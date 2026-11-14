// @vitest-environment node
/**
 * Sem JWT_SECRET configurado, o backend NÃO pode assinar tokens com um segredo
 * embutido no código (qualquer um forjaria um token de admin). Falha fechada.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { call, insertUser, makeEnv } from '../helpers/api';
import { signJwtEdge } from '../../functions/api/_lib/auth.js';

const env = makeEnv({ JWT_SECRET: undefined });

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_erin', username: 'erin', email: 'erin@ethos.test', password: 'Erin#Senha-forte-1' });
});

describe('JWT_SECRET obrigatório', () => {
  it('login responde 503 com mensagem clara e sem emitir token', async () => {
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'erin', password: 'Erin#Senha-forte-1' } });
    expect(res.status).toBe(503);
    expect(res.json.error).toMatch(/JWT_SECRET/);
    expect(res.json.auth).toBeUndefined();
  });

  it('token assinado com o antigo segredo embutido não é aceito', async () => {
    const legacySecretEnv = { JWT_SECRET: 'ethos_edge_jwt_hmac_secret_2026_v1_production_key_secure' };
    const forged = await signJwtEdge({ sub: 'usr_erin', role: 'admin' }, legacySecretEnv, 3600);
    const res = await call(env, '/api/user/usr_erin/data', { token: forged });
    expect(res.status).toBe(401);
  });

  it('segredo curto demais é recusado', async () => {
    await expect(signJwtEdge({ sub: 'x' }, { JWT_SECRET: 'curto' }, 60)).rejects.toThrow(/JWT_SECRET/);
  });
});
