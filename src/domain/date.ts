import type { IsoInstant, LocalDate, TimeZone } from './types';

const LOCAL_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** `true` se `value` é uma data `YYYY-MM-DD` válida de calendário. */
export function isLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !LOCAL_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** `true` se `tz` é um fuso IANA reconhecido pelo runtime. */
export function isTimeZone(tz: unknown): tz is TimeZone {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Data local (`YYYY-MM-DD`) de um instante em um fuso. */
export function toLocalDate(instant: Date | IsoInstant | number, tz: TimeZone): LocalDate {
  const date = instant instanceof Date ? instant : new Date(instant);
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

/** Hora local (0..23) de um instante em um fuso. */
export function localHour(instant: Date | IsoInstant | number, tz: TimeZone): number {
  const date = instant instanceof Date ? instant : new Date(instant);
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(date);
  return Number(hour) % 24;
}

/** Soma `days` dias a uma data local (aritmética de calendário, sem fuso). */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Número de dias de `from` até `to` (pode ser negativo). */
export function diffDays(from: LocalDate, to: LocalDate): number {
  const toUtc = (s: LocalDate) => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}
