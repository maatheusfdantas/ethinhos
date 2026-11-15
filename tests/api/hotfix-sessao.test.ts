// @vitest-environment node
/**
 * Lote 0 (auditoria 15/11/2026).
 * S1: verify-email-token entregava sessão a qualquer conta já verificada, sem conferir o código.
 * S3: refresh renovava sessão sem consultar o banco (conta desativada/excluída continuava com acesso).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, decodeJwt, insertUser, loginFull, makeEnv } from '../helpers/api';

const env = makeEnv();
let ip = 40;
const nextIp = () => `198.51.100.${ip++}`;

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_vitima', username: 'vitima', email: 'vitima@exemplo.com', password: 'Vitima#Senha-forte1' });
  await insertUser(env, { id: 'usr_chefe', username: 'chefe', email: 'chefe@exemplo.com', password: 'Chefe#Senha-forte1', role: 'admin' });
  await insertUser(env, { id: 'usr_sai', username: 'sai', email: 'sai@exemplo.com', password: 'Sai#Senha-forte1' });
});

describe('S1: verify-email-token não dá sessão sem código', () => {
  for (const alvo of ['vitima@exemplo.com', 'vitima', 'chefe@exemplo.com']) {
    it(`conta já verificada (${alvo}) com código qualquer: nenhum token`, async () => {
      const r = await call(env, '/api/auth/verify-email-token', { method: 'POST', body: { email: alvo, token: '000000' }, headers: { 'CF-Connecting-IP': nextIp() } });
      expect(r.json?.auth).toBeUndefined();
      expect(JSON.stringify(r.json)).not.toMatch(/accessToken|refreshToken|eyJ/);
      expect(r.json?.alreadyVerified).toBe(true);
    });
  }
});

describe('S3: refresh consulta o estado atual da conta', () => {
  it('conta ativa: renova normalmente', async () => {
    const { refreshToken } = await loginFull(env, 'vitima', 'Vitima#Senha-forte1', nextIp());
    const r = await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken } });
    expect(r.status).toBe(200);
    expect(r.json.accessToken).toBeTruthy();
  });

  it('conta desativada depois do login: refresh recusado', async () => {
    const { refreshToken } = await loginFull(env, 'sai', 'Sai#Senha-forte1', nextIp());
    await env.DB.prepare("UPDATE users SET is_active = 0 WHERE id = 'usr_sai'").run();
    expect((await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken } })).status).toBe(401);
    await env.DB.prepare("UPDATE users SET is_active = 1 WHERE id = 'usr_sai'").run();
  });

  it('conta excluída depois do login: refresh recusado', async () => {
    await insertUser(env, { id: 'usr_tmp', username: 'temporaria', email: 'tmp@exemplo.com', password: 'Tmp#Senha-forte1' });
    const { refreshToken } = await loginFull(env, 'temporaria', 'Tmp#Senha-forte1', nextIp());
    await env.DB.prepare("DELETE FROM users WHERE id = 'usr_tmp'").run();
    expect((await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken } })).status).toBe(401);
  });

  it('admin rebaixado: o token renovado traz o papel atual, não o antigo', async () => {
    const { refreshToken } = await loginFull(env, 'chefe', 'Chefe#Senha-forte1', nextIp());
    await env.DB.prepare("UPDATE users SET role = 'user' WHERE id = 'usr_chefe'").run();
    const r = await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken } });
    expect(r.status).toBe(200);
    expect(decodeJwt(r.json.accessToken).role).toBe('user');
    expect((await call(env, '/api/admin/users', { token: r.json.accessToken })).status).toBe(403);
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE id = 'usr_chefe'").run();
  });
});
