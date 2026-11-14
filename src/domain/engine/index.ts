export { analyze, DEFAULT_WINDOW_DAYS, MIN_RESOLVED_PERIODS } from './analyze';
export type { AnalyzeInput } from './analyze';
export { buildInsights, WEEKDAY_NAMES_PT } from './insights';
export {
  categoryAdherence,
  completionRate,
  computeStreaks,
  computeTrend,
  consistencyLabel,
  consistencyScore,
  coverage,
  dailyProgress,
  outcomesByDate,
  recoveryRate,
  regularity,
  variability
} from './metrics';
export { buildOccurrences, totalsByCommitment } from './occurrences';
export { bestDay, bestTime, calendarHeatmap, weeklyComparison, weeklyConsistency, weeklySeries } from './patterns';
export type * from './types';
export { eachDay, weekEnd, weekRange, weekStart, weeklyPeriod } from './week';
export type { WeeklyPeriod } from './week';
