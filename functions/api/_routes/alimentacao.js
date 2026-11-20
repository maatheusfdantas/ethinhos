/**
 * Alimentação (lote E, Nutricionista): planos por paciente com versões imutáveis, publicação com data de início,
 * encerramento, modelos reaproveitáveis e, do lado da pessoa, o registro das refeições.
 * Regras (docs/10, 7.4 e 7.5; docs/11, seção 4):
 * - Só Nutricionista ativa (modelo conferido no banco a cada pedido). Personal e Clínica recebem 403.
 * - A nutricionista vê só planos do próprio espaço e de vínculos ativos. Encerrado o vínculo, perde o acesso;
 *   a pessoa mantém planos e registros, só para leitura.
 * - Um plano em andamento por vínculo. Publicar cria uma versão imutável que vale a partir da data de início;
 *   até lá, a versão anterior continua valendo. Cada registro fica ligado à versão do dia.
 * - Registro do dia = refeições previstas com registro ÷ previstas (extra fora do denominador).
 *   Relação com o plano = só contagens por situação, sem nota.
 * Tabelas da migração 0013; sem ela, 503 com código.
 */
import { recordAuditLogEdge } from '../_lib/audit.js';
import { activeLinkById, isMissingTable, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateDate, validateText } from '../../../src/domain/validation.js';
import {
  addDays, cleanMealPlanContent, dayNumbers, groupFor, mondayOf, starterContent, STATUS_KEYS, subsOf, sumCounts, versionFor
} from '../../../src/components/alimentacao/planoModel.js';

const newId = (p) => `${p}_${crypto.randomUUID()}`;
const parse = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };
const utcToday = () => new Date().toISOString().slice(0, 10);
const LOG_WINDOW_DAYS = 14;

/** "Hoje" da pessoa (data local enviada pelo navegador), aceito só se estiver a no máximo 1 dia do UTC. */
export function todayFrom(raw) {
  const s = utcToday();
  const v = validateDate(raw);
  if (v.error || v.value < addDays(s, -1) || v.value > addDays(s, 1)) return s;
  return v.value;
}

function fmtBr(dateStr) {
  const [y, m, d] = String(dateStr).split('-');
  return y && m && d ? `${d}/${m}` : String(dateStr || '');
}

async function versionsOf(db, planIds) {
  const ids = [...new Set(planIds)].slice(0, 100);
  if (!ids.length) return {};
  const rows = (await db.prepare(
    `SELECT plan_id, version, name, content_json, starts_on, published_at FROM meal_plan_versions WHERE plan_id IN (${ids.map(() => '?').join(',')}) ORDER BY version`
  ).bind(...ids).all()).results || [];
  const out = {};
  for (const r of rows) (out[r.plan_id] ||= []).push({ version: r.version, name: r.name, startsOn: r.starts_on, publishedAt: r.published_at, content: parse(r.content_json, {}) });
  return out;
}

/** Plano que vale numa data (null se ainda não começou, já terminou ou foi encerrado antes). */
export function planOnDate(plan, versions, date) {
  if (plan.ends_on && date > plan.ends_on) return null;
  if (plan.status === 'encerrado' && plan.ended_at && date > plan.ended_at.slice(0, 10)) return null;
  const v = versionFor(versions, date);
  if (!v) return null;
  const g = groupFor(v.content, date);
  return { version: v, group: g, meals: g?.meals || [] };
}

/** Números por dia num intervalo (dias depois de "hoje" vêm marcados como futuros e não contam). */
export function rangeNumbers(plan, versions, logs, from, to, today) {
  const byDate = {};
  for (const l of logs) (byDate[l.date] ||= {})[l.meal_key] = l;
  const days = [];
  for (let d = from, i = 0; d <= to && i < 62; d = addDays(d, 1), i += 1) {
    const p = planOnDate(plan, versions, d);
    const n = dayNumbers(p ? p.meals : [], byDate[d] || {});
    const extras = Object.keys(byDate[d] || {}).filter((k) => k.startsWith('extra:')).length;
    days.push({ date: d, futuro: d > today, version: p?.version.version || null, ...n, extras });
  }
  const past = days.filter((x) => !x.futuro);
  return {
    days,
    total: { previstas: past.reduce((a, x) => a + x.previstas, 0), registradas: past.reduce((a, x) => a + x.registradas, 0), counts: sumCounts(past.map((x) => x.counts)), extras: past.reduce((a, x) => a + x.extras, 0) }
  };
}

function versionMeta(v) {
  return v ? { version: v.version, name: v.name, startsOn: v.startsOn, publishedAt: v.publishedAt } : null;
}

function planMeta(p, versions, today) {
  const vig = versionFor(versions, today);
  const next = versions.filter((v) => v.startsOn > today).sort((a, b) => a.startsOn.localeCompare(b.startsOn) || b.version - a.version)[0] || null;
  const terminou = Boolean(p.ends_on && p.ends_on < today);
  return {
    id: p.id, name: p.name, status: p.status, spaceName: p.space_name || null, proName: p.pro_name || null,
    endsOn: p.ends_on || null, endedAt: p.ended_at || null, endReason: p.end_reason || null, currentVersion: p.current_version,
    vigente: p.status === 'encerrado' || terminou ? null : versionMeta(vig), proxima: p.status === 'encerrado' ? null : versionMeta(next),
    versoes: versions.map(versionMeta), ativo: p.status === 'publicado' && !terminou
  };
}

export async function handleAlimentacaoRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody, clientIp, userAgent } = ctx;
  const isPro = pathname.startsWith('/api/espacos/planos') || /^\/api\/espacos\/pessoas\/[^/]+\/(plano|alimentacao)$/.test(pathname)
    || /^\/api\/espacos\/turmas\/[^/]+\/planos$/.test(pathname);
  const isClient = pathname === '/api/alimentacao' || pathname.startsWith('/api/alimentacao/');
  if (!isPro && !isClient) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const q = (k) => url?.searchParams?.get(k) || '';
  const nowIso = new Date().toISOString();
  const audit = (eventType, metadata = {}) => recordAuditLogEdge(storage, { eventType, userId: me, ipAddress: clientIp, userAgent, metadata, correlationId });

  try {
    // =====================================================================
    // PESSOA: Alimentação (só planos com versão publicada; rascunho é da nutricionista)
    // =====================================================================
    if (isClient) {
      const today = todayFrom(q('hoje') || body.hoje);
      const myPlan = async (planId) => db.prepare(
        `SELECT p.*, s.name AS space_name, u.name AS pro_name,
                (SELECT l.status FROM space_links l WHERE l.id = p.link_id) AS link_status
         FROM meal_plans p LEFT JOIN spaces s ON s.id = p.space_id LEFT JOIN users u ON u.id = s.owner_user_id
         WHERE p.id = ? AND p.client_id = ? AND p.current_version > 0`
      ).bind(String(planId || ''), me).first();

      if (pathname === '/api/alimentacao' && method === 'GET') {
        const rows = (await db.prepare(
          `SELECT p.*, s.name AS space_name, u.name AS pro_name FROM meal_plans p
           LEFT JOIN spaces s ON s.id = p.space_id LEFT JOIN users u ON u.id = s.owner_user_id
           WHERE p.client_id = ? AND p.current_version > 0 ORDER BY p.status = 'publicado' DESC, p.updated_at DESC LIMIT 50`
        ).bind(me).all()).results || [];
        const vers = await versionsOf(db, rows.map((r) => r.id));
        return reply({ hoje: today, planos: rows.map((p) => planMeta(p, vers[p.id] || [], today)) });
      }

      // Pode registrar nesta data? (plano publicado, vínculo ativo, versão valendo, entre hoje-14 e hoje)
      const gate = (plan, p, date) => {
        if (plan.status !== 'publicado' || plan.link_status !== 'ativo') return { motivo: `Plano encerrado${plan.ended_at ? ` em ${fmtBr(plan.ended_at.slice(0, 10))}` : ''}: fica só para leitura.` };
        if (date > today) return { motivo: 'Dá para registrar no próprio dia ou depois.' };
        if (date < addDays(today, -LOG_WINDOW_DAYS)) return { motivo: `Registros só dos últimos ${LOG_WINDOW_DAYS} dias.` };
        if (!p) return { motivo: plan.ends_on && date > plan.ends_on ? `O plano terminou em ${fmtBr(plan.ends_on)}.` : 'Nenhuma versão do plano vale neste dia.' };
        return { ok: true };
      };

      if (pathname === '/api/alimentacao/dia' && method === 'GET') {
        const plan = await myPlan(q('planId'));
        if (!plan) return reply({ error: 'Plano não encontrado.' }, 404);
        const date = q('date') ? validateDate(q('date'), { label: 'A data' }) : { value: today };
        if (date.error) return reply({ error: date.error }, 400);
        const versions = (await versionsOf(db, [plan.id]))[plan.id] || [];
        const p = planOnDate(plan, versions, date.value);
        const logs = (await db.prepare('SELECT meal_key, status, option_key, substitution, note, updated_at FROM meal_logs WHERE plan_id = ? AND date = ? AND client_id = ?').bind(plan.id, date.value, me).all()).results || [];
        const byKey = Object.fromEntries(logs.map((l) => [l.meal_key, l]));
        const g = gate(plan, p, date.value);
        // Abrir o plano resolve a pendência "plano publicado" dele.
        try {
          await db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND ref_id = ? AND type = 'plano_publicado' AND read_at IS NULL").bind(nowIso, me, plan.id).run();
        } catch (e) {
          if (!isMissingTable(e)) throw e;
        }
        return reply({
          plano: planMeta(plan, versions, today), date: date.value, hoje: today,
          versao: p ? { ...versionMeta(p.version), notes: p.version.content?.notes || '' } : null,
          grupo: p?.group ? { key: p.group.key, label: p.group.label } : null,
          refeicoes: p ? p.meals : [],
          registros: Object.fromEntries(logs.filter((l) => !l.meal_key.startsWith('extra:')).map((l) => [l.meal_key, { status: l.status, optionKey: l.option_key, substitution: l.substitution, note: l.note, updatedAt: l.updated_at }])),
          extras: logs.filter((l) => l.meal_key.startsWith('extra:')).map((l) => ({ key: l.meal_key, note: l.note, updatedAt: l.updated_at })),
          numeros: dayNumbers(p ? p.meals : [], byKey),
          podeRegistrar: Boolean(g.ok), motivo: g.motivo || null
        });
      }

      if (pathname === '/api/alimentacao/semana' && method === 'GET') {
        const plan = await myPlan(q('planId'));
        if (!plan) return reply({ error: 'Plano não encontrado.' }, 404);
        const from = q('from') ? validateDate(q('from'), { label: 'O início da semana' }) : { value: mondayOf(today) };
        if (from.error) return reply({ error: from.error }, 400);
        const to = addDays(from.value, 6);
        const versions = (await versionsOf(db, [plan.id]))[plan.id] || [];
        const logs = (await db.prepare('SELECT date, meal_key, status FROM meal_logs WHERE plan_id = ? AND client_id = ? AND date BETWEEN ? AND ?').bind(plan.id, me, from.value, to).all()).results || [];
        return reply({ plano: planMeta(plan, versions, today), hoje: today, from: from.value, ...rangeNumbers(plan, versions, logs, from.value, to, today) });
      }

      const verMatch = pathname.match(/^\/api\/alimentacao\/planos\/([^/]+)\/versoes\/(\d+)$/);
      if (verMatch && method === 'GET') {
        const plan = await myPlan(verMatch[1]);
        if (!plan) return reply({ error: 'Plano não encontrado.' }, 404);
        const v = ((await versionsOf(db, [plan.id]))[plan.id] || []).find((x) => x.version === Number(verMatch[2]));
        if (!v) return reply({ error: 'Versão não encontrada.' }, 404);
        return reply({ plano: { id: plan.id, name: plan.name, spaceName: plan.space_name, proName: plan.pro_name }, versao: { ...versionMeta(v), content: v.content } });
      }

      if ((pathname === '/api/alimentacao/registros' && method === 'PUT') || (pathname === '/api/alimentacao/extras' && method === 'POST') || (pathname === '/api/alimentacao/registros/apagar' && method === 'POST')) {
        const plan = await myPlan(body.planId);
        if (!plan) return reply({ error: 'Plano não encontrado.' }, 404);
        const date = validateDate(body.date, { label: 'A data' });
        if (date.error) return reply({ error: date.error }, 400);
        const versions = (await versionsOf(db, [plan.id]))[plan.id] || [];
        const p = planOnDate(plan, versions, date.value);
        const g = gate(plan, p, date.value);
        if (!g.ok) return reply({ error: g.motivo }, 409);
        const numbers = async () => {
          const rows = (await db.prepare('SELECT meal_key, status FROM meal_logs WHERE plan_id = ? AND date = ? AND client_id = ?').bind(plan.id, date.value, me).all()).results || [];
          return dayNumbers(p.meals, Object.fromEntries(rows.map((l) => [l.meal_key, l])));
        };

        if (pathname === '/api/alimentacao/registros/apagar') {
          const key = String(body.mealKey || '');
          await db.prepare('DELETE FROM meal_logs WHERE plan_id = ? AND date = ? AND meal_key = ? AND client_id = ?').bind(plan.id, date.value, key, me).run();
          return reply({ success: true, numeros: await numbers() });
        }

        if (pathname === '/api/alimentacao/extras') {
          const note = validateText(body.note, { label: 'A descrição da refeição extra', max: 140, required: true });
          if (note.error) return reply({ error: note.error }, 400);
          const count = await db.prepare("SELECT COUNT(*) AS n FROM meal_logs WHERE plan_id = ? AND date = ? AND status = 'extra'").bind(plan.id, date.value).first();
          if (Number(count?.n || 0) >= 10) return reply({ error: 'No máximo 10 refeições extras por dia.' }, 400);
          const key = `extra:${crypto.randomUUID().slice(0, 12)}`;
          await db.prepare('INSERT INTO meal_logs (id, plan_id, client_id, version, date, meal_key, status, option_key, substitution, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)')
            .bind(newId('mlg'), plan.id, me, p.version.version, date.value, key, 'extra', note.value, nowIso, nowIso).run();
          return reply({ success: true, key, numeros: await numbers() });
        }

        // Registrar ou corrigir uma refeição prevista
        const meal = p.meals.find((m) => m.key === String(body.mealKey || ''));
        if (!meal) return reply({ error: 'Esta refeição não está no plano deste dia.' }, 400);
        const status = String(body.status || '');
        if (!STATUS_KEYS.includes(status)) return reply({ error: 'Escolha como foi a refeição.' }, 400);
        let optionKey = null;
        if (status !== 'nao_realizada') {
          const opts = meal.options || [];
          optionKey = body.optionKey ? String(body.optionKey) : opts[0]?.key || null;
          if (optionKey && !opts.some((o) => o.key === optionKey)) return reply({ error: 'Opção inválida para esta refeição.' }, 400);
        }
        let substitution = null;
        if (status === 'alternativa') {
          const subs = subsOf(meal);
          if (!subs.length) return reply({ error: 'Esta refeição não tem substituição autorizada. Use “Diferente do planejado”.' }, 400);
          substitution = String(body.substitution || '');
          if (!subs.includes(substitution)) return reply({ error: 'Escolha uma das substituições autorizadas pela nutricionista.' }, 400);
        }
        const note = validateText(body.note, { label: 'A observação', max: 280, multiline: true });
        if (note.error) return reply({ error: note.error }, 400);
        await db.prepare(
          `INSERT INTO meal_logs (id, plan_id, client_id, version, date, meal_key, status, option_key, substitution, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(plan_id, date, meal_key) DO UPDATE SET status = excluded.status, option_key = excluded.option_key, substitution = excluded.substitution,
             note = excluded.note, version = excluded.version, updated_at = excluded.updated_at WHERE meal_logs.client_id = excluded.client_id`
        ).bind(newId('mlg'), plan.id, me, p.version.version, date.value, meal.key, status, optionKey, substitution, note.value || null, nowIso, nowIso).run();
        return reply({ success: true, numeros: await numbers() });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // =====================================================================
    // PROFISSIONAL (só Nutricionista)
    // =====================================================================
    const gateRes = await requirePro(db, me, 'alimentacao');
    if (gateRes.error) return reply({ error: gateRes.error }, gateRes.status);
    const pro = gateRes.pro;
    const today = todayFrom(q('hoje') || body.hoje);

    // ---------------- Modelos ----------------
    if (pathname === '/api/espacos/planos-modelo' && method === 'GET') {
      const rows = (await db.prepare("SELECT id, name, content_json, version, updated_at FROM meal_templates WHERE space_id = ? AND status = 'ativo' ORDER BY updated_at DESC LIMIT 100").bind(pro.space_id).all()).results || [];
      return reply({ modelos: rows.map((r) => ({ id: r.id, name: r.name, version: r.version, updatedAt: r.updated_at, content: parse(r.content_json, {}) })) });
    }
    if (pathname === '/api/espacos/planos-modelo' && method === 'POST') {
      const name = validateText(body.name, { label: 'O nome do modelo', max: 80, required: true });
      if (name.error) return reply({ error: name.error }, 400);
      const c = cleanMealPlanContent(body.content || starterContent(), { draft: true });
      if (c.error) return reply({ error: c.error }, 400);
      const id = newId('mtp');
      await db.prepare('INSERT INTO meal_templates (id, space_id, name, content_json, version, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)')
        .bind(id, pro.space_id, name.value, JSON.stringify(c.value), 'ativo', me, nowIso, nowIso).run();
      return reply({ success: true, modelo: { id, name: name.value, version: 1, content: c.value } }, 201);
    }
    const modelo = pathname.match(/^\/api\/espacos\/planos-modelo\/([^/]+)(\/arquivar)?$/);
    if (modelo) {
      const t = await db.prepare("SELECT * FROM meal_templates WHERE id = ? AND space_id = ? AND status = 'ativo'").bind(modelo[1], pro.space_id).first();
      if (!t) return reply({ error: 'Modelo não encontrado.' }, 404);
      if (!modelo[2] && method === 'GET') return reply({ modelo: { id: t.id, name: t.name, version: t.version, updatedAt: t.updated_at, content: parse(t.content_json, {}) } });
      if (!modelo[2] && method === 'PUT') {
        const name = validateText(body.name ?? t.name, { label: 'O nome do modelo', max: 80, required: true });
        if (name.error) return reply({ error: name.error }, 400);
        const c = cleanMealPlanContent(body.content, { draft: true });
        if (c.error) return reply({ error: c.error }, 400);
        await db.prepare('UPDATE meal_templates SET name = ?, content_json = ?, version = version + 1, updated_at = ? WHERE id = ?').bind(name.value, JSON.stringify(c.value), nowIso, t.id).run();
        return reply({ success: true, version: t.version + 1 });
      }
      if (modelo[2] && method === 'POST') {
        await db.prepare("UPDATE meal_templates SET status = 'arquivado', updated_at = ? WHERE id = ?").bind(nowIso, t.id).run();
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // ---------------- Plano de uma pessoa ----------------
    const pessoaPlano = pathname.match(/^\/api\/espacos\/pessoas\/([^/]+)\/plano$/);
    if (pessoaPlano) {
      const link = await activeLinkById(db, pro.space_id, pessoaPlano[1]);
      if (!link) return reply({ error: 'Pessoa sem vínculo ativo com o seu espaço.' }, 404);
      if (method === 'GET') {
        const plans = (await db.prepare('SELECT * FROM meal_plans WHERE link_id = ? AND space_id = ? ORDER BY created_at DESC LIMIT 20').bind(link.id, pro.space_id).all()).results || [];
        const vers = await versionsOf(db, plans.map((p) => p.id));
        const open = plans.find((p) => p.status !== 'encerrado') || null;
        let resumo7 = null;
        if (open && open.current_version > 0) {
          const from = addDays(today, -6);
          const logs = (await db.prepare('SELECT date, meal_key, status FROM meal_logs WHERE plan_id = ? AND client_id = ? AND date BETWEEN ? AND ?').bind(open.id, link.client_id, from, today).all()).results || [];
          resumo7 = rangeNumbers(open, vers[open.id] || [], logs, from, today, today).total;
        }
        return reply({
          hoje: today,
          pessoa: { linkId: link.id, name: link.name, username: link.username, since: link.started_at },
          plano: open ? { ...planMeta(open, vers[open.id] || [], today), draft: parse(open.draft_json, starterContent()), draftUpdatedAt: open.draft_updated_at, sourceTemplateId: open.source_template_id } : null,
          anteriores: plans.filter((p) => p.status === 'encerrado' && p.current_version > 0).map((p) => planMeta(p, vers[p.id] || [], today)),
          resumo7
        });
      }
      if (method === 'POST') {
        const name = validateText(body.name, { label: 'O nome do plano', max: 80, required: true });
        if (name.error) return reply({ error: name.error }, 400);
        let content = starterContent();
        let source = null;
        if (body.modeloId) {
          const t = await db.prepare("SELECT id, content_json FROM meal_templates WHERE id = ? AND space_id = ? AND status = 'ativo'").bind(String(body.modeloId), pro.space_id).first();
          if (!t) return reply({ error: 'Modelo não encontrado.' }, 404);
          content = parse(t.content_json, starterContent());
          source = t.id;
        }
        const c = cleanMealPlanContent(content, { draft: true });
        if (c.error) return reply({ error: c.error }, 400);
        const open = await db.prepare("SELECT id FROM meal_plans WHERE link_id = ? AND status IN ('rascunho', 'publicado')").bind(link.id).first();
        if (open) return reply({ error: 'Já existe um plano em andamento para esta pessoa. Publique uma nova versão ou encerre o atual.' }, 409);
        const id = newId('mpl');
        try {
          await db.prepare(
            `INSERT INTO meal_plans (id, space_id, link_id, client_id, name, status, draft_json, draft_updated_at, current_version, source_template_id, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'rascunho', ?, ?, 0, ?, ?, ?, ?)`
          ).bind(id, pro.space_id, link.id, link.client_id, name.value, JSON.stringify(c.value), nowIso, source, me, nowIso, nowIso).run();
        } catch (e) {
          if (/UNIQUE/i.test(String(e?.message || e))) return reply({ error: 'Já existe um plano em andamento para esta pessoa.' }, 409);
          throw e;
        }
        return reply({ success: true, planId: id }, 201);
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    const planoAcao = pathname.match(/^\/api\/espacos\/planos\/([^/]+)\/(rascunho|publicar|encerrar)$/);
    if (planoAcao) {
      const plan = await db.prepare('SELECT * FROM meal_plans WHERE id = ? AND space_id = ?').bind(planoAcao[1], pro.space_id).first();
      if (!plan) return reply({ error: 'Plano não encontrado.' }, 404);
      const link = await activeLinkById(db, pro.space_id, plan.link_id);
      if (!link) return reply({ error: 'Pessoa sem vínculo ativo com o seu espaço.' }, 404);
      if (plan.status === 'encerrado') return reply({ error: 'Este plano foi encerrado e fica só para leitura.' }, 409);

      if (planoAcao[2] === 'rascunho' && method === 'PUT') {
        const name = validateText(body.name ?? plan.name, { label: 'O nome do plano', max: 80, required: true });
        if (name.error) return reply({ error: name.error }, 400);
        const c = cleanMealPlanContent(body.content, { draft: true });
        if (c.error) return reply({ error: c.error }, 400);
        await db.prepare('UPDATE meal_plans SET name = ?, draft_json = ?, draft_updated_at = ?, updated_at = ? WHERE id = ?').bind(name.value, JSON.stringify(c.value), nowIso, nowIso, plan.id).run();
        return reply({ success: true, content: c.value });
      }

      if (planoAcao[2] === 'publicar' && method === 'POST') {
        const c = cleanMealPlanContent(parse(plan.draft_json, {}), { draft: false });
        if (c.error) return reply({ error: `Ainda falta completar o plano: ${c.error}` }, 400);
        const starts = validateDate(body.startsOn, { label: 'A data de início' });
        if (starts.error) return reply({ error: starts.error }, 400);
        if (starts.value < today) return reply({ error: 'A data de início não pode ser no passado.' }, 400);
        if (starts.value > addDays(today, 366)) return reply({ error: 'A data de início pode ser no máximo daqui a um ano.' }, 400);
        const last = await db.prepare('SELECT MAX(starts_on) AS s FROM meal_plan_versions WHERE plan_id = ?').bind(plan.id).first();
        if (last?.s && starts.value < last.s) return reply({ error: `Já existe uma versão que começa em ${fmtBr(last.s)}. A nova precisa começar nessa data ou depois.` }, 400);
        let endsOn = plan.ends_on || null;
        if (Object.prototype.hasOwnProperty.call(body, 'endsOn')) {
          if (body.endsOn === null || body.endsOn === '') endsOn = null;
          else {
            const e = validateDate(body.endsOn, { label: 'A data de término' });
            if (e.error) return reply({ error: e.error }, 400);
            if (e.value < starts.value) return reply({ error: 'O término precisa ser depois do início.' }, 400);
            endsOn = e.value;
          }
        }
        if (endsOn && endsOn < starts.value) return reply({ error: 'O término precisa ser depois do início.' }, 400);
        const version = Number(plan.current_version || 0) + 1;
        await db.batch([
          db.prepare('INSERT INTO meal_plan_versions (id, plan_id, version, name, content_json, starts_on, published_by, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .bind(newId('mpv'), plan.id, version, plan.name, JSON.stringify(c.value), starts.value, me, nowIso),
          db.prepare("UPDATE meal_plans SET status = 'publicado', current_version = ?, ends_on = ?, draft_json = ?, updated_at = ? WHERE id = ? AND current_version = ?")
            .bind(version, endsOn, JSON.stringify(c.value), nowIso, plan.id, plan.current_version)
        ]);
        try {
          await db.prepare('INSERT OR IGNORE INTO notifications (id, user_id, type, ref_id, space_id, dedupe_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(newId('ntf'), plan.client_id, 'plano_publicado', plan.id, pro.space_id, `plano:${plan.id}:v${version}`, nowIso).run();
        } catch (e) {
          if (!isMissingTable(e)) throw e;
        }
        await audit('MEAL_PLAN_PUBLISHED', { planId: plan.id, version, startsOn: starts.value });
        return reply({ success: true, version, startsOn: starts.value, endsOn });
      }

      if (planoAcao[2] === 'encerrar' && method === 'POST') {
        await db.prepare("UPDATE meal_plans SET status = 'encerrado', ended_at = ?, end_reason = ?, updated_at = ? WHERE id = ?").bind(nowIso, plan.current_version > 0 ? 'encerrado pela nutricionista' : 'rascunho descartado', nowIso, plan.id).run();
        await audit('MEAL_PLAN_ENDED', { planId: plan.id, published: plan.current_version > 0 });
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    // ---------------- Registros de uma pessoa (semana) ----------------
    const pessoaReg = pathname.match(/^\/api\/espacos\/pessoas\/([^/]+)\/alimentacao$/);
    if (pessoaReg && method === 'GET') {
      const link = await activeLinkById(db, pro.space_id, pessoaReg[1]);
      if (!link) return reply({ error: 'Pessoa sem vínculo ativo com o seu espaço.' }, 404);
      const plan = q('planId')
        ? await db.prepare('SELECT * FROM meal_plans WHERE id = ? AND link_id = ? AND space_id = ? AND current_version > 0').bind(q('planId'), link.id, pro.space_id).first()
        : await db.prepare("SELECT * FROM meal_plans WHERE link_id = ? AND space_id = ? AND current_version > 0 ORDER BY status != 'encerrado' DESC, updated_at DESC LIMIT 1").bind(link.id, pro.space_id).first();
      if (!plan) return reply({ hoje: today, plano: null, days: [], total: null, registros: [] });
      const from = q('from') ? validateDate(q('from'), { label: 'O início da semana' }) : { value: mondayOf(today) };
      if (from.error) return reply({ error: from.error }, 400);
      const to = addDays(from.value, 6);
      const versions = (await versionsOf(db, [plan.id]))[plan.id] || [];
      const logs = (await db.prepare('SELECT date, meal_key, status, option_key, substitution, note, updated_at FROM meal_logs WHERE plan_id = ? AND client_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC, updated_at DESC').bind(plan.id, link.client_id, from.value, to).all()).results || [];
      const registros = logs.map((l) => {
        const p = planOnDate(plan, versions, l.date);
        const meal = p?.meals.find((m) => m.key === l.meal_key);
        const opt = meal?.options?.find((o) => o.key === l.option_key);
        return { date: l.date, mealKey: l.meal_key, meal: meal ? meal.name : l.meal_key.startsWith('extra:') ? 'Refeição extra' : 'Refeição', time: meal?.time || '', status: l.status, option: opt && (meal.options.length > 1) ? opt.name : null, substitution: l.substitution, note: l.note, updatedAt: l.updated_at };
      });
      return reply({ hoje: today, from: from.value, plano: planMeta(plan, versions, today), ...rangeNumbers(plan, versions, logs, from.value, to, today), registros });
    }

    // ---------------- Planos de uma turma (cada paciente tem o seu) ----------------
    const turmaPlanos = pathname.match(/^\/api\/espacos\/turmas\/([^/]+)\/planos$/);
    if (turmaPlanos && method === 'GET') {
      const g = await db.prepare('SELECT id FROM space_groups WHERE id = ? AND space_id = ?').bind(turmaPlanos[1], pro.space_id).first();
      if (!g) return reply({ error: 'Turma não encontrada.' }, 404);
      const members = (await db.prepare(
        `SELECT l.id AS link_id, l.client_id, u.name FROM group_members m JOIN space_links l ON l.id = m.link_id JOIN users u ON u.id = l.client_id
         WHERE m.group_id = ? AND m.status = 'ativa' AND l.status = 'ativo' ORDER BY u.name LIMIT 300`
      ).bind(g.id).all()).results || [];
      const linkIds = members.map((m) => m.link_id);
      const plans = linkIds.length ? (await db.prepare(
        `SELECT * FROM meal_plans WHERE space_id = ? AND status IN ('rascunho', 'publicado') AND link_id IN (${linkIds.map(() => '?').join(',')})`
      ).bind(pro.space_id, ...linkIds).all()).results || [] : [];
      const vers = await versionsOf(db, plans.map((p) => p.id));
      const from = addDays(today, -6);
      const logs = plans.length ? (await db.prepare(
        `SELECT plan_id, date, meal_key, status FROM meal_logs WHERE date BETWEEN ? AND ? AND plan_id IN (${plans.map(() => '?').join(',')})`
      ).bind(from, today, ...plans.map((p) => p.id)).all()).results || [] : [];
      return reply({
        hoje: today,
        pessoas: members.map((m) => {
          const p = plans.find((x) => x.link_id === m.link_id);
          if (!p) return { linkId: m.link_id, name: m.name, plano: null };
          const meta = planMeta(p, vers[p.id] || [], today);
          const r = p.current_version > 0 ? rangeNumbers(p, vers[p.id] || [], logs.filter((l) => l.plan_id === p.id), from, today, today).total : null;
          return { linkId: m.link_id, name: m.name, plano: { id: p.id, name: p.name, status: p.status, vigente: meta.vigente, proxima: meta.proxima }, registro7: r ? { previstas: r.previstas, registradas: r.registradas } : null };
        })
      });
    }

    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'A alimentação dos espaços ainda não está disponível neste ambiente.', code: 'alimentacao_indisponivel' }, 503);
    throw e;
  }
}
