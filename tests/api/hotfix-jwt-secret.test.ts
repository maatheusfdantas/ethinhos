// @vitest-environment node
/**
 * HOTFIX-001 — sem JWT_SECRET (ou com segredo curto) o backend falha fechado.
 * Arquivo próprio porque o handler guarda estado de inicialização do banco em nível de módulo.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, insertUser, makeEnv } from '../helpers/api';

const env = makeEnv({ JWT_SECRET: undefined });

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_erin', username: 'erin', email: 'erin@ethos.test', password: 'Erin#Senha-forte-1' });
});

describe('JWT_SECRET obrigatório', () => {
  it('sem segredo: login responde 503 com mensagem clara e sem token', async () => {
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'erin', password: 'Erin#Senha-forte-1' } });
    expect(res.status).toBe(503);
    expect(res.json.error).toMatch(/JWT_SECRET/);
    expect(res.json.auth).toBeUndefined();
  });

  it('segredo curto também é recusado (503)', async () => {
    env.JWT_SECRET = 'curto';
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'erin', password: 'Erin#Senha-forte-1' } });
    expect(res.status).toBe(503);
  });

  it('sem segredo, rotas protegidas respondem 401 (nenhum token é aceito)', async () => {
    env.JWT_SECRET = undefined;
    const res = await call(env, '/api/user/usr_erin/data', { token: 'a.b.c' });
    expect(res.status).toBe(401);
  });
});
