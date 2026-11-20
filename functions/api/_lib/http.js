/**
 * CORS, cabeçalhos de segurança, respostas JSON e sanitização.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 1. CABEÇALHOS HTTP DE SEGURANÇA, CORS RESTRITO E SANITIZAÇÃO ANTI-XSS
// ============================================================================
export function getAllowedOrigin(request) {
  const origin = request?.headers?.get('Origin') || '';
  if (!origin) return 'https://ethos-3hs.pages.dev';
  if (
    origin === 'https://ethos-3hs.pages.dev' ||
    origin.endsWith('.ethos-3hs.pages.dev') ||
    origin === 'https://ethos-landing-7j3.pages.dev' ||
    origin.endsWith('.ethos-landing-7j3.pages.dev') ||
    origin === 'https://ethos-landing.pages.dev' ||
    origin.endsWith('.ethos-landing.pages.dev') ||
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:5173' ||
    origin === 'http://localhost:3001'
  ) {
    return origin;
  }
  return 'https://ethos-3hs.pages.dev';
}

/**
 * @param {string} correlationId
 * @param {Request | null} [request]
 * @returns {Record<string, string>}
 */
export function getSecurityHeaders(correlationId, request = null) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Correlation-ID': correlationId,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Correlation-ID, X-CSRF-Token',
    'Vary': 'Origin'
  };
}

/**
 * @param {unknown} data
 * @param {number} [status]
 * @param {string} [correlationId]
 * @param {Request | null} [request]
 * @returns {Response}
 */
export function jsonResponse(data, status = 200, correlationId = crypto.randomUUID(), request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: getSecurityHeaders(correlationId, request)
  });
}

export function sanitizeStringEdge(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Correção C: tira a tag inteira (antes só tirava < e >, e <b>Oi</b> virava bOi/b).
    .replace(/<\/?[a-zA-Z!][^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeObjectEdge(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const cleaned = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (typeof val === 'string') {
      // Auditoria S7: fotos em data URL eram cortadas em 1.500 caracteres (imagem corrompida).
      // Aceita só imagem base64 válida, até ~300 KB; o resto continua com o limite normal.
      const isAvatarKey = key === 'avatar' || key === 'avatarUrl';
      if (isAvatarKey && val.length <= 300000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(val)) {
        cleaned[key] = val;
        continue;
      }
      cleaned[key] = key.toLowerCase().includes('password') ? val.slice(0, 256) : sanitizeStringEdge(val, 1500);
    } else if (Array.isArray(val)) {
      cleaned[key] = val.map((item) => (typeof item === 'string' ? sanitizeStringEdge(item, 500) : item));
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

