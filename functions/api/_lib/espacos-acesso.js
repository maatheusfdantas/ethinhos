/**
 * Acesso aos espaços profissionais: uma função única, lida do banco a cada pedido (docs/11, seção 4).
 * - Perfil profissional ativo e o MODELO decidem o que cada profissional pode tocar:
 *   Personal → treino; Nutricionista → alimentação; Clínica → só organização (agenda, avisos, tarefas).
 * - Nada vem do navegador além do id da pessoa no token: role, owner, spaceId e clientId enviados são ignorados.
 */
export const MODEL_LABEL = { personal: 'Personal', nutri: 'Nutricionista', clinica: 'Organização Clínica' };
export const PEOPLE_LABEL = { personal: 'Alunos', nutri: 'Pacientes', clinica: 'Pessoas' };
export const MODEL_AREAS = { personal: ['treino'], nutri: ['alimentacao'], clinica: [] };

export async function proOf(db, userId) {
  return db
    .prepare('SELECT p.user_id, p.model, p.status, p.space_id, p.approved_at, s.name AS space_name, s.settings_json FROM pro_profiles p JOIN spaces s ON s.id = p.space_id WHERE p.user_id = ?')
    .bind(userId)
    .first();
}

/**
 * Exige perfil profissional ativo (e, se pedido, a área do modelo).
 * Devolve { pro } ou { status, error } para a rota responder.
 */
export async function requirePro(db, userId, area = null) {
  const pro = await proOf(db, userId);
  if (!pro) return { status: 403, error: 'Você não tem um espaço profissional.' };
  if (pro.status !== 'ativo') return { status: 403, error: 'Seu espaço está suspenso. Fale com o suporte do Ethos.' };
  if (area && !(MODEL_AREAS[pro.model] || []).includes(area)) {
    const what = area === 'treino' ? 'treinos' : area === 'alimentacao' ? 'alimentação' : area;
    return { status: 403, error: `O modelo ${MODEL_LABEL[pro.model]} não acessa ${what}.` };
  }
  return { pro };
}

/** Vínculo ativo de uma pessoa com o espaço (por id do vínculo, conferindo o espaço). */
export async function activeLinkById(db, spaceId, linkId) {
  return db
    .prepare("SELECT l.id, l.client_id, l.started_at, u.name, u.username FROM space_links l JOIN users u ON u.id = l.client_id WHERE l.id = ? AND l.space_id = ? AND l.status = 'ativo'")
    .bind(linkId, spaceId)
    .first();
}

export function settingsOf(pro) {
  try {
    return JSON.parse(pro?.settings_json || '{}') || {};
  } catch {
    return {};
  }
}

/**
 * Encerra atribuições (mantidas para a pessoa, só leitura) quando o vínculo acaba ou ela sai da turma.
 * Nada é apagado.
 */
export async function endAssignments(db, { linkId = null, clientId = null, groupId = null, reason }) {
  const nowIso = new Date().toISOString();
  try {
    if (linkId) {
      await db.prepare("UPDATE assignments SET status = 'encerrada', end_reason = ?, ended_at = ?, updated_at = ? WHERE link_id = ? AND status = 'ativa'").bind(reason, nowIso, nowIso, linkId).run();
    } else if (clientId && groupId) {
      await db.prepare("UPDATE assignments SET status = 'encerrada', end_reason = ?, ended_at = ?, updated_at = ? WHERE client_id = ? AND group_key = ? AND status = 'ativa'").bind(reason, nowIso, nowIso, clientId, groupId).run();
    }
  } catch (e) {
    if (!/no such table/i.test(String(e?.message || e))) throw e;
  }
  // Lote E: ao fim do vínculo, o plano alimentar em andamento é encerrado (a pessoa mantém tudo, só leitura).
  // Sair de uma turma não mexe no plano: planos alimentares são individuais.
  if (linkId) {
    try {
      await db.prepare("UPDATE meal_plans SET status = 'encerrado', ended_at = ?, end_reason = ?, updated_at = ? WHERE link_id = ? AND status IN ('rascunho', 'publicado')").bind(nowIso, reason, nowIso, linkId).run();
    } catch (e) {
      if (!/no such table/i.test(String(e?.message || e))) throw e;
    }
  }
}

export const isMissingTable = (e) => /no such table/i.test(String(e?.message || e));
