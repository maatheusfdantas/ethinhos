/**
 * Espaços profissionais: fundação (perfil profissional, espaço, admin) e turmas/convites (lotes A e B).
 * Regras (docs/10-espacos-profissionais.md, seção 5):
 * - O servidor decide tudo a cada pedido, lendo do banco: perfil (ativo/suspenso), espaço, vínculo e participação.
 *   Nada vem do token além do id da pessoa; nenhum campo de papel enviado pelo navegador é aceito.
 * - O admin ativa, suspende e troca o modelo; ele não lê dados de alunos nem de pacientes.
 * - Convite: o banco guarda só o hash. Turma: vários usos em 24 h. Individual: 1 uso em 24 h.
 *   A prévia nunca mostra os participantes. Entrar exige confirmação e declaração de maioridade.
 * - Ninguém da turma vê os outros participantes. O profissional vê só quem tem vínculo ativo com ele.
 * Tabelas da migração 0009; sem ela, as rotas respondem 503 (nada é criado sozinho).
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { sha256Hex } from '../_lib/email.js';
import { jsonResponse } from '../_lib/http.js';
import { endAssignments } from '../_lib/espacos-acesso.js';

export const MODELS = { personal: 'Personal', nutri: 'Nutricionista', clinica: 'Organização Clínica' };
const PEOPLE_LABEL = { personal: 'Alunos', nutri: 'Pacientes', clinica: 'Pessoas' };
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const INVALID_INVITE = 'Este código não vale mais ou não existe. Peça um novo ao profissional.';

export function generateInviteCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}
export const normalizeCode = (raw) => {
  const s = String(raw || '').trim();
  const fromLink = s.match(/convite[=/]([A-Za-z0-9-]+)/);
  return (fromLink ? fromLink[1] : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
};
const id = (p) => `${p}_${crypto.randomUUID()}`;
const isMissingTable = (e) => /no such table/i.test(String(e?.message || e));
const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

async function proOf(db, userId) {
  return db
    .prepare('SELECT p.user_id, p.model, p.status, p.space_id, p.approved_at, s.name AS space_name FROM pro_profiles p JOIN spaces s ON s.id = p.space_id WHERE p.user_id = ?')
    .bind(userId)
    .first();
}

async function inviteFromCode(db, code) {
  if (code.length < 6) return null;
  return db
    .prepare(
      `SELECT i.*, s.name AS space_name, s.model AS space_model, s.owner_user_id, u.name AS owner_name, p.status AS pro_status,
              g.name AS group_name, g.status AS group_status, g.max_members
       FROM space_invites i
       JOIN spaces s ON s.id = i.space_id
       JOIN users u ON u.id = s.owner_user_id
       LEFT JOIN pro_profiles p ON p.user_id = s.owner_user_id
       LEFT JOIN space_groups g ON g.id = i.group_id
       WHERE i.code_hash = ?`
    )
    .bind(await sha256Hex(code))
    .first();
}

function inviteUsable(inv, nowIso) {
  if (!inv) return false;
  if (inv.revoked_at || inv.expires_at <= nowIso) return false;
  if (inv.pro_status !== 'ativo') return false;
  if (inv.max_uses !== null && inv.max_uses !== undefined && inv.uses >= inv.max_uses) return false;
  if (inv.kind === 'turma' && inv.group_status !== 'ativa') return false;
  return true;
}

export async function handleEspacosRoutes(ctx) {
  const { request, correlationId, pathname, method, storage, authClaims, rawBody, clientIp, userAgent } = ctx;
  const isAdminRoute = pathname.startsWith('/api/admin/profissionais');
  if (!pathname.startsWith('/api/espacos') && !isAdminRoute) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();
  const audit = (eventType, metadata = {}) => recordAuditLogEdge(storage, { eventType, userId: me, ipAddress: clientIp, userAgent, metadata, correlationId });

  try {
    // =====================================================================
    // ADMIN (o guard já exige papel admin em /api/admin/*)
    // =====================================================================
    if (isAdminRoute) {
      if (authClaims.role !== 'admin') return reply({ error: 'Acesso restrito.' }, 403);

      if (pathname === '/api/admin/profissionais' && method === 'GET') {
        const pros = (await db.prepare(
          `SELECT p.user_id, p.model, p.status, p.approved_at, p.updated_at, s.name AS space_name, u.name, u.username, u.email,
                  (SELECT COUNT(*) FROM space_links l WHERE l.space_id = p.space_id AND l.status = 'ativo') AS people
           FROM pro_profiles p JOIN spaces s ON s.id = p.space_id JOIN users u ON u.id = p.user_id ORDER BY p.approved_at DESC LIMIT 200`
        ).all()).results || [];
        const hist = (await db.prepare(
          `SELECT event_type, metadata, created_at FROM auth_audit_logs WHERE event_type LIKE 'PRO_%' ORDER BY created_at DESC LIMIT 30`
        ).all()).results || [];
        return reply({
          profissionais: pros.map((p) => ({ userId: p.user_id, name: p.name, username: p.username, email: p.email, model: p.model, modelLabel: MODELS[p.model], status: p.status, spaceName: p.space_name, approvedAt: p.approved_at, people: Number(p.people || 0) })),
          historico: hist.map((h) => { let m = {}; try { m = JSON.parse(h.metadata || '{}'); } catch { m = {}; } return { type: h.event_type, at: h.created_at, ...m }; })
        });
      }

      if (pathname === '/api/admin/profissionais/busca' && method === 'GET') {
        const q = clean(new URL(request.url).searchParams.get('q'), 120).replace(/^@/, '').toLowerCase();
        if (!q) return reply({ conta: null });
        const u = await db.prepare('SELECT id, name, username, email, created_at, role FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').bind(q, q).first();
        if (!u) return reply({ conta: null });
        const p = await proOf(db, u.id);
        return reply({ conta: { id: u.id, name: u.name, username: u.username, email: u.email, createdAt: u.created_at, role: u.role, pro: p ? { model: p.model, status: p.status, spaceName: p.space_name } : null } });
      }

      if (pathname === '/api/admin/profissionais' && method === 'POST') {
        const userId = clean(body.userId, 80);
        const model = String(body.model || '');
        const spaceName = clean(body.spaceName, 80);
        if (!MODELS[model]) return reply({ error: 'Escolha um modelo: Personal, Nutricionista ou Organização Clínica.' }, 400);
        if (spaceName.length < 2) return reply({ error: 'Dê um nome ao espaço.' }, 400);
        const u = await db.prepare('SELECT id, name, username FROM users WHERE id = ?').bind(userId).first();
        if (!u) return reply({ error: 'Conta não encontrada.' }, 404);
        if (await proOf(db, userId)) return reply({ error: 'Esta conta já tem modo profissional. Use suspender, reativar ou trocar o modelo.' }, 409);
        const spaceId = id('spc');
        await db.batch([
          db.prepare('INSERT INTO spaces (id, owner_user_id, model, name, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(spaceId, userId, model, spaceName, '{}', nowIso, nowIso),
          db.prepare('INSERT INTO pro_profiles (user_id, model, status, space_id, approved_by, approved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(userId, model, 'ativo', spaceId, me, nowIso, nowIso)
        ]);
        await audit('PRO_ACTIVATED', { target: u.username, model, spaceName });
        return reply({ success: true }, 201);
      }

      const one = pathname.match(/^\/api\/admin\/profissionais\/([^/]+)$/);
      if (one && method === 'PUT') {
        const p = await proOf(db, one[1]);
        if (!p) return reply({ error: 'Perfil profissional não encontrado.' }, 404);
        const u = await db.prepare('SELECT username FROM users WHERE id = ?').bind(one[1]).first();
        if (body.status !== undefined) {
          if (!['ativo', 'suspenso'].includes(body.status)) return reply({ error: 'Situação inválida.' }, 400);
          await db.prepare('UPDATE pro_profiles SET status = ?, updated_at = ? WHERE user_id = ?').bind(body.status, nowIso, one[1]).run();
          await audit(body.status === 'suspenso' ? 'PRO_SUSPENDED' : 'PRO_REACTIVATED', { target: u?.username, motivo: clean(body.motivo, 200) || undefined });
        }
        if (body.model !== undefined) {
          if (!MODELS[body.model]) return reply({ error: 'Modelo inválido.' }, 400);
          // Nada é convertido nem apagado: o que era do modelo anterior fica guardado.
          await db.batch([
            db.prepare('UPDATE pro_profiles SET model = ?, updated_at = ? WHERE user_id = ?').bind(body.model, nowIso, one[1]),
            db.prepare('UPDATE spaces SET model = ?, updated_at = ? WHERE id = ?').bind(body.model, nowIso, p.space_id)
          ]);
          await audit('PRO_MODEL_CHANGED', { target: u?.username, de: p.model, para: body.model });
        }
        return reply({ success: true });
      }
      return null;
    }

    // =====================================================================
    // CONVITES (qualquer pessoa logada)
    // =====================================================================
    if ((pathname === '/api/espacos/convites/previa' || pathname === '/api/espacos/convites/aceitar') && method === 'POST') {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const fails = Number((await db.prepare("SELECT COUNT(*) AS n FROM auth_audit_logs WHERE event_type = 'INVITE_FAILED' AND ip_address = ? AND created_at >= ?").bind(clientIp, since).first())?.n || 0);
      if (fails >= 10) return reply({ error: 'Muitas tentativas com códigos inválidos. Tente de novo em 15 minutos.' }, 429);
      const inv = await inviteFromCode(db, normalizeCode(body.code));
      if (!inviteUsable(inv, nowIso)) {
        await recordAuditLogEdge(storage, { eventType: 'INVITE_FAILED', userId: me, ipAddress: clientIp, userAgent, metadata: {}, correlationId });
        return reply({ error: INVALID_INVITE }, 404);
      }
      if (inv.owner_user_id === me) return reply({ error: 'Este convite é do seu próprio espaço.' }, 409);
      const link = await db.prepare("SELECT id FROM space_links WHERE space_id = ? AND client_id = ? AND status = 'ativo'").bind(inv.space_id, me).first();
      const member = inv.group_id ? await db.prepare("SELECT id FROM group_members WHERE group_id = ? AND client_id = ? AND status = 'ativa'").bind(inv.group_id, me).first() : null;
      const already = inv.group_id ? Boolean(member) : Boolean(link);
      const preview = {
        spaceName: inv.space_name, model: inv.space_model, modelLabel: MODELS[inv.space_model], proName: inv.owner_name,
        kind: inv.kind, groupName: inv.group_name || null, hasLink: Boolean(link), already, expiresAt: inv.expires_at
      };
      if (pathname.endsWith('/previa')) return reply({ convite: preview });

      // aceitar
      if (already) return reply({ success: true, already: true, convite: preview, message: inv.group_id ? 'Você já está nesta turma.' : 'Você já tem vínculo com este espaço.' });
      if (body.adult !== true) return reply({ error: 'Confirme que você tem 18 anos ou mais.', field: 'adult' }, 400);
      if (inv.max_members && inv.group_id) {
        const n = Number((await db.prepare("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND status = 'ativa'").bind(inv.group_id).first())?.n || 0);
        if (n >= inv.max_members) return reply({ error: 'Esta turma está cheia. Fale com o profissional.' }, 409);
      }
      // Uso do convite: condicional (dois pedidos ao mesmo tempo não passam do limite).
      const used = await db.prepare(
        'UPDATE space_invites SET uses = uses + 1 WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND (max_uses IS NULL OR uses < max_uses)'
      ).bind(inv.id, nowIso).run();
      if (!used?.meta?.changes) return reply({ error: INVALID_INVITE }, 404);
      await db.prepare("INSERT OR IGNORE INTO space_links (id, space_id, client_id, status, started_at) VALUES (?, ?, ?, 'ativo', ?)").bind(id('lnk'), inv.space_id, me, nowIso).run();
      const lk = await db.prepare("SELECT id FROM space_links WHERE space_id = ? AND client_id = ? AND status = 'ativo'").bind(inv.space_id, me).first();
      if (inv.group_id) {
        await db.prepare("INSERT OR IGNORE INTO group_members (id, group_id, link_id, client_id, status, joined_at) VALUES (?, ?, ?, ?, 'ativa', ?)").bind(id('mbr'), inv.group_id, lk.id, me, nowIso).run();
      }
      await audit('SPACE_JOINED', { space: inv.space_id, kind: inv.kind });
      return reply({ success: true, convite: preview }, 201);
    }

    // =====================================================================
    // PESSOA: meus espaços
    // =====================================================================
    if (pathname === '/api/espacos/meus' && method === 'GET') {
      const links = (await db.prepare(
        `SELECT l.id, l.space_id, l.started_at, s.name AS space_name, s.model, u.name AS pro_name, p.status AS pro_status
         FROM space_links l JOIN spaces s ON s.id = l.space_id JOIN users u ON u.id = s.owner_user_id LEFT JOIN pro_profiles p ON p.user_id = s.owner_user_id
         WHERE l.client_id = ? AND l.status = 'ativo' ORDER BY l.started_at`
      ).bind(me).all()).results || [];
      const groups = (await db.prepare(
        `SELECT m.id, m.link_id, m.joined_at, g.name, g.description FROM group_members m JOIN space_groups g ON g.id = m.group_id
         WHERE m.client_id = ? AND m.status = 'ativa' ORDER BY m.joined_at`
      ).bind(me).all()).results || [];
      return reply({
        espacos: links.map((l) => ({
          linkId: l.id, spaceName: l.space_name, model: l.model, modelLabel: MODELS[l.model], proName: l.pro_name, since: l.started_at, proSuspended: l.pro_status !== 'ativo',
          turmas: groups.filter((g) => g.link_id === l.id).map((g) => ({ memberId: g.id, name: g.name, description: g.description, since: g.joined_at }))
        }))
      });
    }
    const leaveGroup = pathname.match(/^\/api\/espacos\/meus\/turmas\/([^/]+)$/);
    if (leaveGroup && method === 'DELETE') {
      const m = await db.prepare("SELECT group_id FROM group_members WHERE id = ? AND client_id = ? AND status = 'ativa'").bind(leaveGroup[1], me).first();
      const r = await db.prepare("UPDATE group_members SET status = 'saiu', left_at = ? WHERE id = ? AND client_id = ? AND status = 'ativa'").bind(nowIso, leaveGroup[1], me).run();
      if (!r?.meta?.changes) return reply({ error: 'Participação não encontrada.' }, 404);
      // O que veio da turma fica com a pessoa, encerrado (só leitura). O vínculo continua.
      if (m) await endAssignments(db, { clientId: me, groupId: m.group_id, reason: 'saiu da turma' });
      return reply({ success: true });
    }
    const endMine = pathname.match(/^\/api\/espacos\/meus\/([^/]+)$/);
    if (endMine && method === 'DELETE') {
      const r = await db.prepare("UPDATE space_links SET status = 'encerrado', ended_at = ?, ended_by = ? WHERE id = ? AND client_id = ? AND status = 'ativo'").bind(nowIso, me, endMine[1], me).run();
      if (!r?.meta?.changes) return reply({ error: 'Vínculo não encontrado.' }, 404);
      await db.prepare("UPDATE group_members SET status = 'saiu', left_at = ? WHERE link_id = ? AND status = 'ativa'").bind(nowIso, endMine[1]).run();
      await endAssignments(db, { linkId: endMine[1], reason: 'vínculo encerrado' });
      await audit('SPACE_LINK_ENDED', { by: 'pessoa' });
      return reply({ success: true });
    }

    // =====================================================================
    // PROFISSIONAL: meu espaço (perfil ativo conferido no banco a cada pedido)
    // =====================================================================
    const pro = await proOf(db, me);
    if (pathname === '/api/espacos/meu' && method === 'GET') {
      if (!pro) return reply({ pro: null });
      if (pro.status !== 'ativo') return reply({ pro: { model: pro.model, modelLabel: MODELS[pro.model], status: pro.status, spaceName: pro.space_name } });
      const groups = (await db.prepare(
        `SELECT g.*, (SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id AND m.status = 'ativa') AS members,
                (SELECT MAX(expires_at) FROM space_invites i WHERE i.group_id = g.id AND i.revoked_at IS NULL AND i.expires_at > ?) AS invite_until,
                (SELECT id FROM space_invites i WHERE i.group_id = g.id AND i.revoked_at IS NULL AND i.expires_at > ? ORDER BY expires_at DESC LIMIT 1) AS invite_id
         FROM space_groups g WHERE g.space_id = ? AND g.status != 'arquivada' ORDER BY g.created_at`
      ).bind(nowIso, nowIso, pro.space_id).all()).results || [];
      const people = Number((await db.prepare("SELECT COUNT(*) AS n FROM space_links WHERE space_id = ? AND status = 'ativo'").bind(pro.space_id).first())?.n || 0);
      const recent = Number((await db.prepare("SELECT COUNT(*) AS n FROM space_links WHERE space_id = ? AND status = 'ativo' AND started_at >= ?").bind(pro.space_id, new Date(Date.now() - 7 * 86400000).toISOString()).first())?.n || 0);
      return reply({
        pro: { model: pro.model, modelLabel: MODELS[pro.model], peopleLabel: PEOPLE_LABEL[pro.model], status: pro.status, spaceName: pro.space_name },
        turmas: groups.map((g) => ({ id: g.id, name: g.name, description: g.description, status: g.status, members: Number(g.members || 0), inviteUntil: g.invite_until, inviteId: g.invite_id })),
        pessoas: { total: people, ultimos7dias: recent }
      });
    }
    if (!pathname.startsWith('/api/espacos/')) return null;
    if (!pro) return reply({ error: 'Você não tem um espaço profissional.' }, 403);
    if (pro.status !== 'ativo') return reply({ error: 'Seu espaço está suspenso. Fale com o suporte do Ethos.' }, 403);
    const groupOf = async (gid) => db.prepare('SELECT * FROM space_groups WHERE id = ? AND space_id = ?').bind(gid, pro.space_id).first();

    if (pathname === '/api/espacos/turmas' && method === 'POST') {
      const name = clean(body.name, 80);
      if (name.length < 2) return reply({ error: 'Dê um nome à turma.' }, 400);
      const status = body.status === 'rascunho' ? 'rascunho' : 'ativa';
      const gid = id('grp');
      await db.prepare('INSERT INTO space_groups (id, space_id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(gid, pro.space_id, name, clean(body.description, 240), status, nowIso, nowIso).run();
      return reply({ turma: { id: gid, name, status } }, 201);
    }

    const turma = pathname.match(/^\/api\/espacos\/turmas\/([^/]+)(\/[a-z]+)?(?:\/([^/]+))?$/);
    if (turma) {
      const g = await groupOf(turma[1]);
      if (!g) return reply({ error: 'Turma não encontrada.' }, 404);
      const sub = turma[2] || '';
      if (sub === '' && method === 'GET') {
        const members = (await db.prepare(
          `SELECT m.id, m.joined_at, u.name, u.username FROM group_members m JOIN users u ON u.id = m.client_id
           WHERE m.group_id = ? AND m.status = 'ativa' ORDER BY u.name`
        ).bind(g.id).all()).results || [];
        return reply({ turma: { id: g.id, name: g.name, description: g.description, status: g.status }, membros: members.map((m) => ({ memberId: m.id, name: m.name, username: m.username, since: m.joined_at })) });
      }
      if (sub === '' && method === 'PUT') {
        const name = body.name !== undefined ? clean(body.name, 80) : g.name;
        const status = ['rascunho', 'ativa', 'arquivada'].includes(body.status) ? body.status : g.status;
        if (name.length < 2) return reply({ error: 'Dê um nome à turma.' }, 400);
        await db.prepare('UPDATE space_groups SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?').bind(name, body.description !== undefined ? clean(body.description, 240) : g.description, status, nowIso, g.id).run();
        if (status === 'arquivada') await db.prepare('UPDATE space_invites SET revoked_at = ? WHERE group_id = ? AND revoked_at IS NULL').bind(nowIso, g.id).run();
        return reply({ success: true });
      }
      if (sub === '/convite' && method === 'POST') {
        if (g.status !== 'ativa') return reply({ error: 'Ative a turma para gerar convites.' }, 409);
        // Um código válido por turma: gerar outro revoga o anterior (quem já entrou continua).
        await db.prepare('UPDATE space_invites SET revoked_at = ? WHERE group_id = ? AND revoked_at IS NULL').bind(nowIso, g.id).run();
        const code = generateInviteCode();
        const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
        await db.prepare('INSERT INTO space_invites (id, space_id, group_id, kind, code_hash, expires_at, max_uses, uses, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?, ?)')
          .bind(id('inv'), pro.space_id, g.id, 'turma', await sha256Hex(normalizeCode(code)), expiresAt, me, nowIso).run();
        await audit('SPACE_INVITE_CREATED', { kind: 'turma' });
        return reply({ code, expiresAt }, 201);
      }
      if (sub === '/membros' && turma[3] && method === 'DELETE') {
        const mm = await db.prepare("SELECT client_id FROM group_members WHERE id = ? AND group_id = ? AND status = 'ativa'").bind(turma[3], g.id).first();
        const r = await db.prepare("UPDATE group_members SET status = 'removida', left_at = ? WHERE id = ? AND group_id = ? AND status = 'ativa'").bind(nowIso, turma[3], g.id).run();
        if (!r?.meta?.changes) return reply({ error: 'Participante não encontrado.' }, 404);
        if (mm) await endAssignments(db, { clientId: mm.client_id, groupId: g.id, reason: 'removida da turma' });
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    if (pathname === '/api/espacos/convite-individual' && method === 'POST') {
      const code = generateInviteCode();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
      await db.prepare('INSERT INTO space_invites (id, space_id, group_id, kind, code_hash, expires_at, max_uses, uses, created_by, created_at) VALUES (?, ?, NULL, ?, ?, ?, 1, 0, ?, ?)')
        .bind(id('inv'), pro.space_id, 'individual', await sha256Hex(normalizeCode(code)), expiresAt, me, nowIso).run();
      await audit('SPACE_INVITE_CREATED', { kind: 'individual' });
      return reply({ code, expiresAt }, 201);
    }

    const revoke = pathname.match(/^\/api\/espacos\/convites\/([^/]+)$/);
    if (revoke && method === 'DELETE') {
      const r = await db.prepare('UPDATE space_invites SET revoked_at = ? WHERE id = ? AND space_id = ? AND revoked_at IS NULL').bind(nowIso, revoke[1], pro.space_id).run();
      if (!r?.meta?.changes) return reply({ error: 'Convite não encontrado.' }, 404);
      await audit('SPACE_INVITE_REVOKED', {});
      return reply({ success: true });
    }

    if (pathname === '/api/espacos/pessoas' && method === 'GET') {
      const rows = (await db.prepare(
        `SELECT l.id, l.started_at, u.name, u.username FROM space_links l JOIN users u ON u.id = l.client_id
         WHERE l.space_id = ? AND l.status = 'ativo' ORDER BY u.name LIMIT 500`
      ).bind(pro.space_id).all()).results || [];
      const groups = (await db.prepare(
        `SELECT m.link_id, g.name FROM group_members m JOIN space_groups g ON g.id = m.group_id
         WHERE g.space_id = ? AND m.status = 'ativa'`
      ).bind(pro.space_id).all()).results || [];
      return reply({ pessoas: rows.map((r) => ({ linkId: r.id, name: r.name, username: r.username, since: r.started_at, turmas: groups.filter((g) => g.link_id === r.id).map((g) => g.name) })) });
    }
    const endLink = pathname.match(/^\/api\/espacos\/pessoas\/([^/]+)$/);
    if (endLink && method === 'DELETE') {
      const r = await db.prepare("UPDATE space_links SET status = 'encerrado', ended_at = ?, ended_by = ? WHERE id = ? AND space_id = ? AND status = 'ativo'").bind(nowIso, me, endLink[1], pro.space_id).run();
      if (!r?.meta?.changes) return reply({ error: 'Vínculo não encontrado.' }, 404);
      await db.prepare("UPDATE group_members SET status = 'removida', left_at = ? WHERE link_id = ? AND status = 'ativa'").bind(nowIso, endLink[1]).run();
      await endAssignments(db, { linkId: endLink[1], reason: 'vínculo encerrado' });
      await audit('SPACE_LINK_ENDED', { by: 'profissional' });
      return reply({ success: true });
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'Os espaços profissionais ainda não estão disponíveis neste ambiente.', code: 'espacos_indisponivel' }, 503);
    throw e;
  }
}
