/**
 * Regras puras de desbloqueio, desafios e tempo mínimo de cultivo no Foco.
 *
 * - Cultivos padrão (indiceTema 0 e 1 de cada tema = 10 cultivos): já liberados desde o início,
 *   sem tempo mínimo obrigatório.
 * - Demais cultivos (indiceTema 2..20): desbloqueados conforme o usuário conclui desafios reais
 *   de duração de sessão (10, 15, 25, 35, 45, 60 e 90 min), sessões concluídas, tempo acumulado,
 *   dias distintos de foco e sessões no Modo Foco Total.
 * - Cultivos de níveis mais altos exigem um tempo mínimo de foco na sessão para poderem ser cultivados.
 */

export const DESAFIOS_CULTIVO = [
  {
    id: 'sprint-10',
    titulo: 'Primeiro Sprint',
    descricao: 'Conclua 1 sessão de foco de pelo menos 10 min',
    tipo: 'sessao_min',
    meta: 10,
    indices: [2],
    resumoRegra: 'Foco de 10 min'
  },
  {
    id: 'foco-15',
    titulo: 'Ritmo Inicial',
    descricao: 'Conclua 1 sessão de foco de pelo menos 15 min',
    tipo: 'sessao_min',
    meta: 15,
    indices: [3],
    resumoRegra: 'Foco de 15 min'
  },
  {
    id: 'pomodoro-25',
    titulo: 'Pomodoro Clássico',
    descricao: 'Conclua 1 sessão de foco de pelo menos 25 min',
    tipo: 'sessao_min',
    meta: 25,
    indices: [4],
    resumoRegra: 'Foco de 25 min'
  },
  {
    id: 'imersao-35',
    titulo: 'Imersão Contínua',
    descricao: 'Conclua 1 sessão de foco de pelo menos 35 min',
    tipo: 'sessao_min',
    meta: 35,
    indices: [5],
    resumoRegra: 'Foco de 35 min'
  },
  {
    id: 'profundo-45',
    titulo: 'Foco Profundo',
    descricao: 'Conclua 1 sessão de foco de pelo menos 45 min',
    tipo: 'sessao_min',
    meta: 45,
    indices: [6],
    resumoRegra: 'Foco de 45 min'
  },
  {
    id: 'maratona-60',
    titulo: 'Hora de Ouro',
    descricao: 'Conclua 1 sessão de foco de pelo menos 60 min',
    tipo: 'sessao_min',
    meta: 60,
    indices: [7],
    resumoRegra: 'Foco de 60 min'
  },
  {
    id: 'lendario-90',
    titulo: 'Mestre do Tempo',
    descricao: 'Conclua 1 sessão de foco de pelo menos 90 min',
    tipo: 'sessao_min',
    meta: 90,
    indices: [8],
    resumoRegra: 'Foco de 90 min'
  },
  {
    id: 'sessoes-3',
    titulo: 'Trinca de Foco',
    descricao: 'Conclua 3 sessões completas de foco',
    tipo: 'sessoes_total',
    meta: 3,
    indices: [9, 10],
    resumoRegra: '3 sessões completas'
  },
  {
    id: 'acumulado-120',
    titulo: '2 Horas Acumuladas',
    descricao: 'Acumule 120 minutos de foco registrado',
    tipo: 'minutos_acumulados',
    meta: 120,
    indices: [11, 12],
    resumoRegra: '120 min acumulados'
  },
  {
    id: 'foco-total-1',
    titulo: 'Blindagem Mental',
    descricao: 'Conclua 1 sessão no Modo Foco Total sem trocar de aba',
    tipo: 'foco_total',
    meta: 1,
    indices: [13, 14],
    resumoRegra: '1 sessão Foco Total'
  },
  {
    id: 'dias-3',
    titulo: '3 Dias de Constância',
    descricao: 'Conclua sessões de foco em 3 dias diferentes',
    tipo: 'dias_distintos',
    meta: 3,
    indices: [15, 16],
    resumoRegra: '3 dias diferentes'
  },
  {
    id: 'acumulado-300',
    titulo: '5 Horas de Disciplina',
    descricao: 'Acumule 300 minutos de foco registrado',
    tipo: 'minutos_acumulados',
    meta: 300,
    indices: [17, 18],
    resumoRegra: '300 min acumulados'
  },
  {
    id: 'foco-total-3',
    titulo: 'Guardião do Foco Total',
    descricao: 'Conclua 3 sessões no Modo Foco Total sem trocar de aba',
    tipo: 'foco_total',
    meta: 3,
    indices: [19],
    resumoRegra: '3 sessões Foco Total'
  },
  {
    id: 'sessoes-15',
    titulo: 'Colecionador Cósmico',
    descricao: 'Conclua 15 sessões completas de foco',
    tipo: 'sessoes_total',
    meta: 15,
    indices: [20],
    resumoRegra: '15 sessões completas'
  }
];

/**
 * Tempo mínimo de foco (em minutos) exigido na sessão para cultivar determinada espécie.
 * Cultivos padrão (0 e 1) aceitam qualquer duração; espécies avançadas exigem sessões maiores.
 */
export function tempoMinimoDaEspecie(especie) {
  if (!especie) return 0;
  const idx = Number(especie.indiceTema ?? 0);
  if (idx <= 1) return 0;
  if (idx === 2) return 10;
  if (idx <= 4) return 15;
  if (idx <= 7) return 25;
  if (idx <= 12) return 30;
  if (idx <= 16) return 45;
  return 60;
}

/** Retorna o desafio responsável por desbloquear esta espécie, ou null se for padrão. */
export function desafioDaEspecie(especie) {
  if (!especie) return null;
  const idx = Number(especie.indiceTema ?? 0);
  if (idx <= 1) return null;
  return DESAFIOS_CULTIVO.find((d) => d.indices.includes(idx)) || DESAFIOS_CULTIVO[DESAFIOS_CULTIVO.length - 1];
}

/** Calcula estatísticas reais de foco a partir do estado do focoStore. */
export function estatisticasDeDesbloqueio(estadoFoco) {
  const sessoes = Array.isArray(estadoFoco?.sessions) ? estadoFoco.sessions : [];
  const completas = sessoes.filter((s) => s && s.full);
  const maiorSessaoMin = completas.reduce((m, s) => Math.max(m, Number(s.mins) || 0), 0);
  const totalSessoes = completas.length;
  const minutosAcumulados = sessoes.reduce((acc, s) => acc + (Number(s?.mins) || 0), 0);
  const diasDistintos = new Set(completas.map((s) => s.date).filter(Boolean)).size;
  const sessoesFocoTotal = completas.filter((s) => Boolean(s.focoTotal)).length;

  return {
    maiorSessaoMin,
    totalSessoes,
    minutosAcumulados,
    diasDistintos,
    sessoesFocoTotal
  };
}

/** Avalia o progresso e status (concluído ou não) de cada desafio de cultivo. */
export function avaliarDesafiosCultivo(estadoFoco, todasEspecies = []) {
  const stats = estatisticasDeDesbloqueio(estadoFoco);

  return DESAFIOS_CULTIVO.map((d) => {
    let atual = 0;
    if (d.tipo === 'sessao_min') atual = stats.maiorSessaoMin;
    else if (d.tipo === 'sessoes_total') atual = stats.totalSessoes;
    else if (d.tipo === 'minutos_acumulados') atual = stats.minutosAcumulados;
    else if (d.tipo === 'dias_distintos') atual = stats.diasDistintos;
    else if (d.tipo === 'foco_total') atual = stats.sessoesFocoTotal;

    const concluido = atual >= d.meta;
    const progressoPct = Math.min(100, Math.round((atual / Math.max(1, d.meta)) * 100));
    const qtdCultivos = todasEspecies.length
      ? todasEspecies.filter((e) => d.indices.includes(Number(e.indiceTema ?? 0))).length
      : d.indices.length * 9;

    return {
      ...d,
      atual: Math.min(atual, d.meta),
      concluido,
      progressoPct,
      qtdCultivos
    };
  });
}

/** Verifica se uma espécie específica está desbloqueada para o usuário. */
export function especieDesbloqueada(especie, desafiosAvaliados) {
  const desafio = desafioDaEspecie(especie);
  if (!desafio) return true;
  const avaliado = desafiosAvaliados.find((d) => d.id === desafio.id);
  return Boolean(avaliado?.concluido);
}

/** Retorna quais desafios foram recém-concluídos entre o estado anterior e o próximo. */
export function desafiosRecemDesbloqueados(estadoAntes, estadoDepois, todasEspecies = []) {
  const antes = new Set(avaliarDesafiosCultivo(estadoAntes, todasEspecies).filter((d) => d.concluido).map((d) => d.id));
  return avaliarDesafiosCultivo(estadoDepois, todasEspecies).filter((d) => d.concluido && !antes.has(d.id));
}
