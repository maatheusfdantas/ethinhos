import React, { useEffect, useRef, useState } from 'react';
import { Check, HeartHandshake, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import '../../styles/espacos.css';
import '../../styles/telas.css';

/** Sugestões do formulário (as mesmas do módulo antigo; o texto de impacto com percentuais não aparece mais). */
const SUGESTOES = [
  { title: 'Cigarro / Nicotina', category: 'Saúde Física & Pulmonar', cost_per_day: 15, motivational_reason: 'Recuperar o fôlego, a saúde cardiovascular e viver mais com a família.' },
  { title: 'Bebida Alcoólica', category: 'Saúde Mental & Fígado', cost_per_day: 25, motivational_reason: 'Ter clareza mental total, sono reparador e energia constante nos treinos.' },
  { title: 'Automutilação & Autocuidado', category: 'Equilíbrio Emocional & Acolhimento', cost_per_day: 0, motivational_reason: 'Cuidar do meu corpo com gentileza e encontrar formas seguras de aliviar a dor emocional.' },
  { title: 'Doomscrolling / Redes Excessivas', category: 'Foco & Produtividade', cost_per_day: 0, motivational_reason: 'Parar de queimar minha atenção e focar nos meus objetivos reais de vida.' },
  { title: 'Apostas / Jogos de Azar (Bets)', category: 'Finanças & Estabilidade', cost_per_day: 40, motivational_reason: 'Proteger meu patrimônio, minha paz de espírito e o respeito próprio.' },
  { title: 'Açúcar & Junk Food Compulsivo', category: 'Nutrição & Vitalidade', cost_per_day: 20, motivational_reason: 'Evitar picos de insulina, névoa mental e letargia durante a tarde.' }
];
const ROTULO = { 'Cigarro / Nicotina': 'Cigarro ou nicotina', 'Bebida Alcoólica': 'Bebida alcoólica', 'Automutilação & Autocuidado': 'Automutilação', 'Doomscrolling / Redes Excessivas': 'Redes sociais em excesso', 'Apostas / Jogos de Azar (Bets)': 'Apostas', 'Açúcar & Junk Food Compulsivo': 'Açúcar e ultraprocessados' };
const GATILHOS = ['Estresse ou sobrecarga', 'Ansiedade', 'Pressão de amigos ou do ambiente', 'Tédio', 'Frustração ou solidão', 'Cansaço ou pouco sono', 'Outro motivo'];
const MARCOS = [[0, 'Primeiro dia'], [1, '24 horas'], [3, '3 dias'], [7, '1 semana'], [14, '2 semanas'], [30, '1 mês'], [90, '90 dias'], [180, '6 meses'], [365, '1 ano'], [730, '2 anos']];
const ATERRAMENTO = [
  ['5 coisas que você vê', ['Um objeto na sua frente', 'Uma luz ou sombra', 'Um detalhe no chão ou na parede', 'Suas próprias mãos', 'Uma cor diferente ao redor']],
  ['4 coisas que você pode tocar', ['O tecido da sua roupa', 'A superfície onde você está apoiado', 'A temperatura das suas mãos', 'O chão sob seus pés']],
  ['3 sons que você ouve', ['Um som distante', 'Um som perto, no mesmo ambiente', 'Sua própria respiração']],
  ['2 cheiros', ['O cheiro do ambiente', 'O cheiro da sua roupa ou das mãos']],
  ['1 gosto ou sensação', ['Um gole de água, sentindo o corpo']]
];
const TOTAL_ATERRAMENTO = ATERRAMENTO.reduce((s, [, it]) => s + it.length, 0);
const reais = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Tempo desde o início (dias, horas e minutos inteiros). */
export function tempoLimpo(startedAt, agora = Date.now()) {
  const ms = Math.max(0, agora - new Date(startedAt).getTime());
  const totalMin = Math.floor(ms / 60000);
  const totalH = Math.floor(totalMin / 60);
  return { dias: Math.floor(totalH / 24), horas: totalH % 24, minutos: totalMin % 60 };
}
/** Marco atual e o próximo, para a barra de progresso. */
export function marcos(dias) {
  const i = Math.max(0, MARCOS.findIndex(([d], k) => dias >= d && (k === MARCOS.length - 1 || dias < MARCOS[k + 1][0])));
  const [d0, atual] = MARCOS[i];
  const prox = MARCOS[Math.min(i + 1, MARCOS.length - 1)][0];
  return { atual, proximo: prox, falta: Math.max(0, prox - dias), pct: prox > d0 ? Math.round(((dias - d0) / (prox - d0)) * 100) : 100 };
}

const formVazio = () => ({ title: '', category: '', reason: '', date: hojeIso(), time: '00:00', costValue: '', costPeriod: 'none' });

/**
 * Maus hábitos no visual atual do Ethos (proposta 09, aprovada em 21/11/2026). Mesmas props, dados e ações do
 * BadHabitsTab antigo (que continua no código): contador desde o início, recaída com gatilho e anotação (o recorde
 * fica guardado), economia pelo custo informado, histórico, exclusão e o apoio imediato (CVV 188, respiração,
 * 5-4-3-2-1, onda de 15 minutos e água fria). Sem números inventados: o "ganho de foco" e os percentuais saíram.
 * Agora só grava quando algo muda (antes regravava a cópia local toda vez que a aba abria).
 */
export function MausHabitosTab({ user, showToast }) {
  const storageKey = `ethos_bad_habits_${user?.id || 'default'}`;
  const [lista, setLista] = useState(() => { try { const s = localStorage.getItem(storageKey); return s ? JSON.parse(s) : []; } catch { return []; } });
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 10000); return () => clearInterval(t); }, []);

  const mudou = useRef(false);
  useEffect(() => {
    if (!mudou.current) return;
    try { localStorage.setItem(storageKey, JSON.stringify(lista)); } catch { /* sem armazenamento local */ }
    if (user?.id) fetch(`/api/user/${user.id}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ badHabits: lista }) }).catch(() => showToast?.('Salvo só neste aparelho. Tente de novo com conexão.'));
  }, [lista]); // eslint-disable-line react-hooks/exhaustive-deps
  const alterar = (fn) => { mudou.current = true; setLista(fn); };

  const [novo, setNovo] = useState(null);
  const [recaida, setRecaida] = useState(null); // { habit, gatilho, licao }
  const [apagar, setApagar] = useState(null);
  const [editando, setEditando] = useState(null); // { id, title } | null
  const [abandonar, setAbandonar] = useState(null); // habit | null
  const [sos, setSos] = useState(null); // 'resp' | 'ater' | 'onda' | 'frio' | null
  const [telaCheia, setTelaCheia] = useState(false);

  /* ---------- Exercícios ---------- */
  const [resp, setResp] = useState({ on: false, s: 0, ciclo: 1 });
  useEffect(() => {
    if (!resp.on || (!telaCheia && sos !== 'resp')) return undefined;
    const t = setInterval(() => setResp((r) => { const s = (r.s + 1) % 12; return { ...r, s, ciclo: s === 0 ? r.ciclo + 1 : r.ciclo }; }), 1000);
    return () => clearInterval(t);
  }, [resp.on, sos, telaCheia]);
  const fase = resp.s < 4 ? ['in', 'Inspire', 4 - resp.s] : resp.s < 8 ? ['in', 'Segure', 8 - resp.s] : ['out', 'Solte', 12 - resp.s];
  const [marcados, setMarcados] = useState({});
  const feitosAter = Object.values(marcados).filter(Boolean).length;
  const [onda, setOnda] = useState({ on: false, s: 900 });
  const [frio, setFrio] = useState({ on: false, s: 30 });
  useEffect(() => {
    if (!onda.on) return undefined;
    const t = setInterval(() => setOnda((o) => (o.s <= 1 ? { on: false, s: 0 } : { ...o, s: o.s - 1 })), 1000);
    return () => clearInterval(t);
  }, [onda.on]);
  useEffect(() => {
    if (!frio.on) return undefined;
    const t = setInterval(() => setFrio((o) => (o.s <= 1 ? { on: false, s: 0 } : { ...o, s: o.s - 1 })), 1000);
    return () => clearInterval(t);
  }, [frio.on]);
  const minutosOnda = Math.floor((900 - onda.s) / 60);
  const textoOnda = onda.s === 900 ? 'Toque em começar e espere a vontade passar, sem decidir nada agora.'
    : onda.s === 0 ? 'Passaram 15 minutos. A vontade passou ou ficou mais fraca: você atravessou.'
    : minutosOnda < 3 ? 'Subindo: parece urgente, mas costuma durar poucos minutos. Respire e não decida agora.'
    : minutosOnda < 7 ? 'No pico: você já está há alguns minutos aguentando. Daqui a pouco começa a baixar.'
    : minutosOnda < 12 ? 'Baixando: o pior já passou. Continue respirando.' : 'Quase lá: falta pouco para os 15 minutos.';
  const relogio = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- Ações ---------- */
  const criar = (e) => {
    e.preventDefault();
    if (!novo.title.trim()) return;
    const v = parseFloat(String(novo.costValue).replace(',', '.')) || 0;
    const porDia = novo.costPeriod === 'day' ? v : novo.costPeriod === 'week' ? (v > 0 ? Number((v / 7).toFixed(2)) : 0) : novo.costPeriod === 'month' ? (v > 0 ? Number((v / 30).toFixed(2)) : 0) : 0;
    const h = {
      id: `bh_${Date.now()}`, title: novo.title.trim(), category: novo.category.trim() || 'Superação Pessoal', icon_name: 'ShieldOff',
      started_at: new Date(`${novo.date}T${novo.time || '00:00'}:00`).toISOString(),
      cost_per_day: porDia, cost_period: novo.costPeriod, cost_value: v,
      motivational_reason: novo.reason.trim() || 'Construir minha melhor versão com mais saúde e dignidade.',
      impact_description: 'Melhora progressiva da clareza mental e restabelecimento do equilíbrio corporal.',
      best_streak_days: 0, relapse_count: 0, relapses: []
    };
    alterar((prev) => [h, ...prev]);
    setNovo(null);
    showToast?.(`${h.title}: contagem começou.`);
  };
  const confirmarRecaida = (e) => {
    e.preventDefault();
    const h = recaida.habit;
    const { dias } = tempoLimpo(h.started_at, Date.now());
    const best = Math.max(h.best_streak_days || 0, dias);
    const entrada = { date: new Date().toISOString(), days_achieved: dias, trigger: recaida.gatilho, lesson: recaida.licao.trim() || 'Acolher a recaída e retomar o foco imediatamente.' };
    alterar((prev) => prev.map((x) => (x.id === h.id ? { ...x, started_at: new Date().toISOString(), best_streak_days: best, relapse_count: (x.relapse_count || 0) + 1, relapses: [entrada, ...(x.relapses || [])] } : x)));
    setRecaida(null);
    showToast?.(`Contagem recomeçou. Seu recorde de ${best} ${best === 1 ? 'dia' : 'dias'} continua guardado.`);
  };
  const excluir = () => {
    alterar((prev) => prev.filter((x) => x.id !== apagar.id));
    showToast?.(`Acompanhamento de ${apagar.title} removido.`);
    setApagar(null);
  };
  const salvarNome = (e) => {
    e.preventDefault();
    if (!editando || !editando.title.trim()) return;
    const novoNome = editando.title.trim();
    alterar((prev) => prev.map((x) => (x.id === editando.id ? { ...x, title: novoNome } : x)));
    setEditando(null);
    showToast?.(`Nome atualizado para "${novoNome}".`);
  };
  const confirmarAbandono = () => {
    if (!abandonar) return;
    alterar((prev) => prev.filter((x) => x.id !== abandonar.id));
    setAbandonar(null);
    showToast?.('Tudo bem dar um passo atrás e respirar. Estamos com você quando quiser recomeçar, sem culpa.');
  };
  const usarSugestao = (s) => setNovo((f) => ({ ...f, title: s.title, category: s.category, reason: s.motivational_reason, costPeriod: s.cost_per_day > 0 ? 'day' : 'none', costValue: s.cost_per_day > 0 ? String(s.cost_per_day) : '' }));

  const maior = lista.reduce((m, h) => Math.max(m, tempoLimpo(h.started_at, agora).dias), 0);
  const economia = lista.reduce((s, h) => s + tempoLimpo(h.started_at, agora).dias * (Number(h.cost_per_day) || 0), 0);
  const apoio = (
    <div className="mh-help">
      <h3>Se estiver difícil agora</h3>
      <p>CVV: apoio emocional gratuito e sigiloso, 24 horas, de qualquer telefone.</p>
      <a className="rx-btn tiny" href="tel:188"><Phone size={14} />Ligar 188</a>
    </div>
  );

  return (
    <div className="es mh">
      <div className="es-head">
        <div><h1>Maus hábitos</h1><p>Tempo sem recaída, contado a partir do início que você marcou.</p></div>
        <div className="acts">
          <button type="button" className="rx-btn ghost" onClick={() => setSos('resp')}>Preciso de ajuda agora</button>
          <button type="button" className="rx-btn" onClick={() => setNovo(formVazio())}><Plus size={16} />Novo acompanhamento</button>
        </div>
      </div>
      <div className="es-grid">
        <div className="es-stack">
          {lista.length === 0 ? (
            <article className="es-card"><div className="es-empty"><h3>Nada sendo acompanhado</h3><p>Escolha algo que você quer largar e marque quando parou. O Ethos conta o tempo desde então e guarda seu recorde se houver uma recaída.</p><button type="button" className="rx-btn" onClick={() => setNovo(formVazio())}><Plus size={16} />Começar um acompanhamento</button></div></article>
          ) : lista.map((h) => {
            const t = tempoLimpo(h.started_at, agora);
            const m = marcos(t.dias);
            const gasto = t.dias * (Number(h.cost_per_day) || 0);
            const rel = h.relapses || [];
            return (
              <article className="es-card" key={h.id} data-testid="mau-habito">
                {editando?.id === h.id ? (
                  <form onSubmit={salvarNome} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    <input
                      className="es-input"
                      aria-label="Novo nome do mau hábito"
                      value={editando.title}
                      onChange={(e) => setEditando({ ...editando, title: e.target.value })}
                      autoFocus
                      style={{ flex: '1 1 180px' }}
                    />
                    <button type="submit" className="rx-btn tiny">Salvar nome</button>
                    <button type="button" className="rx-btn ghost tiny" onClick={() => setEditando(null)}>Cancelar</button>
                  </form>
                ) : (
                  <h2>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{h.title}</span>
                      <button
                        type="button"
                        className="rx-link"
                        aria-label={`Editar nome de ${h.title}`}
                        onClick={() => setEditando({ id: h.id, title: h.title })}
                        style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Pencil size={13} />
                        <span>Editar nome</span>
                      </button>
                    </span>
                    <span className="rx-sub" style={{ margin: 0, fontWeight: 500 }}>{h.category}</span>
                  </h2>
                )}
                <div className="mh-count" aria-label={`${t.dias} dias, ${t.horas} horas e ${t.minutos} minutos sem recaída`}>
                  <b>{t.dias}<span>{t.dias === 1 ? 'dia' : 'dias'}</span></b><b>{t.horas}<span>h</span></b><b>{t.minutos}<span>min</span></b>
                </div>
                <div className="rx-meter" style={{ maxWidth: 'none', marginTop: 10 }}><div className={`rx-fill ${m.pct ? '' : 'zero'}`} style={{ width: `${m.pct}%` }} /></div>
                <p className="rx-sub" style={{ margin: '8px 0 0' }}>Marco atual: {m.atual}. Próximo: {m.proximo} dias (faltam {m.falta}).</p>
                {h.motivational_reason && <p className="mh-why">{h.motivational_reason}</p>}
                <div className="mh-facts">
                  <span>Recorde <b>{Math.max(h.best_streak_days || 0, t.dias)} dias</b></span>
                  {gasto > 0 && <span>Economia <b>{reais(gasto)}</b> ({reais(h.cost_per_day)} por dia)</span>}
                  <span>{h.relapse_count > 0 ? <><b>{h.relapse_count}</b> {h.relapse_count === 1 ? 'recaída registrada' : 'recaídas registradas'}</> : 'Nenhuma recaída registrada'}</span>
                </div>
                {rel.length > 0 && (
                  <details className="mh-hist"><summary>O que você anotou nas recaídas ({rel.length})</summary>
                    <ul>{rel.map((r, i) => <li key={i}>{new Date(r.date).toLocaleDateString('pt-BR')}, depois de {r.days_achieved || 0} {r.days_achieved === 1 ? 'dia' : 'dias'}. Gatilho: {r.trigger}. {r.lesson}</li>)}</ul>
                  </details>
                )}
                <div className="mh-acts">
                  <button type="button" className="rx-btn ghost tiny" onClick={() => setRecaida({ habit: h, gatilho: GATILHOS[0], licao: '' })}>Registrar recaída</button>
                  <button type="button" className="rx-btn ghost tiny" onClick={() => setAbandonar(h)} aria-label={`Abandonar ${h.title}`}>Abandonar</button>
                  <span className="sp" />
                  <button type="button" className="mh-del" aria-label={`Excluir ${h.title}`} onClick={() => setApagar(h)}><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}
        </div>
        <aside className="rx-rail">
          <section className="summary">
            <h2>Maior sequência</h2>
            <div className="tl-big" style={{ marginTop: 12 }}>{maior}<small> {maior === 1 ? 'dia' : 'dias'}</small></div>
            {economia > 0 && <p className="rx-sub" style={{ marginTop: 10 }}>{reais(economia)} que deixaram de ser gastos, pelo custo que você informou.</p>}
          </section>
          <section>
            {apoio}
            <button type="button" className="rx-link" style={{ marginTop: 12, paddingLeft: 0 }} onClick={() => setSos('resp')}>Exercícios para passar o impulso</button>
          </section>
          <section><h2>Lembrete</h2><p className="rx-sub">“A vitória sobre si mesmo é a maior de todas as conquistas.” Platão</p></section>
        </aside>
      </div>

      {sos && (
        <div className="rx-overlay" onClick={() => setSos(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="mh-sos-t" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="mh-sos-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Para passar o impulso<button type="button" className="rx-link" aria-label="Fechar" onClick={() => setSos(null)}><X size={16} /></button></h2>
            <div style={{ margin: '10px 0 14px' }}>{apoio}</div>
            <div className="tl-seg" role="group" aria-label="Exercício" style={{ marginBottom: 12 }}>
              {[['resp', 'Respiração'], ['ater', '5-4-3-2-1'], ['onda', 'Onda de 15 min'], ['frio', 'Água fria']].map(([k, l]) => <button key={k} type="button" aria-pressed={sos === k} onClick={() => setSos(k)}>{l}</button>)}
            </div>
            {sos === 'resp' && (<>
              <p>Inspire 4 segundos, segure 4, solte 4. Repita algumas vezes.</p>
              <div className={`mh-orb ${resp.on ? fase[0] : ''}`} aria-live="polite">{resp.on ? `${fase[1]} ${fase[2]}` : 'Pronto?'}</div>
              <p className="rx-sub" style={{ textAlign: 'center', margin: '0 0 12px' }}>{resp.on ? `Ciclo ${resp.ciclo}` : 'Siga o círculo: ele cresce ao inspirar e diminui ao soltar.'}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="rx-btn" onClick={() => setResp((r) => ({ ...r, on: !r.on }))}>{resp.on ? 'Pausar' : 'Começar'}</button>
                <button type="button" className="rx-btn ghost" onClick={() => setResp({ on: false, s: 0, ciclo: 1 })}>Recomeçar</button>
                <button type="button" className="rx-btn ghost" onClick={() => setTelaCheia(true)}>Tela cheia</button>
              </div>
            </>)}
            {sos === 'ater' && (<>
              <p>Repare no que está à sua volta e marque cada item. {feitosAter} de {TOTAL_ATERRAMENTO}.</p>
              {ATERRAMENTO.map(([titulo, itens], gi) => (
                <div key={titulo} style={{ marginBottom: 10 }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 620 }}>{titulo}</h3>
                  <ul className="mh-g">{itens.map((it, ii) => { const id = `${gi}_${ii}`; return <li key={id}><button type="button" className="rx-check" aria-pressed={Boolean(marcados[id])} aria-label={it} onClick={() => setMarcados((m) => ({ ...m, [id]: !m[id] }))}><Check size={14} strokeWidth={2.6} /></button>{it}</li>; })}</ul>
                </div>
              ))}
              {feitosAter === TOTAL_ATERRAMENTO && <p role="status">Pronto. Você passou pelos cinco sentidos.</p>}
            </>)}
            {sos === 'onda' && (<>
              <p>A vontade costuma subir, chegar a um pico e baixar em alguns minutos.</p>
              <div className="mh-timer" aria-live="off">{relogio(onda.s)}</div>
              <p className="rx-sub" style={{ textAlign: 'center', minHeight: 40 }} aria-live="polite">{textoOnda}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button type="button" className="rx-btn" disabled={onda.s === 0} onClick={() => setOnda((o) => ({ ...o, on: !o.on }))}>{onda.on ? 'Pausar' : onda.s === 900 ? 'Começar' : 'Continuar'}</button>
                <button type="button" className="rx-btn ghost" onClick={() => setOnda({ on: false, s: 900 })}>Recomeçar</button>
              </div>
            </>)}
            {sos === 'frio' && (<>
              <p>Lave o rosto com água bem fria ou segure gelo nas mãos por 30 segundos. Pode ajudar a desacelerar.</p>
              <div className="mh-timer">{relogio(frio.s)}</div>
              {frio.s === 0 && <p className="rx-sub" style={{ textAlign: 'center' }} role="status">Pronto. Respire devagar mais um pouco.</p>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button type="button" className="rx-btn" disabled={frio.s === 0} onClick={() => setFrio((o) => ({ ...o, on: !o.on }))}>{frio.on ? 'Pausar' : frio.s === 30 ? 'Começar' : 'Continuar'}</button>
                <button type="button" className="rx-btn ghost" onClick={() => setFrio({ on: false, s: 30 })}>Recomeçar</button>
              </div>
            </>)}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button type="button" className="rx-btn ghost" onClick={() => { setSos(null); setResp((r) => ({ ...r, on: false })); }}>Estou melhor, fechar</button></div>
          </div>
        </div>
      )}

      {telaCheia && (
        <div className="rx-overlay mh-full" onClick={() => setTelaCheia(false)}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Respiração em tela cheia" style={{ textAlign: 'center' }}>
            <div className={`mh-orb big ${resp.on ? fase[0] : ''}`} aria-live="polite">{resp.on ? `${fase[1]} ${fase[2]}` : 'Pronto?'}</div>
            <p className="rx-sub">{resp.on ? `Ciclo ${resp.ciclo}` : 'Inspire 4, segure 4, solte 4.'}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <button type="button" className="rx-btn" onClick={() => setResp((r) => ({ ...r, on: !r.on }))}>{resp.on ? 'Pausar' : 'Começar'}</button>
              <button type="button" className="rx-btn ghost" onClick={() => setTelaCheia(false)}>Concluir</button>
            </div>
          </div>
        </div>
      )}

      {recaida && (() => {
        const t = tempoLimpo(recaida.habit.started_at, agora);
        const best = Math.max(recaida.habit.best_streak_days || 0, t.dias);
        return (
          <div className="rx-overlay" onClick={() => setRecaida(null)}>
            <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="mh-r-t" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} onSubmit={confirmarRecaida}>
              <h2 id="mh-r-t">Registrar recaída</h2>
              <p>Acontece. Os {t.dias} {t.dias === 1 ? 'dia' : 'dias'} que você fez continuam contando: seu recorde de {best} {best === 1 ? 'dia' : 'dias'} fica guardado e a contagem recomeça agora.</p>
              <div className="es-field"><label htmlFor="mh-g">O que puxou a vontade?</label><select id="mh-g" className="es-input" value={recaida.gatilho} onChange={(e) => setRecaida({ ...recaida, gatilho: e.target.value })}>{GATILHOS.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
              <div className="es-field"><label htmlFor="mh-l">O que você quer tentar da próxima vez? <span className="rx-sub">(opcional)</span></label><textarea id="mh-l" className="es-input pf-bio" rows={3} value={recaida.licao} onChange={(e) => setRecaida({ ...recaida, licao: e.target.value })} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="rx-btn ghost" onClick={() => setRecaida(null)}>Cancelar</button>
                <button type="submit" className="rx-btn">Recomeçar a contagem</button>
              </div>
            </form>
          </div>
        );
      })()}

      {novo && (
        <div className="rx-overlay" onClick={() => setNovo(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="mh-n-t" style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onSubmit={criar}>
            <h2 id="mh-n-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Novo acompanhamento<button type="button" className="rx-link" aria-label="Fechar" onClick={() => setNovo(null)}><X size={16} /></button></h2>
            <p>Sugestões</p>
            <div className="es-chips" style={{ marginBottom: 14 }}>{SUGESTOES.map((s) => <button key={s.title} type="button" className="es-chip" aria-pressed={novo.title === s.title} onClick={() => usarSugestao(s)}>{ROTULO[s.title]}</button>)}</div>
            <div className="ag-form">
              <div className="es-field full"><label htmlFor="mh-t">O que você quer largar</label><input id="mh-t" className="es-input" required value={novo.title} onChange={(e) => setNovo({ ...novo, title: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="mh-d">Parei em</label><input id="mh-d" type="date" className="es-input" required max={hojeIso()} value={novo.date} onChange={(e) => setNovo({ ...novo, date: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="mh-h">Horário</label><input id="mh-h" type="time" className="es-input" value={novo.time} onChange={(e) => setNovo({ ...novo, time: e.target.value })} /></div>
              <div className="es-field full"><label htmlFor="mh-m">Por que isso importa para você <span className="rx-sub">(opcional)</span></label><input id="mh-m" className="es-input" value={novo.reason} onChange={(e) => setNovo({ ...novo, reason: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="mh-c">Categoria <span className="rx-sub">(opcional)</span></label><input id="mh-c" className="es-input" placeholder="Ex.: Saúde" value={novo.category} onChange={(e) => setNovo({ ...novo, category: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="mh-v">Quanto gastava <span className="rx-sub">(opcional)</span></label>
                <div className="ag-dt"><input id="mh-v" className="es-input" inputMode="decimal" placeholder="R$" value={novo.costValue} onChange={(e) => setNovo({ ...novo, costValue: e.target.value, costPeriod: novo.costPeriod === 'none' && e.target.value ? 'day' : novo.costPeriod })} />
                  <select className="es-input" aria-label="Período do gasto" value={novo.costPeriod} onChange={(e) => setNovo({ ...novo, costPeriod: e.target.value })}><option value="none">sem custo</option><option value="day">por dia</option><option value="week">por semana</option><option value="month">por mês</option></select></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setNovo(null)}>Cancelar</button>
              <button type="submit" className="rx-btn">Começar a contar</button>
            </div>
          </form>
        </div>
      )}

      {apagar && (
        <div className="rx-overlay" onClick={() => setApagar(null)}>
          <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="mh-del-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="mh-del-t">Excluir {apagar.title}?</h2>
            <p>A contagem, o recorde e as anotações deste acompanhamento serão apagados.</p>
            <div className="opts" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setApagar(null)}>Cancelar</button>
              <button type="button" className="rx-btn" onClick={excluir}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {abandonar && (
        <div className="rx-overlay" onClick={() => setAbandonar(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="mh-ab-t" data-testid="mh-abandonar-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="mh-ab-t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HeartHandshake size={18} />
              <span>Pausar o acompanhamento de {abandonar.title}</span>
            </h2>
            <p style={{ lineHeight: 1.55 }}>
              Não se culpe. Mudar um hábito difícil não é uma linha reta, e cada hora ou dia que você tentou já foi um passo real de cuidado consigo mesmo. Se este não é o momento de continuar este acompanhamento, está tudo bem respirar, tirar esse peso dos ombros e recomeçar apenas quando você se sentir pronto — sem cobranças e sem julgamentos.
            </p>
            <div className="opts" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setAbandonar(null)}>Continuar tentando</button>
              <button type="button" className="rx-btn" onClick={confirmarAbandono}>Abandonar sem culpa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
