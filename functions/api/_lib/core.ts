/**
 * Infra compartilhada das rotas do núcleo (`/api/v1/*`): contexto tipado,
 * autenticação obrigatória por JWT, respostas JSON e mapeamento linha <-> domínio.
 */
import { isTimeZone, toLocalDate } from '../../../src/domain/date';
import type { Commitment, Entry, LocalDate, Recurrence, TimeZone } from '../../../src/domain/types';
import { getSecurityHeaders, jsonResponse } from './http.js';

// ---- D1 (subconjunto usado) ----
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
}
export interface D1RunResult {
  meta: { changes: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1RunResult>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface CoreCtx {
  request: Request;
  env: { DB?: D1Database; [k: string]: unknown };
  correlationId: string;
  url: URL;
  pathname: string;
  method: string;
  /** JSON original do corpo, sem a sanitização legada (o núcleo valida por campo). */
  rawBody: unknown;
  authClaims: { sub: string; role?: string; type?: string } | null;
}

export const DEFAULT_TIMEZONE: TimeZone = 'America/Sao_Paulo';

export function json(ctx: CoreCtx, data: unknown, status = 200): Response {
  return jsonResponse(data, status, ctx.correlationId, ctx.request);
}

export function noContent(ctx: CoreCtx): Response {
  return new Response(null, { status: 204, headers: getSecurityHeaders(ctx.correlationId, ctx.request) });
}

export function apiError(ctx: CoreCtx, status: number, error: string, field?: string): Response {
  return json(ctx, field ? { error, field } : { error }, status);
}

/** Usuário autenticado ou Response 401. Tokens de refresh não valem como acesso. */
export function requireUser(ctx: CoreCtx): { userId: string } | Response {
  const c = ctx.authClaims;
  if (!c || typeof c.sub !== 'string' || c.type === 'refresh') {
    return apiError(ctx, 401, 'Não autorizado: token JWT ausente, inválido ou expirado.');
  }
  return { userId: c.sub };
}

export function requireDb(ctx: CoreCtx): D1Database | Response {
  return ctx.env.DB ?? apiError(ctx, 503, 'Banco de dados indisponível.');
}

export function bodyObject(ctx: CoreCtx): Record<string, unknown> | null {
  const b = ctx.rawBody;
  return typeof b === 'object' && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
}

export async function getUserTimezone(db: D1Database, userId: string): Promise<TimeZone> {
  const row = await db.prepare('SELECT timezone FROM users WHERE id = ?').bind(userId).first<{ timezone: string | null }>();
  return row?.timezone && isTimeZone(row.timezone) ? row.timezone : DEFAULT_TIMEZONE;
}

export function todayFor(tz: TimeZone): LocalDate {
  return toLocalDate(new Date(), tz);
}

/** Rotina padrão do usuário (1 por usuário no MVP), criada sob demanda. */
export async function ensureDefaultRoutine(db: D1Database, userId: string): Promise<string> {
  const existing = await db
    .prepare('SELECT id FROM routines WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
    .bind(userId)
    .first<{ id: string }>();
  if (existing) return existing.id;
  const id = `rt_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO routines (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, userId, 'Minha rotina', now, now)
    .run();
  return id;
}

// ---- Mapeamento de linhas ----
export interface CommitmentRow {
  id: string;
  user_id: string;
  routine_id: string;
  kind: Commitment['kind'];
  title: string;
  category_id: string | null;
  measure_type: Commitment['measure']['type'];
  measure_target: number;
  measure_unit: string | null;
  recurrence: string;
  status: Commitment['status'];
  start_date: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function toCommitment(r: CommitmentRow): Commitment {
  return {
    id: r.id,
    userId: r.user_id,
    routineId: r.routine_id,
    kind: r.kind,
    title: r.title,
    categoryId: r.category_id,
    measure: { type: r.measure_type, target: Number(r.measure_target), unit: r.measure_unit },
    recurrence: JSON.parse(r.recurrence) as Recurrence,
    status: r.status,
    startDate: r.start_date,
    position: Number(r.position),
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export interface EntryRow {
  id: string;
  user_id: string;
  commitment_id: string;
  date: string;
  value: number;
  note: string | null;
  source: Entry['source'];
  recorded_at: string;
  created_at: string;
  deleted_at: string | null;
}

export function toEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    userId: r.user_id,
    commitmentId: r.commitment_id,
    date: r.date,
    value: Number(r.value),
    note: r.note,
    source: r.source,
    recordedAt: r.recorded_at,
    createdAt: r.created_at,
    deletedAt: r.deleted_at
  };
}
