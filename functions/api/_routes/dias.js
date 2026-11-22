/**
 * Registro de cada dia (proposta 15, aprovada em 22/11/2026): base da Análise de progresso.
 * Tudo usa só a identidade do token. A tabela vem da migração 0016; sem ela, as rotas respondem 503.
 *
 * - PUT /api/dias/:data  grava (ou regrava) o resumo de um dia. Só aceita datas próximas de hoje
 *   (de 2 dias atrás a 1 dia à frente, por causa do fuso da pessoa): o histórico antigo não é reescrito.
 * - GET /api/dias?de=AAAA-MM-DD&ate=AAAA-MM-DD  devolve os dias registrados no intervalo (até 400).
 */
import { jsonResponse } from '../_lib/http.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const isMissingTable = (e) => /no such table/i.test(String(e?.message || e));
const int = (v, min, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
};
const dayMs = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const validDate = (d) => typeof d === 'string' && DATE_RE.test(d) && !Number.isNaN(dayMs(d)) && new Date(dayMs(d)).toISOString().slice(0, 10) === d;

/** Lista de hábitos do dia, limpa: { id, t (título), c (categoria), f (feito) }. */
export function cleanHabits(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 200).filter((h) => h && h.id).map((h) => ({
    id: String(h.id).slice(0, 80),
    t: String(h.t ?? h.title ?? '').slice(0, 120),
    c: String(h.c ?? h.category ?? '').slice(0, 60),
    f: Boolean(h.f ?? h.done)
  }));
}

function out(r) {
  let habits = [];
  try { habits = JSON.parse(r.habits_json || '[]'); } catch { habits = []; }
  return {
    date: r.date,
    habits,
    habitsTotal: Number(r.habits_total || 0),
    habitsDone: Number(r.habits_done || 0),
    waterGlasses: Number(r.water_glasses || 0),
    waterTarget: Number(r.water_target || 0),
    glassMl: Number(r.glass_ml || 250),
    sleepLogged: r.sleep_logged === 1,
    sleepBed: r.sleep_bed || null,
    sleepWake: r.sleep_wake || null,
    focusMin: Number(r.focus_min || 0)
  };
}

export async function handleDiasRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody } = ctx;
  if (pathname !== '/api/dias' && !pathname.startsWith('/api/dias/')) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const userId = authClaims.sub;

  try {
    if (pathname === '/api/dias' && method === 'GET') {
      const hoje = new Date().toISOString().slice(0, 10);
      const ate = validDate(url.searchParams.get('ate')) ? url.searchParams.get('ate') : hoje;
      const padraoDe = new Date(dayMs(ate) - 119 * 86400000).toISOString().slice(0, 10);
      const de = validDate(url.searchParams.get('de')) ? url.searchParams.get('de') : padraoDe;
      const rows = (await db.prepare('SELECT * FROM daily_log WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date LIMIT 400').bind(userId, de, ate).all()).results || [];
      const first = await db.prepare('SELECT MIN(date) AS d FROM daily_log WHERE user_id = ?').bind(userId).first();
      return reply({ days: rows.map(out), since: first?.d || null });
    }

    const m = pathname.match(/^\/api\/dias\/([^/]+)$/);
    if (m && method === 'PUT') {
      const date = decodeURIComponent(m[1]);
      if (!validDate(date)) return reply({ error: 'Data inválida.' }, 400);
      const diff = Math.round((dayMs(date) - dayMs(new Date().toISOString().slice(0, 10))) / 86400000);
      if (diff < -2 || diff > 1) return reply({ error: 'Só dá para registrar dias próximos de hoje.' }, 400);
      const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
      const habits = cleanHabits(body.habits);
      const nowIso = new Date().toISOString();
      await db.prepare(
        `INSERT INTO daily_log (user_id, date, habits_json, habits_total, habits_done, water_glasses, water_target, glass_ml, sleep_logged, sleep_bed, sleep_wake, focus_min, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET habits_json = excluded.habits_json, habits_total = excluded.habits_total, habits_done = excluded.habits_done,
           water_glasses = excluded.water_glasses, water_target = excluded.water_target, glass_ml = excluded.glass_ml, sleep_logged = excluded.sleep_logged,
           sleep_bed = excluded.sleep_bed, sleep_wake = excluded.sleep_wake, focus_min = MAX(daily_log.focus_min, excluded.focus_min), updated_at = excluded.updated_at`
      ).bind(
        userId, date, JSON.stringify(habits), habits.length, habits.filter((h) => h.f).length,
        int(body.waterGlasses, 0, 100), int(body.waterTarget, 0, 100), int(body.glassMl || 250, 50, 2000),
        body.sleepLogged ? 1 : 0,
        TIME_RE.test(String(body.sleepBed || '')) ? body.sleepBed : null,
        TIME_RE.test(String(body.sleepWake || '')) ? body.sleepWake : null,
        int(body.focusMin, 0, 1440), nowIso, nowIso
      ).run();
      return reply({ ok: true, date });
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'O registro diário ainda não está disponível.' }, 503);
    throw e;
  }
}
