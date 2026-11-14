/**
 * Geração de insights a partir das métricas. Porte de engine/insights.py (alertas) mais os insights
 * que o plano pede: sequência, quebra de sequência, taxa de conclusão, melhor dia/horário e
 * consistência semanal.
 *
 * Tom: descrever o que aconteceu e oferecer um próximo passo pequeno; nada de culpa.
 * Não é copiado do legado: o relatório "analítico" projetava janelas de 7/30/90 dias com fatores
 * inventados (x0,95, x0,96...) e citava uma estatística sem fonte ("eleva em 34% a durabilidade").
 */
import { diffDays } from '../date';
import type { Insight, InsightTone, LocalDate, Weekday } from '../types';
import { weekdayOf } from '../schedule';
import type { BestDay, BestTime, CommitmentMetrics, Occurrence, Summary, TimeBucket, WeeklyConsistency } from './types';

export const WEEKDAY_NAMES_PT: Record<Weekday, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado'
};

const BUCKET_PHRASE_PT: Record<TimeBucket, string> = {
  night: 'de madrugada',
  morning: 'pela manhã',
  afternoon: 'à tarde',
  evening: 'à noite'
};

// Limiares herdados do legado.
export const THRESHOLDS = {
  lowCoverage: 60,
  sharpDecline: -15,
  highVariability: 35,
  weekdayConflictShare: 35,
  weekdayConflictMinFailures: 4,
  minStreakToCelebrate: 3,
  minRunToMournBreak: 3,
  minWeeksForWeeklyInsight: 3
} as const;

export interface InsightContext {
  window: { from: LocalDate; to: LocalDate };
  hasEnoughData: boolean;
  summary: Summary;
  commitments: readonly CommitmentMetrics[];
  titles: ReadonlyMap<string, string>;
  /** Ocorrências da janela analisada. */
  occurrences: readonly Occurrence[];
  weekly: WeeklyConsistency;
  bestDay: BestDay | null;
  bestTime: BestTime | null;
}

const pct = (n: number) => `${Math.round(n)}%`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const TONE_ORDER: Record<InsightTone, number> = { attention: 0, positive: 1, neutral: 2 };

export function buildInsights(ctx: InsightContext): Insight[] {
  const { summary: s, window } = ctx;
  const period = { from: window.from, to: window.to };
  const out: Insight[] = [];
  const add = (i: Omit<Insight, 'period' | 'commitmentId'> & { commitmentId?: string | null }) =>
    out.push({ commitmentId: null, ...i, period });

  if (!ctx.hasEnoughData) return out;

  // Sequência em andamento
  if (s.currentStreak >= THRESHOLDS.minStreakToCelebrate) {
    const record = s.currentStreak >= s.bestStreak && s.currentStreak >= 7;
    add({
      kind: 'streak',
      tone: 'positive',
      title: `Sequência de ${s.currentStreak} ${plural(s.currentStreak, 'dia', 'dias')}`,
      message: record
        ? 'Esta é a sua maior sequência até agora. Manter horários estáveis ajuda a consolidar o hábito.'
        : `Você cumpriu tudo o que estava previsto por ${s.currentStreak} dias seguidos.`,
      value: s.currentStreak
    });
  }

  // Sequência interrompida (só quando é o resultado mais recente)
  if (s.currentStreak === 0 && s.lastBrokenRun && s.lastBrokenRun.length >= THRESHOLDS.minRunToMournBreak) {
    const n = s.lastBrokenRun.length;
    add({
      kind: 'streak_broken',
      tone: 'neutral',
      title: `Sua sequência de ${n} ${plural(n, 'dia', 'dias')} foi interrompida`,
      message: 'Acontece com todo mundo. Retomar já no próximo dia previsto mantém isto como um tropeço, não como um novo padrão.',
      value: n
    });
  }

  // Taxa de conclusão
  {
    const rate = s.completionRate;
    const tone: InsightTone = rate >= 80 ? 'positive' : rate >= 50 ? 'neutral' : 'attention';
    const days = diffLabel(window.from, window.to);
    add({
      kind: 'completion_rate',
      tone,
      title: `Taxa de conclusão: ${pct(rate)}`,
      message:
        rate >= 80
          ? `Ótimo ritmo nos ${days}.`
          : rate >= 50
            ? `Mais da metade do que estava previsto foi cumprido nos ${days}.`
            : `Nos ${days} menos da metade foi cumprido. Reduzir a meta ou mudar o horário costuma ajudar.`,
      value: rate
    });
  }

  // Melhor e pior dia
  if (ctx.bestDay) {
    const { best, worst } = ctx.bestDay;
    add({
      kind: 'best_day',
      tone: 'neutral',
      title: `Seu melhor dia é ${WEEKDAY_NAMES_PT[best.weekday]}`,
      message: `Você cumpre ${pct(best.rate)} do previsto em ${WEEKDAY_NAMES_PT[best.weekday]}, contra ${pct(worst.rate)} em ${WEEKDAY_NAMES_PT[worst.weekday]}.`,
      value: best.weekday
    });
  }

  // Melhor horário
  if (ctx.bestTime) {
    const t = ctx.bestTime;
    add({
      kind: 'best_time',
      tone: 'neutral',
      title: `Você costuma registrar ${BUCKET_PHRASE_PT[t.bucket]}`,
      message: `${pct(t.share * 100)} dos seus registros acontecem ${BUCKET_PHRASE_PT[t.bucket]}, com pico por volta das ${t.peakHour}h.`,
      value: t.peakHour
    });
  }

  // Consistência semanal
  if (ctx.weekly.weeksCounted >= THRESHOLDS.minWeeksForWeeklyInsight) {
    const { weeksCounted: n, weeksOnTarget: on } = ctx.weekly;
    const tone: InsightTone = on / n >= 0.75 ? 'positive' : on / n >= 0.4 ? 'neutral' : 'attention';
    add({
      kind: 'weekly_consistency',
      tone,
      title: `${on} de ${n} semanas dentro da meta`,
      message: `Em ${on} das últimas ${n} semanas você cumpriu pelo menos 80% do previsto.`,
      value: on
    });
  }

  // Alertas diagnósticos
  if (s.coverage < THRESHOLDS.lowCoverage) {
    add({
      kind: 'low_coverage',
      tone: 'attention',
      title: 'Poucos registros no período',
      message: `Só ${pct(s.coverage)} do que estava previsto tem algum registro. Registrar na hora da execução deixa a análise mais fiel.`,
      value: s.coverage
    });
  }

  if (s.trend.hasBaseline && s.trend.delta < THRESHOLDS.sharpDecline) {
    add({
      kind: 'decline',
      tone: 'attention',
      title: 'Queda recente',
      message: `A conclusão caiu ${Math.abs(s.trend.delta)} pontos nos últimos 7 dias em relação à semana anterior. Proteger os hábitos mais simples por 3 dias costuma reerguer o ritmo.`,
      value: s.trend.delta
    });
  }

  if (s.variability > THRESHOLDS.highVariability) {
    add({
      kind: 'instability',
      tone: 'attention',
      title: 'Rotina instável',
      message: `O progresso diário oscila bastante (desvio de ${s.variability} pontos), alternando dias de alta entrega e dias parados.`,
      value: s.variability
    });
  }

  for (const c of ctx.commitments) {
    if (!c.isAtRisk) continue;
    const name = ctx.titles.get(c.commitmentId) ?? 'Compromisso';
    add({
      kind: 'at_risk',
      tone: 'attention',
      commitmentId: c.commitmentId,
      title: `Em risco: ${name}`,
      message: `A conclusão de "${name}" está em ${pct(c.completionRate)}. Considere reduzir a meta ou reservar um horário fixo.`,
      value: c.completionRate
    });
  }

  const conflict = weekdayConflict(ctx.occurrences);
  if (conflict) {
    add({
      kind: 'weekday_conflict',
      tone: 'attention',
      title: `Gargalo em ${WEEKDAY_NAMES_PT[conflict.weekday]}`,
      message: `${pct(conflict.share)} das falhas caem em ${WEEKDAY_NAMES_PT[conflict.weekday]}. Isso sugere conflito de agenda nesse dia, não falta de motivação geral.`,
      value: conflict.weekday
    });
  }

  // Atenção primeiro, depois conquistas, depois informativos (ordem estável dentro de cada grupo).
  return out
    .map((insight, index) => ({ insight, index }))
    .sort((a, b) => TONE_ORDER[a.insight.tone] - TONE_ORDER[b.insight.tone] || a.index - b.index)
    .map((x) => x.insight);
}

/**
 * Dia da semana com a maior parcela das falhas, se passar de 35% e houver pelo menos 4 falhas.
 * Mantém só o dia mais concentrado (o legado podia emitir vários alertas seguidos).
 */
export function weekdayConflict(occs: readonly Occurrence[]): { weekday: Weekday; share: number } | null {
  const failures = occs.filter((o) => o.scope === 'day' && o.resolved && !o.completed);
  if (failures.length < THRESHOLDS.weekdayConflictMinFailures) return null;
  const counts = new Map<Weekday, number>();
  for (const f of failures) {
    const wd = weekdayOf(f.date);
    counts.set(wd, (counts.get(wd) ?? 0) + 1);
  }
  let top: Weekday | null = null;
  let topCount = 0;
  for (const wd of [1, 2, 3, 4, 5, 6, 0] as const) {
    const n = counts.get(wd) ?? 0;
    if (n > topCount) {
      top = wd;
      topCount = n;
    }
  }
  if (top === null) return null;
  const share = (topCount / failures.length) * 100;
  return share >= THRESHOLDS.weekdayConflictShare ? { weekday: top, share } : null;
}

function diffLabel(from: LocalDate, to: LocalDate): string {
  return `últimos ${diffDays(from, to) + 1} dias`;
}
