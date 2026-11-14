/**
 * Expansão do calendário: transforma compromissos + registros em ocorrências classificadas.
 *
 * Diferenças deliberadas em relação a engine/calculator.py (ver docs/04-engine-decisoes.md):
 * - O progresso do dia é a SOMA dos registros (contrato). O legado guardava um único check-in por
 *   hábito e dia, e o último vencia.
 * - Registros excluídos (`deletedAt`) e valores não positivos não contam.
 * - Dias da semana seguem só a convenção do domínio (0 = domingo). O legado aceitava 0..6 como
 *   domingo..sábado OU segunda..domingo ao mesmo tempo, o que fazia o dia 1 valer segunda e terça.
 * - `weekly_count` gera uma ocorrência por SEMANA (o legado o tratava como diário).
 * - "Pendente" (hoje não cumprido, semana em curso) não é falha.
 */
import { addDays } from '../date';
import { isDueOn } from '../schedule';
import type { Commitment, Entry, LocalDate } from '../types';
import type { Occurrence } from './types';
import { eachDay, weekStart } from './week';

const EPS = 1e-9;

export type DailyTotals = ReadonlyMap<LocalDate, number>;

/** commitmentId -> (data -> soma dos registros válidos do dia). */
export function totalsByCommitment(entries: readonly Entry[]): Map<string, Map<LocalDate, number>> {
  const out = new Map<string, Map<LocalDate, number>>();
  for (const e of entries) {
    if (e.deletedAt !== null && e.deletedAt !== undefined) continue;
    if (!Number.isFinite(e.value) || e.value <= 0) continue;
    let perDay = out.get(e.commitmentId);
    if (!perDay) {
      perDay = new Map();
      out.set(e.commitmentId, perDay);
    }
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.value);
  }
  return out;
}

export interface BuildInput {
  commitments: readonly Commitment[];
  entries: readonly Entry[];
  /** Primeiro dia considerado (inclusive). Compromissos só geram ocorrências a partir de `startDate`. */
  from: LocalDate;
  /** Último dia considerado (inclusive), normalmente `today`. */
  to: LocalDate;
  today: LocalDate;
  /** Padrão: compromissos arquivados ficam de fora, como `active = false` no legado. */
  includeArchived?: boolean;
}

function classify(completed: boolean, resolved: boolean, progress: number): Occurrence['status'] {
  if (completed) return 'done';
  if (!resolved) return 'pending';
  return progress > 0 ? 'partial' : 'missed';
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function buildOccurrences(input: BuildInput): Occurrence[] {
  const { commitments, entries, from, to, today, includeArchived = false } = input;
  const totals = totalsByCommitment(entries);
  const out: Occurrence[] = [];

  for (const c of commitments) {
    if (c.status !== 'active' && !includeArchived) continue;
    const perDay = totals.get(c.id) ?? new Map<LocalDate, number>();
    const dayTarget = c.measure.target > 0 ? c.measure.target : 1;
    const base = { commitmentId: c.id, categoryId: c.categoryId, kind: c.kind };

    if (c.recurrence.freq === 'weekly_count') {
      const needed = c.recurrence.count;
      const firstDay = from > c.startDate ? from : c.startDate;
      for (let wk = weekStart(firstDay); wk <= to; wk = addDays(wk, 7)) {
        const wkEnd = addDays(wk, 6);
        let progress = 0;
        for (const d of eachDay(wk, wkEnd < to ? wkEnd : to)) {
          if (d < c.startDate) continue;
          if ((perDay.get(d) ?? 0) >= dayTarget - EPS) progress++;
        }
        const completed = progress >= needed;
        // Semana em que o compromisso começou no meio: só conta se for cumprida.
        if (!completed && c.startDate > wk) continue;
        const resolved = completed || wkEnd < today;
        out.push({
          ...base,
          scope: 'week',
          date: wkEnd <= to ? wkEnd : to,
          target: needed,
          progress,
          ratio: clamp01(progress / needed),
          status: classify(completed, resolved, progress),
          completed,
          resolved
        });
      }
      continue;
    }

    const first = from > c.startDate ? from : c.startDate;
    for (const d of eachDay(first, to)) {
      // `isDueOn` exige status ativo; um arquivado incluído de propósito é tratado como ativo.
      if (!isDueOn({ status: 'active', startDate: c.startDate, recurrence: c.recurrence }, d)) continue;
      const progress = perDay.get(d) ?? 0;
      const completed = progress >= dayTarget - EPS;
      const resolved = completed || d < today;
      out.push({
        ...base,
        scope: 'day',
        date: d,
        target: dayTarget,
        progress,
        ratio: clamp01(progress / dayTarget),
        status: classify(completed, resolved, progress),
        completed,
        resolved
      });
    }
  }

  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.commitmentId < b.commitmentId ? -1 : 1));
}
