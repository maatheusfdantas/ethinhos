/**
 * Hash de senha (PBKDF2) e JWT HMAC-SHA256.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 2. HASHING DE SENHA E ASSINATURA JWT (WEB CRYPTO API — CLOUDFLARE EDGE)
// ============================================================================
export async function hashPasswordEdge(plainPassword, existingSaltHex = null) {
  const enc = new TextEncoder();
  const saltBytes = existingSaltHex
    ? new Uint8Array(existingSaltHex.match(/.{1,2}/g).map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(plainPassword)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2$${saltHex}$${hashHex}`;
}

/** Comparação em tempo constante de duas strings hex de mesmo tamanho. */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica a senha contra o hash PBKDF2 gravado (`pbkdf2$salt$hash` ou `pbkdf2_sha256$...`).
 * Não há senhas mestras nem comparação em texto puro: qualquer outro formato é recusado.
 */
export async function verifyPasswordEdge(plainPassword, storedPassword) {
  if (typeof storedPassword !== 'string' || !storedPassword) return false;
  if (!storedPassword.startsWith('pbkdf2$') && !storedPassword.startsWith('pbkdf2_sha256$')) return false;

  const parts = storedPassword.split('$');
  if (parts.length !== 3 || !/^[0-9a-f]+$/i.test(parts[1]) || !/^[0-9a-f]{64}$/i.test(parts[2])) return false;

  try {
    const candidate = await hashPasswordEdge(String(plainPassword), parts[1]);
    return timingSafeEqualHex(candidate.split('$')[2], parts[2].toLowerCase());
  } catch (_e) {
    return false;
  }
}

export function base64UrlEncode(strOrBytes) {
  const bytes = typeof strOrBytes === 'string' ? new TextEncoder().encode(strOrBytes) : new Uint8Array(strOrBytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecodeToString(b64url) {
  const b64 = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** Erro de configuração do servidor (ex.: segredo ausente). O roteador responde 503. */
export class ServerConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerConfigError';
  }
}

const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Chave HMAC dos JWT. Falha fechada: sem JWT_SECRET (ou com segredo curto) não há
 * assinatura nem verificação. Não existe segredo padrão embutido no código.
 */
export async function getHmacKeyEdge(env) {
  const secret = env?.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw new ServerConfigError(
      `JWT_SECRET ausente ou com menos de ${MIN_JWT_SECRET_LENGTH} caracteres. Configure-o nas variáveis do Cloudflare Pages.`
    );
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwtEdge(payload, env, ttlSeconds = 30 * 24 * 3600) {
  const effectiveTtl = Math.max(ttlSeconds || 0, 30 * 24 * 3600);
  const nowSec = Math.floor(Date.now() / 1000);
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const fullPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + effectiveTtl,
    jti: crypto.randomUUID(),
    iss: 'ethos-cloudflare-edge'
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await getHmacKeyEdge(env);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const sigB64 = base64UrlEncode(sigBuffer);
  return `${signingInput}.${sigB64}`;
}

export async function verifyJwtEdge(token, env) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKeyEdge(env);
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const b64 = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const sigBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) sigBytes[i] = binary.charCodeAt(i);

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, signingInput);
    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64));
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSec) return null;

    return payload;
  } catch (_e) {
    return null;
  }
}

export async function authenticateRequestEdge(request, env) {
  let token = '';
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookie = request.headers.get('Cookie') || '';
    const cookieMatch = cookie.match(/ethos_access_token=([^;]+)/);
    if (cookieMatch) token = cookieMatch[1].trim();
  }
  if (!token) return null;
  return verifyJwtEdge(token, env);
}

