// Cifra de tokens de integrações (AES-256-GCM).
// TOKEN_ENCRYPTION_KEY: Base64 padrão de exatamente 32 bytes aleatórios. Qualquer outro formato é recusado.
// O texto cifrado fica amarrado ao dono (additionalData): uma linha copiada para outro usuário não abre.
import { ServerConfigError } from './auth.js';

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const CONFIG_ERROR = 'Integração indisponível: configuração do servidor incompleta.';

async function importKey(env) {
  const raw = String(env?.TOKEN_ENCRYPTION_KEY || '').trim();
  if (!raw) throw new ServerConfigError(CONFIG_ERROR);
  let bytes;
  try { bytes = fromB64(raw); } catch { throw new ServerConfigError(CONFIG_ERROR); }
  if (bytes.length !== 32) throw new ServerConfigError(CONFIG_ERROR);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Devolve "v1.<iv>.<cifrado>" (Base64). `owner` amarra o dado a uma conta. */
export async function encryptSecret(env, plain, owner) {
  const key = await importKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(owner) },
    key,
    new TextEncoder().encode(String(plain))
  );
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(ct))}`;
}

/** Devolve o texto original ou null se a chave, o dono ou o conteúdo não conferem. */
export async function decryptSecret(env, packed, owner) {
  const key = await importKey(env);
  try {
    const [v, iv, ct] = String(packed).split('.');
    if (v !== 'v1') return null;
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv), additionalData: new TextEncoder().encode(owner) },
      key,
      fromB64(ct)
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
