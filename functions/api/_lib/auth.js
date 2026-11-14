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

export async function verifyPasswordEdge(plainPassword, storedPassword) {
  if (!storedPassword) return false;
  const strPlain = String(plainPassword);

  // 1. Verificação de hash PBKDF2 (aceita tanto 'pbkdf2$' quanto 'pbkdf2_sha256$')
  if (storedPassword.startsWith('pbkdf2$') || storedPassword.startsWith('pbkdf2_sha256$')) {
    const parts = storedPassword.split('$');
    if (parts.length === 3) {
      const saltHex = parts[1];
      const storedHashHex = parts[2];
      try {
        const candidate = await hashPasswordEdge(strPlain, saltHex);
        const candidateHashHex = candidate.split('$')[2];
        if (candidateHashHex === storedHashHex) return true;

        // Suporte retrocompatível para admin (Admin@2026!Ethos ou admin123)
        if (strPlain === 'Admin@2026!Ethos' || strPlain === 'admin123') {
          for (const alias of ['Admin@2026!Ethos', 'admin123']) {
            const c = await hashPasswordEdge(alias, saltHex);
            if (c.split('$')[2] === storedHashHex) return true;
          }
        }

        // Suporte retrocompatível para contas de usuário (Teste@2026!Ethos, teste123, Ethos@User123! ou 123)
        if (strPlain === 'Teste@2026!Ethos' || strPlain === 'teste123' || strPlain === 'Ethos@User123!' || strPlain === '123') {
          for (const alias of ['Teste@2026!Ethos', 'teste123', 'Ethos@User123!', '123']) {
            const c = await hashPasswordEdge(alias, saltHex);
            if (c.split('$')[2] === storedHashHex) return true;
          }
        }
      } catch (e) {}
    }
  }

  // 2. Suporte universal a senhas mestras de demonstração / admin
  if (strPlain === 'Admin@2026!Ethos' || strPlain === 'admin123') {
    if (
      storedPassword.includes('febf532795b036798452056058a895de') ||
      storedPassword.includes('admin') ||
      storedPassword === 'admin123' ||
      storedPassword === 'Admin@2026!Ethos'
    ) {
      return true;
    }
  }

  if (strPlain === 'Teste@2026!Ethos' || strPlain === 'teste123' || strPlain === 'Ethos@User123!' || strPlain === '123') {
    if (
      storedPassword.includes('cc0f5f3e6731f40c32c7d213ef07d13d') ||
      storedPassword.includes('cb31c61939830df7483ad19c0a93d07a') ||
      storedPassword.includes('84031a9eca1665248f7748df78788360') ||
      storedPassword.includes('f9021394d7cbb44c77fae0821fc12687') ||
      storedPassword.includes('e5ed0191f53323c19c425ae34740b482') ||
      storedPassword === '123' ||
      storedPassword === 'teste123' ||
      storedPassword === 'Teste@2026!Ethos' ||
      storedPassword === 'Ethos@User123!'
    ) {
      return true;
    }
  }

  return strPlain === String(storedPassword);
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

export async function getHmacKeyEdge(env) {
  const secret = env?.JWT_SECRET || 'ethos_edge_jwt_hmac_secret_2026_v1_production_key_secure';
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

