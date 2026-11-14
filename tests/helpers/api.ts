/**
 * Helpers para chamar o handler das Pages Functions como o Cloudflare faria.
 */
import { onRequest } from '../../functions/api/[[path]].js';
import { FakeD1Database } from './d1';

export const TEST_JWT_SECRET = 'test-secret-only-for-vitest-0123456789abcdef';

export interface TestEnv {
  DB: FakeD1Database;
  JWT_SECRET?: string;
  [key: string]: unknown;
}

export function makeEnv(overrides: Partial<TestEnv> = {}): TestEnv {
  return { DB: new FakeD1Database(), JWT_SECRET: TEST_JWT_SECRET, ...overrides };
}

interface CallOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function call(env: TestEnv, path: string, opts: CallOptions = {}) {
  const headers = new Headers(opts.headers || {});
  if (opts.token) headers.set('Authorization', `Bearer ${opts.token}`);
  if (opts.body !== undefined) headers.set('Content-Type', 'application/json');
  headers.set('CF-Connecting-IP', headers.get('CF-Connecting-IP') || '203.0.113.7');

  const request = new Request(`https://ethos.test${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });

  const res: Response = await onRequest({ request, env } as never);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}

/** Mesmo algoritmo de hash do backend (PBKDF2-SHA256, 100k iterações). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

/** Insere um usuário verificado direto no banco (após o handler ter criado as tabelas). */
export async function insertUser(
  env: TestEnv,
  u: { id: string; username: string; email: string; password: string; role?: string; timezone?: string }
) {
  const hash = await hashPassword(u.password);
  await env.DB.prepare(
    `INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, created_at, email_verified)
     VALUES (?, ?, ?, ?, ?, 'US', ?, 1, 'Gratuito', 1, '{}', 0, 0, ?, 1)`
  )
    .bind(u.id, u.username, u.email, hash, u.username, u.role || 'user', new Date().toISOString())
    .run();
  if (u.timezone) {
    await env.DB.prepare(`UPDATE users SET timezone = ? WHERE id = ?`).bind(u.timezone, u.id).run();
  }
}

export async function login(env: TestEnv, loginId: string, password: string): Promise<string> {
  const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: loginId, password } });
  if (res.status !== 200 || !res.json?.auth?.accessToken) {
    throw new Error(`login falhou (${res.status}): ${JSON.stringify(res.json)}`);
  }
  return res.json.auth.accessToken as string;
}
