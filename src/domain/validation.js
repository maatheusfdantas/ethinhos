/**
 * Validação e normalização de campos (correção C, 20/11/2026).
 * Usada pela tela (aviso imediato) e OBRIGATORIAMENTE pelo servidor (validação final).
 * Cada função devolve { value } quando válido ou { error } com uma mensagem clara.
 * Regra geral para texto: normaliza Unicode, tira caracteres de controle, remove marcação HTML,
 * junta espaços repetidos e limita o tamanho. Não é só trim().
 */

const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;
const TAG_RE = /<\/?[a-zA-Z!][^>]*>/g;

/** Texto livre: sem HTML/script, sem caracteres invisíveis, espaços normalizados, tamanho limitado. */
export function cleanText(raw, { max = 280, multiline = false } = {}) {
  let s = String(raw ?? '').normalize('NFC').replace(CONTROL_RE, '');
  s = s.replace(TAG_RE, '').replace(/[<>]/g, '');
  if (multiline) {
    s = s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n');
  } else {
    s = s.replace(/\s+/g, ' ');
  }
  return s.trim().slice(0, max);
}

export function validateText(raw, { label = 'O texto', max = 280, min = 0, multiline = false, required = false } = {}) {
  const original = String(raw ?? '');
  if (original.length > max * 4) return { error: `${label} pode ter no máximo ${max} caracteres.` };
  const value = cleanText(original, { max: max + 1, multiline });
  if (required && !value) return { error: `${label} é obrigatório.` };
  if (value.length > max) return { error: `${label} pode ter no máximo ${max} caracteres.` };
  if (value && value.length < min) return { error: `${label} precisa ter pelo menos ${min} caracteres.` };
  return { value };
}

/** Nome de pessoa: letras (com acento), espaços, hífen, apóstrofo e ponto. Sem números nem símbolos. */
const NAME_RE = /^[\p{L}][\p{L}\p{M}'’. -]*[\p{L}.]$/u;
export function validatePersonName(raw, { label = 'O nome', max = 80 } = {}) {
  const value = cleanText(raw, { max: max + 1 });
  if (!value) return { error: `${label} é obrigatório.` };
  if (value.length < 2) return { error: `${label} precisa ter pelo menos 2 letras.` };
  if (value.length > max) return { error: `${label} pode ter no máximo ${max} caracteres.` };
  if (!NAME_RE.test(value) || /\d/.test(value)) return { error: `${label} pode ter só letras, espaços, hífen e apóstrofo.` };
  return { value };
}

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
export function validateEmail(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return { error: 'Informe o e-mail.' };
  if (/\s/.test(s)) return { error: 'O e-mail não pode ter espaços.' };
  if (s.length > 254 || !EMAIL_RE.test(s) || s.includes('..')) return { error: 'Informe um e-mail válido, como nome@exemplo.com.' };
  return { value: s };
}

/** Telefone: guarda só dígitos (10 a 13, com DDD e opcionalmente o código do país). */
export function validatePhone(raw, { required = false } = {}) {
  const original = String(raw ?? '').trim();
  if (!original) return required ? { error: 'Informe o telefone.' } : { value: '' };
  if (/[^\d\s()+.-]/.test(original)) return { error: 'O telefone pode ter só números.' };
  const digits = original.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return { error: 'Informe o telefone com DDD, só números (10 a 13 dígitos).' };
  return { value: digits };
}

/** Telefone para exibir: (11) 98765-4321. */
export function formatPhone(digits) {
  const d = String(digits || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/** Código numérico (ex.: 6 dígitos) ou alfanumérico controlado. */
export function validateCode(raw, { digits = 6 } = {}) {
  const s = String(raw ?? '').replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(s)) return { error: `O código tem ${digits} números.` };
  return { value: s };
}

export function validateNumber(raw, { label = 'O valor', min = 0, max = 1e6, integer = false, unit = '' } = {}) {
  if (raw === '' || raw === null || raw === undefined) return { error: `${label} é obrigatório.` };
  const n = Number(String(raw).replace(',', '.'));
  const u = unit ? ` ${unit}` : '';
  if (!Number.isFinite(n)) return { error: `${label} precisa ser um número.` };
  if (integer && !Number.isInteger(n)) return { error: `${label} precisa ser um número inteiro.` };
  if (n < min || n > max) return { error: `${label} precisa estar entre ${min} e ${max}${u}.` };
  return { value: n };
}

/** Data real no formato AAAA-MM-DD (rejeita 2026-02-30). */
export function validateDate(raw, { label = 'A data' } = {}) {
  const s = String(raw ?? '');
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return { error: `${label} é inválida.` };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || y > 2200 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { error: `${label} é inválida.` };
  return { value: s };
}

/** Horário HH:MM (00:00 a 23:59). */
export function validateTime(raw, { label = 'O horário' } = {}) {
  const s = String(raw ?? '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return { error: `${label} é inválido (use HH:MM).` };
  return { value: s };
}

/** Cor hexadecimal (#RGB ou #RRGGBB). */
export function validateHexColor(raw) {
  const s = String(raw ?? '').trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return { error: 'Cor inválida.' };
  return { value: s };
}
