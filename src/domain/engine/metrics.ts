/**
 * Métricas puras sobre ocorrências. Porte de engine/calculator.py (10 métricas + score composto).
 * Nenhuma função lê relógio, rede ou banco: tudo que depende de "hoje" recebe `today`.
 * Divergências do legado estão marcadas com "DIVERGÊNCIA" e listadas em docs/04-engine-decisoes.md.
 */
import { addDays } from '../date';
import type { LocalDate } from '../types';
import type {
  BrokenRun,
  CategoryMetrics,
  ConsistencyInputs,
  ConsistencyLabel,
  DayOutcome,
  Occurrence,
  StreakResult,
  TrendResult,
  TrendStatus
} from './types';

// ---- utilidades numéricas ----
/** Arredonda para 1 casa (meio para longe do zero). */
export function round1(x: number): number {
  const r = Math.round(Math.abs(x) * 10) / 10;
  return r === 0 ? 0 : x < 0 ? -r : r;
}
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** Desvio-padrão populacional (np.std padrão). */
function popStd(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
/** Desvio-padrão amostral (np.std ddof=1). */
function sampleStd(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export const inRange = (o: Pick<Occurrence, 'date'>, from: LocalDate, to: LocalDate) => o.date >= from && o.date <= to;
const resolvedOnly = (occs: readonly Occurrence[]) => occs.filter((o) => o.resolved);

// ---- Métrica 1: progresso do dia ----
/**
 * Média de progresso (0..100) dos compromissos DIÁRIOS devidos em `date`. Inclui os ainda
 * pendentes (é o progresso "até agora"). `weekly_count` fica de fora: tem barra semanal própria.
 * DIVERGÊNCIA: sem compromissos devidos devolve `null` (o legado devolvia 0, igual a "nada feito").
 */
export function dailyProgress(occs: readonly Occurrence[], date: LocalDate): { value: number | null; due: number; done: number } {
  const today = occs.filter((o) => o.scope === 'day' && o.date === date);
  if (today.length === 0) return { value: null, due: 0, done: 0 };
  return {
    value: round1(mean(today.map((o) => o.ratio)) * 100),
    due: today.length,
    done: today.filter((o) => o.completed).length
  };
}

// ---- Métrica 2: taxa de conclusão ----
/**
 * Concluídas / resolvidas, em %. Pendentes não entram no denominador.
 * DIVERGÊNCIA: o legado contava o "hoje" ainda aberto como falha.
 * (O legado também excluía `skipped_justified`; o domínio atual não tem esse conceito.)
 */
export function completionRate(occs: readonly Occurrence[]): number {
  const valid = resolvedOnly(occs);
  if (valid.length === 0) return 0;
  return round1((valid.filter((o) => o.completed).length / valid.length) * 100);
}

// ---- Resultado por dia (base de sequência, regularidade, recuperação, variabilidade) ----
/**
 * Agrupa por data. Um dia só entra se TODAS as ocorrências dele estão resolvidas; assim "hoje ainda
 * em aberto" não quebra sequência nem conta como falha. `completed` = todas cumpridas.
 */
export function outcomesByDate(occs: readonly Occurrence[]): DayOutcome[] {
  const byDate = new Map<LocalDate, Occurrence[]>();
  for (const o of occs) {
    const list = byDate.get(o.date);
    if (list) list.push(o);
    else byDate.set(o.date, [o]);
  }
  const out: DayOutcome[] = [];
  for (const [date, list] of byDate) {
    if (!list.every((o) => o.resolved)) continue;
    out.push({
      date,
      total: list.length,
      done: list.filter((o) => o.completed).length,
      completed: list.every((o) => o.completed),
      meanRatio: mean(list.map((o) => o.ratio))
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---- Métricas 3 e 4: sequência atual e melhor sequência ----
/**
 * Sequência de períodos cumpridos. Dias sem nada previsto são ignorados (não quebram nem contam).
 * DIVERGÊNCIA: o legado só enxergava a janela de 30 dias, então nenhuma sequência passava de 30.
 * Aqui a entrada é o histórico inteiro (o chamador decide o que passar).
 */
export function computeStreaks(outcomes: readonly DayOutcome[]): StreakResult {
  let best = 0;
  let run = 0;
  for (const o of outcomes) {
    if (o.completed) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let lastBrokenRun: BrokenRun | null = null;
  for (let i = outcomes.length - 1; i >= 0; i--) {
    const failed = outcomes[i]!;
    if (failed.completed) continue;
    let length = 0;
    for (let j = i - 1; j >= 0 && outcomes[j]!.completed; j--) length++;
    lastBrokenRun = { length, failedOn: failed.date };
    break;
  }

  return { current: run, best, lastBrokenRun };
}

// ---- Métrica 5: regularidade ----
/**
 * 0.5 * conclusão + 0.3 * sequência (ref. 14) + 0.2 * espaçamento.
 * DIVERGÊNCIA (espaçamento): o legado media a distância em DIAS DE CALENDÁRIO e esperava 1 dia, o que
 * penalizava hábitos de dias úteis ou de 3x por semana. Aqui a distância é medida em períodos
 * PREVISTOS (posição dentro de `outcomes`), então seguir o plano à risca dá espaçamento perfeito.
 */
export function regularity(args: {
  completionRate: number;
  currentStreak: number;
  outcomes: readonly DayOutcome[];
  streakRef?: number;
}): number {
  const { completionRate: rate, currentStreak, outcomes, streakRef = 14 } = args;
  const completionNorm = clamp01(rate / 100);
  const streakNorm = clamp01(currentStreak / streakRef);

  const positions: number[] = [];
  outcomes.forEach((o, i) => {
    if (o.completed) positions.push(i);
  });

  let spacingNorm: number;
  if (positions.length <= 1) {
    spacingNorm = positions.length === 1 ? 0.5 : 0;
  } else {
    const diffs = positions.slice(1).map((p, i) => p - positions[i]!);
    const meanDiff = mean(diffs);
    const std = diffs.length > 1 ? popStd(diffs) : 0;
    spacingNorm = clamp01(1 / (1 + Math.abs(meanDiff - 1) + 0.3 * std));
  }

  return round3(0.5 * completionNorm + 0.3 * streakNorm + 0.2 * spacingNorm);
}

// ---- Métrica 6: tendência recente ----
/**
 * Taxa dos últimos 7 dias menos a dos 7 anteriores. > 10 melhorando, < -10 piorando.
 * DIVERGÊNCIA: se uma das duas semanas não tem ocorrências resolvidas (hábito recém-criado), o
 * legado tratava como 0% e acusava "melhorando +100". Aqui não há base de comparação: delta 0, estável.
 */
export function computeTrend(occs: readonly Occurrence[], today: LocalDate): TrendResult {
  const lastFrom = addDays(today, -6);
  const prevFrom = addDays(today, -13);
  const prevTo = addDays(today, -7);
  const last = resolvedOnly(occs).filter((o) => inRange(o, lastFrom, today));
  const prev = resolvedOnly(occs).filter((o) => inRange(o, prevFrom, prevTo));
  const last7Rate = completionRate(last);
  const prev7Rate = completionRate(prev);
  const hasBaseline = last.length > 0 && prev.length > 0;
  const delta = hasBaseline ? round1(last7Rate - prev7Rate) : 0;
  const status: TrendStatus = delta > 10 ? 'improving' : delta < -10 ? 'declining' : 'stable';
  return { delta, status, hasBaseline, last7Rate, prev7Rate };
}

// ---- Métrica 7: taxa de recuperação ----
/**
 * Falhas seguidas de sucesso no PRÓXIMO período previsto / total de falhas. Uma falha no último
 * período resolvido conta como não recuperada (igual ao legado). Sem falhas: 100.
 */
export function recoveryRate(outcomes: readonly DayOutcome[]): number {
  let failures = 0;
  let recovered = 0;
  for (let i = 0; i < outcomes.length - 1; i++) {
    if (!outcomes[i]!.completed) {
      failures++;
      if (outcomes[i + 1]!.completed) recovered++;
    }
  }
  const last = outcomes[outcomes.length - 1];
  if (last && !last.completed) failures++;
  if (failures === 0) return 100;
  return round1((recovered / failures) * 100);
}

// ---- Métrica 8: cobertura de registro (antes "confiabilidade do registro") ----
/**
 * Ocorrências resolvidas com algum registro / resolvidas, em %.
 * DIVERGÊNCIA DE SENTIDO: no legado, um check-in de valor 0 contava como "registrado, mas falhou".
 * No domínio atual todo registro tem valor > 0, então "sem registro" e "falhou" são a mesma coisa e
 * esta métrica passa a medir "teve algum progresso". Veja a decisão em docs/04-engine-decisoes.md.
 */
export function coverage(occs: readonly Occurrence[]): number {
  const valid = resolvedOnly(occs);
  if (valid.length === 0) return 100;
  return round1((valid.filter((o) => o.progress > 0).length / valid.length) * 100);
}

// ---- Métrica 9: aderência por categoria ----
export function categoryAdherence(occs: readonly Occurrence[]): CategoryMetrics[] {
  const groups = new Map<string | null, Occurrence[]>();
  for (const o of resolvedOnly(occs)) {
    const list = groups.get(o.categoryId);
    if (list) list.push(o);
    else groups.set(o.categoryId, [o]);
  }
  const out: CategoryMetrics[] = [];
  for (const [categoryId, list] of groups) {
    out.push({
      categoryId,
      adherence: round1(mean(list.map((o) => o.ratio)) * 100),
      totalExpected: list.length,
      totalCompleted: list.filter((o) => o.completed).length,
      commitmentsCount: new Set(list.map((o) => o.commitmentId)).size
    });
  }
  return out.sort((a, b) => b.adherence - a.adherence || String(a.categoryId).localeCompare(String(b.categoryId)));
}

// ---- Métrica 10: variabilidade ----
/** Desvio-padrão amostral do progresso diário (0..100) nos dias resolvidos. Menos de 2 dias: 0. */
export function variability(outcomes: readonly DayOutcome[]): number {
  if (outcomes.length < 2) return 0;
  return round1(sampleStd(outcomes.map((o) => o.meanRatio * 100)));
}

// ---- Score composto de consistência ----
export const CONSISTENCY_WEIGHTS = {
  completion: 0.3,
  regularity: 0.2,
  recovery: 0.15,
  coverage: 0.15,
  trend: 0.1,
  categoryBalance: 0.1
} as const;

export const TREND_SCORE: Record<TrendStatus, number> = { improving: 100, stable: 70, declining: 40 };

export function consistencyLabel(score: number): ConsistencyLabel {
  if (score >= 85) return 'very_consistent';
  if (score >= 70) return 'consistent';
  if (score >= 55) return 'oscillating';
  if (score >= 40) return 'needs_adjustment';
  return 'fragile';
}

/** Mesma fórmula e mesmos pesos do legado. Equilíbrio entre categorias = 100 - desvio populacional. */
export function consistencyScore(input: ConsistencyInputs): { score: number; label: ConsistencyLabel } {
  const balance =
    input.categoryAdherences.length > 1 ? Math.min(100, Math.max(0, 100 - popStd(input.categoryAdherences))) : 100;
  const w = CONSISTENCY_WEIGHTS;
  const raw =
    w.completion * input.completionRate +
    w.regularity * (input.regularity * 100) +
    w.recovery * input.recoveryRate +
    w.coverage * input.coverage +
    w.trend * TREND_SCORE[input.trendStatus] +
    w.categoryBalance * balance;
  const score = Math.min(100, Math.max(0, round1(raw)));
  return { score, label: consistencyLabel(score) };
}
