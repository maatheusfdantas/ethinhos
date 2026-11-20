/**
 * Visão geral do profissional (docs/11, seção 8): só o que pede ação, cada número com a sua lista.
 * Personal: sem treino atribuído, registros novos. Nutri: sem plano publicado, registros novos, plano que termina.
 * Todos: convites de evento sem resposta, próximos eventos. Clínica: pendências administrativas.
 * Cada bloco é lido do banco a cada pedido; se a tabela do lote ainda não existir, o bloco não aparece.
 */
import { isMissingTable, PEOPLE_LABEL, MODEL_LABEL, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';

async function safe(fn) {
  try {
    return await fn();
  } catch (e) {
    if (isMissingTable(e)) return null;
    throw e;
  }
}

export async function handleEspacosVisaoRoutes(ctx) {
  const { request, correlationId, pathname, method, storage, authClaims } = ctx;
  if (pathname !== '/api/espacos/visao' && pathname !== '/api/espacos/visao/visto') return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const nowIso = new Date().toISOString();
  try {
    const gate = await requirePro(db, me);
    if (gate.error) return reply({ error: gate.error }, gate.status);
    const pro = gate.pro;

    if (pathname === '/api/espacos/visao/visto' && method === 'POST') {
      await db.prepare('INSERT INTO space_seen (user_id, space_id, seen_at) VALUES (?, ?, ?) ON CONFLICT(user_id, space_id) DO UPDATE SET seen_at = excluded.seen_at').bind(me, pro.space_id, nowIso).run();
      return reply({ success: true });
    }
    if (method !== 'GET') return reply({ error: 'Rota não encontrada.' }, 404);

    const seen = await safe(() => db.prepare('SELECT seen_at FROM space_seen WHERE user_id = ? AND space_id = ?').bind(me, pro.space_id).first());
    const since = seen?.seen_at || new Date(Date.now() - 7 * 86400000).toISOString();
    const blocks = [];

    const people = Number((await db.prepare("SELECT COUNT(*) AS n FROM space_links WHERE space_id = ? AND status = 'ativo'").bind(pro.space_id).first())?.n || 0);
    const turmas = (await db.prepare(
      `SELECT g.id, g.name, g.description, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id AND m.status = 'ativa') AS members
       FROM space_groups g WHERE g.space_id = ? AND g.status = 'ativa' ORDER BY g.created_at`
    ).bind(pro.space_id).all()).results || [];

    if (pro.model === 'personal') {
      const sem = await safe(async () => (await db.prepare(
        `SELECT l.id AS link_id, u.name, l.started_at FROM space_links l JOIN users u ON u.id = l.client_id
         WHERE l.space_id = ? AND l.status = 'ativo'
           AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.link_id = l.id AND a.status = 'ativa')
         ORDER BY l.started_at DESC LIMIT 50`
      ).bind(pro.space_id).all()).results || []);
      if (sem) blocks.push({ key: 'sem_atribuicao', label: 'Sem treino atribuído', action: 'atribuir', items: sem.map((r) => ({ linkId: r.link_id, name: r.name, detail: `vínculo desde ${r.started_at.slice(0, 10)}` })) });
      const novos = await safe(async () => (await db.prepare(
        `SELECT s.id, s.name, s.status, s.ended_at, s.planned_sets, l.id AS link_id, u.name AS person,
                (SELECT COUNT(*) FROM workout_sets t WHERE t.session_id = s.id) AS done_sets
         FROM workout_sessions s JOIN assignments a ON a.id = s.assignment_id JOIN space_links l ON l.id = a.link_id JOIN users u ON u.id = s.user_id
         WHERE a.space_id = ? AND l.status = 'ativo' AND s.status != 'em_andamento' AND s.ended_at > ? AND s.user_id = a.client_id
         ORDER BY s.ended_at DESC LIMIT 50`
      ).bind(pro.space_id, since).all()).results || []);
      if (novos) blocks.push({ key: 'registros_novos', label: 'Registros novos', action: 'abrir', items: novos.map((r) => ({ linkId: r.link_id, sessionId: r.id, name: r.person, detail: `${r.name}, ${Number(r.done_sets)} de ${Number(r.planned_sets)} séries${r.status === 'incompleta' ? ' (incompleta)' : ''}`, at: r.ended_at })) });
    }

    if (pro.model === 'nutri') {
      const sem = await safe(async () => (await db.prepare(
        `SELECT l.id AS link_id, u.name, l.started_at FROM space_links l JOIN users u ON u.id = l.client_id
         WHERE l.space_id = ? AND l.status = 'ativo'
           AND NOT EXISTS (SELECT 1 FROM meal_plans p WHERE p.link_id = l.id AND p.status = 'publicado')
         ORDER BY l.started_at DESC LIMIT 50`
      ).bind(pro.space_id).all()).results || []);
      if (sem) blocks.push({ key: 'sem_plano', label: 'Sem plano publicado', action: 'plano', items: sem.map((r) => ({ linkId: r.link_id, name: r.name, detail: `vínculo desde ${r.started_at.slice(0, 10)}` })) });
      const novos = await safe(async () => (await db.prepare(
        `SELECT p.link_id, u.name, COUNT(*) AS n, MAX(g.updated_at) AS last
         FROM meal_logs g JOIN meal_plans p ON p.id = g.plan_id JOIN space_links l ON l.id = p.link_id JOIN users u ON u.id = g.client_id
         WHERE p.space_id = ? AND l.status = 'ativo' AND g.updated_at > ? AND g.client_id = p.client_id
         GROUP BY p.link_id ORDER BY last DESC LIMIT 50`
      ).bind(pro.space_id, since).all()).results || []);
      if (novos) blocks.push({ key: 'registros_novos', label: 'Registros novos', action: 'abrir', items: novos.map((r) => ({ linkId: r.link_id, name: r.name, detail: `${Number(r.n)} refeições registradas`, at: r.last })) });
      const vence = await safe(async () => {
        const limit = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        return (await db.prepare(
          `SELECT p.link_id, p.name AS plan, p.ends_on, u.name FROM meal_plans p JOIN space_links l ON l.id = p.link_id JOIN users u ON u.id = p.client_id
           WHERE p.space_id = ? AND l.status = 'ativo' AND p.status = 'publicado' AND p.ends_on IS NOT NULL AND p.ends_on <= ? ORDER BY p.ends_on LIMIT 50`
        ).bind(pro.space_id, limit).all()).results || [];
      });
      if (vence) blocks.push({ key: 'plano_termina', label: 'Plano termina em 7 dias', action: 'plano', items: vence.map((r) => ({ linkId: r.link_id, name: r.name, detail: `${r.plan}, termina em ${r.ends_on}` })) });
    }

    // Agenda (lote C): convites sem resposta de eventos futuros e próximos eventos
    const pend = await safe(async () => (await db.prepare(
      `SELECT i.id, u.name, e.title, e.starts_at, l.id AS link_id FROM space_event_invites i JOIN space_events e ON e.id = i.event_id JOIN users u ON u.id = i.user_id
       LEFT JOIN space_links l ON l.space_id = e.space_id AND l.client_id = i.user_id AND l.status = 'ativo'
       WHERE e.space_id = ? AND e.status = 'ativo' AND i.status = 'pendente' AND e.starts_at > ? ORDER BY e.starts_at LIMIT 50`
    ).bind(pro.space_id, nowIso).all()).results || []);
    if (pend) blocks.push({ key: 'convites_pendentes', label: 'Convites sem resposta', action: 'lembrar', items: pend.map((r) => ({ inviteId: r.id, linkId: r.link_id, name: r.name, detail: `${r.title}, ${r.starts_at}` })) });
    const prox = await safe(async () => (await db.prepare(
      `SELECT e.id, e.title, e.starts_at,
              (SELECT COUNT(*) FROM space_event_invites i WHERE i.event_id = e.id AND i.status = 'aceito') AS aceitos,
              (SELECT COUNT(*) FROM space_event_invites i WHERE i.event_id = e.id AND i.status = 'pendente') AS pendentes
       FROM space_events e WHERE e.space_id = ? AND e.status = 'ativo' AND e.starts_at > ? AND e.starts_at <= ? ORDER BY e.starts_at LIMIT 20`
    ).bind(pro.space_id, nowIso, new Date(Date.now() + 7 * 86400000).toISOString()).all()).results || []);
    if (prox) blocks.push({ key: 'proximos_eventos', label: 'Próximos eventos', action: 'agenda', items: prox.map((r) => ({ eventId: r.id, name: r.title, detail: `${Number(r.aceitos)} aceitos, ${Number(r.pendentes)} pendentes`, at: r.starts_at })) });

    // Clínica (lote F): pendências administrativas abertas
    if (pro.model === 'clinica') {
      const tarefas = await safe(async () => (await db.prepare("SELECT id, title, due_on FROM space_tasks WHERE space_id = ? AND status = 'aberta' ORDER BY COALESCE(due_on, '9999') LIMIT 50").bind(pro.space_id).all()).results || []);
      if (tarefas) blocks.push({ key: 'tarefas', label: 'Pendências administrativas', action: 'tarefa', items: tarefas.map((r) => ({ taskId: r.id, name: r.title, detail: r.due_on ? `até ${r.due_on}` : 'sem prazo' })) });
    }

    return reply({
      pro: { model: pro.model, modelLabel: MODEL_LABEL[pro.model], peopleLabel: PEOPLE_LABEL[pro.model], spaceName: pro.space_name },
      pessoas: people,
      turmas: turmas.map((t) => ({ id: t.id, name: t.name, description: t.description, members: Number(t.members || 0) })),
      desde: since,
      blocos: blocks
    });
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'Os espaços profissionais ainda não estão disponíveis neste ambiente.', code: 'espacos_indisponivel' }, 503);
    throw e;
  }
}
