// @vitest-environment node
/**
 * Lote 0b (auditoria 15/11/2026).
 * S2: códigos de 6 dígitos sem limite de tentativas, gerados com Math.random e acumulando a cada reenvio.
 * S11: 5 falhas de qualquer lugar travavam o login de qualquer conta (inclusive o admin).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, makeEnv } from '../helpers/api';
import { sha256Hex } from '../../functions/api/_lib/email.js';
import { generateCode6 } from '../../functions/api/_lib/codes.js';

const env = makeEnv();
const login = (user: string, password: string, ip: string) =>
  call(env, '/api/auth/login', { method: 'POST', body: { login: user, password }, headers: { 'CF-Connecting-IP': ip } });

async function plantCode(userId: string, type: string, code: string, id = `tok_test_${type}_${code}_${Math.random().toString(36).slice(2)}`) {
  await env.DB.prepare(
    'INSERT INTO auth_tokens (id, user_id, token_hash, type, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).bind(id, userId, await sha256Hex(code), type, new Date(Date.now() + 3600e3).toISOString(), new Date().toISOString()).run();
  return id;
}
const wrong = (n: number) => String(100000 + n);

beforeAll(async () => {
  await call(env, '/api/health');
  for (const u of ['alvo', 'dona', 'spray', 'distrib', 'reset1', 'reset2', 'verif', 'reenvio', 'muitos']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
  }
  await env.DB.prepare("UPDATE users SET email_verified = 0 WHERE id IN ('usr_verif', 'usr_reenvio')").run();
});

describe('S11: bloqueio por IP + conta', () => {
  it('atacante de outro IP não trava o login da dona', async () => {
    for (let i = 0; i < 5; i++) expect((await login('alvo', 'errada', '198.51.100.200')).status).toBe(401);
    expect((await login('alvo', 'alvo#Senha-forte1', '198.51.100.200')).status).toBe(429);
    expect((await login('alvo', 'alvo#Senha-forte1', '198.51.100.201')).status).toBe(200);
  });

  it('entrar com sucesso zera as falhas daquele IP naquele login', async () => {
    const ip = '198.51.100.210';
    for (let i = 0; i < 4; i++) await login('dona', 'errada', ip);
    expect((await login('dona', 'dona#Senha-forte1', ip)).status).toBe(200);
    for (let i = 0; i < 4; i++) expect((await login('dona', 'errada', ip)).status).toBe(401);
    expect((await login('dona', 'dona#Senha-forte1', ip)).status).toBe(200);
  });

  it('o mesmo IP tentando muitas contas é bloqueado (20 falhas)', async () => {
    const ip = '198.51.100.220';
    for (let i = 0; i < 20; i++) await login(`ninguem${i}`, 'errada', ip);
    expect((await login('spray', 'spray#Senha-forte1', ip)).status).toBe(429);
    expect((await login('spray', 'spray#Senha-forte1', '198.51.100.221')).status).toBe(200);
  });

  it('ataque distribuído contra uma conta (50 IPs) também é bloqueado', async () => {
    for (let i = 0; i < 50; i++) await login('distrib', 'errada', `192.0.2.${i + 1}`);
    expect((await login('distrib', 'distrib#Senha-forte1', '192.0.2.200')).status).toBe(429);
  }, 60000); // 51 logins com PBKDF2: com a suíte inteira em paralelo passa dos 5 s padrão
});

describe('S2: códigos de 6 dígitos', () => {
  it('são sempre 6 dígitos e variam (gerados com crypto)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = generateCode6();
      expect(c).toMatch(/^[1-9]\d{5}$/);
      seen.add(c);
    }
    expect(seen.size).toBeGreaterThan(490);
  });

  it('recuperação de senha: na 5ª tentativa errada o código é cancelado', async () => {
    await plantCode('usr_reset1', 'password_reset', '424242');
    const tryCode = (token: string) => call(env, '/api/auth/reset-password', { method: 'POST', body: { email: 'reset1', token, newPassword: 'Nova#Senha-forte9' } });
    for (let i = 0; i < 4; i++) expect((await tryCode(wrong(i))).status).toBe(400);
    const fifth = await tryCode(wrong(9));
    expect(fifth.status).toBe(429);
    expect(fifth.json.error).toMatch(/peça um novo/);
    expect((await tryCode('424242')).status).not.toBe(200);
    expect((await login('reset1', 'reset1#Senha-forte1', '198.51.100.230')).status).toBe(200);
  });

  it('recuperação de senha: código certo depois de poucas falhas funciona e cancela os outros', async () => {
    await plantCode('usr_reset2', 'password_reset', '515151');
    const tryCode = (token: string) => call(env, '/api/auth/reset-password', { method: 'POST', body: { email: 'reset2', token, newPassword: 'Nova#Senha-forte9' } });
    for (let i = 0; i < 3; i++) await tryCode(wrong(i));
    expect((await tryCode('515151')).status).toBe(200);
    const open = await env.DB.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE user_id = 'usr_reset2' AND used = 0").first();
    expect(Number((open as any).n)).toBe(0);
  });

  it('confirmação de e-mail: 5 tentativas erradas cancelam o código', async () => {
    await plantCode('usr_verif', 'email_verification', '616161');
    const tryCode = (token: string) => call(env, '/api/auth/verify-email-token', { method: 'POST', body: { email: 'verif@exemplo.com', token } });
    for (let i = 0; i < 4; i++) expect((await tryCode(wrong(i))).status).toBe(400);
    expect((await tryCode(wrong(8))).status).toBe(429);
    const r = await tryCode('616161');
    expect(r.status).not.toBe(200);
    expect(r.json?.auth).toBeUndefined();
  });

  it('reenviar o código cancela os anteriores, mas preserva o token de 48h do admin', async () => {
    const own = await plantCode('usr_reenvio', 'email_verification', '717171');
    const admin = await plantCode('usr_reenvio', 'email_verification', '727272', 'tok_48h_teste_reenvio');
    expect((await call(env, '/api/auth/resend-verification', { method: 'POST', body: { email: 'reenvio@exemplo.com' } })).status).toBe(200);
    const row = (id: string) => env.DB.prepare('SELECT used FROM auth_tokens WHERE id = ?').bind(id).first();
    expect(Number(((await row(own)) as any).used)).toBe(1);
    expect(Number(((await row(admin)) as any).used)).toBe(0);
  });

  it('no máximo 5 pedidos de código por hora para a mesma conta', async () => {
    const ask = () => call(env, '/api/auth/forgot-password', { method: 'POST', body: { email: 'muitos@exemplo.com' } });
    for (let i = 0; i < 5; i++) expect((await ask()).status).toBe(200);
    const sixth = await ask();
    expect(sixth.status).toBe(429);
    expect(JSON.stringify(sixth.json)).not.toMatch(/\d{6}/);
  });
});
