/**
 * Biblioteca de exercícios do Ethos (proposta 07). Sem API externa: a base fica no D1 (seed v1, 250 exercícios).
 * Regras:
 * - Qualquer conta lê a base. Personalizados: os da própria pessoa e, para um Personal ativo, os do espaço dele.
 *   Personalizados de outro espaço ou de outra pessoa nunca aparecem nem podem ser alterados.
 * - Personalizado exige ao menos um músculo principal (decisão 6). Arquivar não apaga (fichas antigas guardam o nome).
 * - Correção de nome pelo Personal vale só no espaço dele (exercise_name_fix); a base não muda.
 * Tabelas da migração 0015; sem ela, 503 com código.
 */
import { isMissingTable, requirePro } from '../_lib/espacos-acesso.js';
import { jsonResponse } from '../_lib/http.js';
import { validateText } from '../../../src/domain/validation.js';
import { cleanMuscleList, matchesExercise } from '../../../src/components/treino/musculos.js';

const parse = (s, fb) => { try { return JSON.parse(s); } catch { return fb; } };

function libOut(r, fixes) {
  const fixed = fixes?.get(r.id);
  return {
    id: r.id, name: fixed || r.name_pt, originalName: fixed ? r.name_pt : undefined, aliases: parse(r.aliases_json, []), group: r.muscle_group,
    primary: parse(r.primary_json, []), secondary: parse(r.secondary_json, []), equipment: r.equipment, level: r.level, type: r.type,
    metric: r.metric, instructions: parse(r.instructions_json, []), origin: 'importada', source: r.source, sourceVersion: r.source_version,
    license: r.license, reviewed: r.review_status === 'revisado'
  };
}
function customOut(r) {
  return {
    id: r.id, name: r.name_pt, aliases: [], group: r.muscle_group, primary: parse(r.primary_json, []), secondary: parse(r.secondary_json, []),
    equipment: r.equipment, level: null, type: 'Personalizado', metric: r.metric, instructions: parse(r.instructions_json, []),
    origin: 'personalizada', scope: r.owner_kind, status: r.status, updatedAt: r.updated_at
  };
}

/** Valida os campos de um exercício personalizado. */
export function cleanCustomExercise(b) {
  const name = validateText(b?.name, { label: 'O nome do exercício', max: 80, required: true });
  if (name.error) return { error: name.error };
  const primary = cleanMuscleList(b?.primary, { max: 6 });
  if (!primary.length) return { error: 'Escolha ao menos um músculo principal.' };
  const secondary = cleanMuscleList(b?.secondary, { max: 8 }).filter((k) => !primary.includes(k));
  const equipment = validateText(b?.equipment, { label: 'O equipamento', max: 40 });
  if (equipment.error) return { error: equipment.error };
  const instructions = [];
  for (const line of (Array.isArray(b?.instructions) ? b.instructions : [b?.instructions]).slice(0, 3)) {
    const t = validateText(line, { label: 'A instrução', max: 300 });
    if (t.error) return { error: t.error };
    if (t.value) instructions.push(t.value);
  }
  return { value: { name: name.value, primary, secondary, equipment: equipment.value || null, metric: b?.metric === 'tempo' ? 'tempo' : 'reps', instructions } };
}

export async function handleExerciciosRoutes(ctx) {
  const { request, correlationId, pathname, method, url, storage, authClaims, rawBody } = ctx;
  if (pathname !== '/api/exercicios' && !pathname.startsWith('/api/exercicios/')) return null;
  const reply = (data, status = 200) => jsonResponse(data, status, correlationId, request);
  if (!authClaims) return reply({ error: 'Entre na sua conta.' }, 401);
  if (storage.mode !== 'd1') return reply({ error: 'Indisponível no momento.' }, 503);
  const db = storage.db;
  const me = authClaims.sub;
  const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const nowIso = new Date().toISOString();

  try {
    // Personal ativo? (o espaço dele tem personalizados e correções de nome). Outros modelos não editam treino.
    const proGate = await requirePro(db, me, 'treino');
    const space = proGate.pro ? proGate.pro.space_id : null;

    if (pathname === '/api/exercicios' && method === 'GET') {
      const rows = (await db.prepare('SELECT * FROM exercise_library ORDER BY muscle_group, name_pt').all()).results || [];
      const fixes = new Map();
      if (space) for (const f of (await db.prepare('SELECT library_id, name_pt FROM exercise_name_fix WHERE space_id = ?').bind(space).all()).results || []) fixes.set(f.library_id, f.name_pt);
      const customs = (await db.prepare(
        `SELECT * FROM exercise_custom WHERE status = 'ativo' AND ((owner_kind = 'pessoa' AND owner_id = ?) OR (owner_kind = 'espaco' AND owner_id = ?)) ORDER BY name_pt LIMIT 500`
      ).bind(me, space || '-').all()).results || [];
      let list = rows.map((r) => libOut(r, fixes));
      let pers = customs.map(customOut);
      const q = url?.searchParams?.get('q');
      if (q) { list = list.filter((e) => matchesExercise(e, q)); pers = pers.filter((e) => matchesExercise(e, q)); }
      return reply({ exercicios: list, personalizados: pers, podeEditarEspaco: Boolean(space), total: rows.length });
    }

    if (pathname === '/api/exercicios/personalizados' && method === 'POST') {
      const escopo = body.escopo === 'espaco' ? 'espaco' : 'pessoa';
      if (escopo === 'espaco' && !space) return reply({ error: proGate.error || 'Só um Personal ativo cria exercícios do espaço.' }, 403);
      const c = cleanCustomExercise(body);
      if (c.error) return reply({ error: c.error }, 400);
      const ownerId = escopo === 'espaco' ? space : me;
      const count = await db.prepare("SELECT COUNT(*) AS n FROM exercise_custom WHERE owner_kind = ? AND owner_id = ? AND status = 'ativo'").bind(escopo, ownerId).first();
      if (Number(count?.n || 0) >= 300) return reply({ error: 'Limite de 300 exercícios personalizados.' }, 400);
      const id = `pz_${crypto.randomUUID()}`;
      await db.prepare(
        `INSERT INTO exercise_custom (id, owner_kind, owner_id, name_pt, muscle_group, primary_json, secondary_json, equipment, metric, instructions_json, based_on, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'Personalizados', ?, ?, ?, ?, ?, ?, 'ativo', ?, ?, ?)`
      ).bind(id, escopo, ownerId, c.value.name, JSON.stringify(c.value.primary), JSON.stringify(c.value.secondary), c.value.equipment, c.value.metric, JSON.stringify(c.value.instructions), typeof body.basedOn === 'string' && /^fe_[a-z0-9_]{1,90}$/.test(body.basedOn) ? body.basedOn : null, me, nowIso, nowIso).run();
      const row = await db.prepare('SELECT * FROM exercise_custom WHERE id = ?').bind(id).first();
      return reply({ success: true, exercicio: customOut(row) }, 201);
    }

    const pers = pathname.match(/^\/api\/exercicios\/personalizados\/([^/]+)(\/arquivar)?$/);
    if (pers) {
      const row = await db.prepare("SELECT * FROM exercise_custom WHERE id = ? AND status = 'ativo'").bind(pers[1]).first();
      const mine = row && ((row.owner_kind === 'pessoa' && row.owner_id === me) || (row.owner_kind === 'espaco' && space && row.owner_id === space));
      if (!mine) return reply({ error: 'Exercício não encontrado.' }, 404);
      if (!pers[2] && method === 'PUT') {
        const c = cleanCustomExercise({ ...customOut(row), ...body });
        if (c.error) return reply({ error: c.error }, 400);
        await db.prepare('UPDATE exercise_custom SET name_pt = ?, primary_json = ?, secondary_json = ?, equipment = ?, metric = ?, instructions_json = ?, updated_at = ? WHERE id = ?')
          .bind(c.value.name, JSON.stringify(c.value.primary), JSON.stringify(c.value.secondary), c.value.equipment, c.value.metric, JSON.stringify(c.value.instructions), nowIso, row.id).run();
        return reply({ success: true, exercicio: customOut(await db.prepare('SELECT * FROM exercise_custom WHERE id = ?').bind(row.id).first()) });
      }
      if (pers[2] && method === 'POST') {
        await db.prepare("UPDATE exercise_custom SET status = 'arquivado', updated_at = ? WHERE id = ?").bind(nowIso, row.id).run();
        return reply({ success: true });
      }
      return reply({ error: 'Rota não encontrada.' }, 404);
    }

    const nome = pathname.match(/^\/api\/exercicios\/([^/]+)\/nome$/);
    if (nome && method === 'PUT') {
      if (!space) return reply({ error: proGate.error || 'Só um Personal ativo corrige nomes no espaço.' }, 403);
      const lib = await db.prepare('SELECT id, name_pt FROM exercise_library WHERE id = ?').bind(nome[1]).first();
      if (!lib) return reply({ error: 'Exercício não encontrado.' }, 404);
      const n = validateText(body.name, { label: 'O nome', max: 80 });
      if (n.error) return reply({ error: n.error }, 400);
      if (!n.value || n.value === lib.name_pt) {
        await db.prepare('DELETE FROM exercise_name_fix WHERE space_id = ? AND library_id = ?').bind(space, lib.id).run();
        return reply({ success: true, name: lib.name_pt });
      }
      await db.prepare('INSERT INTO exercise_name_fix (space_id, library_id, name_pt, updated_by, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(space_id, library_id) DO UPDATE SET name_pt = excluded.name_pt, updated_by = excluded.updated_by, updated_at = excluded.updated_at')
        .bind(space, lib.id, n.value, me, nowIso).run();
      return reply({ success: true, name: n.value });
    }
    return reply({ error: 'Rota não encontrada.' }, 404);
  } catch (e) {
    if (isMissingTable(e)) return reply({ error: 'A biblioteca de exercícios ainda não está disponível neste ambiente.', code: 'exercicios_indisponivel' }, 503);
    throw e;
  }
}
