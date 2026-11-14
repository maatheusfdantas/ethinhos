/**
 * Núcleo — Rotina: configurações do usuário (fuso) e CRUD de compromissos.
 *
 *   GET    /api/v1/me/settings            -> { timezone }
 *   PUT    /api/v1/me/settings            { timezone }
 *   GET    /api/v1/commitments?status=    -> { commitments }   (active | archived | all; padrão active)
 *   POST   /api/v1/commitments            -> 201 criado | 200 já existia (idempotente pelo id do cliente)
 *   PATCH  /api/v1/commitments/:id        atualização parcial
 *   DELETE /api/v1/commitments/:id        exclusão definitiva (apaga os registros); para manter
 *                                         o histórico, use PATCH { status: 'archived' }
 */
import { isTimeZone } from '../../../src/domain/date';
import type { Commitment } from '../../../src/domain/types';
import {
  parseId,
  parseKind,
  parseLocalDate,
  parseMeasure,
  parsePosition,
  parseRecurrence,
  parseStatus,
  parseTitle,
  type Result
} from '../../../src/domain/validate';
import {
  apiError,
  bodyObject,
  type CommitmentRow,
  type CoreCtx,
  type D1Database,
  ensureDefaultRoutine,
  getUserTimezone,
  json,
  noContent,
  requireDb,
  requireUser,
  todayFor,
  toCommitment
} from '../_lib/core';

const COMMITMENT_PATH = /^\/api\/v1\/commitments\/([^/]+)$/;

export async function handleRoutineRoutes(ctx: CoreCtx): Promise<Response | null> {
  const { pathname, method } = ctx;
  const isSettings = pathname === '/api/v1/me/settings';
  const isCollection = pathname === '/api/v1/commitments';
  const itemMatch = pathname.match(COMMITMENT_PATH);
  if (!isSettings && !isCollection && !itemMatch) return null;

  const auth = requireUser(ctx);
  if (auth instanceof Response) return auth;
  const db = requireDb(ctx);
  if (db instanceof Response) return db;
  const { userId } = auth;

  if (isSettings && method === 'GET') return getSettings(ctx, db, userId);
  if (isSettings && method === 'PUT') return putSettings(ctx, db, userId);
  if (isCollection && method === 'GET') return listCommitments(ctx, db, userId);
  if (isCollection && method === 'POST') return createCommitment(ctx, db, userId);
  if (itemMatch && method === 'PATCH') return updateCommitment(ctx, db, userId, itemMatch[1]!);
  if (itemMatch && method === 'DELETE') return deleteCommitment(ctx, db, userId, itemMatch[1]!);
  return apiError(ctx, 405, 'Método não permitido.');
}

// ---- Configurações ----
async function getSettings(ctx: CoreCtx, db: D1Database, userId: string) {
  return json(ctx, { timezone: await getUserTimezone(db, userId) });
}

async function putSettings(ctx: CoreCtx, db: D1Database, userId: string) {
  const tz = bodyObject(ctx)?.timezone;
  if (!isTimeZone(tz)) return apiError(ctx, 422, 'Fuso inválido: use um identificador IANA, ex.: America/Sao_Paulo.', 'timezone');
  await db.prepare('UPDATE users SET timezone = ? WHERE id = ?').bind(tz, userId).run();
  return json(ctx, { timezone: tz });
}

// ---- Compromissos ----
async function loadCommitment(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM commitments WHERE id = ?').bind(id).first<CommitmentRow>();
}

async function categoryBelongsTo(db: D1Database, categoryId: string, userId: string) {
  const row = await db.prepare('SELECT id FROM core_categories WHERE id = ? AND user_id = ?').bind(categoryId, userId).first();
  return row !== null;
}

function reject(ctx: CoreCtx, r: Extract<Result<unknown>, { ok: false }>) {
  return apiError(ctx, 422, r.error, r.field);
}

async function listCommitments(ctx: CoreCtx, db: D1Database, userId: string) {
  const status = ctx.url.searchParams.get('status') || 'active';
  if (!['active', 'archived', 'all'].includes(status)) return apiError(ctx, 422, "status deve ser 'active', 'archived' ou 'all'.", 'status');
  const stmt =
    status === 'all'
      ? db.prepare('SELECT * FROM commitments WHERE user_id = ? ORDER BY position ASC, created_at ASC').bind(userId)
      : db.prepare('SELECT * FROM commitments WHERE user_id = ? AND status = ? ORDER BY position ASC, created_at ASC').bind(userId, status);
  const { results } = await stmt.all<CommitmentRow>();
  return json(ctx, { commitments: results.map(toCommitment) });
}

async function createCommitment(ctx: CoreCtx, db: D1Database, userId: string) {
  const b = bodyObject(ctx);
  if (!b) return apiError(ctx, 400, 'Corpo JSON obrigatório.');

  const id = parseId(b.id);
  if (!id.ok) return reject(ctx, id);

  // Idempotência: o mesmo id reenviado devolve o que já existe, sem duplicar.
  const existing = await loadCommitment(db, id.value);
  if (existing) {
    if (existing.user_id !== userId) return apiError(ctx, 409, 'Id já utilizado.', 'id');
    return json(ctx, { commitment: toCommitment(existing), created: false }, 200);
  }

  const tz = await getUserTimezone(db, userId);
  const today = todayFor(tz);
  const kind = parseKind(b.kind ?? 'habit');
  if (!kind.ok) return reject(ctx, kind);
  const title = parseTitle(b.title);
  if (!title.ok) return reject(ctx, title);
  const measure = parseMeasure(b.measure);
  if (!measure.ok) return reject(ctx, measure);
  const recurrence = parseRecurrence(b.recurrence, kind.value, today);
  if (!recurrence.ok) return reject(ctx, recurrence);
  const startDate = b.startDate === undefined ? parseLocalDate(today) : parseLocalDate(b.startDate, 'startDate');
  if (!startDate.ok) return reject(ctx, startDate);
  const position = parsePosition(b.position);
  if (!position.ok) return reject(ctx, position);

  let categoryId: string | null = null;
  if (b.categoryId !== undefined && b.categoryId !== null) {
    if (typeof b.categoryId !== 'string' || !(await categoryBelongsTo(db, b.categoryId, userId))) {
      return apiError(ctx, 422, 'Categoria não encontrada.', 'categoryId');
    }
    categoryId = b.categoryId;
  }

  const routineId = await ensureDefaultRoutine(db, userId);
  const now = new Date().toISOString();

  const res = await db
    .prepare(
      `INSERT INTO commitments (id, user_id, routine_id, kind, title, category_id, measure_type, measure_target, measure_unit,
         recurrence, status, start_date, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
       ON CONFLICT(id) DO NOTHING`
    )
    .bind(
      id.value, userId, routineId, kind.value, title.value, categoryId,
      measure.value.type, measure.value.target, measure.value.unit,
      JSON.stringify(recurrence.value), startDate.value, position.value, now, now
    )
    .run();

  const row = (await loadCommitment(db, id.value))!;
  if (row.user_id !== userId) return apiError(ctx, 409, 'Id já utilizado.', 'id');
  const created = res.meta.changes === 1;
  return json(ctx, { commitment: toCommitment(row), created }, created ? 201 : 200);
}

async function updateCommitment(ctx: CoreCtx, db: D1Database, userId: string, id: string) {
  const row = await loadCommitment(db, id);
  if (!row || row.user_id !== userId) return apiError(ctx, 404, 'Compromisso não encontrado.');
  const b = bodyObject(ctx);
  if (!b) return apiError(ctx, 400, 'Corpo JSON obrigatório.');

  const current = toCommitment(row);
  const next: Commitment = { ...current };

  if (b.title !== undefined) {
    const r = parseTitle(b.title);
    if (!r.ok) return reject(ctx, r);
    next.title = r.value;
  }
  if (b.measure !== undefined) {
    const r = parseMeasure(b.measure);
    if (!r.ok) return reject(ctx, r);
    next.measure = r.value;
  }
  if (b.recurrence !== undefined) {
    const r = parseRecurrence(b.recurrence, current.kind, current.startDate);
    if (!r.ok) return reject(ctx, r);
    next.recurrence = r.value;
  }
  if (b.status !== undefined) {
    const r = parseStatus(b.status);
    if (!r.ok) return reject(ctx, r);
    next.status = r.value;
  }
  if (b.startDate !== undefined) {
    const r = parseLocalDate(b.startDate, 'startDate');
    if (!r.ok) return reject(ctx, r);
    next.startDate = r.value;
  }
  if (b.position !== undefined) {
    const r = parsePosition(b.position);
    if (!r.ok) return reject(ctx, r);
    next.position = r.value;
  }
  if (b.categoryId !== undefined) {
    if (b.categoryId === null) next.categoryId = null;
    else if (typeof b.categoryId !== 'string' || !(await categoryBelongsTo(db, b.categoryId, userId))) {
      return apiError(ctx, 422, 'Categoria não encontrada.', 'categoryId');
    } else next.categoryId = b.categoryId;
  }

  next.updatedAt = new Date().toISOString();
  await db
    .prepare(
      `UPDATE commitments SET title = ?, category_id = ?, measure_type = ?, measure_target = ?, measure_unit = ?,
         recurrence = ?, status = ?, start_date = ?, position = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      next.title, next.categoryId, next.measure.type, next.measure.target, next.measure.unit,
      JSON.stringify(next.recurrence), next.status, next.startDate, next.position, next.updatedAt,
      id, userId
    )
    .run();
  return json(ctx, { commitment: next });
}

async function deleteCommitment(ctx: CoreCtx, db: D1Database, userId: string, id: string) {
  // Idempotente: apagar o que já não existe também responde 204.
  await db.prepare('DELETE FROM commitments WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return noContent(ctx);
}
