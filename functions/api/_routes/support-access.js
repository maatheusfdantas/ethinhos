/**
 * Acesso de suporte consentido e temporário (decisão do usuário, 14/11/2026: opção A).
 *
 * O admin NÃO lê dados de outras contas (o guard não abre mais exceção para ele).
 * Quando um atendimento precisa, o próprio cliente libera, a partir de um chamado dele, leitura
 * temporária de áreas específicas. Cada visualização fica registrada e visível para o cliente,
 * que pode revogar a qualquer momento.
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { jsonResponse } from '../_lib/http.js';

export const SUPPORT_SCOPES = {
  habitos: 'Hábitos',
  agenda: 'Agenda',
  treinos: 'Treinos',
  saude: 'Saúde (peso, altura, objetivo, água e sono)',
  notas: 'Notas'
};
export const SUPPORT_HOURS = [1, 24, 72];

const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const isActive = (g, nowIso) => !g.revoked_at && g.expires_at > nowIso;

async function scopedData(db, userId, scopes) {
  const out = {};
  const user = await db.prepare('SELECT name, username, weight, height, workouts_json, post_its FROM users WHERE id = ?').bind(userId).first();
  out.conta = { nome: user?.name || '', usuario: user?.username || '' }; // identificação mínima, sem e-mail
  if (scopes.includes('habitos')) {
    out.habitos = ((await db.prepare('SELECT title, category, target, current, unit, completed, repeat_days FROM habits WHERE user_id = ?').bind(userId).all()).results || []);
  }
  if (scopes.includes('agenda')) {
    out.agenda = ((await db.prepare('SELECT title, date, start_time, end_time, all_day, category, completed FROM events WHERE user_id = ? ORDER BY date DESC LIMIT 200').bind(userId).all()).results || []);
  }
  if (scopes.includes('treinos')) out.treinos = parseJson(user?.workouts_json, []);
  if (scopes.includes('notas')) out.notas = parseJson(user?.post_its, []);
  if (scopes.includes('saude')) {
    let profile = null; let water = null;
    try { profile = await db.prepare('SELECT goal, activity_level, birth_date FROM user_health_profile WHERE user_id = ?').bind(userId).first(); } catch { /* tabela opcional */ }
    try { water = await db.prepare('SELECT water_glasses, water_target, sleep_bed_time, sleep_wake_time FROM health WHERE user_id = ?').bind(userId).first(); } catch { /* tabela opcional */ }
    out.saude = { peso: user?.weight ?? null, altura: user?.height ?? null, perfil: profile || null, aguaESono: water || null };
  }
  return out;
}

export async function handleSupportAccessRoutes(ctx) {
  const { request, correlationId, clientIp, userAgent, pathname, method, body, storage, authClaims } = ctx;
  if (!pathname.startsWith('/api/support-access') && !pathname.startsWith('/api/admin/support-access')) return null;
  if (!authClaims) return jsonResponse({ error: 'Entre na sua conta.' }, 401, correlationId, request);
  if (storage.mode !== 'd1') return jsonResponse({ error: 'Indisponível no momento.' }, 503, correlationId, request);
  const db = storage.db; const me = authClaims.sub; const nowIso = new Date().toISOString();

  /* ------------------------- cliente ------------------------- */
  if (pathname === '/api/support-access' && method === 'GET') {
    const rows = (await db.prepare('SELECT id, ticket_id, scopes, expires_at, revoked_at, created_at, view_count, last_viewed_at FROM support_access_grants WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(me).all()).results || [];
    return jsonResponse({ grants: rows.map((g) => ({ ...g, scopes: parseJson(g.scopes, []), active: isActive(g, nowIso) })), scopes: SUPPORT_SCOPES, hours: SUPPORT_HOURS }, 200, correlationId, request);
  }

  if (pathname === '/api/support-access' && method === 'POST') {
    const ticketId = String(body.ticketId || '');
    const scopes = Array.isArray(body.scopes) ? [...new Set(body.scopes.map(String))] : [];
    const hours = Number(body.hours);
    if (!scopes.length || scopes.some((s) => !SUPPORT_SCOPES[s])) return jsonResponse({ error: 'Escolha ao menos uma área válida.' }, 400, correlationId, request);
    if (!SUPPORT_HOURS.includes(hours)) return jsonResponse({ error: 'Duração inválida.' }, 400, correlationId, request);
    const ticket = await db.prepare('SELECT id, user_id, status FROM support_tickets WHERE id = ?').bind(ticketId).first();
    if (!ticket || ticket.user_id !== me) return jsonResponse({ error: 'Chamado não encontrado.' }, 404, correlationId, request);
    const id = `sag_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString();
    await db.prepare('INSERT INTO support_access_grants (id, user_id, ticket_id, scopes, expires_at, revoked_at, created_at, view_count, last_viewed_at) VALUES (?, ?, ?, ?, ?, NULL, ?, 0, NULL)')
      .bind(id, me, ticketId, JSON.stringify(scopes), expiresAt, nowIso).run();
    await recordAuditLogEdge(storage, { eventType: 'SUPPORT_ACCESS_GRANTED', userId: me, ipAddress: clientIp, userAgent, metadata: { grantId: id, ticketId, scopes, hours }, correlationId });
    return jsonResponse({ success: true, grant: { id, ticket_id: ticketId, scopes, expires_at: expiresAt, active: true, view_count: 0 } }, 201, correlationId, request);
  }

  const revoke = pathname.match(/^\/api\/support-access\/([^/]+)$/);
  if (revoke && method === 'DELETE') {
    const g = await db.prepare('SELECT id, user_id FROM support_access_grants WHERE id = ?').bind(revoke[1]).first();
    if (!g || g.user_id !== me) return jsonResponse({ error: 'Acesso não encontrado.' }, 404, correlationId, request);
    await db.prepare('UPDATE support_access_grants SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?').bind(nowIso, g.id).run();
    await recordAuditLogEdge(storage, { eventType: 'SUPPORT_ACCESS_REVOKED', userId: me, ipAddress: clientIp, userAgent, metadata: { grantId: g.id }, correlationId });
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  /* ------------------------- admin (o guard já exige papel admin em /api/admin/*) ------------------------- */
  if (pathname === '/api/admin/support-access' && method === 'GET') {
    const rows = (await db.prepare('SELECT id, user_id, ticket_id, scopes, expires_at, revoked_at, created_at, view_count, last_viewed_at FROM support_access_grants ORDER BY created_at DESC LIMIT 100').all()).results || [];
    return jsonResponse({ grants: rows.map((g) => ({ ...g, scopes: parseJson(g.scopes, []), active: isActive(g, nowIso) })), scopes: SUPPORT_SCOPES }, 200, correlationId, request);
  }

  const view = pathname.match(/^\/api\/admin\/support-access\/([^/]+)\/data$/);
  if (view && method === 'GET') {
    const g = await db.prepare('SELECT * FROM support_access_grants WHERE id = ?').bind(view[1]).first();
    if (!g) return jsonResponse({ error: 'Acesso não encontrado.' }, 404, correlationId, request);
    if (!isActive(g, nowIso)) return jsonResponse({ error: 'Este acesso expirou ou foi revogado pelo cliente.' }, 403, correlationId, request);
    const scopes = parseJson(g.scopes, []);
    const data = await scopedData(db, g.user_id, scopes);
    await db.prepare('UPDATE support_access_grants SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?').bind(nowIso, g.id).run();
    await recordAuditLogEdge(storage, { eventType: 'SUPPORT_DATA_VIEWED', userId: g.user_id, ipAddress: clientIp, userAgent, metadata: { grantId: g.id, viewer: me, scopes }, correlationId });
    return jsonResponse({ grant: { id: g.id, ticket_id: g.ticket_id, scopes, expires_at: g.expires_at }, data }, 200, correlationId, request);
  }

  return null;
}
