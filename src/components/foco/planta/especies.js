// Espécies da planta do Foco e seus estágios. Para adicionar uma espécie:
//   1. crie a pasta src/assets/plantas/<id>/ com um arquivo por assetKey (svg, png ou webp) e o chão;
//   2. acrescente a configuração abaixo. A lógica do cronômetro não muda.
// Cada estágio vale a partir de minProgress (0 a 1) do progresso da sessão.

import { CATALOGO_EXTRA, PALETAS_ALTERNADAS, TEMAS_CULTIVO } from './catalogoCultivo';

export { PALETAS_ALTERNADAS, TEMAS_CULTIVO };

/**
 * @typedef {{ stageId: string, minProgress: number, assetKey: string, nome: string }} Estagio
 * @typedef {{ id: string, nome: string, subtitulo?: string, tema?: 'plantas'|'mundos'|'elementos', indiceTema?: number,
 *   paleta?: { id: string, nome: string, c1: string, c2: string, c3: string, light: string },
 *   estagios: Estagio[], murcha: { stageId: string, assetKey: string, nome: string },
 *   chao: string, entrada: { ms: number, escala: number } }} Especie
 */

/** @type {Especie[]} */
export const ESPECIES = [
  {
    id: 'lirio-lunar',
    nome: 'Lírio-lunar',
    subtitulo: 'Flor original do Foco Ethos sobre ilha lunar (Padrão)',
    tema: 'plantas',
    indiceTema: 0,
    paleta: PALETAS_ALTERNADAS[0],
    estagios: [
      { stageId: 'semente', minProgress: 0, assetKey: 'semente', nome: 'Semente' },
      { stageId: 'broto', minProgress: 0.1, assetKey: 'broto', nome: 'Broto' },
      { stageId: 'muda', minProgress: 0.35, assetKey: 'muda', nome: 'Muda' },
      { stageId: 'jovem', minProgress: 0.65, assetKey: 'jovem', nome: 'Jovem' },
      { stageId: 'florida', minProgress: 1, assetKey: 'florida', nome: 'Florida' }
    ],
    murcha: { stageId: 'murcha', assetKey: 'murcha', nome: 'Murcha' },
    chao: 'chao',
    // Entrada curta só quando o estágio muda
    entrada: { ms: 320, escala: 0.88 }
  },
  ...CATALOGO_EXTRA
];

export const ESPECIE_PADRAO = ESPECIES[0].id;
export const especiePorId = (id) => ESPECIES.find((e) => e.id === id) || ESPECIES[0];
export const especiesPorTema = (tema) => (!tema || tema === 'todos' ? ESPECIES : ESPECIES.filter((e) => (e.tema || 'plantas') === tema));

/**
 * Escolhe o estágio pelo progresso. estado 'murcha' (sessão descartada) devolve o estágio de falha.
 * @param {Especie} especie
 * @param {number} prog 0 a 1
 * @param {'ativa'|'murcha'} [estado]
 */
export function estagioPara(especie, prog, estado = 'ativa') {
  if (estado === 'murcha') return especie.murcha;
  const p = Number.isFinite(prog) ? prog : 0;
  let atual = especie.estagios[0];
  for (const e of especie.estagios) if (p >= e.minProgress) atual = e;
  return atual;
}
