// @vitest-environment node
/**
 * Testes de caracterização do handler legado (`functions/api/[[path]].js`).
 * Congelam o comportamento observável atual para que a modularização não o mude.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let adminToken = '';
let aliceToken = '';

beforeAll(async () => {
  // Nenhuma chamada de rede real em testes.
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));

  // Primeira requisição cria as tabelas legadas e semeia o admin.
  const health = await call(env, '/api/health');
  expect(health.status).toBe(200);

  await insertUser(env, { id: 'usr_alice', username: 'alice', email: 'alice@ethos.test', password: 'Alice#Senha-forte-1' });
  await insertUser(env, { id: 'usr_bob', username: 'bob', email: 'bob@ethos.test', password: 'Bob#Senha-forte-1' });
  aliceToken = await login(env, 'alice', 'Alice#Senha-forte-1');
  adminToken = await login(env, 'admin', 'Admin@2026!Ethos');
});

describe('handler legado: rotas públicas', () => {
  it('GET /api/health responde ok em modo d1', async () => {
    const res = await call(env, '/api/health');
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ status: 'ok', databaseMode: 'd1' });
  });

  it('OPTIONS responde 204 (preflight CORS)', async () => {
    const res = await call(env, '/api/health', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
  });

  it('rota desconhecida responde 404', async () => {
    const res = await call(env, '/api/nao-existe');
    expect(res.status).toBe(404);
  });

  it('POST /api/waitlist grava o inscrito (usado pelo landing-site)', async () => {
    const res = await call(env, '/api/waitlist', {
      method: 'POST',
      body: { name: 'Fulana', email: 'Fulana@Exemplo.com', phone: '+55 11 90000-0000' }
    });
    expect(res.status).toBe(201);
    expect(res.json.entry).toMatchObject({ email: 'fulana@exemplo.com', status: 'pendente' });
    const row = await env.DB.prepare('SELECT email FROM waitlist WHERE id = ?').bind(res.json.entry.id).first();
    expect(row).toEqual({ email: 'fulana@exemplo.com' });
  });

  it('POST /api/waitlist sem telefone responde 400', async () => {
    const res = await call(env, '/api/waitlist', { method: 'POST', body: { name: 'X', email: 'x@y.z' } });
    expect(res.status).toBe(400);
  });
});

describe('handler legado: autenticação', () => {
  it('login com senha errada responde 401', async () => {
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'alice', password: 'errada' } });
    expect(res.status).toBe(401);
  });

  it('login sem campos responde 400', async () => {
    const res = await call(env, '/api/auth/login', { method: 'POST', body: {} });
    expect(res.status).toBe(400);
  });

  it('login válido devolve access e refresh token', async () => {
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'alice@ethos.test', password: 'Alice#Senha-forte-1' } });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ id: 'usr_alice', role: 'user' });
    expect(res.json.auth.accessToken.split('.')).toHaveLength(3);
    expect(res.json.auth.refreshToken.split('.')).toHaveLength(3);
  });
});

describe('handler legado: autorização (Anti-IDOR e RBAC)', () => {
  it('dono acessa os próprios dados com JWT', async () => {
    const res = await call(env, '/api/user/usr_alice/data', { token: aliceToken });
    expect(res.status).toBe(200);
  });

  it('usuário não acessa dados de outro usuário (403)', async () => {
    const res = await call(env, '/api/user/usr_bob/data', { token: aliceToken });
    expect(res.status).toBe(403);
  });

  it('sem token responde 401', async () => {
    const res = await call(env, '/api/user/usr_alice/data');
    expect(res.status).toBe(401);
  });

  it('token adulterado responde 401', async () => {
    const forged = aliceToken.slice(0, -4) + 'AAAA';
    const res = await call(env, '/api/user/usr_alice/data', { token: forged });
    expect(res.status).toBe(401);
  });

  it('rotas /api/admin exigem papel admin', async () => {
    expect((await call(env, '/api/admin/users')).status).toBe(401);
    expect((await call(env, '/api/admin/users', { token: aliceToken })).status).toBe(403);
    expect((await call(env, '/api/admin/users', { token: adminToken })).status).toBe(200);
  });
});
