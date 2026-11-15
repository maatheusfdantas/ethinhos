/**
 * Orquestrador da engine: `(compromissos, registros, hoje, fuso) -> métricas e insights`.
 * Função pura e determinística: não lê o relógio (o chamador informa `today`), não faz I/O.
 */
import { addDays } from '../date';
import type { Commitment, CommitmentKind, Entry, LocalDate, TimeZone } from '../types';
import { buildInsights } from './insights';
import {
  categoryAdherence,
  completionRate,
  computeStreaks,
  computeTrend,
  consistencyScore,
  coverage,
  dailyProgress,
  inRange,
  outcomesByDate,
  recoveryRate,
  regularity,
  variability
} from './metrics';
import { buildOccurrences } from './occurrences';
import { bestDay, bestTime, weeklyConsistency, weeklySeries } from './patterns';
import type { Analysis, CommitmentMetrics, Occurrence, Summary, WindowMetrics } from './types';

/** Menos períodos resolvidos que isto e não há base para uma nota de consistência. */
export const MIN_RESOLVED_PERIODS = 3;
export const DEFAULT_WINDOW_DAYS = 30;
/** Janela dos padrões (melhor dia / melhor horário): precisam de mais amostras que a nota. */
export const PATTERN_LOOKBACK_DAYS = 90;
/** Limite de segurança: histórico mais antigo que isto não entra no cálculo de sequências. */
export const MAX_HISTORY_DAYS = 3 * 366;

export interface AnalyzeInput {
  commitments: readonly Commitment[];
  entries: readonly Entry[];
  /** Data local de hoje, informada pelo chamador (a engine nunca consulta o relógio). */
  today: LocalDate;
  timezone: TimeZone;
  windowDays?: number;
  /** Padrão: só hábitos. Tarefas pontuais não entram em sequência, regularidade nem nota. */
  kinds?: readonly CommitmentKind[];
  includeArchived?: boolean;
}

const distinctDates = (occs: readonly Occurrence[]) => new Set(occs.filter((o) => o.resolved).map((o) => o.date)).size;

/** Nota de consistência de um conjunto de ocorrências (uma janela). `null` sem dados suficientes. */
function scoreFor(
  windowOccs: readonly Occurrence[],
  allOccs: readonly Occurrence[],
  today: LocalDate,
  currentStreak: number
): { score: number | null; label: Summary['label']; parts: Omit<Summary, 'consistencyScore' | 'label' | 'currentStreak' | 'bestStreak' | 'lastBrokenRun' | 'dailyProgress' | 'dueToday' | 'doneToday'> } {
  const outcomes = outcomesByDate(windowOccs.filter((o) => o.scope === 'day'));
  const rate = completionRate(windowOccs);
  const reg = regularity({ completionRate: rate, currentStreak, outcomes });
  const trend = computeTrend(allOccs, today);
  const rec = recoveryRate(outcomes);
  const cov = coverage(windowOccs);
  const cats = categoryAdherence(windowOccs);
  const parts = { completionRate: rate, regularity: reg, trend, coverage: cov, recoveryRate: rec, variability: variability(outcomes) };
  if (distinctDates(windowOccs) < MIN_RESOLVED_PERIODS) return { score: null, label: null, parts };
  const { score, label } = consistencyScore({
    completionRate: rate,
    regularity: reg,
    recoveryRate: rec,
    coverage: cov,
    trendStatus: trend.status,
    categoryAdherences: cats.map((c) => c.adherence)
  });
  return { score, label, parts };
}

function windowMetrics(allOccs: readonly Occurrence[], today: LocalDate, days: number, streak: number): WindowMetrics {
  const from = addDays(today, -(days - 1));
  const occs = allOccs.filter((o) => inRange(o, from, today));
  return { days, from, to: today, completionRate: completionRate(occs), consistencyScore: scoreFor(occs, allOccs, today, streak).score };
}

function perCommitment(c: Commitment, all: readonly Occurrence[], today: LocalDate, from: LocalDate): CommitmentMetrics {
  const own = all.filter((o) => o.commitmentId === c.id);
  const ownWindow = own.filter((o) => inRange(o, from, today));
  const weekly = c.recurrence.freq === 'weekly_count';
  const historyOutcomes = outcomesByDate(own);
  const streaks = computeStreaks(historyOutcomes);
  const windowOutcomes = outcomesByDate(ownWindow);
  const resolvedCount = ownWindow.filter((o) => o.resolved).length;
  const rate = completionRate(ownWindow);
  const trend = computeTrend(own, today);
  const isAtRisk = rate < 40 && resolvedCount >= 7;
  return {
    commitmentId: c.id,
    categoryId: c.categoryId,
    streakUnit: weekly ? 'week' : 'day',
    completionRate: rate,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    regularity: regularity({ completionRate: rate, currentStreak: streaks.current, outcomes: windowOutcomes }),
    coverage: coverage(ownWindow),
    recoveryRate: recoveryRate(windowOutcomes),
    trend,
    isAtRisk,
    status: resolvedCount === 0 ? 'no_data' : isAtRisk ? 'at_risk' : trend.status === 'improving' && rate >= 70 ? 'rising' : 'steady',
    resolvedCount
  };
}

export function analyze(input: AnalyzeInput): Analysis {
  const { today, timezone, includeArchived = false } = input;
  const windowDays = Math.max(1, Math.floor(input.windowDays ?? DEFAULT_WINDOW_DAYS));
  const kinds = input.kinds ?? (['habit'] as const);
  const commitments = input.commitments.filter((c) => kinds.includes(c.kind) && (includeArchived || c.status === 'active'));
  const windowFrom = addDays(today, -(windowDays - 1));
  const window = { from: windowFrom, to: today, days: windowDays };

  // Histórico inteiro (para sequências), limitado por segurança.
  const earliest = commitments.reduce<LocalDate>((min, c) => (c.startDate < min ? c.startDate : min), today);
  const floor = addDays(today, -MAX_HISTORY_DAYS);
  const historyFrom = earliest > floor ? earliest : floor;

  const all = buildOccurrences({ commitments, entries: input.entries, from: historyFrom, to: today, today, includeArchived });
  const windowOccs = all.filter((o) => inRange(o, windowFrom, today));
  const dayHistory = all.filter((o) => o.scope === 'day');

  const streaks = computeStreaks(outcomesByDate(dayHistory));
  const scored = scoreFor(windowOccs, all, today, streaks.current);
  const today1 = dailyProgress(all, today);
  const hasEnoughData = scored.score !== null;

  const summary: Summary = {
    consistencyScore: scored.score,
    label: scored.label,
    currentStreak: streaks.current,
    bestStreak: streaks.best,
    lastBrokenRun: streaks.lastBrokenRun,
    dailyProgress: today1.value,
    dueToday: today1.due,
    doneToday: today1.done,
    ...scored.parts
  };

  const series = weeklySeries(all, today);
  const weekly = weeklyConsistency(series, today);
  const lookbackFrom = addDays(today, -(PATTERN_LOOKBACK_DAYS - 1));
  const patternOccs = all.filter((o) => inRange(o, lookbackFrom, today));
  const best = bestDay(patternOccs);
  const ids = new Set(commitments.map((c) => c.id));
  const time = bestTime(input.entries, ids, timezone, lookbackFrom, today);

  const commitmentMetrics = commitments.map((c) => perCommitment(c, all, today, windowFrom));

  const insights = buildInsights({
    window: { from: windowFrom, to: today },
    hasEnoughData,
    summary,
    commitments: commitmentMetrics,
    titles: new Map(commitments.map((c) => [c.id, c.title])),
    occurrences: windowOccs,
    weekly,
    bestDay: best,
    bestTime: time
  });

  return {
    today,
    window,
    hasEnoughData,
    summary,
    commitments: commitmentMetrics,
    categories: categoryAdherence(windowOccs),
    weekly: { series, consistency: weekly },
    patterns: { bestDay: best, bestTime: time },
    windows: {
      d7: windowMetrics(all, today, 7, streaks.current),
      d30: windowMetrics(all, today, 30, streaks.current),
      d90: windowMetrics(all, today, 90, streaks.current)
    },
    insights
  };
}

