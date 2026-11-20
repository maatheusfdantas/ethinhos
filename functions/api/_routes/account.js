/**
 * Conta do próprio usuário: perfil de saúde (privado), exportação dos dados e exclusão da conta.
 * Todas as rotas usam SÓ a identidade do token (sem id na URL): nem o admin lê a saúde de outra pessoa por aqui.
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { authenticateRequestEdge, verifyPasswordEdge } from '../_lib/auth.js';
import { jsonResponse } from '../_lib/http.js';
import { normalizeUsername } from '../../../src/domain/credentials.js';
import { eraseUserData } from '../_lib/erase.js';

export const HEALTH_GOALS = ['perder_peso', 'manter', 'ganhar_massa', 'condicionamento', 'sono', 'outro'];
export const ACTIVITY_LEVELS = ['sedentario', 'leve', 'moderado', 'intenso'];

const asNumber = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/** Valida o corpo de PUT /api/account/health. Devolve { error } ou { value }. */
export function parseHealth(body) {
  const out = {};
  if (body.weight !== undefined) {
    const w = asNumber(body.weight);
    if (w !== null && (!Number.isFinite(w) || w < 20 || w > 400)) return { error: 'Peso deve estar entre 20 e 400 kg.' };
    out.weight = w;
  }
  if (body.height !== undefined) {
    let h = asNumber(body.height);
    if (h !== null && h > 3) h = h / 100; // veio em centímetros
    if (h !== null && (!Number.isFinite(h) || h < 0.5 || h > 2.5)) return { error: 'Altura deve estar entre 50 e 250 cm.' };
    out.height = h === null ? null : Math.round(h * 100) / 100;
  }
  if (body.goal !== undefined) {
    if (body.goal !== '' && !HEALTH_GOALS.includes(body.goal)) return { error: 'Objetivo inválido.' };
    out.goal = body.goal || null;
  }
  if (body.activityLevel !== undefined) {
    if (body.activityLevel !== '' && !ACTIVITY_LEVELS.includes(body.activityLevel)) return { error: 'Nível de atividade inválido.' };
    out.activityLevel = body.activityLevel || null;
  }
  if (body.birthDate !== undefined) {
    if (body.birthDate) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(body.birthDate));
      const year = m ? Number(m[1]) : 0;
      if (!m || year < 1900 || String(body.birthDate) > new Date().toISOString().slice(0, 10)) return { error: 'Data de nascimento inválida.' };
    }
    out.birthDate = body.birthDate || null;
  }
  return { value: out };
}

// A lista de tabelas apagadas na exclusão de conta fica em _lib/erase.js (a mesma do admin).

async function safeAll(db, sql, ...binds) {
  try { return (await db.prepare(sql).bind(...binds).all()).results || []; } catch { return []; }
}
const parseJson = (s, fallback) => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };

export async function handleAccountRoutes(ctx) {
  const { request, env, correlationId, clientIp, userAgent, pathname, method, body, storage } = ctx;
  if (!pathname.startsWith('/api/account')) return null;
  const claims = await authenticateRequestEdge(request, env);
  if (!claims) return jsonResponse({ error: 'Entre na sua conta.' }, 401, correlationId, request);
  if (storage.mode !== 'd1') return jsonResponse({ error: 'Indisponível no momento.' }, 503, correlationId, request);
  const db = storage.db; const userId = claims.sub;

  if (pathname === '/api/account/health' && method === 'GET') {
    const u = await db.prepare('SELECT weight, height FROM users WHERE id = ?').bind(userId).first();
    const h = await db.prepare('SELECT goal, activity_level, birth_date FROM user_health_profile WHERE user_id = ?').bind(userId).first();
    return jsonResponse({ weight: u?.weight ?? null, height: u?.height ?? null, goal: h?.goal || '', activityLevel: h?.activity_level || '', birthDate: h?.birth_date || '' }, 200, correlationId, request);
  }

  if (pathname === '/api/account/health' && method === 'PUT') {
    const parsed = parseHealth(body || {});
    if (parsed.error) return jsonResponse({ error: parsed.error }, 400, correlationId, request);
    const v = parsed.value; const now = new Date().toISOString();
    if (v.weight !== undefined && v.weight !== null) await db.prepare('UPDATE users SET weight = ? WHERE id = ?').bind(v.weight, userId).run();
    if (v.height !== undefined && v.height !== null) await db.prepare('UPDATE users SET height = ? WHERE id = ?').bind(v.height, userId).run();
    const cur = await db.prepare('SELECT goal, activity_level, birth_date FROM user_health_profile WHERE user_id = ?').bind(userId).first();
    const goal = v.goal !== undefined ? v.goal : cur?.goal ?? null;
    const activity = v.activityLevel !== undefined ? v.activityLevel : cur?.activity_level ?? null;
    const birth = v.birthDate !== undefined ? v.birthDate : cur?.birth_date ?? null;
    await db.prepare(`INSERT INTO user_health_profile (user_id, goal, activity_level, birth_date, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET goal = excluded.goal, activity_level = excluded.activity_level, birth_date = excluded.birth_date, updated_at = excluded.updated_at`)
      .bind(userId, goal, activity, birth, now).run();
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  if (pathname === '/api/account/export' && method === 'GET') {
    const u = await db.prepare('SELECT id, username, email, name, bio, avatar, role, subscription_tier, is_public, streak_days, points, weight, height, playlists, shared_metrics, post_its, active_track, workouts_json, bad_habits_json, page_preferences, created_at FROM users WHERE id = ?').bind(userId).first();
    if (!u) return jsonResponse({ error: 'Conta não encontrada.' }, 404, correlationId, request);
    const categories = await safeAll(db, 'SELECT * FROM categories WHERE user_id = ?', userId);
    const subclasses = [];
    for (const c of categories) subclasses.push(...await safeAll(db, 'SELECT * FROM subclasses WHERE category_id = ?', c.id));
    const { workouts_json, bad_habits_json, ...rest } = u;
    const data = {
      exportedAt: new Date().toISOString(),
      profile: {
        ...rest,
        playlists: parseJson(u.playlists, []), shared_metrics: parseJson(u.shared_metrics, {}), post_its: parseJson(u.post_its, []),
        active_track: parseJson(u.active_track, null), workouts: parseJson(workouts_json, []), bad_habits: parseJson(bad_habits_json, []),
        page_preferences: parseJson(u.page_preferences, {})
      },
      healthProfile: (await safeAll(db, 'SELECT goal, activity_level, birth_date FROM user_health_profile WHERE user_id = ?', userId))[0] || null,
      habits: await safeAll(db, 'SELECT * FROM habits WHERE user_id = ?', userId),
      events: await safeAll(db, 'SELECT * FROM events WHERE user_id = ?', userId),
      water_and_sleep: await safeAll(db, 'SELECT * FROM health WHERE user_id = ?', userId),
      tags: await safeAll(db, 'SELECT * FROM tags WHERE user_id = ?', userId),
      categories, subclasses,
      bad_habits: await safeAll(db, 'SELECT * FROM bad_habits WHERE user_id = ?', userId),
      support_tickets: await safeAll(db, 'SELECT id, subject, message, status, created_at FROM support_tickets WHERE user_id = ?', userId),
      connected_accounts: await safeAll(db, 'SELECT provider, created_at FROM oauth_identities WHERE user_id = ?', userId)
    };
    await recordAuditLogEdge(storage, { eventType: 'ACCOUNT_EXPORTED', userId, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
    return jsonResponse(data, 200, correlationId, request);
  }

  if (pathname === '/api/account' && method === 'DELETE') {
    const u = await db.prepare('SELECT id, username, password, role FROM users WHERE id = ?').bind(userId).first();
    if (!u) return jsonResponse({ error: 'Conta não encontrada.' }, 404, correlationId, request);
    if (u.role === 'admin') return jsonResponse({ error: 'Contas de administrador não podem ser excluídas por aqui.' }, 403, correlationId, request);
    if (normalizeUsername(body?.username) !== String(u.username).toLowerCase()) {
      return jsonResponse({ error: 'Digite seu @ exatamente para confirmar.', field: 'username' }, 400, correlationId, request);
    }
    if (u.password !== 'OAUTH_FEDERATED_ACCOUNT' && !(await verifyPasswordEdge(String(body?.password || ''), u.password))) {
      await recordAuditLogEdge(storage, { eventType: 'ACCOUNT_DELETE_REFUSED', userId, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
      return jsonResponse({ error: 'Senha incorreta.', field: 'password' }, 400, correlationId, request);
    }
    await eraseUserData(db, userId, { midia: env?.MIDIA });
    await recordAuditLogEdge(storage, { eventType: 'ACCOUNT_DELETED', userId, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
    return jsonResponse({ success: true }, 200, correlationId, request);
  }

  return null;
}
