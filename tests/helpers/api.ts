/**
 * Helpers para chamar o handler das Pages Functions como o Cloudflare faria.
 * (hotfix/seguranca: versão monolítica de functions/api/[[path]].js)
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

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Mesmo algoritmo de hash do backend (PBKDF2-SHA256, 100k iterações). */
export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(plain), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${hex(salt)}$${hex(new Uint8Array(bits))}`;
}

/** Insere um usuário verificado direto no banco. `rawPassword` grava o campo sem hash. */
export async function insertUser(
  env: TestEnv,
  u: { id: string; username: string; email: string; password?: string; rawPassword?: string; role?: string }
) {
  const stored = u.rawPassword ?? (await hashPassword(u.password ?? ''));
  await env.DB.prepare(
    `INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, created_at, email_verified)
     VALUES (?, ?, ?, ?, ?, 'US', ?, 1, 'Gratuito', 1, '{}', 0, 0, ?, 1)`
  )
    .bind(u.id, u.username, u.email, stored, u.username, u.role || 'user', new Date().toISOString())
    .run();
}

export async function loginFull(env: TestEnv, loginId: string, password: string, ip?: string) {
  const res = await call(env, '/api/auth/login', {
    method: 'POST',
    body: { login: loginId, password },
    headers: ip ? { 'CF-Connecting-IP': ip } : {}
  });
  if (res.status !== 200 || !res.json?.auth?.accessToken) {
    throw new Error(`login falhou (${res.status}): ${JSON.stringify(res.json)}`);
  }
  return res.json.auth as { accessToken: string; refreshToken: string; expiresIn: number };
}

export async function login(env: TestEnv, loginId: string, password: string): Promise<string> {
  return (await loginFull(env, loginId, password)).accessToken;
}

// ---- JWT (só para os testes forjarem tokens nos cenários de recusa) ----
const b64url = (bytes: Uint8Array | string) => {
  const b = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export async function signTestJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

export function decodeJwt(token: string): Record<string, any> {
  const part = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)));
}
