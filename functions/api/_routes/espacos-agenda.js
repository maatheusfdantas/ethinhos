/**
 * Espaços, lote C: eventos com convite, avisos com comentários privados e pendências (docs/11, fluxos 7 e 8).
 * Regras:
 * - Qualquer modelo (Personal, Nutri, Clínica) cria eventos e avisos para turma, pessoas ou o espaço.
 *   Convidados e destinatários são fixados na criação.
 * - Evento: pendente → aceito/recusado. Mudar data ou horário sobe a versão e volta os aceitos para pendente.
 *   Mudar só texto ou local mantém o aceite e avisa. Cancelar mantém o histórico (aparece riscado).
 *   Pendente de evento que já começou deixa de pedir ação ("sem resposta").
 * - A agenda da pessoa recebe uma REFERÊNCIA ao evento aceito (não uma cópia: a sincronização não toca).
 * - Comentários são privados: cada destinatário vê só a própria conversa com o profissional.
 * - Pendências não se repetem (dedupe_key único) e não bloqueiam nada.
 * Tabelas da migração 0012; sem ela, 503.
 */
import { activeLinkById, isMissingTable, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateText } from '../../../src/domain/validation.js';

const newId = (p) => `${p}_${crypto.randomUUID()}`;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;
const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z_+-]+){0,2}$/;

function validInstant(v) {
  const s = String(v || '');
  if (!ISO_RE.test(s)) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

async function resolveRecipients(db, spaceId, { audience, groupId, linkIds }) {
  if (audience === 'turma') {
    const g = await db.prepare("SELECT id FROM space_groups WHERE id = ? AND space_id = ? AND status != 'arquivada'").bind(String(groupId || ''), spaceId).first();
    if (!g) return { error: 'Turma não encontrada.' };
    const rows = (await db.prepare(
      `SELECT DISTINCT l.client_id FROM group_members m JOIN space_links l ON l.id = m.link_id
       WHERE m.group_id = ? AND m.status = 'ativa' AND l.status = 'ativo'`
    ).bind(g.id).all()).results || [];
    return { users: rows.map((r) => r.client_id), groupId: g.id };
  }
  if (audience === 'pessoas') {
    const users = [];
    for (const lid of (Array.isArray(linkIds) ? linkIds : []).map(String).slice(0, 300)) {
      const l = await activeLinkById(db, spaceId, lid);
      if (l && !users.includes(l.client_id)) users.push(l.client_id);
    }
    return { users, groupId: null };
  }
  if (audience === 'espaco') {
    const rows = (await db.prepare("SELECT client_id FROM space_links WHERE space_id = ? AND status = 'ativo'").bind(spaceId).all()).results || [];
    return { users: rows.map((r) => r.client_id), groupId: null };
  }
  return { error: 'Escolha para quem: turma, pessoas ou todo o espaço.' };
}

const notifyStmt = (db, { userId, type, refId, spaceId, dedupe }) =>
  db.prepare('INSERT OR IGNORE INTO notifications (id, user_id, type, ref_id, space_id, dedupe_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId('ntf'), userId, type, refId, spaceId, dedupe, new Date().toISOString());

function eventOut(e) {
  return { id: e.id, title: e.title, description: e.description, location: e.location, startsAt: e.starts_at, endsAt: e.ends_at, tz: e.tz, audience: e.audience, groupId: e.group_id, groupName: e.group_name || null, status: e.status, version: e.version };
}

export async function handleEspacosAgendaRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody } = ctx;
  const proRoute = pathname.startsWith('/api/espacos/eventos') || pathname.startsWith('/api/espacos/avisos');
  const clientRoute = pathname.startsWith('/api/pendencias') || pathname.startsWith('/api/eventos/') || pathname.startsWith('/api/agenda/espacos') || pathname === '/api/avisos' || pathname.startsWith('/api/avisos/');
  if (!proRoute && !clientRoute) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();

  try {
    // =====================================================================
    // PESSOA
    // =====================================================================
    if (clientRoute) {
      if (pathname === '/api/pendencias' && method === 'GET') {
        const convites = (await db.prepare(
          `SELECT i.id, i.status, i.answered_version, e.id AS event_id, e.title, e.description, e.location, e.starts_at, e.ends_at, e.version, s.name AS space_name, u.name AS pro_name,
                  (SELECT MAX(n.created_at) FROM notifications n WHERE n.ref_id = i.id AND n.user_id = i.user_id AND n.dedupe_key LIKE 'lembrete:%') AS lembrete_at
           FROM space_event_invites i JOIN space_events e ON e.id = i.event_id JOIN spaces s ON s.id = e.space_id JOIN users u ON u.id = s.owner_user_id
           JOIN space_links l ON l.space_id = e.space_id AND l.client_id = i.user_id AND l.status = 'ativo'
           WHERE i.user_id = ? AND i.status = 'pendente' AND e.status = 'ativo' AND e.starts_at > ?
           ORDER BY e.starts_at LIMIT 50`
        ).bind(me, nowIso).all()).results || [];
        const avisos = (await db.prepare(
          `SELECT p.id, p.title, p.created_at, s.name AS space_name, u.name AS pro_name
           FROM space_post_recipients r JOIN space_posts p ON p.id = r.post_id JOIN spaces s ON s.id = p.space_id JOIN users u ON u.id = s.owner_user_id
           JOIN space_links l ON l.space_id = p.space_id AND l.client_id = r.user_id AND l.status = 'ativo'
           WHERE r.user_id = ? AND r.read_at IS NULL AND p.status = 'publicado' ORDER BY p.created_at DESC LIMIT 50`
        ).bind(me).all()).results || [];
        const outras = (await db.prepare(
          `SELECT n.id, n.type, n.ref_id, n.created_at, s.name AS space_name,
                  e.title AS event_title, e.starts_at AS event_starts, p.title AS post_title
           FROM notifications n LEFT JOIN spaces s ON s.id = n.space_id
           LEFT JOIN space_events e ON e.id = n.ref_id AND n.type IN ('evento_cancelado', 'evento_texto')
           LEFT JOIN space_posts p ON p.id = n.ref_id AND n.type = 'comentario'
           WHERE n.user_id = ? AND n.read_at IS NULL AND n.type IN ('evento_cancelado', 'evento_texto', 'comentario', 'plano_publicado')
           ORDER BY n.created_at DESC LIMIT 50`
        ).bind(me).all()).results || [];
        // Lote E: nome do plano alimentar publicado (consulta à parte: sem a migração 0013, só fica sem título).
        const planIds = outras.filter((o) => o.type === 'plano_publicado').map((o) => o.ref_id);
        if (planIds.length) {
          try {
            const names = (await db.prepare(`SELECT id, name FROM meal_plans WHERE client_id = ? AND id IN (${planIds.map(() => '?').join(',')})`).bind(me, ...planIds).all()).results || [];
            for (const o of outras) if (o.type === 'plano_publicado') o.post_title = names.find((x) => x.id === o.ref_id)?.name || 'Plano alimentar';
          } catch (e) {
            if (!isMissingTable(e)) throw e;
          }
        }
        return reply({
          convites: convites.map((c) => ({ inviteId: c.id, eventId: c.event_id, title: c.title, description: c.description, location: c.location, startsAt: c.starts_at, endsAt: c.ends_at, spaceName: c.space_name, proName: c.pro_name, changed: c.answered_version !== null && c.answered_version < c.version, lembrete: Boolean(c.lembrete_at) })),
          avisos: avisos.map((a) => ({ postId: a.id, title: a.title, createdAt: a.created_at, spaceName: a.space_name, proName: a.pro_name })),
          outras: outras.map((o) => ({ id: o.id, type: o.type, refId: o.ref_id, createdAt: o.created_at, spaceName: o.space_name, title: o.event_title || o.post_title || '', startsAt: o.event_starts || null })),
          total: convites.length + avisos.length + outras.length
        });
      }
      if (pathname === '/api/pendencias/lidas' && method === 'POST') {
        const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 200);
        for (const nid of ids) await db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL').bind(nowIso, nid, me).run();
        return reply({ success: true });
      }
      const resp = pathname.match(/^\/api\/eventos\/convites\/([^/]+)\/responder$/);
      if (resp && method === 'POST') {
        const resposta = body.resposta === 'aceito' ? 'aceito' : body.resposta === 'recusado' ? 'recusado' : null;
        if (!resposta) return reply({ error: 'Responda com aceito ou recusado.' }, 400);
        const inv = await db.prepare(
          `SELECT i.*, e.status AS event_status, e.starts_at, e.version FROM space_event_invites i JOIN space_events e ON e.id = i.event_id
           JOIN space_links l ON l.space_id = e.space_id AND l.client_id = i.user_id AND l.status = 'ativo'
           WHERE i.id = ? AND i.user_id = ?`
        ).bind(resp[1], me).first();
        if (!inv) return reply({ error: 'Convite não encontrado.' }, 404);
        if (inv.event_status !== 'ativo') return reply({ error: 'Este evento foi cancelado.' }, 409);
        if (inv.starts_at <= nowIso) return reply({ error: 'Este evento já começou.' }, 409);
        await db.batch([
          db.prepare('UPDATE space_event_invites SET status = ?, answered_version = ?, answered_at = ?, updated_at = ? WHERE id = ?').bind(resposta, inv.version, nowIso, nowIso, inv.id),
          db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND ref_id = ? AND read_at IS NULL").bind(nowIso, me, inv.id)
        ]);
        return reply({ success: true, status: resposta });
      }
      if (pathname === '/api/agenda/espacos' && method === 'GET') {
        const from = validInstant(url.searchParams.get('from')) || new Date(Date.now() - 31 * 86400000).toISOString();
        const to = validInstant(url.searchParams.get('to')) || new Date(Date.now() + 120 * 86400000).toISOString();
        const rows = (await db.prepare(
          `SELECT i.id AS invite_id, e.*, s.name AS space_name FROM space_event_invites i JOIN space_events e ON e.id = i.event_id JOIN spaces s ON s.id = e.space_id
           WHERE i.user_id = ? AND i.status = 'aceito' AND e.starts_at >= ? AND e.starts_at <= ? ORDER BY e.starts_at LIMIT 300`
        ).bind(me, from, to).all()).results || [];
        return reply({ eventos: rows.map((e) => ({ ...eventOut(e), inviteId: e.invite_id, spaceName: e.space_name })) });
      }
      if (pathname === '/api/avisos' && method === 'GET') {
        const rows = (await db.prepare(
          `SELECT p.id, p.title, p.body, p.created_at, p.allow_comments, r.read_at, s.name AS space_name, u.name AS pro_name,
                  (SELECT COUNT(*) FROM space_post_comments c WHERE c.post_id = p.id AND c.participant_id = r.user_id) AS comments
           FROM space_post_recipients r JOIN space_posts p ON p.id = r.post_id JOIN spaces s ON s.id = p.space_id JOIN users u ON u.id = s.owner_user_id
           WHERE r.user_id = ? AND p.status = 'publicado' ORDER BY p.created_at DESC LIMIT 100`
        ).bind(me).all()).results || [];
        return reply({ avisos: rows.map((a) => ({ postId: a.id, title: a.title, body: a.body, createdAt: a.created_at, read: Boolean(a.read_at), spaceName: a.space_name, proName: a.pro_name, comments: Number(a.comments || 0), allowComments: a.allow_comments === 1 })) });
      }
      const av = pathname.match(/^\/api\/avisos\/([^/]+)(\/comentarios)?$/);
      if (av) {
        const post = await db.prepare(
          `SELECT p.*, s.name AS space_name, u.name AS pro_name, s.owner_user_id,
                  (SELECT status FROM space_links l WHERE l.space_id = p.space_id AND l.client_id = r.user_id ORDER BY l.started_at DESC LIMIT 1) AS link_status
           FROM space_post_recipients r JOIN space_posts p ON p.id = r.post_id JOIN spaces s ON s.id = p.space_id JOIN users u ON u.id = s.owner_user_id
           WHERE r.post_id = ? AND r.user_id = ?`
        ).bind(av[1], me).first();
        if (!post) return reply({ error: 'Aviso não encontrado.' }, 404);
        if (!av[2] && method === 'GET') {
          await db.batch([
            db.prepare('UPDATE space_post_recipients SET read_at = COALESCE(read_at, ?) WHERE post_id = ? AND user_id = ?').bind(nowIso, post.id, me),
            db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND ref_id = ? AND read_at IS NULL").bind(nowIso, me, post.id)
          ]);
          const comments = (await db.prepare('SELECT id, author_id, body, created_at FROM space_post_comments WHERE post_id = ? AND participant_id = ? ORDER BY created_at').bind(post.id, me).all()).results || [];
          return reply({
            aviso: { postId: post.id, title: post.title, body: post.body, createdAt: post.created_at, spaceName: post.space_name, proName: post.pro_name, allowComments: post.allow_comments === 1 && post.link_status === 'ativo' },
            conversa: comments.map((c) => ({ id: c.id, mine: c.author_id === me, body: c.body, createdAt: c.created_at }))
          });
        }
        if (av[2] && method === 'POST') {
          if (post.allow_comments !== 1) return reply({ error: 'Este aviso não aceita comentários.' }, 403);
          if (post.link_status !== 'ativo') return reply({ error: 'O vínculo com este espaço foi encerrado. O aviso fica só para leitura.' }, 403);
          const t = validateText(body.body, { label: 'O comentário', max: 1000, multiline: true, required: true });
          if (t.error) return reply({ error: t.error }, 400);
          const cid = newId('cmt');
          await db.batch([
            db.prepare('INSERT INTO space_post_comments (id, post_id, participant_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(cid, post.id, me, me, t.value, nowIso),
            notifyStmt(db, { userId: post.owner_user_id, type: 'comentario_pro', refId: post.id, spaceId: post.space_id, dedupe: `comentario:${cid}` })
          ]);
          return reply({ success: true, id: cid }, 201);
        }
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // =====================================================================
    // PROFISSIONAL (qualquer modelo)
    // =====================================================================
    const gate = await requirePro(db, me);
    if (gate.error) return reply({ error: gate.error }, gate.status);
    const pro = gate.pro;

    // ---------- Eventos ----------
    if (pathname === '/api/espacos/eventos' && method === 'GET') {
      const quando = url.searchParams.get('quando') === 'passados' ? 'passados' : 'futuros';
      const groupId = url.searchParams.get('groupId');
      const linkId = url.searchParams.get('linkId');
      let filter = '';
      const args = [nowIso, nowIso, nowIso, pro.space_id];
      if (groupId) { filter += ' AND e.group_id = ?'; args.push(groupId); }
      if (linkId) {
        const l = await activeLinkById(db, pro.space_id, linkId);
        if (!l) return reply({ error: 'Pessoa não encontrada.' }, 404);
        filter += ' AND EXISTS (SELECT 1 FROM space_event_invites x WHERE x.event_id = e.id AND x.user_id = ?)';
        args.push(l.client_id);
      }
      const rows = (await db.prepare(
        `SELECT e.*, g.name AS group_name,
                SUM(CASE WHEN i.status = 'aceito' THEN 1 ELSE 0 END) AS aceitos,
                SUM(CASE WHEN i.status = 'pendente' AND e.starts_at > ? THEN 1 ELSE 0 END) AS pendentes,
                SUM(CASE WHEN i.status = 'recusado' THEN 1 ELSE 0 END) AS recusados,
                SUM(CASE WHEN i.status = 'pendente' AND e.starts_at <= ? THEN 1 ELSE 0 END) AS sem_resposta,
                SUM(CASE WHEN i.attendance = 'presente' THEN 1 ELSE 0 END) AS presentes
         FROM space_events e LEFT JOIN space_event_invites i ON i.event_id = e.id LEFT JOIN space_groups g ON g.id = e.group_id
         WHERE ${quando === 'futuros' ? 'e.ends_at > ?' : 'e.ends_at <= ?'} AND e.space_id = ?${filter}
         GROUP BY e.id ORDER BY e.starts_at ${quando === 'futuros' ? 'ASC' : 'DESC'} LIMIT 100`
      ).bind(...args).all()).results || [];
      return reply({ eventos: rows.map((e) => ({ ...eventOut(e), aceitos: Number(e.aceitos || 0), pendentes: Number(e.pendentes || 0), recusados: Number(e.recusados || 0), semResposta: Number(e.sem_resposta || 0), presentes: Number(e.presentes || 0) })) });
    }

    if (pathname === '/api/espacos/eventos' && method === 'POST') {
      const title = validateText(body.title, { label: 'O título', max: 120, required: true, min: 2 });
      if (title.error) return reply({ error: title.error, field: 'title' }, 400);
      const startsAt = validInstant(body.startsAt);
      const endsAt = validInstant(body.endsAt);
      if (!startsAt || !endsAt) return reply({ error: 'Data e horário inválidos.', field: 'startsAt' }, 400);
      if (endsAt <= startsAt) return reply({ error: 'O fim precisa ser depois do início.', field: 'endsAt' }, 400);
      if (startsAt <= nowIso) return reply({ error: 'O evento precisa começar no futuro.', field: 'startsAt' }, 400);
      if (Date.parse(startsAt) - Date.now() > 2 * 366 * 86400000) return reply({ error: 'Marque o evento para os próximos dois anos.', field: 'startsAt' }, 400);
      const rec = await resolveRecipients(db, pro.space_id, body);
      if (rec.error) return reply({ error: rec.error }, 400);
      if (!rec.users.length) return reply({ error: 'Ninguém para convidar. A turma está vazia?' }, 400);
      const eid = newId('evt');
      const tz = TZ_RE.test(String(body.tz || '')) ? String(body.tz) : 'America/Sao_Paulo';
      const stmts = [db.prepare(
        `INSERT INTO space_events (id, space_id, title, description, location, starts_at, ends_at, tz, audience, group_id, status, version, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', 1, ?, ?, ?)`
      ).bind(eid, pro.space_id, title.value, validateText(body.description, { max: 1000, multiline: true }).value || '', validateText(body.location, { max: 200 }).value || '', startsAt, endsAt, tz, body.audience, rec.groupId, me, nowIso, nowIso)];
      for (const uid of rec.users) {
        const iid = newId('inv');
        stmts.push(db.prepare("INSERT OR IGNORE INTO space_event_invites (id, event_id, space_id, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pendente', ?, ?)").bind(iid, eid, pro.space_id, uid, nowIso, nowIso));
        stmts.push(notifyStmt(db, { userId: uid, type: 'evento_convite', refId: iid, spaceId: pro.space_id, dedupe: `evento:${eid}:v1:${uid}` }));
      }
      for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
      return reply({ evento: { id: eid }, convidados: rec.users.length }, 201);
    }

    const ev = pathname.match(/^\/api\/espacos\/eventos\/([^/]+)(\/[a-z]+)?$/);
    if (ev) {
      const e = await db.prepare('SELECT e.*, g.name AS group_name FROM space_events e LEFT JOIN space_groups g ON g.id = e.group_id WHERE e.id = ? AND e.space_id = ?').bind(ev[1], pro.space_id).first();
      if (!e) return reply({ error: 'Evento não encontrado.' }, 404);
      const sub = ev[2] || '';
      if (sub === '' && method === 'GET') {
        const invites = (await db.prepare(
          `SELECT i.id, i.status, i.attendance, i.answered_version, u.name, u.username FROM space_event_invites i JOIN users u ON u.id = i.user_id
           WHERE i.event_id = ? ORDER BY u.name`
        ).bind(e.id).all()).results || [];
        const started = e.starts_at <= nowIso;
        return reply({ evento: eventOut(e), convites: invites.map((i) => ({ inviteId: i.id, name: i.name, username: i.username, status: i.status === 'pendente' && started ? 'sem_resposta' : i.status, attendance: i.attendance })) });
      }
      if (sub === '' && method === 'PUT') {
        if (e.status !== 'ativo') return reply({ error: 'Evento cancelado.' }, 409);
        const title = body.title !== undefined ? validateText(body.title, { label: 'O título', max: 120, required: true, min: 2 }) : { value: e.title };
        if (title.error) return reply({ error: title.error, field: 'title' }, 400);
        const startsAt = body.startsAt !== undefined ? validInstant(body.startsAt) : e.starts_at;
        const endsAt = body.endsAt !== undefined ? validInstant(body.endsAt) : e.ends_at;
        if (!startsAt || !endsAt || endsAt <= startsAt) return reply({ error: 'Data e horário inválidos.', field: 'startsAt' }, 400);
        const timeChanged = startsAt !== e.starts_at || endsAt !== e.ends_at;
        if (timeChanged && startsAt <= nowIso) return reply({ error: 'O novo horário precisa ser no futuro.', field: 'startsAt' }, 400);
        const description = body.description !== undefined ? validateText(body.description, { max: 1000, multiline: true }).value : e.description;
        const location = body.location !== undefined ? validateText(body.location, { max: 200 }).value : e.location;
        const textChanged = title.value !== e.title || description !== e.description || location !== e.location;
        const version = timeChanged ? e.version + 1 : e.version;
        const stmts = [db.prepare('UPDATE space_events SET title = ?, description = ?, location = ?, starts_at = ?, ends_at = ?, version = ?, updated_at = ? WHERE id = ?').bind(title.value, description, location, startsAt, endsAt, version, nowIso, e.id)];
        const invites = (await db.prepare('SELECT id, user_id, status FROM space_event_invites WHERE event_id = ?').bind(e.id).all()).results || [];
        if (timeChanged) {
          // Data ou horário mudou: quem tinha respondido precisa confirmar de novo.
          stmts.push(db.prepare("UPDATE space_event_invites SET status = 'pendente', updated_at = ? WHERE event_id = ? AND status IN ('aceito', 'recusado')").bind(nowIso, e.id));
          for (const i of invites) stmts.push(notifyStmt(db, { userId: i.user_id, type: 'evento_convite', refId: i.id, spaceId: pro.space_id, dedupe: `evento:${e.id}:v${version}:${i.user_id}` }));
        } else if (textChanged) {
          for (const i of invites.filter((x) => x.status === 'aceito')) stmts.push(notifyStmt(db, { userId: i.user_id, type: 'evento_texto', refId: e.id, spaceId: pro.space_id, dedupe: `evento-texto:${e.id}:${nowIso}:${i.user_id}` }));
        }
        await db.batch(stmts);
        return reply({ success: true, version, reconfirmar: timeChanged });
      }
      if (sub === '/cancelar' && method === 'POST') {
        if (e.status !== 'ativo') return reply({ success: true });
        const invites = (await db.prepare("SELECT id, user_id, status FROM space_event_invites WHERE event_id = ? AND status IN ('aceito', 'pendente')").bind(e.id).all()).results || [];
        const stmts = [db.prepare("UPDATE space_events SET status = 'cancelado', updated_at = ? WHERE id = ?").bind(nowIso, e.id)];
        for (const i of invites) {
          stmts.push(db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND ref_id = ? AND read_at IS NULL').bind(nowIso, i.user_id, i.id));
          if (i.status === 'aceito') stmts.push(notifyStmt(db, { userId: i.user_id, type: 'evento_cancelado', refId: e.id, spaceId: pro.space_id, dedupe: `evento-cancelado:${e.id}:${i.user_id}` }));
        }
        await db.batch(stmts);
        return reply({ success: true });
      }
      if (sub === '/lembrar' && method === 'POST') {
        if (e.status !== 'ativo' || e.starts_at <= nowIso) return reply({ error: 'Não dá para lembrar de um evento que já começou ou foi cancelado.' }, 409);
        const inv = await db.prepare("SELECT id, user_id FROM space_event_invites WHERE id = ? AND event_id = ? AND status = 'pendente'").bind(String(body.inviteId || ''), e.id).first();
        if (!inv) return reply({ error: 'Convite pendente não encontrado.' }, 404);
        // Um lembrete por dia: a pendência volta a aparecer como não lida, sem duplicar.
        const day = nowIso.slice(0, 10);
        await db.batch([
          db.prepare("UPDATE notifications SET read_at = NULL WHERE user_id = ? AND ref_id = ? AND type = 'evento_convite'").bind(inv.user_id, inv.id),
          notifyStmt(db, { userId: inv.user_id, type: 'evento_convite', refId: inv.id, spaceId: pro.space_id, dedupe: `lembrete:${inv.id}:${day}` })
        ]);
        return reply({ success: true });
      }
      if (sub === '/presenca' && method === 'PUT') {
        if (e.starts_at > nowIso) return reply({ error: 'A presença é marcada depois que o evento começa.' }, 409);
        const att = body.attendance === 'presente' || body.attendance === 'faltou' ? body.attendance : null;
        const r = await db.prepare('UPDATE space_event_invites SET attendance = ?, updated_at = ? WHERE id = ? AND event_id = ?').bind(att, nowIso, String(body.inviteId || ''), e.id).run();
        if (!r?.meta?.changes) return reply({ error: 'Convite não encontrado.' }, 404);
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // ---------- Avisos ----------
    if (pathname === '/api/espacos/avisos' && method === 'GET') {
      const groupId = url.searchParams.get('groupId');
      const linkId = url.searchParams.get('linkId');
      let filter = '';
      const args = [pro.space_id];
      if (groupId) { filter += ' AND p.group_id = ?'; args.push(groupId); }
      if (linkId) {
        const l = await activeLinkById(db, pro.space_id, linkId);
        if (!l) return reply({ error: 'Pessoa não encontrada.' }, 404);
        filter += ' AND EXISTS (SELECT 1 FROM space_post_recipients x WHERE x.post_id = p.id AND x.user_id = ?)';
        args.push(l.client_id);
      }
      const rows = (await db.prepare(
        `SELECT p.*, g.name AS group_name,
                (SELECT COUNT(*) FROM space_post_recipients r WHERE r.post_id = p.id) AS recipients,
                (SELECT COUNT(*) FROM space_post_recipients r WHERE r.post_id = p.id AND r.read_at IS NOT NULL) AS lidos,
                (SELECT COUNT(DISTINCT c.participant_id) FROM space_post_comments c WHERE c.post_id = p.id) AS conversas
         FROM space_posts p LEFT JOIN space_groups g ON g.id = p.group_id
         WHERE p.space_id = ?${filter} ORDER BY p.created_at DESC LIMIT 100`
      ).bind(...args).all()).results || [];
      return reply({ avisos: rows.map((p) => ({ id: p.id, title: p.title, body: p.body, audience: p.audience, groupName: p.group_name, allowComments: p.allow_comments === 1, status: p.status, createdAt: p.created_at, recipients: Number(p.recipients || 0), conversas: Number(p.conversas || 0) })) });
    }
    if (pathname === '/api/espacos/avisos' && method === 'POST') {
      const title = validateText(body.title, { label: 'O título', max: 120, required: true, min: 2 });
      if (title.error) return reply({ error: title.error, field: 'title' }, 400);
      const text = validateText(body.body, { label: 'O texto', max: 2000, multiline: true, required: true });
      if (text.error) return reply({ error: text.error, field: 'body' }, 400);
      const rec = await resolveRecipients(db, pro.space_id, body);
      if (rec.error) return reply({ error: rec.error }, 400);
      if (!rec.users.length) return reply({ error: 'Ninguém para receber. A turma está vazia?' }, 400);
      const pid = newId('pst');
      const stmts = [db.prepare(
        "INSERT INTO space_posts (id, space_id, audience, group_id, title, body, allow_comments, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'publicado', ?, ?)"
      ).bind(pid, pro.space_id, body.audience, rec.groupId, title.value, text.value, body.allowComments === false ? 0 : 1, me, nowIso)];
      for (const uid of rec.users) {
        stmts.push(db.prepare('INSERT OR IGNORE INTO space_post_recipients (post_id, user_id) VALUES (?, ?)').bind(pid, uid));
      }
      for (let i = 0; i < stmts.length; i += 80) await db.batch(stmts.slice(i, i + 80));
      return reply({ aviso: { id: pid }, destinatarios: rec.users.length }, 201);
    }
    const ap = pathname.match(/^\/api\/espacos\/avisos\/([^/]+)(?:\/conversas\/([^/]+))?$/);
    if (ap) {
      const post = await db.prepare('SELECT * FROM space_posts WHERE id = ? AND space_id = ?').bind(ap[1], pro.space_id).first();
      if (!post) return reply({ error: 'Aviso não encontrado.' }, 404);
      if (!ap[2] && method === 'GET') {
        const threads = (await db.prepare(
          `SELECT r.user_id, r.read_at, u.name, u.username,
                  (SELECT COUNT(*) FROM space_post_comments c WHERE c.post_id = r.post_id AND c.participant_id = r.user_id) AS n,
                  (SELECT MAX(created_at) FROM space_post_comments c WHERE c.post_id = r.post_id AND c.participant_id = r.user_id) AS last
           FROM space_post_recipients r JOIN users u ON u.id = r.user_id WHERE r.post_id = ? ORDER BY last IS NULL, last DESC, u.name`
        ).bind(post.id).all()).results || [];
        return reply({ aviso: { id: post.id, title: post.title, body: post.body, allowComments: post.allow_comments === 1, status: post.status, createdAt: post.created_at }, conversas: threads.map((t) => ({ userId: t.user_id, name: t.name, username: t.username, comments: Number(t.n || 0), last: t.last, read: Boolean(t.read_at) })) });
      }
      if (!ap[2] && method === 'PUT') {
        const status = body.status === 'arquivado' ? 'arquivado' : 'publicado';
        await db.prepare('UPDATE space_posts SET status = ? WHERE id = ?').bind(status, post.id).run();
        return reply({ success: true });
      }
      if (ap[2]) {
        const rec = await db.prepare('SELECT user_id FROM space_post_recipients WHERE post_id = ? AND user_id = ?').bind(post.id, ap[2]).first();
        if (!rec) return reply({ error: 'Esta pessoa não recebeu o aviso.' }, 404);
        if (method === 'GET') {
          const comments = (await db.prepare('SELECT id, author_id, body, created_at FROM space_post_comments WHERE post_id = ? AND participant_id = ? ORDER BY created_at').bind(post.id, rec.user_id).all()).results || [];
          await db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND ref_id = ? AND type = 'comentario_pro' AND read_at IS NULL").bind(nowIso, me, post.id).run();
          return reply({ conversa: comments.map((c) => ({ id: c.id, mine: c.author_id === me, body: c.body, createdAt: c.created_at })) });
        }
        if (method === 'POST') {
          const link = await db.prepare("SELECT id FROM space_links WHERE space_id = ? AND client_id = ? AND status = 'ativo'").bind(pro.space_id, rec.user_id).first();
          if (!link) return reply({ error: 'O vínculo com esta pessoa foi encerrado.' }, 403);
          const t = validateText(body.body, { label: 'A resposta', max: 1000, multiline: true, required: true });
          if (t.error) return reply({ error: t.error }, 400);
          const cid = newId('cmt');
          await db.batch([
            db.prepare('INSERT INTO space_post_comments (id, post_id, participant_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(cid, post.id, rec.user_id, me, t.value, nowIso),
            notifyStmt(db, { userId: rec.user_id, type: 'comentario', refId: post.id, spaceId: pro.space_id, dedupe: `comentario:${cid}` })
          ]);
          return reply({ success: true, id: cid }, 201);
        }
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'A agenda e os avisos dos espaços ainda não estão disponíveis neste ambiente.', code: 'espacos_indisponivel' }, 503);
    throw e;
  }
}
