// Fonte de verdade do tempo do Foco. Funções puras: o tempo restante e o progresso saem sempre
// dos horários guardados (início, duração, pausas), nunca de uma contagem de ticks. Assim o
// cronômetro continua certo com a aba em segundo plano, o celular bloqueado, troca de tela ou recarga.

/**
 * @typedef {Object} SessaoFoco
 * @property {1} v
 * @property {'focus'|'break'} tipo
 * @property {number} inicio      horário de início (ms desde a época)
 * @property {number} duracaoMs   duração planejada
 * @property {number} pausaMs     pausa já encerrada, acumulada
 * @property {number|null} pausadoEm  horário em que a pausa atual começou (null = rodando)
 * @property {Object} meta        dados da tela para restaurar a sessão (categoria, objetivo...)
 */

/** @returns {SessaoFoco} */
export function criarSessao({ minutos, tipo = 'focus', agora = Date.now(), meta = {} }) {
  return { v: 1, tipo, inicio: agora, duracaoMs: Math.round(minutos * 60000), pausaMs: 0, pausadoEm: null, meta };
}

export const fimDe = (s) => s.inicio + s.duracaoMs + s.pausaMs;
export const pausada = (s) => s.pausadoEm != null;

/** Tempo restante em ms. Durante a pausa fica congelado no valor do momento em que pausou. */
export function restanteMs(s, agora = Date.now()) {
  const ref = pausada(s) ? s.pausadoEm : agora;
  return Math.max(0, Math.min(s.duracaoMs, fimDe(s) - ref));
}

/** Progresso de 0 a 1. */
export function progresso(s, agora = Date.now()) {
  if (!s.duracaoMs) return 1;
  return Math.min(1, Math.max(0, 1 - restanteMs(s, agora) / s.duracaoMs));
}

/** Minutos inteiros já focados. */
export const minutosFeitos = (s, agora = Date.now()) => Math.floor((s.duracaoMs - restanteMs(s, agora)) / 60000);

/** Pausa total usada (encerradas + a atual), em ms. */
export const pausaUsadaMs = (s, agora = Date.now()) => s.pausaMs + (pausada(s) ? Math.max(0, agora - s.pausadoEm) : 0);

export const pausar = (s, agora = Date.now()) => (pausada(s) ? s : { ...s, pausadoEm: agora });
export const retomar = (s, agora = Date.now()) => (pausada(s) ? { ...s, pausaMs: s.pausaMs + Math.max(0, agora - s.pausadoEm), pausadoEm: null } : s);

/* ---------- Guarda no navegador, por usuário ---------- */
const chave = (userId) => `ethos_foco_sessao_v1_${userId || 'anon'}`;

/** @returns {SessaoFoco|null} */
export function carregarSessao(userId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(chave(userId));
    if (!raw) return null;
    const s = JSON.parse(raw);
    const valida = s && s.v === 1 && (s.tipo === 'focus' || s.tipo === 'break')
      && Number.isFinite(s.inicio) && Number.isFinite(s.duracaoMs) && s.duracaoMs > 0 && Number.isFinite(s.pausaMs);
    return valida ? { ...s, pausadoEm: Number.isFinite(s.pausadoEm) ? s.pausadoEm : null, meta: s.meta || {} } : null;
  } catch {
    return null;
  }
}

export function salvarSessao(userId, s, storage = globalThis.localStorage) {
  try {
    if (s) storage?.setItem(chave(userId), JSON.stringify(s));
    else storage?.removeItem(chave(userId));
  } catch { /* sem armazenamento: a sessão continua só na memória */ }
}
