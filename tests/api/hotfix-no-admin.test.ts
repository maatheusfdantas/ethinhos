// @vitest-environment node
/**
 * HOTFIX-001 — sem ADMIN_INITIAL_PASSWORD nenhum admin é semeado (não há senha padrão no código).
 * Arquivo próprio porque o handler guarda estado de inicialização do banco em nível de módulo.
 */
import { describe, expect, it, vi } from 'vitest';
import { call, makeEnv } from '../helpers/api';

describe('sem ADMIN_INITIAL_PASSWORD', () => {
  it('nenhum admin é criado e o login "admin" falha', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    const env = makeEnv();
    await call(env, '/api/health');
    const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`).first<{ n: number }>();
    expect(Number(row?.n)).toBe(0);
    const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'admin', password: 'qualquer-coisa' } });
    expect(res.status).toBe(401);
  });
});
