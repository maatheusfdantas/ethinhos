/**
 * Músculos e mapa corporal (proposta 07). Regras puras, usadas pelo servidor (validação) e pelas telas.
 * O mapa mostra a ÊNFASE ESTIMADA da ficha (não é medição): um músculo é "principal" se for principal em algum
 * exercício; senão "secundário" se for secundário em algum; senão não trabalhado.
 */
export const MUSCLES = {
  peitoral: 'Peitoral',
  deltoide_anterior: 'Deltoide anterior',
  deltoide_lateral: 'Deltoide lateral',
  deltoide_posterior: 'Deltoide posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  abdomen: 'Reto abdominal',
  obliquos: 'Oblíquos',
  trapezio: 'Trapézio',
  dorsal: 'Latíssimo do dorso',
  dorso_medio: 'Dorso médio (romboides)',
  lombar: 'Lombar (eretores)',
  gluteos: 'Glúteos',
  abdutores: 'Abdutores do quadril',
  adutores: 'Adutores',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores de coxa',
  panturrilhas: 'Panturrilhas',
  tibial: 'Tibial anterior',
  pescoco: 'Pescoço'
};
export const MUSCLE_KEYS = Object.keys(MUSCLES);

/**
 * Desenho anatômico (viewBox 0 0 200 420), no estilo de mapa muscular: silhueta e músculos com forma própria.
 * Cada região é a metade direita; a esquerda é a mesma forma espelhada em x = 100. Formato: [chave, caminho SVG].
 */
export const SIL_HALF = 'M100,8 C111,8 117,18 117,31 C117,42 113,50 108,53 L108,60 C116,64 128,66 140,68 C151,70 158,77 160,88 C162,102 163,120 164,136 C166,152 168,162 170,172 C173,192 177,212 179,232 C180,244 182,256 179,265 C176,272 168,268 167,259 C165,247 164,237 162,225 C158,207 153,191 150,177 C147,163 146,151 145,141 L142,124 C141,142 139,162 137,180 C138,196 141,210 141,222 C142,250 140,280 137,304 C136,318 137,330 136,344 C134,362 132,378 131,392 C131,402 136,410 129,415 C121,418 114,415 114,406 C114,394 115,380 115,364 C115,348 114,336 114,320 C113,300 109,270 105,242 L102,228 L100,228 Z';

export const FRONT = [
  ['pescoco', 'M103,53 L108,53 L109,63 L104,68 Z'],
  ['trapezio', 'M109,58 C118,63 129,65 138,68 C130,71 121,72 112,70 C110,66 109,62 109,58 Z'],
  ['deltoide_anterior', 'M138,70 C148,71 153,76 154,86 C153,98 151,106 148,112 C144,100 139,88 132,79 C132,74 134,71 138,70 Z'],
  ['deltoide_lateral', 'M150,73 C157,78 160,88 160,100 C159,106 157,110 154,112 C155,100 155,88 150,73 Z'],
  ['peitoral', 'M103,74 C115,70 127,72 133,79 C140,88 145,98 147,110 C137,118 124,121 112,119 C106,117 103,111 103,100 Z'],
  ['biceps', 'M149,116 C156,123 160,137 161,152 C159,161 155,163 152,158 C149,146 147,131 149,116 Z'],
  ['antebraco', 'M158,170 C166,183 172,203 175,222 C175,231 170,233 168,227 C163,211 158,195 155,180 Z'],
  ['abdomen', 'M102,123 L117,123 C119,141 119,160 117,179 C115,195 111,206 104,212 L102,213 Z'],
  ['obliquos', 'M120,125 C130,125 138,131 140,143 C140,161 138,179 136,195 C130,201 124,201 120,197 C122,177 123,151 120,125 Z'],
  ['abdutores', 'M134,206 C140,213 142,225 141,238 C137,233 132,222 130,212 Z'],
  ['quadriceps', 'M117,232 C125,224 136,226 140,241 C142,263 140,285 136,301 C130,309 120,309 116,301 C111,281 111,256 117,232 Z'],
  ['adutores', 'M104,232 C110,235 114,245 114,261 C113,277 110,287 106,291 C104,273 103,251 104,232 Z'],
  ['tibial', 'M127,322 C133,331 135,347 133,367 C132,375 129,379 127,373 C125,357 124,339 127,322 Z'],
  ['panturrilhas', 'M117,322 C121,331 122,347 120,365 C117,359 115,341 117,322 Z']
];
export const BACK = [
  ['trapezio', 'M100,52 L108,54 C118,62 131,66 140,70 C131,77 121,87 113,100 C108,111 104,122 100,131 Z'],
  ['deltoide_posterior', 'M140,71 C151,73 156,80 156,91 C155,101 153,107 149,111 C145,99 140,88 133,79 Z'],
  ['deltoide_lateral', 'M152,75 C158,80 160,90 160,101 C159,107 157,110 154,112 C155,100 155,88 152,75 Z'],
  ['dorso_medio', 'M110,97 C118,87 128,81 137,83 C141,93 139,105 131,113 C123,115 116,117 110,121 Z'],
  ['dorsal', 'M108,125 C120,119 134,115 142,119 C146,141 142,163 136,183 C126,191 116,197 106,201 C106,177 106,151 108,125 Z'],
  ['triceps', 'M149,114 C156,122 160,136 161,152 C158,159 154,161 152,155 C149,141 147,128 149,114 Z'],
  ['antebraco', 'M158,170 C166,183 172,203 175,222 C175,231 170,233 168,227 C163,211 158,195 155,180 Z'],
  ['lombar', 'M101,170 C108,170 113,174 114,182 C114,196 112,207 108,215 L101,215 Z'],
  ['gluteos', 'M102,218 C114,213 130,215 138,225 C142,239 140,253 132,261 C122,265 110,263 102,259 Z'],
  ['posteriores', 'M112,267 C122,263 134,265 138,275 C140,291 138,303 134,309 C126,313 118,311 114,305 C110,293 109,279 112,267 Z'],
  ['adutores', 'M103,263 C108,267 110,281 109,297 C106,291 104,277 103,263 Z'],
  ['panturrilhas', 'M118,320 C128,316 136,324 136,341 C136,357 132,369 126,375 C120,369 116,355 116,341 C116,331 116,325 118,320 Z']
];

/**
 * Ênfase estimada de um conjunto de exercícios: { chave: { lv: 2|1, ex: [{ id, name, lv }] } }.
 * Principal (2) prevalece sobre secundário (1). Exercícios repetidos contam uma vez por músculo.
 */
export function aggregateMuscles(exercises) {
  const out = {};
  for (const e of exercises || []) {
    if (!e) continue;
    for (const [list, lv] of [[e.primary || [], 2], [e.secondary || [], 1]]) {
      for (const k of list) {
        if (!MUSCLES[k]) continue;
        const cur = out[k] || { lv: 0, ex: [] };
        cur.lv = Math.max(cur.lv, lv);
        const found = cur.ex.find((x) => x.id === e.id);
        if (found) found.lv = Math.max(found.lv, lv);
        else cur.ex.push({ id: e.id, name: e.name, lv });
        out[k] = cur;
      }
    }
  }
  return out;
}

/** Valida uma lista de músculos (servidor e tela). */
export function cleanMuscleList(list, { max = 8 } = {}) {
  const arr = Array.isArray(list) ? list : [];
  return [...new Set(arr.map(String).filter((k) => MUSCLES[k]))].slice(0, max);
}

/** Busca sem acento por nome, apelidos (inglês), grupo, músculos e equipamento. */
export function normalizeSearch(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
export function matchesExercise(e, q) {
  const s = normalizeSearch(q).trim();
  if (!s) return true;
  const hay = normalizeSearch([e.name, ...(e.aliases || []), e.group, e.equipment, ...(e.primary || []).map((k) => MUSCLES[k]), ...(e.secondary || []).map((k) => MUSCLES[k])].join(' '));
  return s.split(/\s+/).every((w) => hay.includes(w));
}
