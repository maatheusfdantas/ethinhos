/**
 * Padrões de comportamento: consistência semanal, melhor dia, melhor horário e dados de gráficos.
 * Itens novos em relação ao legado (o plano pede melhor dia/horário e consistência semanal).
 */
import { addDays, localHour, toLocalDate } from '../date';
import { weekdayOf } from '../schedule';
import type { Entry, LocalDate, TimeZone, Weekday } from '../types';
import { completionRate, inRange, round1 } from './metrics';
import type { BestDay, BestTime, Occurrence, TimeBucket, WeekSummary, WeeklyConsistency } from './types';
import { weekStart } from './week';

/** Semana "dentro da meta" quando a conclusão é >= 80%. */
export const WEEK_ON_TARGET = 80;
/** Mínimo de ocorrências resolvidas em um dia da semana para compará-lo com os demais. */
export const MIN_SAMPLES_PER_WEEKDAY = 3;
/** Diferença mínima (pontos) entre melhor e pior dia para dizer que existe um padrão. */
export const MIN_WEEKDAY_GAP = 15;
export const MIN_TIMED_ENTRIES = 5;

// ---- Consistência semanal ----
/** Taxa de conclusão por semana (segunda a domingo), das últimas `weeks` semanas até a semana de `today`. */
export function weeklySeries(occs: readonly Occurrence[], today: LocalDate, weeks = 8): WeekSummary[] {
  const currentStart = weekStart(today);
  const out: WeekSummary[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const from = addDays(currentStart, -7 * i);
    const to = addDays(from, 6);
    const inWeek = occs.filter((o) => o.resolved && inRange(o, from, to));
    out.push({ from, to, completionRate: inWeek.length ? completionRate(inWeek) : null, occurrences: inWeek.length });
  }
  return out;
}

/** Considera só semanas já encerradas e com dados (a semana em curso ainda não é um resultado). */
export function weeklyConsistency(series: readonly WeekSummary[], today: LocalDate): WeeklyConsistency {
  const rates = series.filter((w) => w.to < today && w.completionRate !== null).map((w) => w.completionRate as number);
  const mean = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const stdev = rates.length > 1 ? Math.sqrt(rates.reduce((a, r) => a + (r - mean) ** 2, 0) / (rates.length - 1)) : 0;
  return {
    weeksCounted: rates.length,
    weeksOnTarget: rates.filter((r) => r >= WEEK_ON_TARGET).length,
    stdev: round1(stdev)
  };
}

// ---- Melhor dia da semana ----
const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Dia da semana com maior e menor taxa de conclusão, só entre ocorrências diárias resolvidas. */
export function bestDay(occs: readonly Occurrence[]): BestDay | null {
  const stats = new Map<Weekday, { done: number; total: number }>();
  for (const o of occs) {
    if (o.scope !== 'day' || !o.resolved) continue;
    const wd = weekdayOf(o.date);
    const s = stats.get(wd) ?? { done: 0, total: 0 };
    s.total++;
    if (o.completed) s.done++;
    stats.set(wd, s);
  }
  const rated = WEEK_ORDER.flatMap((weekday) => {
    const s = stats.get(weekday);
    if (!s || s.total < MIN_SAMPLES_PER_WEEKDAY) return [];
    return [{ weekday, rate: round1((s.done / s.total) * 100), samples: s.total }];
  });
  if (rated.length < 2) return null;
  let best = rated[0]!;
  let worst = rated[0]!;
  for (const r of rated) {
    if (r.rate > best.rate) best = r;
    if (r.rate < worst.rate) worst = r;
  }
  if (best.rate - worst.rate < MIN_WEEKDAY_GAP) return null;
  return { best, worst };
}

// ---- Melhor horário ----
export function bucketOf(hour: number): TimeBucket {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Período do dia em que o usuário mais registra. Só vale registro feito no próprio dia a que se refere
 * (`date` = dia local de `recordedAt`) e de origem `tap` ou `timer`: lançamentos manuais e importações
 * têm hora artificial.
 */
export function bestTime(
  entries: readonly Entry[],
  commitmentIds: ReadonlySet<string>,
  timezone: TimeZone,
  from: LocalDate,
  to: LocalDate
): BestTime | null {
  const hours: number[] = [];
  for (const e of entries) {
    if (e.deletedAt || e.value <= 0 || !commitmentIds.has(e.commitmentId)) continue;
    if (e.source !== 'tap' && e.source !== 'timer') continue;
    if (e.date < from || e.date > to) continue;
    if (toLocalDate(e.recordedAt, timezone) !== e.date) continue;
    hours.push(localHour(e.recordedAt, timezone));
  }
  if (hours.length < MIN_TIMED_ENTRIES) return null;

  const perBucket = new Map<TimeBucket, number[]>();
  for (const h of hours) {
    const b = bucketOf(h);
    perBucket.set(b, [...(perBucket.get(b) ?? []), h]);
  }
  let top: TimeBucket = 'morning';
  let topCount = -1;
  for (const b of ['night', 'morning', 'afternoon', 'evening'] as const) {
    const n = perBucket.get(b)?.length ?? 0;
    if (n > topCount) {
      top = b;
      topCount = n;
    }
  }
  const inBucket = perBucket.get(top) ?? [];
  const freq = new Map<number, number>();
  for (const h of inBucket) freq.set(h, (freq.get(h) ?? 0) + 1);
  let peakHour = inBucket[0] ?? 0;
  let peakCount = 0;
  for (const [h, n] of [...freq].sort(([a], [b]) => a - b)) {
    if (n > peakCount) {
      peakHour = h;
      peakCount = n;
    }
  }
  return { bucket: top, peakHour, share: Math.round((topCount / hours.length) * 100) / 100, samples: hours.length };
}

// ---- Dados de gráfico (porte de service.py, sem os dados simulados) ----
export interface HeatmapCell {
  date: LocalDate;
  total: number;
  completed: number;
  /** completed / total, 0..1 (0 sem ocorrências). */
  intensity: number;
}

export function calendarHeatmap(occs: readonly Occurrence[], from: LocalDate, to: LocalDate): HeatmapCell[] {
  const out: HeatmapCell[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = occs.filter((o) => o.scope === 'day' && o.date === d);
    const completed = day.filter((o) => o.completed).length;
    out.push({ date: d, total: day.length, completed, intensity: day.length ? Math.round((completed / day.length) * 100) / 100 : 0 });
  }
  return out;
}

export interface WeekdayComparison {
  date: LocalDate;
  weekday: Weekday;
  current: number;
  previous: number;
}

/** Cumpridos em cada um dos últimos 7 dias contra o mesmo dia da semana anterior. */
export function weeklyComparison(occs: readonly Occurrence[], today: LocalDate): WeekdayComparison[] {
  const doneOn = (d: LocalDate) => occs.filter((o) => o.scope === 'day' && o.date === d && o.completed).length;
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, weekday: weekdayOf(date), current: doneOn(date), previous: doneOn(addDays(date, -7)) };
  });
}
