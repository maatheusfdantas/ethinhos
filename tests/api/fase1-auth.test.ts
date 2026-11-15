// @vitest-environment node
/**
 * Fase 1 — cadastro com @ e senha forte, chamados de suporte protegidos e login social (OAuth + PKCE).
 * Nenhuma rede real: fetch é substituído por um provedor simulado.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, insertUser, login, makeEnv, TEST_JWT_SECRET, signTestJwt } from '../helpers/api';

const OAUTH_ENV = {
  GOOGLE_CLIENT_ID: 'google-client-teste', GOOGLE_CLIENT_SECRET: 'google-secret-teste',
  MICROSOFT_CLIENT_ID: 'ms-client-teste', MICROSOFT_CLIENT_SECRET: 'ms-secret-teste'
};
const env = makeEnv(OAUTH_ENV);
let profile: Record<string, unknown> = {};
let lastTokenBody = '';
const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
  const u = String(input);
  if (u.includes('dns.google')) return Response.json({ Status: 0, Answer: [{ type: 15, data: '10 mx.exemplo.com.' }] });
  if (u.includes('oauth2.googleapis.com/token') || u.includes('login.microsoftonline.com')) {
    lastTokenBody = String(init?.body || '');
    return Response.json({ access_token: 'provider-access', token_type: 'Bearer' });
  }
  if (u.includes('userinfo')) return Response.json(profile);
  return new Response('{}', { status: 503 });
});
let ip = 20;
const nextIp = () => `198.51.100.${ip++}`;

const register = (body: Record<string, unknown>) =>
  call(env, '/api/auth/register', { method: 'POST', body: { name: 'Ana Teste', email: 'ana@exemplo.com', username: 'ana.teste', password: 'Senha#Forte1', ...body }, headers: { 'CF-Connecting-IP': nextIp() } });

beforeAll(async () => {
  vi.stubGlobal('fetch', fetchMock);
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_bia', username: 'bia', email: 'bia@exemplo.com', password: 'Bia#Senha-forte1' });
  await insertUser(env, { id: 'usr_adm', username: 'chefe', email: 'chefe@exemplo.com', password: 'Chefe#Senha-forte1', role: 'admin' });
});

describe('cadastro', () => {
  it('exige @ válido, disponível e não reservado', async () => {
    expect((await register({ username: '' })).status).toBe(400);
    const bad = await register({ username: 'A' });
    expect(bad.status).toBe(400); expect(bad.json.field).toBe('username');
    expect((await register({ username: 'admin' })).json.error).toMatch(/reservado/);
    expect((await register({ username: 'novo_abc' })).json.error).toMatch(/reservado/);
    const taken = await register({ username: 'BIA', email: 'outra@exemplo.com' });
    expect(taken.status).toBe(409); expect(taken.json.error).toMatch(/@ já está em uso/);
  });

  it('exige senha com 8+ caracteres, maiúscula e especial, e confirmação igual', async () => {
    for (const password of ['Curta#1', 'semmaiuscula#1', 'SemEspecial1']) {
      const r = await register({ password });
      expect(r.status).toBe(400); expect(r.json.field).toBe('password');
    }
    const mismatch = await register({ passwordConfirm: 'Outra#Senha1' });
    expect(mismatch.status).toBe(400); expect(mismatch.json.error).toBe('As senhas não coincidem.');
  });

  it('cadastra com @ normalizado e e-mail duplicado tem mensagem própria', async () => {
    const ok = await register({ username: '@Ana.Teste', passwordConfirm: 'Senha#Forte1' });
    expect(ok.status).toBe(201); expect(ok.json.username).toBe('ana.teste');
    const row: any = await env.DB.prepare("SELECT password FROM users WHERE username = 'ana.teste'").first();
    // recadastro com o mesmo e-mail pendente NÃO troca a senha salva
    await register({ username: 'ana.outra', password: 'Invasor#Senha1' });
    const after: any = await env.DB.prepare("SELECT password FROM users WHERE username = 'ana.teste'").first();
    expect(after.password).toBe(row.password);
    const dup = await register({ email: 'bia@exemplo.com', username: 'bia.nova' });
    expect(dup.status).toBe(409); expect(dup.json.field).toBe('email');
  });

  it('consulta de disponibilidade do @', async () => {
    expect((await call(env, '/api/auth/username-available?u=bia')).json).toEqual({ available: false, reason: 'Esse @ já está em uso.' });
    expect((await call(env, '/api/auth/username-available?u=livre.agora')).json).toEqual({ available: true });
    expect((await call(env, '/api/auth/username-available?u=a')).json.available).toBe(false);
  });

  it('atalho admin.local não entra mais na primeira conta admin', async () => {
    const r = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'admin.local', password: 'Chefe#Senha-forte1' }, headers: { 'CF-Connecting-IP': nextIp() } });
    expect(r.status).toBe(401);
  });
});

describe('chamados de suporte', () => {
  it('listar exige login; usuário vê só os seus; admin vê todos', async () => {
    const bia = await login(env, 'bia', 'Bia#Senha-forte1');
    const adm = await login(env, 'chefe', 'Chefe#Senha-forte1');
    await call(env, '/api/support/tickets', { method: 'POST', token: bia, body: { subject: 'Ajuda', message: 'Oi', user_id: 'usr_adm' } });
    await call(env, '/api/support/tickets', { method: 'POST', token: adm, body: { subject: 'Interno', message: 'x' } });
    expect((await call(env, '/api/support/tickets')).status).toBe(401);
    const mine = await call(env, '/api/support/tickets?userId=usr_adm', { token: bia });
    expect(mine.json.tickets.map((t: any) => t.user_id)).toEqual(['usr_bia']);
    expect((await call(env, '/api/support/tickets', { token: adm })).json.tickets.length).toBe(2);
  });
});

// ---- OAuth ----
async function startFlow(provider: 'google' | 'microsoft', query = '') {
  const r = await call(env, `/api/auth/oauth/${provider}${query}`);
  const loc = new URL(r.headers.get('Location')!);
  const cookie = (r.headers.get('Set-Cookie') || '').split(';')[0] ?? '';
  return { r, loc, cookie, state: loc.searchParams.get('state')! };
}
async function finishFlow(provider: 'google' | 'microsoft', query = '') {
  const { cookie, state } = await startFlow(provider, query);
  const r = await call(env, `/api/auth/oauth/callback/${provider}?code=abc&state=${state}`, { headers: { Cookie: cookie } });
  return new URL(r.headers.get('Location')!);
}
const exchange = (code: string) => call(env, '/api/auth/oauth/exchange', { method: 'POST', body: { code } });

describe('login social', () => {
  beforeEach(() => { profile = {}; });

  it('sem credenciais configuradas: volta com erro amigável, sem detalhe técnico', async () => {
    const bare = makeEnv();
    await call(bare, '/api/health');
    expect((await call(bare, '/api/auth/oauth/providers')).json).toEqual({ google: false, microsoft: false });
    const r = await call(bare, '/api/auth/oauth/google');
    expect(r.headers.get('Location')).toBe('https://ethos.test/?auth_error=provedor_indisponivel');
  });

  it('só Google configurado (como em produção): Google funciona, Microsoft fica indisponível', async () => {
    const onlyGoogle = makeEnv({ GOOGLE_CLIENT_ID: 'g-id', GOOGLE_CLIENT_SECRET: 'g-secret' });
    await call(onlyGoogle, '/api/health');
    expect((await call(onlyGoogle, '/api/auth/oauth/providers')).json).toEqual({ google: true, microsoft: false });
    const g = await call(onlyGoogle, '/api/auth/oauth/google?action=login');
    expect(g.status).toBe(302);
    expect(new URL(g.headers.get('Location')!).origin).toBe('https://accounts.google.com');
    const ms = await call(onlyGoogle, '/api/auth/oauth/microsoft');
    expect(ms.headers.get('Location')).toBe('https://ethos.test/?auth_error=provedor_indisponivel');
  });

  it('início pede só identidade, com PKCE e state em cookie HttpOnly', async () => {
    const { r, loc } = await startFlow('google');
    expect(r.status).toBe(302);
    expect(loc.origin).toBe('https://accounts.google.com');
    expect(loc.searchParams.get('scope')).toBe('openid email profile');
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('redirect_uri')).toBe('https://ethos.test/api/auth/oauth/callback/google');
    expect(r.headers.get('Set-Cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it('volta com state diferente ou sem cookie é recusada', async () => {
    const { cookie } = await startFlow('google');
    const wrong = await call(env, '/api/auth/oauth/callback/google?code=abc&state=outro', { headers: { Cookie: cookie } });
    expect(wrong.headers.get('Location')).toMatch(/auth_error=sessao_expirada/);
    const none = await call(env, '/api/auth/oauth/callback/google?code=abc&state=x');
    expect(none.headers.get('Location')).toMatch(/auth_error=sessao_expirada/);
  });

  it('conta nova: código de uso único (sem token na URL), depois escolher o @', async () => {
    profile = { sub: 'g-111', email: 'nova@gmail.com', email_verified: true, name: 'Nova Pessoa' };
    const loc = await finishFlow('google');
    expect(loc.searchParams.get('auth')).toBe('ok');
    expect(loc.search).not.toMatch(/access_token|refresh_token/);
    expect(lastTokenBody).toMatch(/code_verifier=/);
    const code = loc.searchParams.get('code')!;
    const ex = await exchange(code);
    expect(ex.status).toBe(200); expect(ex.json.needsUsername).toBe(true);
    expect(ex.json.role).toBe('user'); // conta nova nunca nasce admin
    expect(ex.json.username).toMatch(/^novo_/); // provisório até escolher o @
    expect((await exchange(code)).status).toBe(400); // não reutiliza
    const tok = ex.json.auth.accessToken;
    expect((await call(env, '/api/auth/username', { method: 'PUT', token: tok, body: { username: 'bia' } })).status).toBe(409);
    const ok = await call(env, '/api/auth/username', { method: 'PUT', token: tok, body: { username: 'nova.pessoa' } });
    expect(ok.status).toBe(200); expect(ok.json.username).toBe('nova.pessoa'); expect(ok.json.needsUsername).toBe(false);
    // segundo login pelo mesmo provedor entra direto na mesma conta
    const again = await exchange((await finishFlow('google')).searchParams.get('code')!);
    expect(again.json.id).toBe(ok.json.id); expect(again.json.needsUsername).toBe(false);
  });

  it('e-mail de conta existente NÃO vincula sozinho (evita tomada de conta)', async () => {
    profile = { sub: 'ms-999', email: 'chefe@exemplo.com', name: 'Falso Chefe' };
    expect((await finishFlow('microsoft')).searchParams.get('auth_error')).toBe('conta_existe');
    profile = { sub: 'g-222', email: 'x@gmail.com', email_verified: false };
    expect((await finishFlow('google')).searchParams.get('auth_error')).toBe('email_nao_verificado');
  });

  it('conectar pelo Perfil vincula à conta logada; depois o login social entra nela', async () => {
    const bia = await login(env, 'bia', 'Bia#Senha-forte1');
    const ticket = (await call(env, '/api/auth/oauth/link-ticket', { method: 'POST', token: bia })).json.ticket;
    profile = { sub: 'ms-bia', email: 'bia.trabalho@empresa.com', name: 'Bia' };
    expect((await finishFlow('microsoft', `?link=${ticket}`)).searchParams.get('connected')).toBe('microsoft');
    const ex = await exchange((await finishFlow('microsoft')).searchParams.get('code')!);
    expect(ex.json.id).toBe('usr_bia');
    const ids = await call(env, '/api/auth/oauth/identities', { token: bia });
    expect(ids.json.identities.map((i: any) => i.provider)).toEqual(['microsoft']);
  });

  it('tokens de estado, vínculo e refresh não valem como sessão', async () => {
    const forged = await signTestJwt({ type: 'oauth_link', sub: 'usr_bia', exp: Math.floor(Date.now() / 1000) + 60 }, TEST_JWT_SECRET);
    expect((await call(env, '/api/user/usr_bia/data', { token: forged })).status).toBe(401);
  });

  it('credenciais do Google não podem mais ser trocadas sem login', async () => {
    expect((await call(env, '/api/auth/google/credentials', { method: 'POST', body: { clientId: 'x', clientSecret: 'y' } })).status).toBe(410);
  });
});
