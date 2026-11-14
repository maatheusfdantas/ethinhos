// Regras de @ e senha. Usadas pela tela (validação em tempo real) e pelo servidor (validação final).

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;
export const RESERVED_USERNAMES = new Set([
  'admin', 'administrador', 'root', 'suporte', 'support', 'ethos', 'sistema', 'system',
  'api', 'oauth', 'login', 'cadastro', 'perfil', 'configuracoes', 'ajuda', 'help', 'null', 'undefined'
]);

export function normalizeUsername(raw) {
  return String(raw || '').trim().replace(/^@+/, '').toLowerCase();
}

/** Devolve a mensagem do problema do @, ou null se estiver válido. */
export function usernameProblem(raw) {
  const u = normalizeUsername(raw);
  if (!u) return 'Escolha um @ para a sua conta.';
  if (u.length < USERNAME_MIN) return `O @ precisa ter pelo menos ${USERNAME_MIN} caracteres.`;
  if (u.length > USERNAME_MAX) return `O @ pode ter no máximo ${USERNAME_MAX} caracteres.`;
  if (!USERNAME_RE.test(u)) return 'Use só letras minúsculas, números, ponto e sublinhado, sem começar ou terminar com ponto ou sublinhado.';
  if (/[._]{2}/.test(u)) return 'Não use dois pontos ou sublinhados seguidos.';
  if (RESERVED_USERNAMES.has(u) || u.startsWith('novo_')) return 'Esse @ é reservado. Escolha outro.';
  return null;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_RULES = [
  { id: 'length', label: `Pelo menos ${PASSWORD_MIN} caracteres`, test: (p) => p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX },
  { id: 'upper', label: 'Uma letra maiúscula', test: (p) => /[A-ZÀ-Ý]/.test(p) },
  { id: 'special', label: 'Um caractere especial (ex.: ! @ # $ %)', test: (p) => /[^A-Za-z0-9À-ÿ\s]/.test(p) }
];

/** Lista o estado de cada requisito, para mostrar marcando em tempo real. */
export function passwordChecklist(password) {
  const p = String(password || '');
  return PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(p) }));
}

/** Mensagem do primeiro requisito não atendido, ou null. */
export function passwordProblem(password) {
  const p = String(password || '');
  if (p.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  const miss = PASSWORD_RULES.find((r) => !r.test(p));
  return miss ? `A senha precisa de: ${miss.label.toLowerCase()}.` : null;
}
