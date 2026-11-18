// @vitest-environment node
/**
 * Lote 2b (auditoria 15/11/2026): S6 (amizade), S7 (pontos e foto), S8 (água), S14 (exclusão de conta).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const tok: Record<string, string> = {};
const one = async (sql: string, ...args: unknown[]) => (await env.DB.prepare(sql).bind(...args).first()) as any;
const count = async (sql: string, ...args: unknown[]) => Number((await one(sql, ...args))?.n ?? 0);

beforeAll(async () => {
  await call(env, '/api/health');
  for (const u of ['ana', 'beto', 'caio', 'dani', 'eva', 'fred']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    tok[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_admin2', username: 'chefia', email: 'chefia@exemplo.com', password: 'Chefia#Senha-forte1', role: 'admin' });
  tok.admin = await login(env, 'chefia', 'Chefia#Senha-forte1');
});

describe('S6: amizades', () => {
  it('quem enviou o pedido não consegue aceitar o próprio pedido', async () => {
    expect((await call(env, '/api/user/usr_ana/connect', { method: 'POST', token: tok.ana, body: { targetUsername: 'beto' } })).status).toBe(200);
    const self = await call(env, '/api/user/usr_ana/connect/usr_beto/accept', { method: 'PUT', token: tok.ana });
    expect(self.status).toBe(409);
    expect((await one("SELECT status FROM friends WHERE user_id = 'usr_ana' AND friend_id = 'usr_beto'")).status).toBe('pending_sent');
    expect((await call(env, '/api/user/usr_beto/connect/usr_ana/accept', { method: 'PUT', token: tok.beto })).status).toBe(200);
    expect((await one("SELECT status FROM friends WHERE user_id = 'usr_ana' AND friend_id = 'usr_beto'")).status).toBe('approved');
  });

  it('perfil privado não expõe a bio a quem envia pedido', async () => {
    await env.DB.prepare("UPDATE users SET is_public = 0, bio = 'texto privado' WHERE id = 'usr_caio'").run();
    const r = await call(env, '/api/user/usr_ana/connect', { method: 'POST', token: tok.ana, body: { targetUsername: 'caio' } });
    expect(JSON.stringify(r.json)).not.toMatch(/texto privado/);
  });
});

describe('S7: pontos e foto', () => {
  it('pontos e sequência enviados pelo navegador são ignorados', async () => {
    await call(env, '/api/user/usr_dani/profile', { method: 'PUT', token: tok.dani, body: { points: 999999, streak_days: 365, bio: 'oi' } });
    const u = await one("SELECT points, streak_days, bio FROM users WHERE id = 'usr_dani'");
    expect(u).toMatchObject({ points: 0, streak_days: 0, bio: 'oi' });
  });

  it('foto em data URL é guardada inteira (antes era cortada em 1.500 caracteres)', async () => {
    const photo = 'data:image/png;base64,' + 'A'.repeat(20000);
    await call(env, '/api/user/usr_dani/profile', { method: 'PUT', token: tok.dani, body: { avatar: photo } });
    expect((await one("SELECT avatar FROM users WHERE id = 'usr_dani'")).avatar).toBe(photo);
  });

  it('texto que não é imagem continua limitado e sem < >', async () => {
    await call(env, '/api/user/usr_dani/profile', { method: 'PUT', token: tok.dani, body: { avatar: '<script>' + 'x'.repeat(3000) } });
    const a = (await one("SELECT avatar FROM users WHERE id = 'usr_dani'")).avatar as string;
    expect(a.length).toBeLessThanOrEqual(1500);
    expect(a).not.toMatch(/[<>]/);
  });
});

describe('S8: água', () => {
  it('salvar saúde sem a água não quebra (antes: erro 500)', async () => {
    const r = await call(env, '/api/user/usr_eva/health', { method: 'POST', token: tok.eva, body: { waterTarget: 9, sleep: { logged: true } } });
    expect(r.status).toBe(200);
  });
  it('0 copo enviado de propósito vale', async () => {
    await call(env, '/api/user/usr_eva/health', { method: 'POST', token: tok.eva, body: { waterGlasses: 3 } });
    expect((await one("SELECT water_glasses FROM health WHERE user_id = 'usr_eva'")).water_glasses).toBe(3);
    await call(env, '/api/user/usr_eva/health', { method: 'POST', token: tok.eva, body: { waterGlasses: 0 } });
    expect((await one("SELECT water_glasses FROM health WHERE user_id = 'usr_eva'")).water_glasses).toBe(0);
  });
});

describe('S14: exclusão de conta sem sobras', () => {
  async function seed(uid: string) {
    const now = new Date().toISOString();
    await env.DB.prepare('INSERT INTO oauth_identities (id, user_id, provider, provider_account_id, provider_email, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(`oi_${uid}`, uid, 'google', `g_${uid}`, `${uid}@g.test`, now).run();
    expect(await count('SELECT COUNT(*) AS n FROM oauth_identities WHERE user_id = ?', uid)).toBe(1);
    await env.DB.prepare("INSERT INTO friends (id, user_id, friend_id, friend_name, friend_username, status, created_at, updated_at) VALUES (?, ?, 'usr_ana', 'Ana', 'ana', 'approved', ?, ?)").bind(`fr1_${uid}`, uid, now, now).run();
    await env.DB.prepare("INSERT INTO friends (id, user_id, friend_id, friend_name, friend_username, status, created_at, updated_at) VALUES (?, 'usr_ana', ?, 'X', 'x', 'approved', ?, ?)").bind(`fr2_${uid}`, uid, now, now).run();
  }
  const leftovers = async (uid: string) =>
    (await count('SELECT COUNT(*) AS n FROM friends WHERE user_id = ? OR friend_id = ?', uid, uid)) +
    (await count('SELECT COUNT(*) AS n FROM oauth_identities WHERE user_id = ?', uid)) +
    (await count('SELECT COUNT(*) AS n FROM users WHERE id = ?', uid));

  it('o admin apaga tudo da conta (Google, amizades)', async () => {
    await seed('usr_fred');
    expect((await call(env, '/api/admin/user/usr_fred', { method: 'DELETE', token: tok.admin })).status).toBe(200);
    expect(await leftovers('usr_fred')).toBe(0);
  });

  it('a própria pessoa apaga a conta e as amizades vão junto', async () => {
    await seed('usr_eva');
    const r = await call(env, '/api/account', { method: 'DELETE', token: tok.eva, body: { username: 'eva', password: 'eva#Senha-forte1' } });
    expect(r.status).toBe(200);
    expect(await leftovers('usr_eva')).toBe(0);
  });
});
