/**
 * Semanas e progresso semanal.
 * A semana vai de SEGUNDA a DOMINGO (ISO 8601), como combinado no contrato da tela Hoje.
 * Decisão de produto ainda por confirmar com o usuário; mudar aqui muda toda a engine.
 */
import { addDays } from '../date';
import { weekdayOf } from '../schedule';
import type { Commitment, LocalDate } from '../types';

export const WEEK_STARTS_ON_MONDAY = true;

/** Segunda-feira da semana que contém `date`. */
export function weekStart(date: LocalDate): LocalDate {
  const sinceMonday = (weekdayOf(date) + 6) % 7; // segunda = 0 ... domingo = 6
  return addDays(date, -sinceMonday);
}

/** Domingo da semana que contém `date`. */
export function weekEnd(date: LocalDate): LocalDate {
  return addDays(weekStart(date), 6);
}

export function weekRange(date: LocalDate): { from: LocalDate; to: LocalDate } {
  const from = weekStart(date);
  return { from, to: addDays(from, 6) };
}

/** Datas de `from` a `to`, inclusive. Vazio se `from > to`. */
export function eachDay(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const EPS = 1e-9;

/** Progresso semanal de um compromisso `weekly_count`, no formato do contrato `DayItem.period`. */
export interface WeeklyPeriod {
  kind: 'week';
  from: LocalDate;
  to: LocalDate;
  /** Dias distintos da semana em que a meta diária foi cumprida. */
  progress: number;
  /** Quantos dias a semana pede (`recurrence.count`). */
  target: number;
  done: boolean;
}

/**
 * `dailyTotals`: soma dos registros por dia deste compromisso (registros excluídos já fora).
 * Devolve `null` para compromissos que não são `weekly_count`.
 * Só contam dias a partir de `startDate`.
 */
export function weeklyPeriod(
  commitment: Pick<Commitment, 'recurrence' | 'measure' | 'startDate'>,
  dailyTotals: ReadonlyMap<LocalDate, number>,
  date: LocalDate
): WeeklyPeriod | null {
  if (commitment.recurrence.freq !== 'weekly_count') return null;
  const { from, to } = weekRange(date);
  const dayTarget = commitment.measure.target > 0 ? commitment.measure.target : 1;
  let progress = 0;
  for (const d of eachDay(from, to)) {
    if (d < commitment.startDate) continue;
    if ((dailyTotals.get(d) ?? 0) >= dayTarget - EPS) progress++;
  }
  const target = commitment.recurrence.count;
  return { kind: 'week', from, to, progress, target, done: progress >= target };
}
