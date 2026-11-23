/**
 * Cálculos da Análise de progresso (proposta 15, 22/11/2026). Só com dados registrados:
 * - registro diário (/api/dias): hábitos feitos, água, sono e foco de cada dia;
 * - Foco deste aparelho, sessões de treino, eventos da agenda e maus hábitos.
 * Dia sem registro não entra em média nenhuma (nem como zero). Nada é estimado.
 */
export const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_SEM_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MIN_DIAS = 3;
export const LIMIAR_DIA = 0.8;

const pad = (n) => String(n).padStart(2, '0');
export const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const dataBR = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export const decimal = (n, casas = 1) => String(Number(n).toFixed(casas)).replace('.', ',');

/** Datas (AAAA-MM-DD) dos últimos `n` dias terminando em `hoje`, da mais antiga para a mais nova. */
export function datasDoPeriodo(n, hoje = isoDia(new Date()), fim = 0) {
  const base = deIso(hoje);
  const out = [];
  for (let i = n - 1 + fim; i >= fim; i--) { const d = new Date(base); d.setDate(d.getDate() - i); out.push(isoDia(d)); }
  return out;
}

export function consistencia(dias) {
  let f = 0; let t = 0;
  for (const d of dias) { t += d.habitsTotal || 0; f += d.habitsDone || 0; }
  return t ? pct(f, t) : null;
}

export const diaCumprido = (d) => Boolean(d && d.habitsTotal > 0 && d.habitsDone / d.habitsTotal >= LIMIAR_DIA);

/** Sequência atual e recorde de dias seguidos com 80% ou mais. Hoje ainda em andamento não quebra a sequência. */
export function sequencias(porData, hoje) {
  const datas = [...porData.keys()].sort();
  let rec = 0; let run = 0; let anterior = null;
  for (const s of datas) {
    const seguido = anterior && Math.round((deIso(s) - deIso(anterior)) / 86400000) === 1;
    run = diaCumprido(porData.get(s)) ? (seguido ? run + 1 : 1) : 0;
    rec = Math.max(rec, run);
    anterior = s;
  }
  let atual = 0;
  const d = deIso(hoje);
  if (!diaCumprido(porData.get(hoje))) d.setDate(d.getDate() - 1);
  while (diaCumprido(porData.get(isoDia(d)))) { atual++; d.setDate(d.getDate() - 1); }
  return { atual, rec };
}

export function porHabito(dias) {
  const m = new Map();
  for (const d of dias) {
    for (const h of d.habits || []) {
      const x = m.get(h.id) || { id: h.id, nome: h.t, cat: h.c, f: 0, t: 0 };
      x.nome = h.t || x.nome; x.cat = h.c || x.cat; x.t++; if (h.f) x.f++;
      m.set(h.id, x);
    }
  }
  return [...m.values()].map((x) => ({ ...x, pc: pct(x.f, x.t) })).sort((a, b) => b.pc - a.pc || b.t - a.t || a.nome.localeCompare(b.nome));
}

export function porCategoria(dias) {
  const m = new Map();
  for (const d of dias) for (const h of d.habits || []) {
    const k = h.c || 'Sem categoria';
    const x = m.get(k) || { nome: k, f: 0, t: 0 };
    x.t++; if (h.f) x.f++;
    m.set(k, x);
  }
  return [...m.values()].map((x) => ({ ...x, pc: pct(x.f, x.t) })).sort((a, b) => b.pc - a.pc || b.t - a.t);
}

export function porDiaDaSemana(dias) {
  return DIAS_SEM.map((nome, k) => {
    const ds = dias.filter((d) => deIso(d.date).getDay() === k && d.habitsTotal > 0);
    return { k, nome, n: ds.length, v: consistencia(ds) };
  });
}

/** Blocos de 7 dias terminando hoje (o último é "esta semana"). `fn` recebe as datas do bloco. */
export function semanas(hoje, qtd, fn) {
  const out = [];
  for (let w = qtd - 1; w >= 0; w--) {
    const datas = datasDoPeriodo(7, hoje, 7 * w);
    out.push({ w, datas, rotulo: w === 0 ? 'esta' : `-${w}`, ...fn(datas) });
  }
  return out;
}

/** Minutos entre 12:00 e a hora (deitar depois da meia-noite continua perto de 23:00). */
const minutosDeitar = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return ((h + 12) % 24) * 60 + m; };
export function horasDeSono(bed, wake) {
  if (!bed || !wake) return null;
  const [bh, bm] = bed.split(':').map(Number); const [wh, wm] = wake.split(':').map(Number);
  let min = wh * 60 + wm - (bh * 60 + bm);
  if (min <= 0) min += 1440;
  return min / 60;
}
export function variacaoDeitar(bedTimes) {
  if (bedTimes.length < 2) return null;
  const xs = bedTimes.map(minutosDeitar);
  const media = xs.reduce((a, x) => a + x, 0) / xs.length;
  return Math.round(Math.sqrt(xs.reduce((a, x) => a + (x - media) ** 2, 0) / xs.length));
}

export function diasLimpos(startedAt, agora = Date.now()) {
  const t = Date.parse(startedAt);
  return Number.isFinite(t) ? Math.max(0, Math.floor((agora - t) / 86400000)) : 0;
}

/** Junta o registro do servidor com o estado de hoje (que pode ser mais novo que o último envio). */
export function mesclarHoje(dias, hoje, resumoHoje) {
  const m = new Map((dias || []).map((d) => [d.date, d]));
  if (resumoHoje) {
    const h = resumoHoje.habits || [];
    const antes = m.get(hoje);
    m.set(hoje, {
      date: hoje, habits: h, habitsTotal: h.length, habitsDone: h.filter((x) => x.f).length,
      waterGlasses: resumoHoje.waterGlasses, waterTarget: resumoHoje.waterTarget, glassMl: resumoHoje.glassMl,
      sleepLogged: resumoHoje.sleepLogged, sleepBed: resumoHoje.sleepBed, sleepWake: resumoHoje.sleepWake,
      focusMin: Math.max(antes?.focusMin || 0, resumoHoje.focusMin || 0)
    });
  }
  return m;
}

/**
 * Monta tudo o que a tela mostra para um período de `n` dias.
 * entrada: { porData (Map), hoje, n, focoLocal (map data->min), focoSessoesList (array), sessoes, eventos, maus, agora }
 */
export function montarAnalise({ porData, hoje, n, focoLocal = {}, focoSessoesList = [], sessoes = null, eventos = [], maus = [], agora = Date.now() }) {
  const datas = datasDoPeriodo(n, hoje);
  const anteriores = datasDoPeriodo(n, hoje, n);
  const dias = datas.map((s) => porData.get(s)).filter(Boolean);
  const diasHab = dias.filter((d) => d.habitsTotal > 0);
  const diasAnt = anteriores.map((s) => porData.get(s)).filter((d) => d && d.habitsTotal > 0);
  const c = consistencia(diasHab);
  const cAnt = diasAnt.length >= MIN_DIAS ? consistencia(diasAnt) : null;
  const delta = c != null && cAnt != null ? c - cAnt : null;
  const seq = sequencias(porData, hoje);
  const pouco = diasHab.length < MIN_DIAS;
  const habitos = porHabito(diasHab);
  const categorias = porCategoria(diasHab);
  const diaSem = porDiaDaSemana(diasHab);
  const comDado = diaSem.filter((x) => x.n > 0);
  const melhorDia = comDado.length > 1 ? comDado.slice().sort((a, b) => b.v - a.v)[0] : null;
  const piorDia = comDado.length > 1 ? comDado.slice().sort((a, b) => a.v - b.v)[0] : null;
  const fds = consistencia(diasHab.filter((d) => [0, 6].includes(deIso(d.date).getDay())));
  const util = consistencia(diasHab.filter((d) => ![0, 6].includes(deIso(d.date).getDay())));
  const diasPerfeitos = diasHab.filter((d) => d.habitsDone >= d.habitsTotal).length;
  const totalHabitosFeitos = diasHab.reduce((a, d) => a + (d.habitsDone || 0), 0);
  const mediaHabitosDia = diasHab.length ? totalHabitosFeitos / diasHab.length : null;

  const sem8 = semanas(hoje, 8, (ds) => { const x = ds.map((s) => porData.get(s)).filter((d) => d && d.habitsTotal > 0); return { v: consistencia(x), n: x.length }; });

  // Água e sono
  const diasAgua = dias.filter((d) => d.waterGlasses > 0 || d.waterTarget > 0);
  const agua = datas.map((s) => ({ date: s, d: porData.get(s) }));
  const mediaAgua = diasAgua.length ? diasAgua.reduce((a, d) => a + d.waterGlasses, 0) / diasAgua.length : null;
  const totalLitrosAgua = diasAgua.reduce((a, d) => a + (Number(d.waterGlasses) || 0) * (Number(d.glassMl) || 250), 0) / 1000;
  const naMeta = diasAgua.filter((d) => d.waterTarget > 0 && d.waterGlasses >= d.waterTarget).length;
  const metaAgua = diasAgua.length ? diasAgua[diasAgua.length - 1].waterTarget : 0;
  const noites = dias.filter((d) => d.sleepLogged && horasDeSono(d.sleepBed, d.sleepWake) != null);
  const mediaSono = noites.length ? noites.reduce((a, d) => a + horasDeSono(d.sleepBed, d.sleepWake), 0) / noites.length : null;
  const noitesIdeais = noites.filter((d) => horasDeSono(d.sleepBed, d.sleepWake) >= 7).length;
  const varDeitar = variacaoDeitar(noites.map((d) => d.sleepBed));

  // Foco: o maior entre o registro do servidor e o que este aparelho guardou
  const foco = datas.map((s) => ({ date: s, v: Math.max(porData.get(s)?.focusMin || 0, Math.round(focoLocal[s] || 0)) }));
  const focoTot = foco.reduce((a, x) => a + x.v, 0);
  const focoDias = foco.filter((x) => x.v > 0).length;
  const mediaFocoDia = focoDias ? Math.round(focoTot / focoDias) : null;
  const melhorDiaFoco = focoDias ? Math.max(...foco.map((x) => x.v)) : 0;
  const focoSessoes = (Array.isArray(focoSessoesList) ? focoSessoesList : [])
    .filter((s) => s?.full && s?.date && s.date >= datas[0] && s.date <= hoje).length;

  // Treino (sessões com pelo menos uma série feita)
  const validas = Array.isArray(sessoes) ? sessoes.filter((s) => s.doneSets > 0 && s.startedAt) : null;
  const diaDaSessao = (s) => isoDia(new Date(s.startedAt));
  const validasPeriodo = validas ? validas.filter((s) => { const d = diaDaSessao(s); return d >= datas[0] && d <= hoje; }) : null;
  const treinoDias = validasPeriodo ? new Set(validasPeriodo.map(diaDaSessao)).size : null;
  const treinoTotalSessoes = validasPeriodo ? validasPeriodo.length : null;
  const treinoTotalSeries = validasPeriodo ? validasPeriodo.reduce((a, s) => a + (Number(s.doneSets) || 0), 0) : null;
  const treinoSem = validas ? semanas(hoje, 8, (ds) => ({ v: new Set(validas.map(diaDaSessao).filter((s) => ds.includes(s))).size })) : null;

  // Agenda: eventos com data no período (sem expandir repetições)
  const evs = (eventos || []).filter((e) => e?.date && e.date.slice(0, 10) >= datas[0] && e.date.slice(0, 10) <= hoje);
  const agConc = evs.filter((e) => e.completed).length;
  const taxaAgenda = evs.length ? pct(agConc, evs.length) : null;
  const agSem = semanas(hoje, 8, (ds) => { const x = (eventos || []).filter((e) => e?.date && ds.includes(e.date.slice(0, 10))); return { v: x.filter((e) => e.completed).length, t: x.length }; });

  // Maus hábitos
  const mausOut = (maus || []).map((h) => {
    const rel = Array.isArray(h.relapses) ? h.relapses : [];
    const limpos = diasLimpos(h.started_at, agora);
    const noPeriodo = rel.filter((r) => r?.date && isoDia(new Date(r.date)) >= datas[0]).length;
    const contagem = {};
    rel.forEach((r) => { if (r?.trigger) contagem[r.trigger] = (contagem[r.trigger] || 0) + 1; });
    const gat = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { id: h.id, nome: h.title, limpos, recorde: Math.max(h.best_streak_days || 0, limpos), recaidas: noPeriodo, gatilho: gat };
  });

  // Textos (só com histórico suficiente)
  // Avisos só com hábitos que têm pelo menos MIN_DIAS dias registrados (um hábito novo não vira "mais difícil").
  const firmes = habitos.filter((h) => h.t >= MIN_DIAS);
  const top = firmes[0] || null;
  const low = firmes.length > 1 ? firmes[firmes.length - 1] : null;
  const notas = pouco ? null : {
    bem: top ? `${top.nome}: feito em ${top.f} de ${top.t} dias (${top.pc}%).${diasAgua.length && naMeta / diasAgua.length >= 0.5 ? ` Água na meta em ${naMeta} de ${diasAgua.length} dias.` : ''}` : null,
    atencao: low && low.pc < 80 ? `${low.nome}: feito em ${low.f} de ${low.t} dias (${low.pc}%).${fds != null && util != null && fds <= util - 10 ? ' Os fins de semana puxam a média para baixo.' : ''}` : (delta != null && delta < 0 ? `A consistência caiu ${-delta} pontos em relação aos ${n} dias anteriores.` : null),
    sugestao: low && low.pc < 50 && melhorDia && piorDia && melhorDia.v - piorDia.v >= 15
      ? `Experimente deixar “${low.nome}” para os dias em que você costuma cumprir mais, como ${DIAS_SEM_LONGO[melhorDia.k]}.`
      : diasAgua.length >= MIN_DIAS && naMeta / diasAgua.length < 0.5
        ? `A água ficou na meta em ${naMeta} de ${diasAgua.length} dias. Registrar o primeiro copo logo ao acordar ajuda a começar.`
        : delta != null && delta < 0
          ? 'Veja se há hábitos demais para o mesmo dia: menos itens, feitos todo dia, sobem a consistência.'
          : seq.atual > 0 ? `Sua sequência está em ${seq.atual} ${seq.atual === 1 ? 'dia' : 'dias'}. Cumprir 80% hoje mantém o ritmo.` : 'Cumprir 80% dos hábitos hoje começa uma sequência nova.'
  };
  let frase;
  if (pouco) frase = null;
  else {
    frase = `Nos últimos ${n} dias você cumpriu ${c}% dos hábitos previstos`;
    if (delta != null) frase += delta === 0 ? `, igual aos ${n} dias anteriores` : `, ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'ponto' : 'pontos'} ${delta > 0 ? 'acima' : 'abaixo'} dos ${n} dias anteriores`;
    frase += '.';
    if (melhorDia && piorDia && melhorDia.k !== piorDia.k && melhorDia.v !== piorDia.v) frase += ` Seu dia mais forte é ${DIAS_SEM_LONGO[melhorDia.k]}; o mais fraco, ${DIAS_SEM_LONGO[piorDia.k]}.`;
  }

  return {
    datas, dias, diasHab, registrados: dias.length, pouco, c, delta, seq, habitos, top, low, categorias, diaSem, melhorDia, piorDia, sem8,
    fds, util, diasPerfeitos, totalHabitosFeitos, mediaHabitosDia,
    agua, diasAgua, mediaAgua, totalLitrosAgua, naMeta, metaAgua, noites, mediaSono, noitesIdeais, varDeitar,
    foco, focoTot, focoDias, mediaFocoDia, melhorDiaFoco, focoSessoes,
    treinoDias, treinoTotalSessoes, treinoTotalSeries, treinoSem, evs, agConc, taxaAgenda, agSem, maus: mausOut, notas, frase
  };
}
