/**
 * Tipos da engine de métricas e insights (funções puras: sem I/O, sem relógio, sem UI).
 * Entrada: compromissos + registros + "hoje" (data local) + fuso. Saída: métricas e insights.
 */
import type { CommitmentKind, Insight, LocalDate, Weekday } from '../types';

/** `day`: uma ocorrência por dia previsto. `week`: uma por semana (frequência `weekly_count`). */
export type OccurrenceScope = 'day' | 'week';

/**
 * - `done`: meta cumprida.
 * - `partial`: período encerrado com progresso, mas abaixo da meta.
 * - `missed`: período encerrado sem nenhum registro.
 * - `pending`: período ainda aberto e meta não cumprida (hoje, ou a semana corrente).
 *   Pendente NÃO é falha: fica fora de taxas, sequências e recuperação.
 */
export type OccurrenceStatus = 'done' | 'partial' | 'missed' | 'pending';

export interface Occurrence {
  commitmentId: string;
  categoryId: string | null;
  kind: CommitmentKind;
  scope: OccurrenceScope;
  /** Dia previsto (scope `day`) ou, em `week`, o domingo que fecha a semana (limitado a "hoje"). */
  date: LocalDate;
  /** Meta: valor do dia (`day`) ou número de dias a cumprir na semana (`week`). */
  target: number;
  /** Soma dos registros do dia (`day`) ou dias da semana com a meta diária cumprida (`week`). */
  progress: number;
  /** progress / target, limitado a 0..1. */
  ratio: number;
  status: OccurrenceStatus;
  completed: boolean;
  /** O período já acabou ou a meta já foi cumprida. Só ocorrências resolvidas entram nas taxas. */
  resolved: boolean;
}

/** Resultado de um dia (ou semana) em que TODAS as ocorrências estão resolvidas. */
export interface DayOutcome {
  date: LocalDate;
  total: number;
  done: number;
  /** Todas as ocorrências do período foram cumpridas. */
  completed: boolean;
  /** Média de `ratio` das ocorrências do período, 0..1. */
  meanRatio: number;
}

export interface BrokenRun {
  /** Quantos períodos seguidos foram cumpridos imediatamente antes da falha. */
  length: number;
  failedOn: LocalDate;
}

export interface StreakResult {
  current: number;
  best: number;
  lastBrokenRun: BrokenRun | null;
}

export type TrendStatus = 'improving' | 'stable' | 'declining';

export interface TrendResult {
  /** Taxa de conclusão dos últimos 7 dias menos a dos 7 dias anteriores (pontos percentuais). */
  delta: number;
  status: TrendStatus;
  /** As duas semanas têm ocorrências resolvidas. Sem base de comparação, delta = 0 e status `stable`. */
  hasBaseline: boolean;
  last7Rate: number;
  prev7Rate: number;
}

export type ConsistencyLabel = 'very_consistent' | 'consistent' | 'oscillating' | 'needs_adjustment' | 'fragile';

export interface ConsistencyInputs {
  /** 0..100 */
  completionRate: number;
  /** 0..1 */
  regularity: number;
  /** 0..100 */
  recoveryRate: number;
  /** 0..100 */
  coverage: number;
  trendStatus: TrendStatus;
  /** Aderência (0..100) de cada categoria. */
  categoryAdherences: readonly number[];
}

export interface CategoryMetrics {
  categoryId: string | null;
  /** Média de progresso (0..100) das ocorrências resolvidas da categoria. */
  adherence: number;
  totalExpected: number;
  totalCompleted: number;
  commitmentsCount: number;
}

export type CommitmentStatusLabel = 'at_risk' | 'rising' | 'steady' | 'no_data';

export interface CommitmentMetrics {
  commitmentId: string;
  categoryId: string | null;
  /** Unidade de contagem das sequências: dias, ou semanas para `weekly_count`. */
  streakUnit: 'day' | 'week';
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
  regularity: number;
  coverage: number;
  recoveryRate: number;
  trend: TrendResult;
  isAtRisk: boolean;
  status: CommitmentStatusLabel;
  /** Ocorrências resolvidas na janela analisada. */
  resolvedCount: number;
}

export interface WeekSummary {
  from: LocalDate;
  to: LocalDate;
  /** `null` quando a semana não tem ocorrências resolvidas. */
  completionRate: number | null;
  occurrences: number;
}

export interface WeeklyConsistency {
  /** Semanas encerradas, com dados, consideradas. */
  weeksCounted: number;
  /** Semanas com taxa de conclusão >= 80%. */
  weeksOnTarget: number;
  /** Desvio-padrão (amostral) das taxas semanais. 0 com menos de 2 semanas. */
  stdev: number;
}

export interface BestDay {
  best: { weekday: Weekday; rate: number; samples: number };
  worst: { weekday: Weekday; rate: number; samples: number };
}

export type TimeBucket = 'night' | 'morning' | 'afternoon' | 'evening';

export interface BestTime {
  bucket: TimeBucket;
  /** Hora local (0..23) mais frequente dentro do período dominante. */
  peakHour: number;
  /** Fração (0..1) dos registros que caem no período dominante. */
  share: number;
  samples: number;
}

export interface WindowMetrics {
  days: number;
  from: LocalDate;
  to: LocalDate;
  completionRate: number;
  /** `null` sem dados suficientes. */
  consistencyScore: number | null;
}

export interface Summary {
  /** `null` quando há menos de 3 períodos resolvidos: um usuário novo não recebe nota. */
  consistencyScore: number | null;
  label: ConsistencyLabel | null;
  currentStreak: number;
  bestStreak: number;
  lastBrokenRun: BrokenRun | null;
  /** Progresso médio (0..100) dos compromissos diários de hoje; `null` se nada é devido hoje. */
  dailyProgress: number | null;
  dueToday: number;
  doneToday: number;
  completionRate: number;
  regularity: number;
  trend: TrendResult;
  coverage: number;
  recoveryRate: number;
  variability: number;
}

export interface Analysis {
  today: LocalDate;
  window: { from: LocalDate; to: LocalDate; days: number };
  /** Há períodos resolvidos suficientes para calcular a nota de consistência. */
  hasEnoughData: boolean;
  summary: Summary;
  commitments: CommitmentMetrics[];
  categories: CategoryMetrics[];
  weekly: { series: WeekSummary[]; consistency: WeeklyConsistency };
  patterns: { bestDay: BestDay | null; bestTime: BestTime | null };
  windows: { d7: WindowMetrics; d30: WindowMetrics; d90: WindowMetrics };
  insights: Insight[];
}
