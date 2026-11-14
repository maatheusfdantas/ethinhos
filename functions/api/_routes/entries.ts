/**
 * Núcleo — Registros (entries) e visão do dia.
 *
 *   POST   /api/v1/entries                 -> 201 criado | 200 já existia (idempotente pelo id do cliente)
 *          { id, commitmentId, value?, date?, recordedAt?, note?, source? }
 *          Sem `date`, a data local é calculada a partir de `recordedAt` (ou agora) no fuso do usuário.
 *   DELETE /api/v1/entries/:id             desfaz (exclusão lógica, idempotente) -> 204
 *   GET    /api/v1/entries?from=&to=       registros não excluídos no intervalo (máx. 366 dias)
 *   GET    /api/v1/day?date=               compromissos devidos no dia + progresso (padrão: hoje no fuso do usuário)
 */
import { diffDays, toLocalDate } from '../../../src/domain/date';
import { isDueOn } from '../../../src/domain/schedule';
import type { Commitment, Entry, LocalDate } from '../../../src/domain/types';
import {
  parseEntryValue,
  parseId,
  parseInstant,
  parseLocalDate,
  parseNote,
  parseSource,
  type Result
} from '../../../src/domain/validate';
import {
  apiError,
  bodyObject,
  type CommitmentRow,
  type CoreCtx,
  type D1Database,
  type EntryRow,
  getUserTimezone,
  json,
  noContent,
  requireDb,
  requireUser,
  todayFor,
  toCommitment,
  toEntry
} from '../_lib/core';

const ENTRY_PATH = /^\/api\/v1\/entries\/([^/]+)$/;
const MAX_RANGE_DAYS = 366;

export async function handleEntriesRoutes(ctx: CoreCtx): Promise<Response | null> {
  const { pathname, method } = ctx;
  const isCollection = pathname === '/api/v1/entries';
  const isDay = pathname === '/api/v1/day';
  const itemMatch = pathname.match(ENTRY_PATH);
  if (!isCollection && !isDay && !itemMatch) return null;

  const auth = requireUser(ctx);
  if (auth instanceof Response) return auth;
  const db = requireDb(ctx);
  if (db instanceof Response) return db;
  const { userId } = auth;

  if (isCollection && method === 'POST') return createEntry(ctx, db, userId);
  if (isCollection && method === 'GET') return listEntries(ctx, db, userId);
  if (itemMatch && method === 'DELETE') return deleteEntry(ctx, db, userId, itemMatch[1]!);
  if (isDay && method === 'GET') return getDay(ctx, db, userId);
  return apiError(ctx, 405, 'Método não permitido.');
}

function reject(ctx: CoreCtx, r: Extract<Result<unknown>, { ok: false }>) {
  return apiError(ctx, 422, r.error, r.field);
}

async function loadEntry(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first<EntryRow>();
}

async function createEntry(ctx: CoreCtx, db: D1Database, userId: string) {
  const b = bodyObject(ctx);
  if (!b) return apiError(ctx, 400, 'Corpo JSON obrigatório.');

  const id = parseId(b.id);
  if (!id.ok) return reject(ctx, id);

  // Idempotência: reenviar o mesmo id (retentativa, fila offline) não duplica.
  const existing = await loadEntry(db, id.value);
  if (existing) {
    if (existing.user_id !== userId) return apiError(ctx, 409, 'Id já utilizado.', 'id');
    return json(ctx, { entry: toEntry(existing), created: false }, 200);
  }

  const commitmentId = parseId(b.commitmentId, 'commitmentId');
  if (!commitmentId.ok) return reject(ctx, commitmentId);
  const commitment = await db
    .prepare('SELECT id FROM commitments WHERE id = ? AND user_id = ?')
    .bind(commitmentId.value, userId)
    .first();
  if (!commitment) return apiError(ctx, 404, 'Compromisso não encontrado.', 'commitmentId');

  const value = parseEntryValue(b.value);
  if (!value.ok) return reject(ctx, value);
  const note = parseNote(b.note);
  if (!note.ok) return reject(ctx, note);
  const source = parseSource(b.source);
  if (!source.ok) return reject(ctx, source);

  const now = new Date().toISOString();
  const recordedAt = b.recordedAt === undefined ? parseInstant(now) : parseInstant(b.recordedAt);
  if (!recordedAt.ok) return reject(ctx, recordedAt);

  let date: LocalDate;
  if (b.date !== undefined) {
    const d = parseLocalDate(b.date);
    if (!d.ok) return reject(ctx, d);
    date = d.value;
  } else {
    // Virada do dia pelo fuso do usuário, não pelo UTC do servidor.
    date = toLocalDate(recordedAt.value, await getUserTimezone(db, userId));
  }

  const res = await db
    .prepare(
      `INSERT INTO entries (id, user_id, commitment_id, date, value, note, source, recorded_at, created_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(id) DO NOTHING`
    )
    .bind(id.value, userId, commitmentId.value, date, value.value, note.value, source.value, recordedAt.value, now)
    .run();

  const row = (await loadEntry(db, id.value))!;
  if (row.user_id !== userId) return apiError(ctx, 409, 'Id já utilizado.', 'id');
  const created = res.meta.changes === 1;
  return json(ctx, { entry: toEntry(row), created }, created ? 201 : 200);
}

async function deleteEntry(ctx: CoreCtx, db: D1Database, userId: string, id: string) {
  const row = await loadEntry(db, id);
  if (row && row.user_id !== userId) return apiError(ctx, 404, 'Registro não encontrado.');
  if (row && !row.deleted_at) {
    await db
      .prepare('UPDATE entries SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(new Date().toISOString(), id, userId)
      .run();
  }
  return noContent(ctx);
}

async function listEntries(ctx: CoreCtx, db: D1Database, userId: string) {
  const from = parseLocalDate(ctx.url.searchParams.get('from'), 'from');
  if (!from.ok) return reject(ctx, from);
  const to = parseLocalDate(ctx.url.searchParams.get('to'), 'to');
  if (!to.ok) return reject(ctx, to);
  const span = diffDays(from.value, to.value);
  if (span < 0) return apiError(ctx, 422, "'from' deve ser anterior ou igual a 'to'.", 'from');
  if (span >= MAX_RANGE_DAYS) return apiError(ctx, 422, `Intervalo máximo de ${MAX_RANGE_DAYS} dias.`, 'to');

  const { results } = await db
    .prepare(
      `SELECT * FROM entries WHERE user_id = ? AND date BETWEEN ? AND ? AND deleted_at IS NULL
       ORDER BY date ASC, recorded_at ASC`
    )
    .bind(userId, from.value, to.value)
    .all<EntryRow>();
  return json(ctx, { from: from.value, to: to.value, entries: results.map(toEntry) });
}

export interface DayItem {
  commitment: Commitment;
  progress: number;
  target: number;
  done: boolean;
  entries: Entry[];
}

async function getDay(ctx: CoreCtx, db: D1Database, userId: string) {
  const timezone = await getUserTimezone(db, userId);
  const rawDate = ctx.url.searchParams.get('date');
  let date: LocalDate;
  if (rawDate === null) date = todayFor(timezone);
  else {
    const d = parseLocalDate(rawDate);
    if (!d.ok) return reject(ctx, d);
    date = d.value;
  }

  const [commitmentsRes, entriesRes] = await Promise.all([
    db
      .prepare(`SELECT * FROM commitments WHERE user_id = ? AND status = 'active' ORDER BY position ASC, created_at ASC`)
      .bind(userId)
      .all<CommitmentRow>(),
    db
      .prepare(`SELECT * FROM entries WHERE user_id = ? AND date = ? AND deleted_at IS NULL ORDER BY recorded_at ASC`)
      .bind(userId, date)
      .all<EntryRow>()
  ]);

  const entriesByCommitment = new Map<string, Entry[]>();
  for (const e of entriesRes.results.map(toEntry)) {
    const list = entriesByCommitment.get(e.commitmentId) ?? [];
    list.push(e);
    entriesByCommitment.set(e.commitmentId, list);
  }

  const items: DayItem[] = commitmentsRes.results
    .map(toCommitment)
    .filter((c) => isDueOn(c, date))
    .map((c) => {
      const entries = entriesByCommitment.get(c.id) ?? [];
      const progress = entries.reduce((sum, e) => sum + e.value, 0);
      return { commitment: c, progress, target: c.measure.target, done: progress >= c.measure.target, entries };
    });

  return json(ctx, { date, timezone, items });
}
