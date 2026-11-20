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

/** Regiões do desenho (viewBox 0 0 120 262). Pares esquerdo/direito usam a mesma chave. */
export const FRONT = [
  ['pescoco', 'r', 55, 28, 10, 8],
  ['deltoide_anterior', 'e', 33, 47, 7.5, 8], ['deltoide_anterior', 'e', 87, 47, 7.5, 8],
  ['deltoide_lateral', 'e', 25, 49, 4, 7], ['deltoide_lateral', 'e', 95, 49, 4, 7],
  ['peitoral', 'e', 48, 58, 12.5, 9], ['peitoral', 'e', 72, 58, 12.5, 9],
  ['biceps', 'e', 22, 72, 6, 12], ['biceps', 'e', 98, 72, 6, 12],
  ['antebraco', 'e', 21, 106, 5, 13], ['antebraco', 'e', 99, 106, 5, 13],
  ['abdomen', 'r', 51, 70, 18, 44], ['obliquos', 'e', 41, 92, 5.5, 16], ['obliquos', 'e', 79, 92, 5.5, 16],
  ['abdutores', 'e', 37, 140, 4, 9], ['abdutores', 'e', 83, 140, 4, 9],
  ['quadriceps', 'e', 46, 172, 9, 26], ['quadriceps', 'e', 74, 172, 9, 26],
  ['adutores', 'e', 56, 158, 3.6, 15], ['adutores', 'e', 64, 158, 3.6, 15],
  ['tibial', 'e', 46, 224, 5, 15], ['tibial', 'e', 74, 224, 5, 15]
];
export const BACK = [
  ['trapezio', 'p', '48,36 72,36 66,60 54,60'],
  ['deltoide_posterior', 'e', 32, 49, 8, 8], ['deltoide_posterior', 'e', 88, 49, 8, 8],
  ['deltoide_lateral', 'e', 25, 50, 4, 7], ['deltoide_lateral', 'e', 95, 50, 4, 7],
  ['dorso_medio', 'r', 53, 60, 14, 16],
  ['dorsal', 'e', 44, 80, 9, 17], ['dorsal', 'e', 76, 80, 9, 17],
  ['triceps', 'e', 22, 72, 6, 12], ['triceps', 'e', 98, 72, 6, 12],
  ['antebraco', 'e', 21, 106, 5, 13], ['antebraco', 'e', 99, 106, 5, 13],
  ['lombar', 'r', 52, 99, 16, 20],
  ['gluteos', 'e', 50, 140, 10.5, 11], ['gluteos', 'e', 70, 140, 10.5, 11],
  ['posteriores', 'e', 47, 180, 8.5, 22], ['posteriores', 'e', 73, 180, 8.5, 22],
  ['panturrilhas', 'e', 47, 225, 7, 16], ['panturrilhas', 'e', 73, 225, 7, 16]
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
