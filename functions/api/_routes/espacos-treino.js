/**
 * Espaços, lote D2 (Personal): fichas com versões, atribuição a pessoa ou turma, adaptação individual,
 * acompanhamento das sessões e, do lado da pessoa, "Do seu personal".
 * Regras (docs/11):
 * - Só Personal ativo (o modelo é conferido no banco a cada pedido). Nutri e Clínica recebem 403.
 * - Versões de ficha são imutáveis. Atribuir cria UMA CÓPIA POR PESSOA (também quando é para a turma);
 *   adaptar a cópia de alguém não muda os colegas. Atribuir de novo não duplica (índice único parcial).
 * - O profissional vê só sessões ligadas às atribuições dele, de pessoas com vínculo ativo.
 * - A pessoa vê e treina só as atribuições dela; edita a cópia só se a atribuição (ou o padrão do espaço) permitir.
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { activeLinkById, isMissingTable, requirePro, settingsOf } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateNumber, validateText } from '../../../src/domain/validation.js';

const newId = (p) => `${p}_${crypto.randomUUID()}`;
const parse = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };

/** Conteúdo de ficha validado no servidor: 1 a 40 exercícios, números com limite, texto limpo. */
export function cleanWorkoutContent(content) {
  const list = Array.isArray(content?.exercises) ? content.exercises : null;
  if (!list || list.length === 0) return { error: 'A ficha precisa de pelo menos um exercício.' };
  if (list.length > 40) return { error: 'A ficha pode ter no máximo 40 exercícios.' };
  const exercises = [];
  for (const [i, e] of list.entries()) {
    const name = validateText(e?.name, { label: `O nome do exercício ${i + 1}`, max: 120, required: true });
    if (name.error) return { error: name.error };
    const sets = validateNumber(e?.sets ?? 3, { label: `As séries de ${name.value}`, min: 1, max: 20, integer: true });
    if (sets.error) return { error: sets.error };
    const reps = validateNumber(e?.reps ?? 10, { label: `As repetições de ${name.value}`, min: 0, max: 1000, integer: true });
    if (reps.error) return { error: reps.error };
    const weightKg = validateNumber(e?.weightKg ?? 0, { label: `A carga de ${name.value}`, min: 0, max: 1000, unit: 'kg' });
    if (weightKg.error) return { error: weightKg.error };
    const restSec = validateNumber(e?.restSec ?? 60, { label: `O descanso de ${name.value}`, min: 0, max: 900, integer: true, unit: 's' });
    if (restSec.error) return { error: restSec.error };
    const id = /^[A-Za-z0-9_-]{1,80}$/.test(String(e?.id || '')) ? String(e.id) : `ex_${i}_${crypto.randomUUID().slice(0, 8)}`;
    exercises.push({
      id, name: name.value, muscle: validateText(e?.muscle, { max: 60 }).value || '',
      sets: sets.value, reps: reps.value, weightKg: Math.round(weightKg.value * 10) / 10, restSec: restSec.value,
      showWeight: e?.showWeight !== false, showRestTimer: e?.showRestTimer !== false,
      note: validateText(e?.note, { max: 200 }).value || '',
      // Proposta 07: referência ao exercício da biblioteca (fe_*) ou personalizado (pz_*), para o mapa corporal.
      ...(/^(fe|pz)_[A-Za-z0-9_-]{1,90}$/.test(String(e?.libraryId || '')) ? { libraryId: String(e.libraryId) } : {})
    });
  }
  return { value: { exercises } };
}

function assignmentOut(a) {
  return {
    id: a.id, name: a.name, templateId: a.template_id, templateVersion: a.template_version, groupId: a.group_key || null,
    groupName: a.group_name || null, content: parse(a.content_json, { exercises: [] }), version: a.version, adapted: a.adapted === 1,
    allowClientEdit: a.allow_client_edit === null || a.allow_client_edit === undefined ? null : a.allow_client_edit === 1,
    status: a.status, endReason: a.end_reason, createdAt: a.created_at, updatedAt: a.updated_at, endedAt: a.ended_at
  };
}

function sessionSummary(s, doneSets) {
  const end = s.ended_at ? Date.parse(s.ended_at) : Date.now();
  const elapsed = Math.max(0, end - Date.parse(s.started_at) - Number(s.paused_ms || 0));
  return { id: s.id, assignmentId: s.assignment_id, name: s.name, status: s.status, startedAt: s.started_at, endedAt: s.ended_at, elapsedMs: elapsed, plannedSets: Number(s.planned_sets || 0), doneSets: Number(doneSets || 0) };
}

export async function handleEspacosTreinoRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody, clientIp, userAgent } = ctx;
  const isPro = pathname.startsWith('/api/espacos/fichas') || pathname === '/api/espacos/atribuir' || pathname.startsWith('/api/espacos/atribuicoes')
    || /^\/api\/espacos\/pessoas\/[^/]+\/acompanhamento$/.test(pathname) || pathname.startsWith('/api/espacos/sessoes/')
    || /^\/api\/espacos\/turmas\/[^/]+\/atribuicoes$/.test(pathname) || pathname === '/api/espacos/config';
  const isClient = pathname.startsWith('/api/treino/atribuidos');
  if (!isPro && !isClient) return null;
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
    // PESSOA: "Do seu personal"
    // =====================================================================
    if (isClient) {
      if (pathname === '/api/treino/atribuidos' && method === 'GET') {
        const rows = (await db.prepare(
          `SELECT a.*, s.name AS space_name, u.name AS pro_name, s.settings_json, g.name AS group_name,
                  (SELECT MAX(ws.started_at) FROM workout_sessions ws WHERE ws.assignment_id = a.id AND ws.user_id = a.client_id AND ws.status != 'em_andamento') AS last_session
           FROM assignments a JOIN spaces s ON s.id = a.space_id JOIN users u ON u.id = s.owner_user_id LEFT JOIN space_groups g ON g.id = a.group_key
           WHERE a.client_id = ? ORDER BY a.status = 'ativa' DESC, a.updated_at DESC LIMIT 100`
        ).bind(me).all()).results || [];
        return reply({
          atribuidos: rows.map((a) => {
            const spaceDefault = settingsOf({ settings_json: a.settings_json }).allowClientEdit === true;
            const out = assignmentOut(a);
            return { ...out, spaceName: a.space_name, proName: a.pro_name, lastSession: a.last_session, canEdit: a.status === 'ativa' && (out.allowClientEdit === null ? spaceDefault : out.allowClientEdit) };
          })
        });
      }
      const mine = pathname.match(/^\/api\/treino\/atribuidos\/([^/]+)$/);
      if (mine && method === 'PUT') {
        const a = await db.prepare('SELECT a.*, s.settings_json FROM assignments a JOIN spaces s ON s.id = a.space_id WHERE a.id = ? AND a.client_id = ?').bind(mine[1], me).first();
        if (!a) return reply({ error: 'Ficha não encontrada.' }, 404);
        if (a.status !== 'ativa') return reply({ error: 'Esta ficha foi encerrada e fica só para leitura.' }, 409);
        const spaceDefault = settingsOf({ settings_json: a.settings_json }).allowClientEdit === true;
        const allowed = a.allow_client_edit === null || a.allow_client_edit === undefined ? spaceDefault : a.allow_client_edit === 1;
        if (!allowed) return reply({ error: 'O profissional não liberou a edição desta ficha. Mudanças valem só na sessão.' }, 403);
        const c = cleanWorkoutContent(body.content);
        if (c.error) return reply({ error: c.error }, 400);
        const v = a.version + 1;
        await db.batch([
          db.prepare('INSERT INTO assignment_versions (id, assignment_id, version, content_json, author_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId('asv'), a.id, v, JSON.stringify(c.value), me, 'ajuste da pessoa', nowIso),
          db.prepare('UPDATE assignments SET content_json = ?, version = ?, adapted = 1, updated_at = ? WHERE id = ?').bind(JSON.stringify(c.value), v, nowIso, a.id)
        ]);
        return reply({ success: true, version: v });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // =====================================================================
    // PROFISSIONAL (Personal)
    // =====================================================================
    const gate = await requirePro(db, me, 'treino');
    if (gate.error) return reply({ error: gate.error }, gate.status);
    const pro = gate.pro;
    const tplOf = (id) => db.prepare('SELECT * FROM pro_templates WHERE id = ? AND space_id = ?').bind(id, pro.space_id).first();
    const versionOf = (tid, v) => db.prepare('SELECT * FROM pro_template_versions WHERE template_id = ? AND version = ?').bind(tid, v).first();
    const assignmentOfSpace = (id) => db.prepare(
      `SELECT a.*, g.name AS group_name FROM assignments a JOIN space_links l ON l.id = a.link_id LEFT JOIN space_groups g ON g.id = a.group_key
       WHERE a.id = ? AND a.space_id = ? AND l.status = 'ativo'`
    ).bind(id, pro.space_id).first();

    if (pathname === '/api/espacos/config' && method === 'PUT') {
      const settings = settingsOf(pro);
      if (body.allowClientEdit !== undefined) settings.allowClientEdit = body.allowClientEdit === true;
      await db.prepare('UPDATE spaces SET settings_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(settings), nowIso, pro.space_id).run();
      return reply({ settings });
    }

    // ---------- Fichas ----------
    if (pathname === '/api/espacos/fichas' && method === 'GET') {
      const rows = (await db.prepare(
        `SELECT t.*, v.content_json,
                (SELECT COUNT(*) FROM assignments a WHERE a.template_id = t.id AND a.status = 'ativa') AS active_assignments
         FROM pro_templates t JOIN pro_template_versions v ON v.template_id = t.id AND v.version = t.current_version
         WHERE t.space_id = ? ORDER BY t.status = 'ativa' DESC, t.updated_at DESC LIMIT 200`
      ).bind(pro.space_id).all()).results || [];
      return reply({
        fichas: rows.map((t) => ({ id: t.id, kind: t.kind, name: t.name, description: t.description, status: t.status, version: t.current_version, content: parse(t.content_json, { exercises: [] }), activeAssignments: Number(t.active_assignments || 0), updatedAt: t.updated_at })),
        config: { allowClientEdit: settingsOf(pro).allowClientEdit === true }
      });
    }
    if (pathname === '/api/espacos/fichas' && method === 'POST') {
      const name = validateText(body.name, { label: 'O nome da ficha', max: 80, required: true, min: 2 });
      if (name.error) return reply({ error: name.error, field: 'name' }, 400);
      const c = cleanWorkoutContent(body.content);
      if (c.error) return reply({ error: c.error }, 400);
      const tid = newId('tpl');
      await db.batch([
        db.prepare('INSERT INTO pro_templates (id, space_id, kind, name, description, status, current_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)')
          .bind(tid, pro.space_id, 'ficha', name.value, validateText(body.description, { max: 240 }).value || '', 'ativa', nowIso, nowIso),
        db.prepare('INSERT INTO pro_template_versions (id, template_id, version, content_json, created_by, created_at) VALUES (?, ?, 1, ?, ?, ?)').bind(newId('tpv'), tid, JSON.stringify(c.value), me, nowIso)
      ]);
      return reply({ ficha: { id: tid, version: 1 } }, 201);
    }

    const ficha = pathname.match(/^\/api\/espacos\/fichas\/([^/]+)(\/[a-z]+)?$/);
    if (ficha) {
      const t = await tplOf(ficha[1]);
      if (!t) return reply({ error: 'Ficha não encontrada.' }, 404);
      const sub = ficha[2] || '';
      if (sub === '' && method === 'GET') {
        const versions = (await db.prepare('SELECT version, created_at FROM pro_template_versions WHERE template_id = ? ORDER BY version DESC').bind(t.id).all()).results || [];
        const cur = await versionOf(t.id, t.current_version);
        const assigned = (await db.prepare(
          `SELECT a.id, a.template_version, a.adapted, a.group_key, g.name AS group_name, u.name AS person
           FROM assignments a JOIN users u ON u.id = a.client_id JOIN space_links l ON l.id = a.link_id LEFT JOIN space_groups g ON g.id = a.group_key
           WHERE a.template_id = ? AND a.status = 'ativa' AND l.status = 'ativo' ORDER BY u.name`
        ).bind(t.id).all()).results || [];
        return reply({
          ficha: { id: t.id, name: t.name, description: t.description, status: t.status, version: t.current_version, content: parse(cur?.content_json, { exercises: [] }) },
          versoes: versions.map((v) => ({ version: v.version, createdAt: v.created_at })),
          atribuicoes: assigned.map((a) => ({ id: a.id, person: a.person, version: a.template_version, adapted: a.adapted === 1, groupName: a.group_name }))
        });
      }
      if (sub === '' && method === 'PUT') {
        const name = body.name !== undefined ? validateText(body.name, { label: 'O nome da ficha', max: 80, required: true, min: 2 }) : { value: t.name };
        if (name.error) return reply({ error: name.error, field: 'name' }, 400);
        const status = ['ativa', 'arquivada'].includes(body.status) ? body.status : t.status;
        await db.prepare('UPDATE pro_templates SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?')
          .bind(name.value, body.description !== undefined ? validateText(body.description, { max: 240 }).value : t.description, status, nowIso, t.id).run();
        return reply({ success: true });
      }
      if (sub === '/versoes' && method === 'POST') {
        const c = cleanWorkoutContent(body.content);
        if (c.error) return reply({ error: c.error }, 400);
        const v = t.current_version + 1;
        await db.batch([
          db.prepare('INSERT INTO pro_template_versions (id, template_id, version, content_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(newId('tpv'), t.id, v, JSON.stringify(c.value), me, nowIso),
          db.prepare('UPDATE pro_templates SET current_version = ?, updated_at = ? WHERE id = ?').bind(v, nowIso, t.id)
        ]);
        return reply({ version: v }, 201);
      }
      // Levar a versão atual a cópias escolhidas (cópias adaptadas só se escolhidas explicitamente).
      if (sub === '/atualizar' && method === 'POST') {
        const ids = Array.isArray(body.assignmentIds) ? body.assignmentIds.map(String).slice(0, 500) : [];
        if (!ids.length) return reply({ error: 'Escolha quem recebe a versão nova.' }, 400);
        const cur = await versionOf(t.id, t.current_version);
        let updated = 0;
        for (const aid of ids) {
          const a = await assignmentOfSpace(aid);
          if (!a || a.template_id !== t.id || a.status !== 'ativa') continue;
          const v = a.version + 1;
          await db.batch([
            db.prepare('INSERT INTO assignment_versions (id, assignment_id, version, content_json, author_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId('asv'), a.id, v, cur.content_json, me, `versão ${t.current_version} da ficha`, nowIso),
            db.prepare('UPDATE assignments SET content_json = ?, template_version = ?, version = ?, adapted = 0, name = ?, updated_at = ? WHERE id = ?').bind(cur.content_json, t.current_version, v, t.name, nowIso, a.id)
          ]);
          updated++;
        }
        return reply({ updated });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // ---------- Atribuir (prévia e confirmação; idempotente) ----------
    if (pathname === '/api/espacos/atribuir' && method === 'POST') {
      const t = await tplOf(String(body.templateId || ''));
      if (!t || t.status !== 'ativa') return reply({ error: 'Ficha não encontrada.' }, 404);
      const cur = await versionOf(t.id, t.current_version);
      let recipients = [];
      let groupKey = '';
      if (body.groupId) {
        const g = await db.prepare("SELECT id, name FROM space_groups WHERE id = ? AND space_id = ? AND status != 'arquivada'").bind(String(body.groupId), pro.space_id).first();
        if (!g) return reply({ error: 'Turma não encontrada.' }, 404);
        groupKey = g.id;
        recipients = (await db.prepare(
          `SELECT l.id AS link_id, l.client_id, u.name FROM group_members m JOIN space_links l ON l.id = m.link_id JOIN users u ON u.id = l.client_id
           WHERE m.group_id = ? AND m.status = 'ativa' AND l.status = 'ativo' ORDER BY u.name`
        ).bind(g.id).all()).results || [];
      } else if (Array.isArray(body.linkIds) && body.linkIds.length) {
        for (const lid of body.linkIds.map(String).slice(0, 200)) {
          const l = await activeLinkById(db, pro.space_id, lid);
          if (l) recipients.push({ link_id: l.id, client_id: l.client_id, name: l.name });
        }
      } else {
        return reply({ error: 'Escolha a turma ou as pessoas.' }, 400);
      }
      if (!recipients.length) return reply({ error: 'Ninguém para receber. A turma está vazia?' }, 400);
      const plan = [];
      for (const r of recipients) {
        const existing = await db.prepare("SELECT id, adapted FROM assignments WHERE space_id = ? AND client_id = ? AND template_id = ? AND group_key = ? AND status = 'ativa'").bind(pro.space_id, r.client_id, t.id, groupKey).first();
        plan.push({ linkId: r.link_id, clientId: r.client_id, name: r.name, already: Boolean(existing), adapted: existing?.adapted === 1 });
      }
      const toCreate = plan.filter((p) => !p.already);
      if (body.preview === true) {
        return reply({ previa: { ficha: t.name, version: t.current_version, total: plan.length, novos: toCreate.length, pessoas: plan.map((p) => ({ name: p.name, already: p.already, adapted: p.adapted })) } });
      }
      const stmts = toCreate.map((p) => db.prepare(
        `INSERT OR IGNORE INTO assignments (id, space_id, link_id, client_id, kind, template_id, template_version, group_key, name, content_json, version, adapted, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'treino', ?, ?, ?, ?, ?, 1, 0, 'ativa', ?, ?, ?)`
      ).bind(newId('asg'), pro.space_id, p.linkId, p.clientId, t.id, t.current_version, groupKey, t.name, cur.content_json, me, nowIso, nowIso));
      if (stmts.length) await db.batch(stmts);
      await audit('SPACE_ASSIGNED', { kind: 'treino', count: toCreate.length, turma: Boolean(groupKey) });
      return reply({ created: toCreate.length, skipped: plan.length - toCreate.length }, 201);
    }

    // ---------- Atribuição: adaptar, permissão, encerrar ----------
    const asg = pathname.match(/^\/api\/espacos\/atribuicoes\/([^/]+)(\/permissao)?$/);
    if (asg) {
      const a = await assignmentOfSpace(asg[1]);
      if (!a) return reply({ error: 'Atribuição não encontrada.' }, 404);
      if (asg[2] && method === 'PUT') {
        const v = body.allowClientEdit === null ? null : body.allowClientEdit === true ? 1 : 0;
        await db.prepare('UPDATE assignments SET allow_client_edit = ?, updated_at = ? WHERE id = ?').bind(v, nowIso, a.id).run();
        return reply({ success: true });
      }
      if (!asg[2] && method === 'PUT') {
        if (a.status !== 'ativa') return reply({ error: 'Atribuição encerrada.' }, 409);
        const c = cleanWorkoutContent(body.content);
        if (c.error) return reply({ error: c.error }, 400);
        const v = a.version + 1;
        await db.batch([
          db.prepare('INSERT INTO assignment_versions (id, assignment_id, version, content_json, author_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId('asv'), a.id, v, JSON.stringify(c.value), me, validateText(body.note, { max: 200 }).value || 'adaptação individual', nowIso),
          db.prepare('UPDATE assignments SET content_json = ?, version = ?, adapted = 1, updated_at = ? WHERE id = ?').bind(JSON.stringify(c.value), v, nowIso, a.id)
        ]);
        return reply({ version: v });
      }
      if (!asg[2] && method === 'DELETE') {
        await db.prepare("UPDATE assignments SET status = 'encerrada', end_reason = 'profissional', ended_at = ?, updated_at = ? WHERE id = ? AND status = 'ativa'").bind(nowIso, nowIso, a.id).run();
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // ---------- Atribuições de uma turma ----------
    const tAsg = pathname.match(/^\/api\/espacos\/turmas\/([^/]+)\/atribuicoes$/);
    if (tAsg && method === 'GET') {
      const g = await db.prepare('SELECT id FROM space_groups WHERE id = ? AND space_id = ?').bind(tAsg[1], pro.space_id).first();
      if (!g) return reply({ error: 'Turma não encontrada.' }, 404);
      const rows = (await db.prepare(
        `SELECT a.template_id, MAX(a.name) AS name, COUNT(*) AS people, SUM(a.adapted) AS adapted, MIN(a.template_version) AS vmin, MAX(a.template_version) AS vmax, MIN(a.created_at) AS since
         FROM assignments a JOIN space_links l ON l.id = a.link_id
         WHERE a.space_id = ? AND a.group_key = ? AND a.status = 'ativa' AND l.status = 'ativo' GROUP BY a.template_id ORDER BY since`
      ).bind(pro.space_id, g.id).all()).results || [];
      return reply({ atribuicoes: rows.map((r) => ({ templateId: r.template_id, name: r.name, people: Number(r.people), adapted: Number(r.adapted || 0), version: r.vmin === r.vmax ? r.vmax : `${r.vmin}–${r.vmax}`, since: r.since })) });
    }

    // ---------- Área individual: acompanhamento ----------
    const ind = pathname.match(/^\/api\/espacos\/pessoas\/([^/]+)\/acompanhamento$/);
    if (ind && method === 'GET') {
      const l = await activeLinkById(db, pro.space_id, ind[1]);
      if (!l) return reply({ error: 'Pessoa não encontrada ou sem vínculo ativo.' }, 404);
      const asgs = (await db.prepare(
        `SELECT a.*, g.name AS group_name FROM assignments a LEFT JOIN space_groups g ON g.id = a.group_key
         WHERE a.link_id = ? ORDER BY a.status = 'ativa' DESC, a.updated_at DESC LIMIT 50`
      ).bind(l.id).all()).results || [];
      const since = new Date(Date.now() - 28 * 86400000).toISOString();
      const sessions = (await db.prepare(
        `SELECT s.*, (SELECT COUNT(*) FROM workout_sets t WHERE t.session_id = s.id) AS done_sets FROM workout_sessions s
         WHERE s.user_id = ? AND s.status != 'em_andamento' AND s.started_at >= ?
           AND s.assignment_id IN (SELECT id FROM assignments WHERE link_id = ?)
         ORDER BY s.started_at DESC LIMIT 60`
      ).bind(l.client_id, since, l.id).all()).results || [];
      return reply({
        pessoa: { linkId: l.id, name: l.name, username: l.username, since: l.started_at },
        atribuicoes: asgs.map(assignmentOut),
        sessoes: sessions.map((s) => sessionSummary(s, s.done_sets)),
        config: { allowClientEdit: settingsOf(pro).allowClientEdit === true }
      });
    }

    // ---------- Sessão (planejado x realizado), só das atribuições do espaço ----------
    const ses = pathname.match(/^\/api\/espacos\/sessoes\/([^/]+)$/);
    if (ses && method === 'GET') {
      const s = await db.prepare(
        `SELECT s.* FROM workout_sessions s JOIN assignments a ON a.id = s.assignment_id JOIN space_links l ON l.id = a.link_id
         WHERE s.id = ? AND a.space_id = ? AND l.status = 'ativo' AND s.user_id = a.client_id`
      ).bind(ses[1], pro.space_id).first();
      if (!s) return reply({ error: 'Sessão não encontrada.' }, 404);
      const sets = (await db.prepare('SELECT exercise_key, exercise_name, set_no, metric, weight_kg, reps, seconds FROM workout_sets WHERE session_id = ? ORDER BY exercise_key, set_no').bind(s.id).all()).results || [];
      return reply({ sessao: { ...sessionSummary(s, sets.length), content: parse(s.content_json, { exercises: [] }), sets: sets.map((x) => ({ exerciseKey: x.exercise_key, setNo: x.set_no, metric: x.metric, weightKg: x.weight_kg, reps: x.reps, seconds: x.seconds })) } });
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'Esta parte dos espaços ainda não está disponível neste ambiente.', code: 'espacos_indisponivel' }, 503);
    throw e;
  }
}

