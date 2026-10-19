"""
Ethos Analytics Engine - Core Calculator & Pipeline
Implements the 10 essential metrics, Occurrence Classification,
and Composite Consistency Score using NumPy, SciPy, and Pandas.
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from scipy import stats

from engine.models import (
    HabitModel, CheckinModel, ExpectedOccurrence,
    OccurrenceStatus, TrendStatus, ConsistencyLabel,
    HabitMetricResult, CategoryMetricResult, SummaryResult
)

def parse_date(date_str: str) -> date:
    """Safely parse YYYY-MM-DD string to date."""
    if isinstance(date_str, (datetime, date)):
        return date_str if isinstance(date_str, date) else date_str.date()
    return datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()

def format_date(d: date) -> str:
    """Format date to YYYY-MM-DD string."""
    return d.strftime("%Y-%m-%d")

class AnalyticsPipeline:
    def __init__(self, habits: List[HabitModel], checkins: List[CheckinModel], reference_date: Optional[date] = None):
        self.habits = habits
        self.checkins = checkins
        self.ref_date = reference_date or date.today()
        # Default analysis window: last 30 days up to reference date
        self.start_date = self.ref_date - timedelta(days=29)
        self.end_date = self.ref_date

    def expand_calendar(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[ExpectedOccurrence]:
        """
        Step 2 of Pipeline: Expand expected execution calendar based on habit schedules.
        Supports daily, weekdays, and custom days (JS Sunday=0..Saturday=6).
        """
        s_date = start_date or self.start_date
        e_date = end_date or self.end_date
        occurrences: List[ExpectedOccurrence] = []

        total_days = (e_date - s_date).days + 1
        for day_offset in range(total_days):
            current_d = s_date + timedelta(days=day_offset)
            current_d_str = format_date(current_d)
            # JS day convention: 0=Sunday, 1=Monday ... 6=Saturday
            js_weekday = (current_d.weekday() + 1) % 7

            for habit in self.habits:
                if not habit.active:
                    continue
                habit_start = parse_date(habit.start_date)
                if current_d < habit_start:
                    continue

                # Check schedule
                is_scheduled = False
                if habit.schedule_type == "daily":
                    is_scheduled = True
                elif habit.schedule_type == "weekdays":
                    is_scheduled = current_d.weekday() < 5  # Mon..Fri
                else:
                    # Custom days list
                    # Accept either JS weekday (0=Sun) or ISO weekday (0=Mon..6=Sun)
                    if js_weekday in habit.schedule_days or current_d.weekday() in habit.schedule_days:
                        is_scheduled = True

                if is_scheduled:
                    occurrences.append(ExpectedOccurrence(
                        habit_id=habit.habit_id,
                        habit_name=habit.name,
                        category=habit.category,
                        expected_date=current_d_str,
                        target_value=habit.target_value,
                        schedule_type=habit.schedule_type,
                        status="not_logged",
                        logged_value=0.0,
                        progress_ratio=0.0,
                        completion_flag=0
                    ))

        return occurrences

    def match_and_classify(self, expected_occurrences: List[ExpectedOccurrence]) -> List[ExpectedOccurrence]:
        """
        Step 3 & 4: Cross expected occurrences with checkins and classify statuses.
        Status types: done, partial, missed, skipped_justified, late_done, not_logged.
        """
        # Index checkins by (habit_id, event_date)
        checkin_map: Dict[Tuple[str, str], CheckinModel] = {}
        for c in self.checkins:
            c_date = format_date(parse_date(c.event_date))
            checkin_map[(c.habit_id, c_date)] = c

        habit_map = {h.habit_id: h for h in self.habits}
        classified: List[ExpectedOccurrence] = []

        for occ in expected_occurrences:
            key = (occ.habit_id, occ.expected_date)
            habit = habit_map.get(occ.habit_id)
            target = occ.target_value if occ.target_value > 0 else 1.0

            if key in checkin_map:
                checkin = checkin_map[key]
                occ.logged_value = float(checkin.value)
                occ.note = checkin.note

                if checkin.status_override:
                    occ.status = checkin.status_override
                    if occ.status in ["done", "late_done"]:
                        occ.progress_ratio = 1.0
                        occ.completion_flag = 1
                    elif occ.status == "partial":
                        occ.progress_ratio = min(occ.logged_value / target, 1.0) if target > 0 else 0.5
                        occ.completion_flag = 0
                    elif occ.status == "skipped_justified":
                        occ.progress_ratio = 1.0  # Justified does not hurt completion
                        occ.completion_flag = 1
                    else:
                        occ.progress_ratio = 0.0
                        occ.completion_flag = 0
                else:
                    # Calculate progress_ratio according to metric_type
                    metric_type = habit.metric_type if habit else "binary"
                    if metric_type == "binary":
                        occ.progress_ratio = 1.0 if occ.logged_value >= 1.0 else 0.0
                    else:
                        occ.progress_ratio = float(np.clip(occ.logged_value / target, 0.0, 1.0))

                    occ.completion_flag = 1 if occ.progress_ratio >= 1.0 else 0

                    if occ.completion_flag == 1:
                        occ.status = "done"
                    elif occ.progress_ratio > 0.0:
                        occ.status = "partial"
                    else:
                        occ.status = "missed"
            else:
                occ_date = parse_date(occ.expected_date)
                if occ_date < self.ref_date:
                    occ.status = "not_logged"
                else:
                    occ.status = "not_logged"
                occ.progress_ratio = 0.0
                occ.completion_flag = 0

            classified.append(occ)

        return classified

    def compute_daily_progress(self, classified_occurrences: List[ExpectedOccurrence], target_date: Optional[date] = None) -> float:
        """
        Metric 1: Daily Progress
        Daily Progress = (sum of progress_ratio for expected habits today / count of expected habits today) * 100
        """
        t_date_str = format_date(target_date or self.ref_date)
        today_occs = [o for o in classified_occurrences if o.expected_date == t_date_str]
        if not today_occs:
            return 0.0
        ratios = [o.progress_ratio for o in today_occs]
        return float(np.round((np.sum(ratios) / len(ratios)) * 100.0, 1))

    def compute_completion_rate(self, occurrences: List[ExpectedOccurrence]) -> float:
        """
        Metric 2: Completion Rate
        Completion Rate = (completed occurrences / valid expected occurrences) * 100
        Where valid excludes 'skipped_justified'.
        """
        valid_occs = [o for o in occurrences if o.status != "skipped_justified"]
        if not valid_occs:
            return 0.0
        completed_count = sum(1 for o in valid_occs if o.completion_flag == 1 or o.status in ["done", "late_done"])
        return float(np.round((completed_count / len(valid_occs)) * 100.0, 1))

    def compute_streaks(self, occurrences: List[ExpectedOccurrence]) -> Tuple[int, int]:
        """
        Metric 3 & 4: Current Streak & Best Streak
        Evaluates consecutive completed periods backwards from reference date.
        """
        if not occurrences:
            return 0, 0

        # Group by date: day is considered successful if all expected habits are done,
        # or in habit-level, if that occurrence is done.
        # Here we evaluate day-level completion
        df = pd.DataFrame([{
            'date': o.expected_date,
            'completed': o.completion_flag == 1 or o.status in ['done', 'late_done'],
            'status': o.status
        } for o in occurrences])

        if df.empty:
            return 0, 0

        # Aggregation by date
        daily_summary = df.groupby('date').agg({
            'completed': 'all',
            'status': lambda s: list(s)
        }).sort_index()

        all_dates = list(daily_summary.index)
        is_completed_list = list(daily_summary['completed'])

        # Best streak
        best_streak = 0
        current_run = 0
        for comp in is_completed_list:
            if comp:
                current_run += 1
                if current_run > best_streak:
                    best_streak = current_run
            else:
                current_run = 0

        # Current streak: scan backwards from ref_date
        current_streak = 0
        ref_date_str = format_date(self.ref_date)
        sorted_dates_desc = sorted(all_dates, reverse=True)

        for d_str in sorted_dates_desc:
            row = daily_summary.loc[d_str]
            if d_str == ref_date_str:
                # If today is not completed yet, don't break current streak of past days
                if row['completed']:
                    current_streak += 1
                else:
                    # Today has pending check-ins, keep streak from yesterday if yesterday succeeded
                    continue
            else:
                if row['completed']:
                    current_streak += 1
                else:
                    # Break on first missed or not_logged that isn't justified
                    break

        return current_streak, best_streak

    def compute_regularity(self, completion_rate: float, current_streak: int, occurrences: List[ExpectedOccurrence], streak_ref: float = 14.0) -> float:
        """
        Metric 5: Regularidade
        Regularidade = 0.5 * completion_norm + 0.3 * streak_norm + 0.2 * spacing_norm
        """
        completion_norm = np.clip(completion_rate / 100.0, 0.0, 1.0)
        streak_norm = np.clip(current_streak / streak_ref, 0.0, 1.0)

        # Spacing norm: check intervals between completed days
        completed_dates = sorted(list(set(
            parse_date(o.expected_date) for o in occurrences
            if o.completion_flag == 1 or o.status in ["done", "late_done"]
        )))

        if len(completed_dates) <= 1:
            spacing_norm = 0.5 if len(completed_dates) == 1 else 0.0
        else:
            diffs = [(completed_dates[i] - completed_dates[i - 1]).days for i in range(1, len(completed_dates))]
            mean_diff = float(np.mean(diffs))
            std_diff = float(np.std(diffs)) if len(diffs) > 1 else 0.0
            # Target diff is 1.0 day for daily habit
            penalty = abs(mean_diff - 1.0) + 0.3 * std_diff
            spacing_norm = float(np.clip(1.0 / (1.0 + penalty), 0.0, 1.0))

        regularity = 0.5 * completion_norm + 0.3 * streak_norm + 0.2 * spacing_norm
        return float(np.round(regularity, 3))

    def compute_trend(self, occurrences: List[ExpectedOccurrence]) -> Tuple[float, TrendStatus]:
        """
        Metric 6: Tendência recente (Trend Delta)
        Trend Delta = Completion Rate últimos 7 dias - Completion Rate 7 dias anteriores
        Classification:
          improving if > 10
          stable if -10 <= delta <= 10
          declining if < -10
        """
        last_7_start = self.ref_date - timedelta(days=6)
        prev_7_start = self.ref_date - timedelta(days=13)
        prev_7_end = self.ref_date - timedelta(days=7)

        last_7_occs = [o for o in occurrences if last_7_start <= parse_date(o.expected_date) <= self.ref_date]
        prev_7_occs = [o for o in occurrences if prev_7_start <= parse_date(o.expected_date) <= prev_7_end]

        rate_last_7 = self.compute_completion_rate(last_7_occs) if last_7_occs else 0.0
        rate_prev_7 = self.compute_completion_rate(prev_7_occs) if prev_7_occs else 0.0

        delta = float(np.round(rate_last_7 - rate_prev_7, 1))
        if delta > 10.0:
            status: TrendStatus = "improving"
        elif delta < -10.0:
            status: TrendStatus = "declining"
        else:
            status: TrendStatus = "stable"

        return delta, status

    def compute_recovery_rate(self, occurrences: List[ExpectedOccurrence]) -> float:
        """
        Metric 7: Taxa de recuperação (Recovery Rate)
        Recovery Rate = (falhas seguidas de sucesso no próximo período / total de falhas) * 100
        """
        df = pd.DataFrame([{
            'date': o.expected_date,
            'completed': o.completion_flag == 1 or o.status in ['done', 'late_done']
        } for o in occurrences])

        if df.empty:
            return 100.0

        daily_agg = df.groupby('date')['completed'].all().sort_index()
        series = list(daily_agg)

        total_failures = 0
        recovered_failures = 0

        for i in range(len(series) - 1):
            if not series[i]:
                total_failures += 1
                if series[i + 1]:
                    recovered_failures += 1

        # Check last failure if it's not the end
        if len(series) > 0 and not series[-1]:
            total_failures += 1

        if total_failures == 0:
            return 100.0

        rate = (recovered_failures / total_failures) * 100.0
        return float(np.round(rate, 1))

    def compute_logging_reliability(self, occurrences: List[ExpectedOccurrence]) -> float:
        """
        Metric 8: Confiabilidade do registro (Logging Reliability)
        Logging Reliability = (ocorrências com registro válido / ocorrências esperadas) * 100
        """
        if not occurrences:
            return 100.0
        valid_logs = sum(1 for o in occurrences if o.status != "not_logged")
        return float(np.round((valid_logs / len(occurrences)) * 100.0, 1))

    def compute_category_adherence(self, occurrences: List[ExpectedOccurrence]) -> List[CategoryMetricResult]:
        """
        Metric 9: Aderência por categoria (Category Adherence)
        Category Adherence = (sum(progress_ratio da categoria) / total esperado da categoria) * 100
        """
        if not occurrences:
            return []

        df = pd.DataFrame([{
            'category': o.category,
            'progress_ratio': o.progress_ratio,
            'completed': 1 if (o.completion_flag == 1 or o.status in ['done', 'late_done']) else 0,
            'habit_id': o.habit_id
        } for o in occurrences])

        results: List[CategoryMetricResult] = []
        for cat, group in df.groupby('category'):
            total_exp = len(group)
            sum_ratio = group['progress_ratio'].sum()
            adherence = float(np.round((sum_ratio / total_exp) * 100.0, 1)) if total_exp > 0 else 0.0
            results.append(CategoryMetricResult(
                category=str(cat),
                adherence=adherence,
                total_expected=int(total_exp),
                total_completed=int(group['completed'].sum()),
                habits_count=int(group['habit_id'].nunique())
            ))

        return results

    def compute_variability(self, occurrences: List[ExpectedOccurrence]) -> float:
        """
        Metric 10: Variabilidade
        Variabilidade = desvio padrão do progresso diário no período (NumPy/SciPy).
        """
        if not occurrences:
            return 0.0

        df = pd.DataFrame([{
            'date': o.expected_date,
            'progress_ratio': o.progress_ratio
        } for o in occurrences])

        daily_progress = df.groupby('date')['progress_ratio'].mean() * 100.0
        if len(daily_progress) <= 1:
            return 0.0

        std_val = float(np.std(daily_progress, ddof=1))
        return float(np.round(std_val, 1))

    def compute_consistency_score(
        self,
        completion_rate: float,
        regularity: float,
        recovery_rate: float,
        logging_reliability: float,
        trend_status: TrendStatus,
        category_adherences: List[float]
    ) -> Tuple[float, ConsistencyLabel, str]:
        """
        Composite Overall Consistency Score:
        Consistency Score =
          0.30 * Completion Rate +
          0.20 * Regularidade * 100 +
          0.15 * Recovery Rate +
          0.15 * Logging Reliability +
          0.10 * Trend Score +
          0.10 * Category Balance

        Where:
          Trend Score = 100 for improving, 70 for stable, 40 for declining
          Category Balance = 100 - std(category_adherences)
        """
        trend_score = 100.0 if trend_status == "improving" else (70.0 if trend_status == "stable" else 40.0)

        if len(category_adherences) > 1:
            cat_std = float(np.std(category_adherences))
            category_balance = float(np.clip(100.0 - cat_std, 0.0, 100.0))
        else:
            category_balance = 100.0

        score = (
            0.30 * completion_rate +
            0.20 * (regularity * 100.0) +
            0.15 * recovery_rate +
            0.15 * logging_reliability +
            0.10 * trend_score +
            0.10 * category_balance
        )
        score = float(np.clip(np.round(score, 1), 0.0, 100.0))

        # Classification
        if score >= 85.0:
            label: ConsistencyLabel = "muito consistente"
            desc = "Desempenho excelente com disciplina contínua, alta estabilidade e retomada rápida após deslizes."
        elif score >= 70.0:
            label: ConsistencyLabel = "consistente"
            desc = "Este indicador resume sua consistência recente considerando execução, continuidade, retomada após falhas, qualidade dos registros e estabilidade entre categorias."
        elif score >= 55.0:
            label: ConsistencyLabel = "oscilando"
            desc = "Sua rotina apresenta boa aderência geral, mas sofre com oscilações no meio da semana ou períodos com registros pendentes."
        elif score >= 40.0:
            label: ConsistencyLabel = "precisa de ajuste"
            desc = "A rotina demanda simplificação ou reprogramação de metas para evitar o acúmulo de quebras consecutivas."
        else:
            label: ConsistencyLabel = "rotina fragilizada"
            desc = "Baixa aderência e quebras frequentes. Recomenda-se focar em um único micro-hábito por vez para restaurar o ritmo."

        return score, label, desc

    def compute_all_habit_metrics(self, classified_occurrences: List[ExpectedOccurrence]) -> List[HabitMetricResult]:
        """Calculates detailed metrics for each individual habit."""
        results: List[HabitMetricResult] = []

        for habit in self.habits:
            h_occs = [o for o in classified_occurrences if o.habit_id == habit.habit_id]
            if not h_occs:
                results.append(HabitMetricResult(
                    habit_id=habit.habit_id,
                    name=habit.name,
                    category=habit.category,
                    completion_rate=0.0,
                    current_streak=0,
                    best_streak=0,
                    regularity=0.0,
                    logging_reliability=0.0,
                    recovery_rate=100.0,
                    trend_delta=0.0,
                    trend_status="stable",
                    is_at_risk=False,
                    status_label="Sem dados"
                ))
                continue

            comp_rate = self.compute_completion_rate(h_occs)
            cur_streak, b_streak = self.compute_streaks(h_occs)
            reg = self.compute_regularity(comp_rate, cur_streak, h_occs)
            log_rel = self.compute_logging_reliability(h_occs)
            rec_rate = self.compute_recovery_rate(h_occs)
            trend_d, trend_s = self.compute_trend(h_occs)

            is_at_risk = comp_rate < 40.0 and len(h_occs) >= 7
            status_label = "Em Risco" if is_at_risk else ("Em Alta" if trend_s == "improving" and comp_rate >= 70.0 else "Estável")

            results.append(HabitMetricResult(
                habit_id=habit.habit_id,
                name=habit.name,
                category=habit.category,
                completion_rate=comp_rate,
                current_streak=cur_streak,
                best_streak=b_streak,
                regularity=reg,
                logging_reliability=log_rel,
                recovery_rate=rec_rate,
                trend_delta=trend_d,
                trend_status=trend_s,
                is_at_risk=is_at_risk,
                status_label=status_label
            ))

        return results
