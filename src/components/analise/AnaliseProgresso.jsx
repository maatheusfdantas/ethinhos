import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Droplets, Dumbbell, Flame, Lightbulb, Moon, ShieldCheck, Star, Tag, Timer, Trophy } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { treinoApi } from '../treino/treinoApi';
import { loadState as loadFoco } from '../rx/focoStore';
import { focoMinutos, resumoDoDia } from '../../hooks/useRegistroDiario';
import { Barras } from './Barras';
import { DIAS_SEM, MIN_DIAS, dataBR, datasDoPeriodo, decimal, deIso, horasDeSono, isoDia, mesclarHoje, montarAnalise, pct } from './analiseCalc';
import '../../styles/analise.css';

const PERIODOS = [7, 30, 90];
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const nivel = (d) => {
  if (!d) return 'fora';
  if (!d.habitsTotal) return '';
  const p = d.habitsDone / d.habitsTotal;
  return p === 0 ? '' : p < 0.4 ? 'v1' : p < 0.7 ? 'v2' : p < 1 ? 'v3' : 'v4';
};

function Vazio({ titulo, children }) {
  return <div className="an-vazio"><b>{titulo}</b>{children}</div>;
}

function Titulo({ cor, icone: Icone, children, extra }) {
  return <h2><span className="rx-tile sm" style={{ '--c': cor }}><Icone size={16} /></span>{children}{extra && <><span className="sp" />{extra}</>}</h2>;
}

/**
 * Análise de progresso (proposta 15, aprovada em 22/11/2026). Substitui na tela a AnaliseTab do lote 2
 * (que continua no código). Tudo vem do que a pessoa registrou; ver analiseCalc.js.
 */
export function AnaliseProgresso({ user, habits = [], health = {}, events = [] }) {
  const [n, setN] = useState(30);
  const [registro, setRegistro] = useState({ estado: 'carregando', dias: [], since: null });
  const [sessoes, setSessoes] = useState(null);
  const [celula, setCelula] = useState(null);
  const uid = user?.id;
  const [hoje] = useState(() => isoDia(new Date()));

  useEffect(() => {
    if (!uid) return undefined;
    let vivo = true;
    const de = datasDoPeriodo(210, hoje)[0];
    apiFetch(`/api/dias?de=${de}&ate=${hoje}`)
      .then(async (r) => {
        if (!vivo) return;
        if (!r.ok) { setRegistro({ estado: r.status === 503 ? 'indisponivel' : 'erro', dias: [], since: null }); return; }
        const j = await r.json();
        if (vivo) setRegistro({ estado: 'ok', dias: Array.isArray(j.days) ? j.days : [], since: j.since || null });
      })
      .catch(() => vivo && setRegistro({ estado: 'erro', dias: [], since: null }));
    treinoApi.historico(100).then((r) => vivo && setSessoes(r.sessions || []), () => vivo && setSessoes([]));
    return () => { vivo = false; };
  }, [uid, hoje]);

  const focoState = useMemo(() => {
    try { return loadFoco(uid); } catch { return { days: {}, sessions: [] }; }
  }, [uid]);

  const focoLocal = useMemo(() => {
    const out = {};
    Object.entries(focoState?.days || {}).forEach(([d, v]) => { out[d] = Number(v?.min || 0); });
    return out;
  }, [focoState]);

  const maus = useMemo(() => {
    try { const s = localStorage.getItem(`ethos_bad_habits_${uid || 'default'}`); const l = s ? JSON.parse(s) : []; return Array.isArray(l) ? l : []; } catch { return []; }
  }, [uid]);

  const porData = useMemo(
    () => mesclarHoje(registro.dias, hoje, resumoDoDia({ habits, health, focusMin: uid ? focoMinutos(uid, hoje) : 0 })),
    [registro.dias, hoje, habits, health, uid]
  );
  const A = useMemo(
    () => montarAnalise({ porData, hoje, n, focoLocal, focoSessoesList: focoState?.sessions || [], sessoes, eventos: events, maus }),
    [porData, hoje, n, focoLocal, focoState?.sessions, sessoes, events, maus]
  );

  const desde = registro.since && registro.since < hoje ? registro.since : hoje;
  const nomeDia = (s) => DIAS_SEM[deIso(s).getDay()];

  // Mapa: semanas em linhas, começando no domingo
  const vazios = deIso(A.datas[0]).getDay();
  const cel = celula ? porData.get(celula) : null;

  return (
    <div className="an">
      <div className="an-head">
        <div><h1>Análise de progresso</h1><p>Calculada só com o que você registrou no Ethos.</p></div>
        <div className="an-seg" role="group" aria-label="Período">
          {PERIODOS.map((p) => <button key={p} type="button" aria-pressed={n === p} onClick={() => setN(p)}>{p} dias</button>)}
        </div>
      </div>

      {registro.estado !== 'ok' && registro.estado !== 'carregando' && (
        <p className="an-aviso" role="status">{registro.estado === 'indisponivel' ? 'O registro de cada dia ainda não está disponível no servidor. Por enquanto, hábitos, água e sono mostram só hoje.' : 'Não foi possível carregar o histórico agora. Os números abaixo usam só o que está neste aparelho.'}</p>
      )}

      <section className="an-hero rx-glass-card" data-testid="an-resumo">
        <h2><span className="rx-tile sm solid" style={{ '--c': 'var(--rx-m-analise)' }}><BarChart3 size={16} /></span>Resumo do período</h2>
        <p className="an-frase">{A.frase || `O Ethos guarda o seu dia desde ${dataBR(desde)}. Com ${MIN_DIAS} dias registrados, este resumo passa a comparar e sugerir.`}</p>
        <div className="an-kpis">
          <div className="an-kpi" data-testid="an-consistencia"><span><CheckCircle2 size={14} />Consistência</span><b>{A.pouco || A.c == null ? '–' : `${A.c}%`}</b>
            {A.delta == null || A.pouco ? <em>sem período anterior para comparar</em> : <em className={A.delta >= 0 ? 'up' : 'down'}>{A.delta >= 0 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{plural(Math.abs(A.delta), 'ponto', 'pontos')} vs {n} dias antes</em>}</div>
          <div className="an-kpi"><span><Flame size={14} />Sequência atual</span><b>{A.seq.atual}<small> {A.seq.atual === 1 ? 'dia' : 'dias'}</small></b><em>dias seguidos com 80% ou mais</em></div>
          <div className="an-kpi"><span><Trophy size={14} />Recorde</span><b>{A.seq.rec}<small> {A.seq.rec === 1 ? 'dia' : 'dias'}</small></b><em>desde {dataBR(desde)}</em></div>
          <div className="an-kpi"><span><CalendarDays size={14} />Dias registrados</span><b>{A.registrados}<small> de {n}</small></b><em>{A.registrados < n ? 'dias sem registro não entram na conta' : 'todos os dias do período'}</em></div>
        </div>
        {A.notas && (
          <div className="an-notas">
            {A.notas.bem && <div className="an-nota" style={{ '--c': 'var(--rx-m-habitos)' }}><span className="rx-tile sm" style={{ '--c': 'var(--rx-m-habitos)' }}><Star size={16} /></span><div><b>Indo bem</b><p>{A.notas.bem}</p></div></div>}
            {A.notas.atencao && <div className="an-nota" style={{ '--c': 'var(--rx-amber)' }}><span className="rx-tile sm" style={{ '--c': 'var(--rx-amber)' }}><AlertTriangle size={16} /></span><div><b>Precisa de atenção</b><p>{A.notas.atencao}</p></div></div>}
            <div className="an-nota" style={{ '--c': 'var(--rx-m-analise)' }}><span className="rx-tile sm" style={{ '--c': 'var(--rx-m-analise)' }}><Lightbulb size={16} /></span><div><b>Sugestão</b><p>{A.notas.sugestao}</p></div></div>
          </div>
        )}
      </section>

      <section className="an-card rx-glass-card" data-testid="an-metricas-extras" aria-label="Mais métricas de acompanhamento">
        <Titulo cor="var(--rx-m-analise)" icone={BarChart3} extra={<span className="rx-sub">dados reais dos últimos {n} dias</span>}>Indicadores de acompanhamento</Titulo>
        <div className="an-extras">
          <div className="an-kpi" data-testid="an-dias-perfeitos">
            <span><Star size={14} />Dias 100% cumpridos</span>
            <b>{A.diasHab.length ? A.diasPerfeitos : '–'}{A.diasHab.length > 0 && <small> de {A.diasHab.length}</small>}</b>
            <em>{A.diasHab.length ? `${A.totalHabitosFeitos} hábitos concluídos · média ${decimal(A.mediaHabitosDia)}/dia` : 'sem hábitos registrados no período'}</em>
          </div>
          <div className="an-kpi" data-testid="an-util-fds">
            <span><CalendarDays size={14} />Úteis vs Fim de semana</span>
            <b>{A.util == null && A.fds == null ? '–' : `${A.util ?? '–'}%`}{A.fds != null && <small> / {A.fds}%</small>}</b>
            <em>{A.util != null || A.fds != null ? 'seg–sex vs sáb–dom em hábitos' : 'registre dias úteis e fins de semana'}</em>
          </div>
          <div className="an-kpi" data-testid="an-agua-litros">
            <span><Droplets size={14} />Hidratação acumulada</span>
            <b>{A.diasAgua.length ? `${decimal(A.totalLitrosAgua, 1)} L` : '–'}</b>
            <em>{A.diasAgua.length ? `em ${plural(A.diasAgua.length, 'dia', 'dias')} · ${A.naMeta} na meta` : 'nenhum copo registrado no período'}</em>
          </div>
          <div className="an-kpi" data-testid="an-sono-ideal">
            <span><Moon size={14} />Noites com 7h ou mais</span>
            <b>{A.noites.length ? A.noitesIdeais : '–'}{A.noites.length > 0 && <small> de {A.noites.length}</small>}</b>
            <em>{A.noites.length ? `${pct(A.noitesIdeais, A.noites.length)}% das noites registradas` : 'sem noites registradas no período'}</em>
          </div>
          <div className="an-kpi" data-testid="an-foco-ritmo">
            <span><Timer size={14} />Ritmo de foco</span>
            <b>{A.mediaFocoDia == null ? '–' : `${A.mediaFocoDia} min`}</b>
            <em>{A.focoDias ? `média por dia focado · recorde ${A.melhorDiaFoco} min${A.focoSessoes ? ` · ${plural(A.focoSessoes, 'sessão', 'sessões')}` : ''}` : 'sem sessões de foco no período'}</em>
          </div>
          <div className="an-kpi" data-testid="an-treino-agenda">
            <span><Dumbbell size={14} />Treino &amp; Agenda</span>
            <b>{A.treinoTotalSeries == null ? '–' : `${A.treinoTotalSeries}`}{A.treinoTotalSeries != null && <small> séries</small>}</b>
            <em>{A.treinoTotalSessoes != null ? `${plural(A.treinoTotalSessoes, 'treino', 'treinos')}${A.taxaAgenda != null ? ` · Agenda ${A.taxaAgenda}% concluída` : ''}` : 'carregando histórico de treino'}</em>
          </div>
        </div>
      </section>

      <div className="an-row">
        <section className="an-card rx-glass-card" data-testid="an-mapa">
          <Titulo cor="var(--rx-m-habitos)" icone={CalendarDays} extra={<span className="rx-sub">{n} dias</span>}>Mapa dos hábitos</Titulo>
          <p className="an-lead">Cada quadrado é um dia. Quanto mais forte, mais hábitos você cumpriu.</p>
          <div className={`an-heat ${n === 90 ? 'denso' : ''}`}>
            <div className="dias" aria-hidden="true">{DIAS_SEM.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grade">
              {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} className="an-cel nada" aria-hidden="true" />)}
              {A.datas.map((s) => {
                const d = porData.get(s);
                const txt = d ? (d.habitsTotal ? `${nomeDia(s)}, ${dataBR(s)}: ${d.habitsDone} de ${d.habitsTotal} hábitos` : `${nomeDia(s)}, ${dataBR(s)}: sem hábitos no dia`) : `${nomeDia(s)}, ${dataBR(s)}: sem registro`;
                return <span key={s} className={`an-cel ${nivel(d)} ${s === hoje ? 'hoje' : ''}`} tabIndex={0} role="img" aria-label={txt} title={txt}
                  onMouseEnter={() => setCelula(s)} onFocus={() => setCelula(s)} onMouseLeave={() => setCelula(null)} onBlur={() => setCelula(null)} />;
              })}
            </div>
          </div>
          <div className="an-escala">
            <span className="an-info" aria-live="polite">{celula ? (cel ? (cel.habitsTotal ? `${nomeDia(celula)}, ${dataBR(celula)}: ${cel.habitsDone} de ${cel.habitsTotal} hábitos` : `${dataBR(celula)}: sem hábitos no dia`) : `${dataBR(celula)}: sem registro`) : ''}</span>
            Menos <span className="an-cel" /><span className="an-cel v1" /><span className="an-cel v2" /><span className="an-cel v3" /><span className="an-cel v4" /> Mais
          </div>
        </section>

        <section className="an-card rx-glass-card" data-testid="an-ranking">
          <Titulo cor="var(--rx-m-habitos)" icone={Star}>Seus hábitos</Titulo>
          <p className="an-lead">Em quantos dias registrados cada hábito foi feito.</p>
          {A.pouco || !A.habitos.length ? <Vazio titulo={A.habitos.length ? 'Pouco histórico' : 'Nenhum hábito registrado'}>{A.habitos.length ? `O ranking aparece com ${MIN_DIAS} dias registrados.` : 'Crie hábitos e marque o que fizer: o ranking se monta sozinho.'}</Vazio> : (
            <ul className="an-rank">
              {A.habitos.map((h) => (
                <li key={h.id}>
                  <div className="nm"><b>{h.nome}</b><span>{h.cat ? `${h.cat} · ` : ''}{h.f} de {h.t} dias{A.top && A.low && h.id === A.top.id && <i className="an-tag top">mais firme</i>}{A.top && A.low && h.id === A.low.id && A.low.pc < A.top.pc && <i className="an-tag low">mais difícil</i>}</span></div>
                  <div className="an-bar" style={{ '--c': 'var(--rx-m-habitos)' }}><i style={{ width: `${h.pc}%` }} /></div>
                  <span className="pc">{h.pc}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="an-row">
        <section className="an-card rx-glass-card">
          <Titulo cor="var(--rx-m-habitos)" icone={BarChart3}>Semana a semana</Titulo>
          <p className="an-lead">Consistência das últimas 8 semanas, em %.</p>
          {A.sem8.every((s) => s.v == null) ? <Vazio titulo="Ainda sem semanas registradas">A primeira barra aparece com o primeiro dia registrado.</Vazio> : (
            <Barras testId="an-semanas" titulo="Consistência por semana" cor="var(--rx-m-habitos)" max={100}
              itens={A.sem8.map((s) => ({ rotulo: s.rotulo, v: s.v, dica: [s.v == null ? 'Sem registro' : `${s.v}%`, `${dataBR(s.datas[0])} a ${dataBR(s.datas[6])}${s.n ? `, ${plural(s.n, 'dia', 'dias')}` : ''}`] }))} />
          )}
        </section>
        <section className="an-card rx-glass-card">
          <Titulo cor="var(--rx-m-habitos)" icone={CalendarDays}>Por dia da semana</Titulo>
          <p className="an-lead">Em que dias você cumpre mais.</p>
          {A.diasHab.length < 7 ? <Vazio titulo="Pouco histórico">Com uma semana de registro dá para ver o padrão.</Vazio> : (
            <Barras testId="an-diasem" titulo="Consistência por dia da semana" cor="var(--rx-m-habitos)" max={100}
              itens={A.diaSem.map((x) => ({ rotulo: x.nome, v: x.v, dica: [x.v == null ? 'Sem registro' : `${x.v}%`, `${x.nome}, média de ${plural(x.n, 'dia', 'dias')}`] }))} />
          )}
        </section>
      </div>

      <div className="an-row">
        <section className="an-card rx-glass-card">
          <Titulo cor="var(--rx-m-analise)" icone={Tag}>Categorias</Titulo>
          <p className="an-lead">Consistência de cada categoria no período.</p>
          {A.pouco || !A.categorias.length ? <Vazio titulo="Pouco histórico">As categorias aparecem com {MIN_DIAS} dias registrados.</Vazio> : (
            <ul className="an-rank">
              {A.categorias.map((x) => (
                <li key={x.nome}><div className="nm"><b>{x.nome}</b><span>{x.f} de {x.t} marcações</span></div><div className="an-bar" style={{ '--c': 'var(--rx-m-analise)' }}><i style={{ width: `${x.pc}%` }} /></div><span className="pc">{x.pc}%</span></li>
              ))}
            </ul>
          )}
        </section>
        <section className="an-card rx-glass-card">
          <Titulo cor="var(--rx-m-agenda)" icone={CalendarDays}>Agenda</Titulo>
          <div className="an-big"><b>{A.agConc}<small> de {A.evs.length}</small></b><span>eventos concluídos no período</span></div>
          {A.agSem.every((s) => !s.t) ? <Vazio titulo="Sem eventos nas últimas semanas">Eventos com data aparecem aqui, por semana.</Vazio> : (
            <Barras testId="an-agenda" titulo="Eventos concluídos por semana" cor="var(--rx-m-agenda)"
              itens={A.agSem.map((s) => ({ rotulo: s.rotulo, v: s.v, dica: [`${s.v} de ${s.t}`, `concluídos, ${dataBR(s.datas[0])} a ${dataBR(s.datas[6])}`] }))} />
          )}
          <p className="an-como">Eventos com data no período marcados como concluídos. Repetições não entram.</p>
        </section>
      </div>

      <div className="an-row">
        <section className="an-card rx-glass-card" data-testid="an-agua">
          <Titulo cor="var(--rx-m-agua)" icone={Droplets}>Água</Titulo>
          <div className="an-mini">
            <div><b>{A.mediaAgua == null ? '–' : decimal(A.mediaAgua)}</b><span>copos por dia</span></div>
            <div><b>{A.naMeta}</b><span>dias na meta</span></div>
            <div><b>{A.diasAgua.length ? `${pct(A.naMeta, A.diasAgua.length)}%` : '–'}</b><span>dos dias registrados</span></div>
          </div>
          {!A.diasAgua.length ? <Vazio titulo="Sem água registrada">Registre copos no Painel e eles aparecem aqui, dia a dia.</Vazio> : (
            <Barras testId="an-agua-graf" titulo="Copos de água por dia" cor="var(--rx-m-agua)" max={Math.max(A.metaAgua + 2, ...A.agua.map((x) => x.d?.waterGlasses || 0))} meta={A.metaAgua} metaTexto={`meta ${A.metaAgua}`}
              itens={A.agua.map((x) => ({ rotulo: dataBR(x.date), v: x.d ? x.d.waterGlasses : null, dica: [x.d ? plural(x.d.waterGlasses, 'copo', 'copos') : 'Sem registro', `${nomeDia(x.date)}, ${dataBR(x.date)}`] }))} />
          )}
        </section>
        <section className="an-card rx-glass-card" data-testid="an-sono">
          <Titulo cor="var(--rx-m-sono)" icone={Moon}>Sono</Titulo>
          <div className="an-mini">
            <div><b>{A.mediaSono == null ? '–' : `${decimal(A.mediaSono)} h`}</b><span>média por noite</span></div>
            <div><b>{A.varDeitar == null ? '–' : `±${A.varDeitar} min`}</b><span>variação ao deitar</span></div>
            <div><b>{A.noites.length}</b><span>{A.noites.length === 1 ? 'noite registrada' : 'noites registradas'}</span></div>
          </div>
          {!A.noites.length ? <Vazio titulo="Sem sono registrado">Registre o sono no Painel e ele aparece aqui.</Vazio> : (
            <Barras testId="an-sono-graf" titulo="Horas de sono por noite" cor="var(--rx-m-sono)" max={10} meta={8} metaTexto="8 h"
              itens={A.datas.map((s) => { const d = porData.get(s); const hr = d?.sleepLogged ? horasDeSono(d.sleepBed, d.sleepWake) : null; const h = hr == null ? null : Math.round(hr * 10) / 10; return { rotulo: dataBR(s), v: h, dica: [h == null ? 'Sem registro' : `${decimal(h)} h`, h == null ? `${nomeDia(s)}, ${dataBR(s)}` : `${d.sleepBed} às ${d.sleepWake}, ${dataBR(s)}`] }; })} />
          )}
        </section>
      </div>

      <div className="an-row tres">
        <section className="an-card rx-glass-card" data-testid="an-foco">
          <Titulo cor="var(--rx-m-foco)" icone={Timer}>Foco</Titulo>
          <div className="an-big"><b>{A.focoTot >= 60 ? `${Math.floor(A.focoTot / 60)} h ${A.focoTot % 60} min` : `${A.focoTot} min`}</b><span>em {plural(A.focoDias, 'dia', 'dias')}</span></div>
          {!A.focoDias ? <Vazio titulo="Sem foco no período">Sessões concluídas no Foco aparecem aqui.</Vazio> : (
            <Barras testId="an-foco-graf" titulo="Minutos de foco por dia" cor="var(--rx-m-foco)"
              itens={A.foco.map((x) => ({ rotulo: dataBR(x.date), v: x.v, dica: [`${x.v} min`, `${nomeDia(x.date)}, ${dataBR(x.date)}`] }))} />
          )}
        </section>
        <section className="an-card rx-glass-card" data-testid="an-treino">
          <Titulo cor="var(--rx-m-treino)" icone={Dumbbell}>Treino</Titulo>
          {A.treinoSem == null ? <p className="rx-sub">Carregando…</p> : (
            <>
              <div className="an-big"><b>{A.treinoDias}</b><span>{A.treinoDias === 1 ? 'dia treinado' : 'dias treinados'} no período</span></div>
              {A.treinoSem.every((s) => !s.v) ? <Vazio titulo="Sem treinos nas últimas semanas">Treinos com pelo menos uma série feita aparecem aqui.</Vazio> : (
                <Barras testId="an-treino-graf" titulo="Dias treinados por semana" cor="var(--rx-m-treino)" max={7}
                  itens={A.treinoSem.map((s) => ({ rotulo: s.rotulo, v: s.v, dica: [plural(s.v, 'dia', 'dias'), `${dataBR(s.datas[0])} a ${dataBR(s.datas[6])}`] }))} />
              )}
              <p className="an-como">Dias por semana nas últimas 8 semanas. Conta sessões com pelo menos uma série feita.</p>
            </>
          )}
        </section>
        <section className="an-card rx-glass-card" data-testid="an-maus">
          <Titulo cor="var(--rx-m-maus)" icone={ShieldCheck}>Maus hábitos</Titulo>
          {!A.maus.length ? <Vazio titulo="Nada sendo acompanhado">Os maus hábitos que você acompanhar aparecem aqui.</Vazio> : (
            <div className="an-mh">
              {A.maus.map((h) => (
                <div key={h.id}><div className="tx"><b>{h.nome}</b><p>Recorde {plural(h.recorde, 'dia', 'dias')} · {plural(h.recaidas, 'recaída', 'recaídas')} no período{h.gatilho ? ` · gatilho mais comum: ${h.gatilho}` : ''}</p></div><strong>{h.limpos} d</strong></div>
              ))}
            </div>
          )}
          <p className="an-como">Dias limpos hoje, com recorde e recaídas registradas.</p>
        </section>
      </div>

      <p className="an-como an-rodape">O Ethos guarda um resumo de cada dia (hábitos feitos, água, sono e foco) desde {dataBR(desde)}. Dias sem registro não entram em nenhum número.</p>
    </div>
  );
}

