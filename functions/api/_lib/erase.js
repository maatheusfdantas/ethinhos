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
  'routines', 'core_categories', 'commitments', 'entries', 'support_access_grants', 'profile_settings'
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
export async function eraseUserData(db, userId) {
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
  stmts.push(db.prepare('DELETE FROM users WHERE id = ?').bind(userId));
  await db.batch(stmts);
}
