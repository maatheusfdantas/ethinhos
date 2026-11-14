// @vitest-environment node
/**
 * Correções de segurança (Fase 1):
 * 1. Anti-IDOR exige JWT; o cabeçalho X-Ethos-User-Id sozinho não autoriza nada.
 * 2. Sem senhas mestras: senhas "de demonstração" não abrem contas alheias.
 * 3. Sem comparação de senha em texto puro.
 * 4. Admin inicial só é criado com ADMIN_INITIAL_PASSWORD (sem senha padrão no código).
 * 5. Login do admin também passa pela proteção contra força bruta.
 * 6. Sem chave de API do Resend embutida no código.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, hashPassword, insertUser, login, makeEnv } from '../helpers/api';
import { sendResendEmailEdge } from '../../functions/api/_lib/email.js';

const ADMIN_PASSWORD = 'Adm1n#Inicial-Somente-Teste';
const env = makeEnv({ ADMIN_INITIAL_PASSWORD: ADMIN_PASSWORD });
const fetchMock = vi.fn(async () => new Response('{}', { status: 503 }));
let ip = 10;
const nextIp = () => `198.51.100.${ip++}`;

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_carol', username: 'carol', email: 'carol@ethos.test', password: '123' });
  await insertUser(env, { id: 'usr_dave', username: 'dave', email: 'dave@ethos.test', password: 'Dave#Senha-forte-1' });
  // Conta legada com senha gravada em texto puro.
  await env.DB.prepare(
    `INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, created_at, email_verified)
     VALUES ('usr_plain', 'plain', 'plain@ethos.test', 'senha-em-texto', 'Plain', 'PL', 'user', 1, 'Gratuito', 1, '{}', 0, 0, ?, 1)`
  )
    .bind(new Date().toISOString())
    .run();
});

const tryLogin = (loginId: string, password: string) =>
  call(env, '/api/auth/login', { method: 'POST', body: { login: loginId, password }, headers: { 'CF-Connecting-IP': nextIp() } });

describe('1. Anti-IDOR exige JWT', () => {
  it('cabeçalho X-Ethos-User-Id sem token não acessa dados (401)', async () => {
    const res = await call(env, '/api/user/usr_dave/data', { headers: { 'X-Ethos-User-Id': 'usr_dave' } });
    expect(res.status).toBe(401);
  });

  it('cabeçalho X-Ethos-User-Id sem token não grava dados (401)', async () => {
    const res = await call(env, '/api/user/usr_dave/habit', {
      method: 'POST',
      headers: { 'X-Ethos-User-Id': 'usr_dave' },
      body: { id: 'h1', title: 'invasão' }
    });
    expect(res.status).toBe(401);
  });

  it('com JWT do dono continua funcionando', async () => {
    const token = await login(env, 'dave', 'Dave#Senha-forte-1');
    const res = await call(env, '/api/user/usr_dave/data', { token });
    expect(res.status).toBe(200);
  });
});

describe('2. Sem senhas mestras', () => {
  it('senha de demonstração não abre conta cuja senha real é outra', async () => {
    for (const alias of ['teste123', 'Teste@2026!Ethos', 'Ethos@User123!']) {
      expect((await tryLogin('carol', alias)).status).toBe(401);
    }
  });

  it('a senha real continua funcionando', async () => {
    expect((await tryLogin('carol', '123')).status).toBe(200);
  });

  it('admin123 / Admin@2026!Ethos não entram como admin', async () => {
    expect((await tryLogin('admin', 'admin123')).status).toBe(401);
    expect((await tryLogin('admin', 'Admin@2026!Ethos')).status).toBe(401);
  });
});

describe('3. Sem comparação em texto puro', () => {
  it('senha gravada em texto puro não autentica', async () => {
    expect((await tryLogin('plain', 'senha-em-texto')).status).toBe(401);
  });
});

describe('4. Admin inicial vem de ADMIN_INITIAL_PASSWORD', () => {
  it('admin entra com a senha da variável de ambiente', async () => {
    expect((await tryLogin('admin', ADMIN_PASSWORD)).status).toBe(200);
  });

  it('a senha fica gravada como hash PBKDF2', async () => {
    const row = await env.DB.prepare(`SELECT password FROM users WHERE id = 'usr_admin'`).first<{ password: string }>();
    expect(row?.password).toMatch(/^pbkdf2\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(row?.password).not.toContain(ADMIN_PASSWORD);
  });
});

describe('5. Força bruta vale para o admin', () => {
  it('5 falhas seguidas bloqueiam novas tentativas do admin (429)', async () => {
    const fixedIp = '192.0.2.200';
    const attempt = (password: string) =>
      call(env, '/api/auth/login', { method: 'POST', body: { login: 'admin', password }, headers: { 'CF-Connecting-IP': fixedIp } });
    for (let i = 0; i < 5; i++) await attempt(`errada-${i}`);
    expect((await attempt(ADMIN_PASSWORD)).status).toBe(429);
  });
});

describe('6. Sem chave do Resend embutida', () => {
  it('sem RESEND_API_KEY no ambiente, não chama a API do Resend', async () => {
    fetchMock.mockClear();
    const res = await sendResendEmailEdge({}, { to: 'x@ethos.test', subject: 's', html: '<p>h</p>', text: 't' });
    expect(res.simulated).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

it('hash de teste usa o mesmo formato do backend', async () => {
  expect(await hashPassword('x')).toMatch(/^pbkdf2\$/);
});
