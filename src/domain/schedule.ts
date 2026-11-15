import type { Commitment, LocalDate, Weekday } from './types';

/** Dia da semana (0 = domingo) de uma data local, sem depender do fuso do runtime. */
export function weekdayOf(date: LocalDate): Weekday {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/**
 * O compromisso aparece na lista desse dia?
 * - Precisa estar ativo e já ter começado (`startDate <= date`).
 * - `weekly_count` aparece todos os dias (o usuário escolhe em quais cumprir).
 */
export function isDueOn(c: Pick<Commitment, 'status' | 'startDate' | 'recurrence'>, date: LocalDate): boolean {
  if (c.status !== 'active') return false;
  if (date < c.startDate) return false;
  const r = c.recurrence;
  switch (r.freq) {
    case 'once':
      return r.date === date;
    case 'daily':
    case 'weekly_count':
      return true;
    case 'weekdays':
      return r.days.includes(weekdayOf(date));
  }
}
