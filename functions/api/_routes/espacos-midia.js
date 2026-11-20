/**
 * Espaços, proposta 07 (decisão 5): foto redonda do profissional e capa retangular de cada turma,
 * tela da turma para o aluno e denúncia de imagem.
 * Regras:
 * - Só o dono do espaço (perfil ativo, qualquer modelo) troca foto e capa. Tipo conferido pelos bytes (JPEG, PNG, WebP);
 *   foto até 1 MB, capa até 2 MB. O navegador recorta e reduz antes de enviar (e isso descarta metadados como GPS).
 * - Arquivos no R2 (binding MIDIA) com chave aleatória; servidos por /api/midia/<chave> sem login (são só imagens de capa).
 * - O aluno vê a própria turma: treinos atribuídos a ele, avisos recebidos, eventos aceitos e notificações do espaço.
 *   A lista de colegas nunca é devolvida.
 * - Participante denuncia uma imagem; o admin vê as denúncias e pode remover a imagem.
 * Tabelas da migração 0015; sem elas (ou sem o R2), 503 com código.
 */
import { isMissingTable, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateText } from '../../../src/domain/validation.js';

const LIMITS = { foto: 1024 * 1024, capa: 2 * 1024 * 1024 };
const KEY_RE = /^m_[0-9a-f-]{36}$/;
export const mediaUrl = (key) => (key ? `/api/midia/${key}` : null);

/** Decodifica um data URL de imagem e confere o tipo pelos primeiros bytes. */
export function decodeImage(dataUrl, max) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'Envie uma imagem JPG, PNG ou WebP.' };
  if (m[2].length > Math.ceil((max * 4) / 3) + 8) return { error: `A imagem pode ter no máximo ${Math.round(max / 1024 / 1024)} MB.` };
  let bin;
  try { bin = atob(m[2]); } catch { return { error: 'Imagem inválida.' }; }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  if (bytes.length > max) return { error: `A imagem pode ter no máximo ${Math.round(max / 1024 / 1024)} MB.` };
  const is = (sig, off = 0) => sig.every((b, i) => bytes[off + i] === b);
  const type = is([0xff, 0xd8, 0xff]) ? 'image/jpeg' : is([0x89, 0x50, 0x4e, 0x47]) ? 'image/png' : is([0x52, 0x49, 0x46, 0x46]) && is([0x57, 0x45, 0x42, 0x50], 8) ? 'image/webp' : null;
  if (!type || type !== m[1]) return { error: 'O arquivo não é uma imagem JPG, PNG ou WebP válida.' };
  return { bytes, type };
}

/** Rota pública: entrega a imagem pela chave aleatória. */
export async function handleMidiaPublica(ctx) {
  const { pathname, method, env } = ctx;
  const m = pathname.match(/^\/api\/midia\/([^/]+)$/);
  if (!m || method !== 'GET') return null;
  if (!KEY_RE.test(m[1]) || !env?.MIDIA) return new Response('Não encontrado', { status: 404 });
  const obj = await env.MIDIA.get(m[1]);
  if (!obj) return new Response('Não encontrado', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'"
    }
  });
}

async function mediaOf(db, spaceId) {
  try {
    return (await db.prepare('SELECT group_id, kind, media_key FROM space_media WHERE space_id = ?').bind(spaceId).all()).results || [];
  } catch (e) {
    if (isMissingTable(e)) return [];
    throw e;
  }
}

export async function handleEspacosMidiaRoutes(ctx) {
  const { request, correlationId, pathname, method, env, storage, authClaims, rawBody } = ctx;
  const proRoute = pathname === '/api/espacos/midia' || pathname === '/api/espacos/midia/foto' || /^\/api\/espacos\/turmas\/[^/]+\/capa$/.test(pathname);
  const alunoRoute = /^\/api\/espacos\/meus\/turmas\/[^/]+(\/denunciar)?$/.test(pathname) && (method === 'GET' || pathname.endsWith('/denunciar'));
  const adminRoute = pathname.startsWith('/api/admin/midia');
  if (!proRoute && !alunoRoute && !adminRoute) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();

  try {
    // ---------------- Profissional: foto e capa ----------------
    if (proRoute) {
      const gate = await requirePro(db, me);
      if (gate.error) return reply({ error: gate.error }, gate.status);
      const space = gate.pro.space_id;
      if (pathname === '/api/espacos/midia' && method === 'GET') {
        const rows = await mediaOf(db, space);
        return reply({ foto: mediaUrl(rows.find((r) => r.kind === 'foto' && !r.group_id)?.media_key), capas: Object.fromEntries(rows.filter((r) => r.kind === 'capa').map((r) => [r.group_id, mediaUrl(r.media_key)])) });
      }
      const turma = pathname.match(/^\/api\/espacos\/turmas\/([^/]+)\/capa$/);
      const kind = turma ? 'capa' : 'foto';
      let groupId = '';
      if (turma) {
        const g = await db.prepare("SELECT id FROM space_groups WHERE id = ? AND space_id = ? AND status != 'arquivada'").bind(turma[1], space).first();
        if (!g) return reply({ error: 'Turma não encontrada.' }, 404);
        groupId = g.id;
      }
      if (!env?.MIDIA) return reply({ error: 'O envio de imagens ainda não está disponível.', code: 'midia_indisponivel' }, 503);
      const old = await db.prepare('SELECT media_key FROM space_media WHERE space_id = ? AND group_id = ? AND kind = ?').bind(space, groupId, kind).first();
      if (method === 'DELETE') {
        if (old) {
          await db.prepare('DELETE FROM space_media WHERE space_id = ? AND group_id = ? AND kind = ?').bind(space, groupId, kind).run();
          await env.MIDIA.delete(old.media_key);
        }
        return reply({ success: true });
      }
      if (method !== 'PUT') return reply({ error: 'Rota não encontrada.' }, 404);
      const img = decodeImage(body.dataUrl, LIMITS[kind]);
      if (img.error) return reply({ error: img.error }, 400);
      const key = `m_${crypto.randomUUID()}`;
      await env.MIDIA.put(key, img.bytes, { httpMetadata: { contentType: img.type } });
      await db.prepare(
        `INSERT INTO space_media (space_id, group_id, kind, media_key, content_type, size_bytes, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(space_id, group_id, kind) DO UPDATE SET media_key = excluded.media_key, content_type = excluded.content_type, size_bytes = excluded.size_bytes, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
      ).bind(space, groupId, kind, key, img.type, img.bytes.length, me, nowIso).run();
      if (old) await env.MIDIA.delete(old.media_key);
      return reply({ success: true, url: mediaUrl(key) });
    }

    // ---------------- Aluno: tela da turma e denúncia ----------------
    if (alunoRoute) {
      const mid = pathname.split('/')[5];
      const m = await db.prepare(
        `SELECT m.id, m.group_id, m.link_id, m.joined_at, g.name, g.description, s.id AS space_id, s.name AS space_name, s.model, u.name AS pro_name
         FROM group_members m JOIN space_groups g ON g.id = m.group_id JOIN space_links l ON l.id = m.link_id AND l.status = 'ativo'
         JOIN spaces s ON s.id = g.space_id JOIN users u ON u.id = s.owner_user_id
         WHERE m.id = ? AND m.client_id = ? AND m.status = 'ativa'`
      ).bind(mid, me).first();
      if (!m) return reply({ error: 'Turma não encontrada.' }, 404);
      const media = await mediaOf(db, m.space_id);
      const fotoKey = media.find((r) => r.kind === 'foto' && !r.group_id)?.media_key || null;
      const capaKey = media.find((r) => r.kind === 'capa' && r.group_id === m.group_id)?.media_key || null;

      if (pathname.endsWith('/denunciar')) {
        if (method !== 'POST') return reply({ error: 'Rota não encontrada.' }, 404);
        const key = body.kind === 'foto' ? fotoKey : body.kind === 'capa' ? capaKey : null;
        if (!key) return reply({ error: 'Não há imagem para denunciar.' }, 400);
        const reason = validateText(body.reason, { label: 'O motivo', max: 280, multiline: true });
        if (reason.error) return reply({ error: reason.error }, 400);
        await db.prepare('INSERT OR IGNORE INTO space_media_reports (id, space_id, media_key, reporter_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(`rep_${crypto.randomUUID()}`, m.space_id, key, me, reason.value || null, 'aberta', nowIso).run();
        return reply({ success: true });
      }

      const safe = async (fn, fb) => { try { return await fn(); } catch (e) { if (isMissingTable(e)) return fb; throw e; } };
      const treinos = await safe(async () => (await db.prepare(
        `SELECT id, name, content_json, version, adapted, group_key, updated_at FROM assignments
         WHERE client_id = ? AND space_id = ? AND status = 'ativa' AND (group_key = ? OR group_key IS NULL OR group_key = '') ORDER BY updated_at DESC LIMIT 50`
      ).bind(me, m.space_id, m.group_id).all()).results || [], []);
      const avisos = await safe(async () => (await db.prepare(
        `SELECT p.id, p.title, p.created_at, p.group_id, r.read_at FROM space_post_recipients r JOIN space_posts p ON p.id = r.post_id
         WHERE r.user_id = ? AND p.space_id = ? AND p.status = 'publicado' ORDER BY p.created_at DESC LIMIT 30`
      ).bind(me, m.space_id).all()).results || [], []);
      const eventos = await safe(async () => (await db.prepare(
        `SELECT e.id, e.title, e.starts_at, e.ends_at, e.location, e.group_id FROM space_event_invites i JOIN space_events e ON e.id = i.event_id
         WHERE i.user_id = ? AND e.space_id = ? AND i.status = 'aceito' AND e.status = 'ativo' AND e.ends_at > ? ORDER BY e.starts_at LIMIT 20`
      ).bind(me, m.space_id, nowIso).all()).results || [], []);
      const notificacoes = await safe(async () => (await db.prepare(
        "SELECT id, type, created_at FROM notifications WHERE user_id = ? AND space_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 20"
      ).bind(me, m.space_id).all()).results || [], []);
      const parse = (s) => { try { return JSON.parse(s); } catch { return { exercises: [] }; } };
      return reply({
        turma: { memberId: m.id, name: m.name, description: m.description, since: m.joined_at, capaUrl: mediaUrl(capaKey) },
        espaco: { name: m.space_name, model: m.model, proName: m.pro_name, fotoUrl: mediaUrl(fotoKey) },
        treinos: treinos.map((a) => ({ id: a.id, name: a.name, exercises: (parse(a.content_json).exercises || []).length, adapted: a.adapted === 1, daTurma: a.group_key === m.group_id, updatedAt: a.updated_at })),
        avisos: avisos.map((p) => ({ id: p.id, title: p.title, createdAt: p.created_at, novo: !p.read_at, daTurma: p.group_id === m.group_id })),
        eventos: eventos.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, endsAt: e.ends_at, location: e.location, daTurma: e.group_id === m.group_id })),
        notificacoes: notificacoes.map((n) => ({ id: n.id, type: n.type, createdAt: n.created_at }))
      });
    }

    // ---------------- Admin: denúncias de imagem ----------------
    if (authClaims.role !== 'admin') return reply({ error: 'Acesso restrito.' }, 403);
    if (pathname === '/api/admin/midia/denuncias' && method === 'GET') {
      const rows = (await db.prepare(
        `SELECT r.media_key, r.space_id, s.name AS space_name, COUNT(*) AS n, MAX(r.created_at) AS last, GROUP_CONCAT(COALESCE(r.reason, ''), ' | ') AS reasons,
                (SELECT kind FROM space_media sm WHERE sm.media_key = r.media_key) AS kind
         FROM space_media_reports r LEFT JOIN spaces s ON s.id = r.space_id WHERE r.status = 'aberta' GROUP BY r.media_key ORDER BY last DESC LIMIT 100`
      ).all()).results || [];
      return reply({ denuncias: rows.map((r) => ({ mediaKey: r.media_key, url: r.kind ? mediaUrl(r.media_key) : null, kind: r.kind || 'removida', spaceName: r.space_name, total: Number(r.n), last: r.last, reasons: String(r.reasons || '').split(' | ').filter(Boolean).slice(0, 5) })) });
    }
    const acao = pathname.match(/^\/api\/admin\/midia\/denuncias\/(m_[0-9a-f-]{36})$/);
    if (acao && method === 'POST') {
      if (body.acao === 'remover') {
        await db.prepare('DELETE FROM space_media WHERE media_key = ?').bind(acao[1]).run();
        if (env?.MIDIA) await env.MIDIA.delete(acao[1]);
      } else if (body.acao !== 'ignorar') return reply({ error: 'Ação inválida.' }, 400);
      await db.prepare("UPDATE space_media_reports SET status = 'resolvida' WHERE media_key = ?").bind(acao[1]).run();
      return reply({ success: true });
    }
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'Esta função ainda não está disponível neste ambiente.', code: 'midia_indisponivel' }, 503);
    throw e;
  }
}
