/**
 * Treino ativo (lote D1): sessões e séries salvas no servidor.
 * Tudo usa só a identidade do token (sem id de usuário na URL). As tabelas vêm da migração 0008;
 * se ela ainda não foi aplicada, as rotas respondem 503 com uma mensagem clara (sem criar nada sozinhas).
 *
 * Regras:
 * - O id da sessão vem do navegador: repetir o pedido (clique duplo, rede instável) não cria outra.
 * - Uma sessão aberta por vez. Pedir outra devolve a aberta (para "retomar").
 * - A sessão guarda uma cópia da ficha do momento: mudar a ficha depois não muda a sessão.
 * - Tempo = agora (ou fim) - início - pausas. Nada de contador em memória.
 * - Finalizar registra só o que foi feito: concluída se todas as séries planejadas foram feitas,
 *   incompleta caso contrário. Nenhuma série é inventada.
 */
import { jsonResponse } from '../_lib/http.js';

const ID_RE = /^[A-Za-z0-9_-]{8,80}$/;
const METRICS = ['kg', 'lado', 'corpo', 'reps', 'tempo'];

function isMissingTable(e) {
  return /no such table/i.test(String(e?.message || e));
}

function elapsedMs(s, nowMs = Date.now()) {
  const end = s.ended_at ? Date.parse(s.ended_at) : nowMs;
  const pausedNow = s.paused_at && !s.ended_at ? nowMs - Date.parse(s.paused_at) : 0;
  return Math.max(0, end - Date.parse(s.started_at) - Number(s.paused_ms || 0) - pausedNow);
}

function sessionOut(s, sets = []) {
  let content = {};
  try { content = JSON.parse(s.content_json || '{}'); } catch { content = {}; }
  return {
    id: s.id,
    workoutRef: s.workout_ref,
    assignmentId: s.assignment_id,
    name: s.name,
    content,
    plannedSets: Number(s.planned_sets || 0),
    status: s.status,
    startedAt: s.started_at,
    endedAt: s.ended_at,
    pausedAt: s.paused_at,
    pausedMs: Number(s.paused_ms || 0),
    elapsedMs: elapsedMs(s),
    sets: sets.map((r) => ({ exerciseKey: r.exercise_key, exerciseName: r.exercise_name, setNo: r.set_no, metric: r.metric, weightKg: r.weight_kg, reps: r.reps, seconds: r.seconds, doneAt: r.done_at }))
  };
}

function plannedFrom(content) {
  const ex = Array.isArray(content?.exercises) ? content.exercises : [];
  return ex.reduce((a, e) => a + Math.max(0, Math.min(30, Number(e?.sets) || 0)), 0);
}

const num = (v, min, max) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

export async function handleTreinoRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody } = ctx;
  if (!pathname.startsWith('/api/treino')) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const userId = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();

  const own = async (id) => db.prepare('SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?').bind(id, userId).first();
  const setsOf = async (id) => (await db.prepare('SELECT * FROM workout_sets WHERE session_id = ? AND user_id = ? ORDER BY exercise_key, set_no').bind(id, userId).all()).results || [];

  try {
    // Sessão aberta (para retomar ao abrir o app ou trocar de aba)
    if (pathname === '/api/treino/sessao-aberta' && method === 'GET') {
      const s = await db.prepare("SELECT * FROM workout_sessions WHERE user_id = ? AND status = 'em_andamento' ORDER BY started_at DESC LIMIT 1").bind(userId).first();
      return reply({ session: s ? sessionOut(s, await setsOf(s.id)) : null });
    }

    // Iniciar (idempotente pelo id do navegador)
    if (pathname === '/api/treino/sessoes' && method === 'POST') {
      const id = String(body.id || '');
      if (!ID_RE.test(id)) return reply({ error: 'Identificador de sessão inválido.' }, 400);
      const existing = await db.prepare('SELECT * FROM workout_sessions WHERE id = ?').bind(id).first();
      if (existing) {
        if (existing.user_id !== userId) return reply({ error: 'Identificador já usado.' }, 409);
        return reply({ session: sessionOut(existing, await setsOf(id)), resumed: true });
      }
      // Ficha atribuída por um profissional (lote D2): o conteúdo vem da cópia da pessoa no servidor,
      // nunca do navegador, e a sessão guarda de qual atribuição veio (o profissional acompanha só essas).
      let assignment = null;
      if (body.assignmentId) {
        assignment = await db.prepare(
          "SELECT a.* FROM assignments a JOIN space_links l ON l.id = a.link_id WHERE a.id = ? AND a.client_id = ? AND a.status = 'ativa' AND l.status = 'ativo'"
        ).bind(String(body.assignmentId), userId).first();
        if (!assignment) return reply({ error: 'Esta ficha do profissional não está mais disponível.' }, 404);
      }
      const name = assignment ? assignment.name : String(body.name || '').trim().slice(0, 120);
      if (!name) return reply({ error: 'Informe o nome do treino.' }, 400);
      const open = await db.prepare("SELECT * FROM workout_sessions WHERE user_id = ? AND status = 'em_andamento' ORDER BY started_at DESC LIMIT 1").bind(userId).first();
      if (open) return reply({ session: sessionOut(open, await setsOf(open.id)), resumed: true, message: 'Você já tem um treino em andamento.' });
      let content = body.content && typeof body.content === 'object' ? body.content : {};
      if (assignment) { try { content = JSON.parse(assignment.content_json); } catch { content = {}; } }
      const contentJson = JSON.stringify(content);
      if (contentJson.length > 60000) return reply({ error: 'Ficha grande demais.' }, 413);
      await db.prepare(
        `INSERT INTO workout_sessions (id, user_id, workout_ref, assignment_id, name, content_json, planned_sets, status, started_at, paused_ms, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'em_andamento', ?, 0, ?, ?)`
      ).bind(id, userId, assignment ? null : body.workoutRef ? String(body.workoutRef).slice(0, 80) : null, assignment ? assignment.id : null, name, contentJson, plannedFrom(content), nowIso, nowIso, nowIso).run();
      return reply({ session: sessionOut(await own(id), []) }, 201);
    }

    // Histórico
    if (pathname === '/api/treino/historico' && method === 'GET') {
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 30));
      const rows = (await db.prepare(
        `SELECT s.*, (SELECT COUNT(*) FROM workout_sets t WHERE t.session_id = s.id) AS done_sets
         FROM workout_sessions s WHERE s.user_id = ? AND s.status != 'em_andamento' ORDER BY s.started_at DESC LIMIT ?`
      ).bind(userId, limit).all()).results || [];
      const exercises = (await db.prepare(
        `SELECT exercise_key, MAX(exercise_name) AS exercise_name, COUNT(*) AS n FROM workout_sets
         WHERE user_id = ? AND weight_kg IS NOT NULL AND weight_kg > 0 GROUP BY exercise_key ORDER BY MAX(done_at) DESC LIMIT 20`
      ).bind(userId).all()).results || [];
      return reply({
        sessions: rows.map((s) => ({ ...sessionOut(s), doneSets: Number(s.done_sets || 0) })),
        exercises: exercises.map((e) => ({ key: e.exercise_key, name: e.exercise_name, sets: Number(e.n) }))
      });
    }

    // Maior carga por semana de um exercício (só sessões encerradas; mesma medida)
    if (pathname === '/api/treino/progresso' && method === 'GET') {
      const key = String(url.searchParams.get('key') || '').slice(0, 80);
      if (!key) return reply({ error: 'Informe o exercício.' }, 400);
      const rows = (await db.prepare(
        `SELECT strftime('%Y-%W', done_at) AS semana, MIN(done_at) AS inicio, MAX(weight_kg) AS carga FROM workout_sets
         WHERE user_id = ? AND exercise_key = ? AND weight_kg IS NOT NULL AND weight_kg > 0
           AND session_id IN (SELECT id FROM workout_sessions WHERE user_id = ? AND status != 'em_andamento')
         GROUP BY semana ORDER BY semana DESC LIMIT 8`
      ).bind(userId, key, userId).all()).results || [];
      return reply({ weeks: rows.reverse().map((r) => ({ week: r.semana, from: r.inicio, maxKg: r.carga })) });
    }

    // Última execução de cada exercício (sugestão; nunca conta como feito)
    if (pathname === '/api/treino/ultimas' && method === 'GET') {
      const keys = String(url.searchParams.get('keys') || '').split(',').map((k) => k.trim()).filter(Boolean).slice(0, 40);
      const out = {};
      for (const k of keys) {
        const r = await db.prepare(
          `SELECT weight_kg, reps, seconds, metric, done_at FROM workout_sets WHERE user_id = ? AND exercise_key = ?
           AND session_id IN (SELECT id FROM workout_sessions WHERE user_id = ? AND status != 'em_andamento')
           ORDER BY done_at DESC LIMIT 1`
        ).bind(userId, k, userId).first();
        if (r) out[k] = { weightKg: r.weight_kg, reps: r.reps, seconds: r.seconds, metric: r.metric, doneAt: r.done_at };
      }
      return reply({ last: out });
    }

    const m = pathname.match(/^\/api\/treino\/sessoes\/([^/]+)(\/[a-z]+)?$/);
    if (!m) return null;
    const sid = m[1];
    const action = m[2] || '';
    const s = await own(sid);
    if (!s) return reply({ error: 'Sessão não encontrada.' }, 404);

    if (action === '' && method === 'GET') return reply({ session: sessionOut(s, await setsOf(sid)) });

    // Descartar (o "Reiniciar sessão" do módulo antigo): só sessão em andamento
    if (action === '' && method === 'DELETE') {
      if (s.status !== 'em_andamento') return reply({ error: 'Sessões encerradas ficam no histórico.' }, 409);
      await db.batch([
        db.prepare('DELETE FROM workout_sets WHERE session_id = ? AND user_id = ?').bind(sid, userId),
        db.prepare('DELETE FROM workout_sessions WHERE id = ? AND user_id = ?').bind(sid, userId)
      ]);
      return reply({ success: true });
    }

    if (s.status !== 'em_andamento') return reply({ error: 'Esta sessão já foi encerrada.' }, 409);

    // Registrar ou corrigir uma série
    if (action === '/series' && method === 'PUT') {
      const exerciseKey = String(body.exerciseKey || '').slice(0, 80);
      const exerciseName = String(body.exerciseName || '').trim().slice(0, 120);
      const setNo = num(body.setNo, 1, 30);
      const metric = METRICS.includes(body.metric) ? body.metric : 'kg';
      const weightKg = num(body.weightKg, 0, 1000);
      const reps = num(body.reps, 0, 1000);
      const seconds = num(body.seconds, 0, 36000);
      if (!exerciseKey || !exerciseName || !setNo || weightKg === undefined || reps === undefined || seconds === undefined) {
        return reply({ error: 'Série inválida.' }, 400);
      }
      await db.prepare(
        `INSERT INTO workout_sets (id, session_id, user_id, exercise_key, exercise_name, set_no, metric, weight_kg, reps, seconds, done_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id, exercise_key, set_no) DO UPDATE SET metric = excluded.metric, weight_kg = excluded.weight_kg, reps = excluded.reps, seconds = excluded.seconds, done_at = excluded.done_at`
      ).bind(`set_${crypto.randomUUID()}`, sid, userId, exerciseKey, exerciseName, setNo, metric, weightKg, reps === null ? null : Math.round(reps), seconds === null ? null : Math.round(seconds), nowIso).run();
      await db.prepare('UPDATE workout_sessions SET updated_at = ? WHERE id = ?').bind(nowIso, sid).run();
      return reply({ session: sessionOut(await own(sid), await setsOf(sid)) });
    }

    // Desfazer uma série
    if (action === '/series' && method === 'DELETE') {
      const exerciseKey = String(body.exerciseKey || url.searchParams.get('exerciseKey') || '');
      const setNo = Number(body.setNo || url.searchParams.get('setNo'));
      await db.prepare('DELETE FROM workout_sets WHERE session_id = ? AND user_id = ? AND exercise_key = ? AND set_no = ?').bind(sid, userId, exerciseKey, setNo).run();
      return reply({ session: sessionOut(await own(sid), await setsOf(sid)) });
    }

    // Pausar / continuar
    if (action === '/pausa' && method === 'POST') {
      const pause = body.pausado !== false;
      if (pause && !s.paused_at) {
        await db.prepare('UPDATE workout_sessions SET paused_at = ?, updated_at = ? WHERE id = ?').bind(nowIso, nowIso, sid).run();
      } else if (!pause && s.paused_at) {
        const extra = Math.max(0, Date.now() - Date.parse(s.paused_at));
        await db.prepare('UPDATE workout_sessions SET paused_ms = paused_ms + ?, paused_at = NULL, updated_at = ? WHERE id = ?').bind(extra, nowIso, sid).run();
      }
      return reply({ session: sessionOut(await own(sid), await setsOf(sid)) });
    }

    // Finalizar
    if (action === '/finalizar' && method === 'POST') {
      const done = Number((await db.prepare('SELECT COUNT(*) AS n FROM workout_sets WHERE session_id = ? AND user_id = ?').bind(sid, userId).first())?.n || 0);
      const status = s.planned_sets > 0 && done >= s.planned_sets ? 'concluida' : 'incompleta';
      const extra = s.paused_at ? Math.max(0, Date.now() - Date.parse(s.paused_at)) : 0;
      await db.prepare('UPDATE workout_sessions SET status = ?, ended_at = ?, paused_ms = paused_ms + ?, paused_at = NULL, updated_at = ? WHERE id = ?').bind(status, nowIso, extra, nowIso, sid).run();
      return reply({ session: sessionOut(await own(sid), await setsOf(sid)) });
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) {
      return reply({ error: 'O treino ativo ainda não está disponível neste ambiente.', code: 'treino_indisponivel' }, 503);
    }
    throw e;
  }
}
