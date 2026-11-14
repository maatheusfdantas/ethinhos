/** Fábricas para os testes da engine. Não é importado pelo app. */
import { addDays } from '../date';
import type { Commitment, Entry, EntrySource, LocalDate, Measure, Recurrence } from '../types';

export function commitment(id: string, over: Partial<Commitment> = {}): Commitment {
  return {
    id,
    userId: 'u1',
    routineId: 'r1',
    kind: 'habit',
    title: id,
    categoryId: null,
    measure: { type: 'check', target: 1, unit: null },
    recurrence: { freq: 'daily' },
    status: 'active',
    startDate: '2026-01-01',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over
  };
}

export const measure = (type: Measure['type'], target: number, unit: string | null = null): Measure => ({ type, target, unit });
export const rec = (r: Recurrence): Recurrence => r;

let seq = 0;
export function entry(commitmentId: string, date: LocalDate, value = 1, over: Partial<Entry> = {}): Entry {
  seq++;
  return {
    id: `e${seq}`,
    userId: 'u1',
    commitmentId,
    date,
    value,
    note: null,
    source: 'tap' as EntrySource,
    recordedAt: `${date}T12:00:00.000Z`,
    createdAt: `${date}T12:00:00.000Z`,
    deletedAt: null,
    ...over
  };
}

/** Um registro de valor `value` para cada data. */
export const entriesOn = (commitmentId: string, dates: readonly LocalDate[], value = 1) =>
  dates.map((d) => entry(commitmentId, d, value));

/**
 * Registros a partir de um padrão: cada caractere é um dia a partir de `from`.
 * '1' = cumprido (um registro de valor 1), qualquer outro = sem registro. Ex.: mark('h', '2026-10-01', '1101').
 */
export const mark = (commitmentId: string, from: LocalDate, pattern: string, value = 1) =>
  [...pattern].flatMap((ch, i) => (ch === '1' ? [entry(commitmentId, addDays(from, i), value)] : []));

/** `n` datas consecutivas a partir de `from`. */
export const days = (from: LocalDate, n: number): LocalDate[] => Array.from({ length: n }, (_, i) => addDays(from, i));
