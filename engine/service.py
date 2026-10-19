"""
Serviço Analítico do Ethos
Coordena a ingestão de dados, o processamento da pipeline de métricas,
geração de insights e formatação do JSON de saída padronizado.
"""

import sqlite3
import json
import os
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional

from engine.models import HabitModel, CheckinModel
from engine.calculator import AnalyticsPipeline, format_date, parse_date
from engine.insights import InsightGenerator

def run_analytics(habits: List[HabitModel], checkins: List[CheckinModel], ref_date: Optional[date] = None) -> Dict[str, Any]:
    """Executa a pipeline analítica completa e formata a resposta JSON padronizada."""
    pipeline = AnalyticsPipeline(habits=habits, checkins=checkins, reference_date=ref_date)

    # 1. Expandir calendário
    expected_occs = pipeline.expand_calendar()

    # 2. Correlacionar e classificar ocorrências
    classified_occs = pipeline.match_and_classify(expected_occs)

    # 3. Calcular Métricas Globais
    daily_prog = pipeline.compute_daily_progress(classified_occs)
    comp_rate = pipeline.compute_completion_rate(classified_occs)
    cur_streak, best_streak = pipeline.compute_streaks(classified_occs)
    regularity = pipeline.compute_regularity(comp_rate, cur_streak, classified_occs)
    trend_d, trend_s = pipeline.compute_trend(classified_occs)
    rec_rate = pipeline.compute_recovery_rate(classified_occs)
    log_rel = pipeline.compute_logging_reliability(classified_occs)
    cat_adherences = pipeline.compute_category_adherence(classified_occs)
    variability = pipeline.compute_variability(classified_occs)

    # 4. Consistency Score
    cat_adherence_values = [c.adherence for c in cat_adherences]
    score, label, desc = pipeline.compute_consistency_score(
        completion_rate=comp_rate,
        regularity=regularity,
        recovery_rate=rec_rate,
        logging_reliability=log_rel,
        trend_status=trend_s,
        category_adherences=cat_adherence_values
    )

    # 5. Habit Metrics
    habit_metrics = pipeline.compute_all_habit_metrics(classified_occs)

    # Summary object
    summary = {
        "consistency_score": score,
        "label": label,
        "description": desc,
        "main_streak": cur_streak,
        "best_streak": best_streak,
        "daily_progress": daily_prog,
        "completion_rate": comp_rate,
        "trend_status": trend_s,
        "trend_delta": trend_d,
        "logging_reliability": log_rel,
        "recovery_rate": rec_rate,
        "variability": variability
    }

    # 6. Insights & Diagnostics
    from engine.models import SummaryResult
    summary_obj = SummaryResult(**summary)
    insight_gen = InsightGenerator(
        habits=habits,
        occurrences=classified_occs,
        habit_metrics=habit_metrics,
        category_metrics=cat_adherences,
        summary=summary_obj
    )

    alerts = [a.model_dump() for a in insight_gen.generate_alerts()]
    highlights = insight_gen.generate_highlights().model_dump()
    quick_rep = insight_gen.generate_quick_report(insight_gen.generate_highlights()).model_dump()
    expanded_rep = insight_gen.generate_expanded_report().model_dump()
    analytical_rep = insight_gen.generate_analytical_report().model_dump()

    # 7. Generate Visual Charts Data
    # A) Calendar Heatmap (past 30 days)
    calendar_heatmap = []
    # Group occurrences by date
    date_groups: Dict[str, List[Any]] = {}
    for o in classified_occs:
        date_groups.setdefault(o.expected_date, []).append(o)

    for i in range(30):
        d = pipeline.start_date + timedelta(days=i)
        d_str = format_date(d)
        day_occs = date_groups.get(d_str, [])
        total = len(day_occs)
        done = sum(1 for o in day_occs if o.completion_flag == 1 or o.status in ["done", "late_done"])
        intensity = round(done / total, 2) if total > 0 else 0.0
        calendar_heatmap.append({
            "date": d_str,
            "total": total,
            "completed": done,
            "intensity": intensity
        })

    # B) Weekly Completion (Current 7 days vs Previous 7 days)
    ref_d = pipeline.ref_date
    weekly_completion = []
    day_labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

    for i in range(7):
        cur_day = ref_d - timedelta(days=6 - i)
        prev_day = cur_day - timedelta(days=7)
        cur_day_str = format_date(cur_day)
        prev_day_str = format_date(prev_day)

        cur_done = sum(1 for o in date_groups.get(cur_day_str, []) if o.completion_flag == 1 or o.status in ["done", "late_done"])
        prev_done = sum(1 for o in date_groups.get(prev_day_str, []) if o.completion_flag == 1 or o.status in ["done", "late_done"])

        weekly_completion.append({
            "day": day_labels[cur_day.weekday()],
            "current": cur_done,
            "previous": prev_done
        })

    # C) Score Series (Simulated trajectory over past 14 days)
    score_series = []
    base_score = max(20.0, score - (trend_d * 0.7))
    for i in range(14):
        d = ref_d - timedelta(days=13 - i)
        step_factor = i / 13.0
        cur_val = round(base_score + (score - base_score) * step_factor, 1)
        score_series.append({
            "date": format_date(d),
            "score": cur_val
        })

    return {
        "summary": summary,
        "highlights": highlights,
        "alerts": alerts,
        "habits": [h.model_dump() for h in habit_metrics],
        "categories": [c.model_dump() for c in cat_adherences],
        "reports": {
            "quick": quick_rep,
            "expanded": expanded_rep,
            "analytical": analytical_rep
        },
        "charts": {
            "score_series": score_series,
            "weekly_completion": weekly_completion,
            "calendar_heatmap": calendar_heatmap
        }
    }

def run_analytics_for_user(user_id: str, db_path: Optional[str] = None) -> Dict[str, Any]:
    """Fetches user habits and checkins from SQLite and runs the analytics pipeline."""
    if db_path is None:
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ethos.db"))

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Load habits
    cursor.execute("""
        SELECT id, title, category, target, unit, repeat_days, created_at, completed
        FROM habits WHERE user_id = ?
    """, (user_id,))
    habit_rows = cursor.fetchall()

    habits: List[HabitModel] = []
    for r in habit_rows:
        try:
            repeat_days = json.loads(r['repeat_days'] or '[1,2,3,4,5]')
        except Exception:
            repeat_days = [1, 2, 3, 4, 5]

        # Determine metric_type
        target_val = float(r['target'] or 1)
        unit = str(r['unit'] or 'vezes').lower()
        if 'min' in unit or 'hora' in unit:
            m_type = "duration"
        elif 'pág' in unit or 'copo' in unit:
            m_type = "quantity"
        elif target_val > 1:
            m_type = "count"
        else:
            m_type = "binary"

        habits.append(HabitModel(
            habit_id=r['id'],
            name=r['title'],
            category=r['category'] or "Geral",
            metric_type=m_type,
            target_value=target_val,
            target_unit=r['unit'] or 'vezes',
            schedule_type="custom",
            schedule_days=repeat_days,
            start_date="2026-09-01",
            active=True
        ))

    # Load health info
    health_data = {}
    try:
        cursor.execute("""
            SELECT water_glasses, water_target, glass_ml, sleep_bed_time, sleep_wake_time, sleep_logged
            FROM health WHERE user_id = ?
        """, (user_id,))
        h_row = cursor.fetchone()
        if h_row:
            health_data = {
                "water_glasses": h_row["water_glasses"],
                "water_target": h_row["water_target"],
                "glass_ml": h_row["glass_ml"],
                "sleep_bed_time": h_row["sleep_bed_time"],
                "sleep_wake_time": h_row["sleep_wake_time"],
                "sleep_logged": h_row["sleep_logged"]
            }
    except Exception:
        pass

    # Check if checkins table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='checkins'")
    has_checkins_table = cursor.fetchone() is not None

    today = date.today()
    today_str = format_date(today)
    now_iso = datetime.now().isoformat()

    db_checkin_map: Dict[Tuple[str, str], CheckinModel] = {}
    if has_checkins_table:
        cursor.execute("""
            SELECT id, habit_id, event_date, logged_at, value, status_override, note
            FROM checkins WHERE user_id = ?
        """, (user_id,))
        for r in cursor.fetchall():
            m = CheckinModel(
                checkin_id=r['id'],
                habit_id=r['habit_id'],
                event_date=r['event_date'],
                logged_at=r['logged_at'],
                value=float(r['value'] or 1.0),
                status_override=r['status_override'],
                note=r['note']
            )
            db_checkin_map[(r['habit_id'], r['event_date'])] = m

    conn.close()

    # 1. Overlay current day's real live habits state from DB if no explicit checkin exists
    for r in habit_rows:
        h_id = r['id']
        is_completed = bool(r['completed'])
        if (h_id, today_str) not in db_checkin_map:
            if is_completed:
                target_val = float(r['target'] or 1.0)
                db_checkin_map[(h_id, today_str)] = CheckinModel(
                    checkin_id=f"live_{h_id}_{today_str}",
                    habit_id=h_id,
                    event_date=today_str,
                    logged_at=now_iso,
                    value=target_val,
                    status_override="done",
                    note="Concluído hoje"
                )

    # 2. For past dates (< today_str):
    # Unless user is clean/new, provide baseline history for past days so historical charts work
    # and don't collapse to zero when the user logs their first checkin in SQLite!
    is_clean = ("clean" in user_id) or (user_id == "usr_clean")
    if not is_clean and habits:
        seed_checkins = generate_seed_checkins_for_profile(user_id, habits)
        for sc in seed_checkins:
            if sc.event_date < today_str and (sc.habit_id, sc.event_date) not in db_checkin_map:
                db_checkin_map[(sc.habit_id, sc.event_date)] = sc

    checkins = list(db_checkin_map.values())
    result = run_analytics(habits, checkins)

    # Real-time Accompaniment metadata
    completed_today_count = sum(1 for r in habit_rows if r['completed'])
    result["accompaniment"] = {
        "user_id": user_id,
        "today_date": today_str,
        "habits_total": len(habits),
        "habits_completed_today": completed_today_count,
        "today_completion_rate": round((completed_today_count / len(habits) * 100), 1) if habits else 0.0,
        "water_glasses": health_data.get("water_glasses", 0),
        "water_target": health_data.get("water_target", 10),
        "glass_ml": health_data.get("glass_ml", 250),
        "water_ml": health_data.get("water_glasses", 0) * health_data.get("glass_ml", 250),
        "water_target_ml": health_data.get("water_target", 10) * health_data.get("glass_ml", 250),
        "sleep_bed_time": health_data.get("sleep_bed_time", "23:30"),
        "sleep_wake_time": health_data.get("sleep_wake_time", "07:00"),
        "sleep_logged": bool(health_data.get("sleep_logged", 0)),
        "is_clean_profile": is_clean
    }

    return result

def generate_seed_checkins_for_profile(user_id: str, habits: List[HabitModel]) -> List[CheckinModel]:
    """Generates synthetic historical check-ins matching the user's intended profile."""
    today = date.today()
    checkins: List[CheckinModel] = []

    # Pro profile (Matheus): ~92% completion, 14-day streak, highly consistent
    # Mid profile (Lucas): ~70% completion, dips on Wed/Thu, recovering
    # Low profile (Bruno): ~28% completion, high misses, low reliability
    # Clean profile (Clean): 0 checkins
    if "pro" in user_id or "matheus" in user_id:
        completion_prob = 0.94
        streak_days = 14
    elif "lucas" in user_id or "mid" in user_id:
        completion_prob = 0.72
        streak_days = 4
    elif "bruno" in user_id or "preguica" in user_id or "low" in user_id:
        completion_prob = 0.28
        streak_days = 0
    elif "clean" in user_id:
        return []
    else:
        completion_prob = 0.85
        streak_days = 7

    for day_offset in range(30):
        cur_d = today - timedelta(days=29 - day_offset)
        # Skip today - today is strictly live accompaniment!
        if cur_d >= today:
            continue
        cur_d_str = format_date(cur_d)
        is_in_recent_streak = (29 - day_offset) < streak_days
        wd = cur_d.weekday()

        for habit in habits:
            target = habit.target_value
            # Check if scheduled on this day
            js_wd = (wd + 1) % 7
            if js_wd not in habit.schedule_days and wd not in habit.schedule_days:
                continue

            # In recent streak, always succeed
            if is_in_recent_streak:
                completed = True
            elif "mid" in user_id and wd in [2, 3]:  # Wednesday / Thursday conflict for mid
                completed = (hash((habit.habit_id, cur_d_str)) % 100) < 35
            else:
                completed = (hash((habit.habit_id, cur_d_str)) % 100) < (completion_prob * 100)

            if completed:
                val = target
                checkins.append(CheckinModel(
                    checkin_id=f"chk_{habit.habit_id}_{cur_d_str}",
                    habit_id=habit.habit_id,
                    event_date=cur_d_str,
                    logged_at=f"{cur_d_str}T08:30:00",
                    value=val,
                    note="Concluído no horário previsto"
                ))
            else:
                # Some missed days log partial or zero, others don't log
                if (hash((habit.habit_id, cur_d_str, "log")) % 100) < 50:
                    checkins.append(CheckinModel(
                        checkin_id=f"chk_{habit.habit_id}_{cur_d_str}",
                        habit_id=habit.habit_id,
                        event_date=cur_d_str,
                        logged_at=f"{cur_d_str}T22:00:00",
                        value=round(target * 0.4, 1) if habit.metric_type != "binary" else 0.0,
                        note="Tempo insuficiente hoje"
                    ))

    return checkins
