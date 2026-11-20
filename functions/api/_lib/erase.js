/**
 * Exclusão completa dos dados de uma conta (auditoria 15/11/2026, S14).
 * Uma lista única usada pela autoexclusão (/api/account) e pelo admin. Antes, o admin apagava só
 * hábitos, eventos e saúde: sobravam vínculos do Google (a pessoa não conseguia se cadastrar de novo),
 * tokens do Spotify, chamados e amizades; a autoexclusão não apagava as amizades.
 * Tabelas que ainda não existem no ambiente são puladas.
 */
export const USER_TABLES = [
  'habits', 'events', 'health', 'tags', 'bad_habit_relapses', 'bad_habits', 'support_tickets', 'auth_tokens',
  'oauth_identities', 'oauth_login_codes', 'spotify_connections', 'user_health_profile', 'category_members',
  'routines', 'core_categories', 'commitments', 'entries', 'support_access_grants', 'profile_settings', 'workout_sets', 'workout_sessions'
];

async function tableExists(db, table) {
  try {
    await db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).first();
    return true;
  } catch {
    return false;
  }
}

/** Monta e executa, num único batch, a exclusão de tudo o que pertence à conta. */
export async function eraseUserData(db, userId, { midia = null } = {}) {
  const mediaKeys = [];
  const stmts = [];
  let categories = [];
  try {
    categories = (await db.prepare('SELECT id FROM categories WHERE user_id = ?').bind(userId).all()).results || [];
  } catch { /* sem tabela */ }
  for (const c of categories) {
    stmts.push(db.prepare('DELETE FROM subclasses WHERE category_id = ?').bind(c.id));
    stmts.push(db.prepare('DELETE FROM category_members WHERE category_id = ?').bind(c.id));
  }
  if (await tableExists(db, 'categories')) stmts.push(db.prepare('DELETE FROM categories WHERE user_id = ?').bind(userId));
  if (await tableExists(db, 'friends')) stmts.push(db.prepare('DELETE FROM friends WHERE user_id = ? OR friend_id = ?').bind(userId, userId));
  for (const table of USER_TABLES) {
    if (await tableExists(db, table)) stmts.push(db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).bind(userId));
  }
  // Espaços profissionais (migração 0009): vínculos e turmas da pessoa; se ela é profissional, o espaço inteiro.
  if (await tableExists(db, 'spaces')) {
    const own = (await db.prepare('SELECT id FROM spaces WHERE owner_user_id = ?').bind(userId).all()).results || [];
    for (const s of own) {
      stmts.push(db.prepare('DELETE FROM group_members WHERE group_id IN (SELECT id FROM space_groups WHERE space_id = ?)').bind(s.id));
      stmts.push(db.prepare('DELETE FROM space_invites WHERE space_id = ?').bind(s.id));
      stmts.push(db.prepare('DELETE FROM space_groups WHERE space_id = ?').bind(s.id));
      stmts.push(db.prepare('DELETE FROM space_links WHERE space_id = ?').bind(s.id));
      stmts.push(db.prepare('DELETE FROM spaces WHERE id = ?').bind(s.id));
    }
    if (await tableExists(db, 'space_events')) {
      for (const s of own) {
        stmts.push(db.prepare('DELETE FROM space_event_invites WHERE space_id = ?').bind(s.id));
        stmts.push(db.prepare('DELETE FROM space_events WHERE space_id = ?').bind(s.id));
        stmts.push(db.prepare('DELETE FROM space_post_comments WHERE post_id IN (SELECT id FROM space_posts WHERE space_id = ?)').bind(s.id));
        stmts.push(db.prepare('DELETE FROM space_post_recipients WHERE post_id IN (SELECT id FROM space_posts WHERE space_id = ?)').bind(s.id));
        stmts.push(db.prepare('DELETE FROM space_posts WHERE space_id = ?').bind(s.id));
        stmts.push(db.prepare('DELETE FROM notifications WHERE space_id = ?').bind(s.id));
      }
      stmts.push(db.prepare('DELETE FROM space_event_invites WHERE user_id = ?').bind(userId));
      stmts.push(db.prepare('DELETE FROM space_post_recipients WHERE user_id = ?').bind(userId));
      stmts.push(db.prepare('DELETE FROM space_post_comments WHERE participant_id = ?').bind(userId));
      stmts.push(db.prepare('DELETE FROM notifications WHERE user_id = ?').bind(userId));
    }
    // Alimentação (migração 0013): planos e registros da pessoa; modelos da nutricionista.
    // Os planos que uma nutricionista publicou ficam com os pacientes (decisão 6), mesmo se ela excluir a conta.
    if (await tableExists(db, 'meal_plans')) {
      stmts.push(db.prepare('DELETE FROM meal_logs WHERE client_id = ?').bind(userId));
      stmts.push(db.prepare('DELETE FROM meal_plan_versions WHERE plan_id IN (SELECT id FROM meal_plans WHERE client_id = ?)').bind(userId));
      stmts.push(db.prepare('DELETE FROM meal_plans WHERE client_id = ?').bind(userId));
      for (const s of own) stmts.push(db.prepare('DELETE FROM meal_templates WHERE space_id = ?').bind(s.id));
    }
    // Proposta 07 (migração 0015): personalizados, correções de nome, imagens e denúncias.
    if (await tableExists(db, 'exercise_custom')) {
      stmts.push(db.prepare("DELETE FROM exercise_custom WHERE owner_kind = 'pessoa' AND owner_id = ?").bind(userId));
      stmts.push(db.prepare('DELETE FROM space_media_reports WHERE reporter_id = ?').bind(userId));
      for (const s of own) {
        stmts.push(db.prepare("DELETE FROM exercise_custom WHERE owner_kind = 'espaco' AND owner_id = ?").bind(s.id));
        stmts.push(db.prepare('DELETE FROM exercise_name_fix WHERE space_id = ?').bind(s.id));
        for (const m of (await db.prepare('SELECT media_key FROM space_media WHERE space_id = ?').bind(s.id).all()).results || []) mediaKeys.push(m.media_key);
        stmts.push(db.prepare('DELETE FROM space_media WHERE space_id = ?').bind(s.id));
        stmts.push(db.prepare('DELETE FROM space_media_reports WHERE space_id = ?').bind(s.id));
      }
    }
    // Pendências administrativas (migração 0014): são do espaço da Clínica que exclui a conta.
    if (await tableExists(db, 'space_tasks')) {
      for (const s of own) stmts.push(db.prepare('DELETE FROM space_tasks WHERE space_id = ?').bind(s.id));
    }
    stmts.push(db.prepare('DELETE FROM group_members WHERE client_id = ?').bind(userId));
    stmts.push(db.prepare('DELETE FROM space_links WHERE client_id = ?').bind(userId));
    stmts.push(db.prepare('DELETE FROM pro_profiles WHERE user_id = ?').bind(userId));
  }
  stmts.push(db.prepare('DELETE FROM users WHERE id = ?').bind(userId));
  await db.batch(stmts);
  // Arquivos no R2 só depois do banco: se falhar, sobra arquivo sem uso, nunca referência quebrada.
  for (const k of mediaKeys) { try { await midia?.delete(k); } catch { /* segue */ } }
}
