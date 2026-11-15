/**
 * Validação de entrada do núcleo, compartilhada entre API e front.
 * Cada função devolve `{ ok: true, value }` ou `{ ok: false, field, error }`.
 */
import { isLocalDate } from './date';
import type {
  CommitmentKind,
  CommitmentStatus,
  EntrySource,
  IsoInstant,
  LocalDate,
  Measure,
  MeasureType,
  Recurrence,
  Weekday
} from './types';

export type Result<T> = { ok: true; value: T } | { ok: false; field: string; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (field: string, error: string): { ok: false; field: string; error: string } => ({ ok: false, field, error });

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const KINDS: readonly CommitmentKind[] = ['habit', 'task'];
const STATUSES: readonly CommitmentStatus[] = ['active', 'archived'];
const MEASURE_TYPES: readonly MeasureType[] = ['check', 'count', 'duration', 'quantity'];
const SOURCES: readonly EntrySource[] = ['tap', 'manual', 'timer', 'import'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseId(v: unknown, field = 'id'): Result<string> {
  return typeof v === 'string' && ID_RE.test(v) ? ok(v) : fail(field, 'Id inválido: use um UUID gerado no cliente.');
}

export function parseTitle(v: unknown): Result<string> {
  if (typeof v !== 'string') return fail('title', 'Título obrigatório.');
  const t = v.trim().replace(/\s+/g, ' ');
  if (t.length < 1 || t.length > 120) return fail('title', 'Título deve ter de 1 a 120 caracteres.');
  return ok(t);
}

export function parseKind(v: unknown): Result<CommitmentKind> {
  return KINDS.includes(v as CommitmentKind) ? ok(v as CommitmentKind) : fail('kind', "Tipo deve ser 'habit' ou 'task'.");
}

export function parseStatus(v: unknown): Result<CommitmentStatus> {
  return STATUSES.includes(v as CommitmentStatus) ? ok(v as CommitmentStatus) : fail('status', "Status deve ser 'active' ou 'archived'.");
}

export function parseMeasure(v: unknown): Result<Measure> {
  if (v === undefined) return ok({ type: 'check', target: 1, unit: null });
  if (!isObj(v)) return fail('measure', 'Medição inválida.');
  if (!MEASURE_TYPES.includes(v.type as MeasureType)) return fail('measure.type', 'Tipo de medição inválido.');
  const type = v.type as MeasureType;
  if (type === 'check') return ok({ type, target: 1, unit: null });
  const target = v.target;
  if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0 || target > 100000) {
    return fail('measure.target', 'Meta deve ser um número maior que zero.');
  }
  let unit: string | null = null;
  if (v.unit !== undefined && v.unit !== null) {
    if (typeof v.unit !== 'string' || v.unit.trim().length > 20) return fail('measure.unit', 'Unidade deve ter até 20 caracteres.');
    unit = v.unit.trim() || null;
  }
  return ok({ type, target, unit });
}

export function parseRecurrence(v: unknown, kind: CommitmentKind, today: LocalDate): Result<Recurrence> {
  if (v === undefined) return ok(kind === 'task' ? { freq: 'once', date: today } : { freq: 'daily' });
  if (!isObj(v)) return fail('recurrence', 'Recorrência inválida.');
  switch (v.freq) {
    case 'daily':
      return ok({ freq: 'daily' });
    case 'once':
      return isLocalDate(v.date) ? ok({ freq: 'once', date: v.date }) : fail('recurrence.date', 'Data deve estar no formato YYYY-MM-DD.');
    case 'weekdays': {
      const days = v.days;
      if (!Array.isArray(days) || days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
        return fail('recurrence.days', 'Informe ao menos um dia da semana (0 = domingo ... 6 = sábado).');
      }
      const unique = [...new Set(days as number[])].sort((a, b) => a - b) as Weekday[];
      return ok({ freq: 'weekdays', days: unique });
    }
    case 'weekly_count': {
      const count = v.count;
      if (!Number.isInteger(count) || (count as number) < 1 || (count as number) > 7) {
        return fail('recurrence.count', 'Vezes por semana deve ser de 1 a 7.');
      }
      return ok({ freq: 'weekly_count', count: count as number });
    }
    default:
      return fail('recurrence.freq', "Frequência deve ser 'daily', 'weekdays', 'weekly_count' ou 'once'.");
  }
}

export function parseLocalDate(v: unknown, field = 'date'): Result<LocalDate> {
  return isLocalDate(v) ? ok(v) : fail(field, 'Data deve estar no formato YYYY-MM-DD.');
}

export function parseInstant(v: unknown, field = 'recordedAt'): Result<IsoInstant> {
  if (typeof v !== 'string') return fail(field, 'Instante deve ser ISO 8601.');
  const t = Date.parse(v);
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}T/.test(v)) return fail(field, 'Instante deve ser ISO 8601.');
  return ok(new Date(t).toISOString());
}

export function parseEntryValue(v: unknown): Result<number> {
  if (v === undefined) return ok(1);
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100000 && v !== 0
    ? ok(v)
    : fail('value', 'Valor deve ser um número diferente de zero.');
}

export function parseNote(v: unknown): Result<string | null> {
  if (v === undefined || v === null || v === '') return ok(null);
  if (typeof v !== 'string' || v.length > 500) return fail('note', 'Nota deve ter até 500 caracteres.');
  return ok(v);
}

export function parseSource(v: unknown): Result<EntrySource> {
  if (v === undefined) return ok('tap');
  return SOURCES.includes(v as EntrySource) ? ok(v as EntrySource) : fail('source', 'Origem inválida.');
}

export function parsePosition(v: unknown): Result<number> {
  if (v === undefined) return ok(0);
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100000 ? ok(v as number) : fail('position', 'Posição inválida.');
}
