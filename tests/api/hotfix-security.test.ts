// @vitest-environment node
/**
 * HOTFIX-001 — correções de segurança sobre a versão publicada (main @ 655c8fe).
 * Nenhuma chamada externa: fetch é substituído por um stub; banco em memória.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, decodeJwt, insertUser, login, loginFull, makeEnv, signTestJwt, TEST_JWT_SECRET } from '../helpers/api';

const ADMIN_PASSWORD = 'Adm1n#Inicial-Somente-Teste';
// Segredo antigo embutido no código publicado. Montado em partes para não reaparecer
// como literal pesquisável; serve só para provar que tokens assinados com ele são recusados.
const OLD_EMBEDDED_SECRET = ['ethos', 'edge', 'jwt', 'hmac', 'secret', '2026', 'v1', 'production', 'key', 'secure'].join('_');
const DEMO_ALIASES = [
  ['Teste', '@2026!Ethos'].join(''),
  ['teste', '123'].join(''),
  ['Ethos', '@User123!'].join('')
];
const ADMIN_ALIASES = [['admin', '123'].join(''), ['Admin', '@2026!Ethos'].join('')];

const env = makeEnv({ ADMIN_INITIAL_PASSWORD: ADMIN_PASSWORD });
const fetchMock = vi.fn(async (_input?: unknown) => new Response('{}', { status: 503 }));
let ipCounter = 10;
const nextIp = () => `198.51.100.${ipCounter++}`;
const tryLogin = (loginId: string, password: string) =>
  call(env, '/api/auth/login', { method: 'POST', body: { login: loginId, password }, headers: { 'CF-Connecting-IP': nextIp() } });

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_carol', username: 'carol', email: 'carol@ethos.test', password: '123' });
  await insertUser(env, { id: 'usr_dave', username: 'dave', email: 'dave@ethos.test', password: 'Dave#Senha-forte-1' });
  await insertUser(env, { id: 'usr_plain', username: 'plain', email: 'plain@ethos.test', rawPassword: 'senha-em-texto' });
  await insertUser(env, { id: 'usr_oauth', username: 'oauthuser', email: 'oauth@ethos.test', rawPassword: 'OAUTH_FEDERATED_ACCOUNT' });
});

describe('autenticação', () => {
  it('login válido devolve access e refresh; senha errada 401; campos vazios 400', async () => {
    expect((await tryLogin('dave', 'Dave#Senha-forte-1')).status).toBe(200);
    expect((await tryLogin('dave', 'errada')).status).toBe(401);
    expect((await call(env, '/api/auth/login', { method: 'POST', body: {} })).status).toBe(400);
  });

  it('senhas de demonstração não abrem conta cuja senha real é outra', async () => {
    for (const alias of DEMO_ALIASES) expect((await tryLogin('carol', alias)).status).toBe(401);
    expect((await tryLogin('carol', '123')).status).toBe(200); // a senha real continua valendo
  });

  it('aliases antigos do admin não entram', async () => {
    for (const alias of ADMIN_ALIASES) expect((await tryLogin('admin', alias)).status).toBe(401);
  });

  it('senha gravada em texto puro não autentica', async () => {
    expect((await tryLogin('plain', 'senha-em-texto')).status).toBe(401);
  });

  it('conta OAuth não pode ser acessada usando o marcador do campo de senha', async () => {
    expect((await tryLogin('oauthuser', 'OAUTH_FEDERATED_ACCOUNT')).status).toBe(401);
  });
});

describe('tokens: expiração e separação access/refresh', () => {
  it('access token expira em 1 h e refresh em 7 dias (sem piso de 30 dias)', async () => {
    const auth = await loginFull(env, 'dave', 'Dave#Senha-forte-1', nextIp());
    const access = decodeJwt(auth.accessToken);
    const refresh = decodeJwt(auth.refreshToken);
    expect(access.exp - access.iat).toBe(3600);
    expect(refresh.exp - refresh.iat).toBe(7 * 24 * 3600);
    expect(refresh.type).toBe('refresh');
    expect(access.type).toBeUndefined();
  });

  it('refresh token NÃO autentica rotas de recurso nem admin', async () => {
    const auth = await loginFull(env, 'dave', 'Dave#Senha-forte-1', nextIp());
    expect((await call(env, '/api/user/usr_dave/data', { token: auth.refreshToken })).status).toBe(401);
    const adminAuth = await loginFull(env, 'admin', ADMIN_PASSWORD, nextIp());
    expect((await call(env, '/api/admin/users', { token: adminAuth.refreshToken })).status).toBe(401);
  });

  it('/api/auth/refresh aceita refresh e recusa access token', async () => {
    const auth = await loginFull(env, 'dave', 'Dave#Senha-forte-1', nextIp());
    const ok = await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken: auth.refreshToken } });
    expect(ok.status).toBe(200);
    expect(decodeJwt(ok.json.accessToken).exp - decodeJwt(ok.json.accessToken).iat).toBe(3600);
    const bad = await call(env, '/api/auth/refresh', { method: 'POST', body: { refreshToken: auth.accessToken } });
    expect(bad.status).toBe(401);
  });

  it('token expirado é recusado', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await signTestJwt({ sub: 'usr_dave', role: 'user', iat: now - 7200, exp: now - 60 }, TEST_JWT_SECRET);
    expect((await call(env, '/api/user/usr_dave/data', { token: expired })).status).toBe(401);
  });

  it('token assinado com o segredo antigo embutido é recusado', async () => {
    const now = Math.floor(Date.now() / 1000);
    const forged = await signTestJwt({ sub: 'usr_admin', role: 'admin', iat: now, exp: now + 3600 }, OLD_EMBEDDED_SECRET);
    expect((await call(env, '/api/admin/users', { token: forged })).status).toBe(401);
    expect((await call(env, '/api/user/usr_admin/data', { token: forged })).status).toBe(401);
  });
});

describe('autorização entre usuários', () => {
  it('cabeçalho X-Ethos-User-Id sem token não lê nem grava (401)', async () => {
    const h = { 'X-Ethos-User-Id': 'usr_dave' };
    expect((await call(env, '/api/user/usr_dave/data', { headers: h })).status).toBe(401);
    expect((await call(env, '/api/user/usr_dave/habit', { method: 'POST', headers: h, body: { id: 'h1', title: 'x' } })).status).toBe(401);
  });

  it('token de A em dados de B responde 403; dono acessa 200', async () => {
    const carol = await login(env, 'carol', '123');
    expect((await call(env, '/api/user/usr_dave/data', { token: carol })).status).toBe(403);
    expect((await call(env, '/api/user/usr_carol/data', { token: carol })).status).toBe(200);
  });
});

describe('administração', () => {
  it('/api/admin exige papel admin', async () => {
    const carol = await login(env, 'carol', '123');
    const admin = await login(env, 'admin', ADMIN_PASSWORD);
    expect((await call(env, '/api/admin/users')).status).toBe(401);
    expect((await call(env, '/api/admin/users', { token: carol })).status).toBe(403);
    expect((await call(env, '/api/admin/users', { token: admin })).status).toBe(200);
  });

  it('admin inicial é gravado como hash PBKDF2 a partir de ADMIN_INITIAL_PASSWORD', async () => {
    const row = await env.DB.prepare(`SELECT password FROM users WHERE id = 'usr_admin'`).first<{ password: string }>();
    expect(row?.password).toMatch(/^pbkdf2\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  });

  it('5 falhas seguidas bloqueiam também o admin (429)', async () => {
    const ip = '192.0.2.200';
    const attempt = (password: string) =>
      call(env, '/api/auth/login', { method: 'POST', body: { login: 'admin', password }, headers: { 'CF-Connecting-IP': ip } });
    for (let i = 0; i < 5; i++) await attempt(`errada-${i}`);
    expect((await attempt(ADMIN_PASSWORD)).status).toBe(429);
  });
});

describe('leads da waitlist', () => {
  it('inscrição pública continua funcionando (201)', async () => {
    const res = await call(env, '/api/waitlist', {
      method: 'POST',
      body: { name: 'Pessoa Teste', email: 'lead@exemplo.test', phone: '+55 11 90000-0000' }
    });
    expect(res.status).toBe(201);
  });

  it('o log de auditoria da inscrição não contém nome, e-mail nem telefone', async () => {
    const rows = await env.DB.prepare(`SELECT user_id, metadata FROM auth_audit_logs WHERE event_type = 'WAITLIST_SIGNUP'`).all<{
      user_id: string | null;
      metadata: string;
    }>();
    expect(rows.results.length).toBeGreaterThan(0);
    for (const r of rows.results) {
      const text = `${r.user_id ?? ''} ${r.metadata}`;
      expect(text).not.toContain('lead@exemplo.test');
      expect(text).not.toContain('Pessoa Teste');
      expect(text).not.toContain('90000-0000');
    }
  });

  it('leitura da waitlist não é pública: sem token 401, usuário comum 403', async () => {
    const carol = await login(env, 'carol', '123');
    expect((await call(env, '/api/admin/waitlist')).status).toBe(401);
    expect((await call(env, '/api/admin/waitlist', { token: carol })).status).toBe(403);
    expect((await call(env, '/api/waitlist')).status).toBe(404); // GET público não existe
  });
});

describe('ausência de segredos', () => {
  it('sem RESEND_API_KEY, nenhuma chamada à API do Resend', async () => {
    fetchMock.mockClear();
    const res = await call(env, '/api/auth/forgot-password', { method: 'POST', body: { email: 'dave@ethos.test' } });
    expect(res.status).toBe(200);
    const calledResend = fetchMock.mock.calls.some(([input]) => String(input).includes('api.resend.com'));
    expect(calledResend).toBe(false);
  });
});
