import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, CheckCircle2, Hash, Gauge, Calendar as CalendarIcon, Minus, Plus, ChevronDown, Info } from 'lucide-react';
import '../../styles/criar.css';

/**
 * Criar hábito ou evento (proposta 13, aprovada em 22/11/2026). Substitui o AddModal na tela;
 * mesmas props e os mesmos objetos gravados (campo por campo). O AddModal continua no código.
 * Lembretes, visibilidade, política de conflito, intervalo antes/depois e energia saíram da tela
 * por decisão do usuário (nada no Ethos age sobre eles); seguem gravados com os valores padrão de antes.
 */

// Cor para categorias do próprio usuário que não têm cor definida (não são categorias de exemplo)
const CORES_PADRAO = ['#7C6FEF', '#00C2D1', '#F24E6C', '#2CC295', '#F4C430', '#9B8CE8'];
const DIAS = [[1, 'Seg'], [2, 'Ter'], [3, 'Qua'], [4, 'Qui'], [5, 'Sex'], [6, 'Sáb'], [0, 'Dom']];
const TIPOS = [
  { id: 'done', titulo: 'Marcar como feito', desc: 'Um toque e pronto', Icon: CheckCircle2, cor: 'var(--rx-m-habitos)' },
  { id: 'counter', titulo: 'Contador', desc: 'Somar +1 até a meta', Icon: Hash, cor: 'var(--rx-m-agenda)' },
  { id: 'value', titulo: 'Valor', desc: 'Minutos, páginas, km…', Icon: Gauge, cor: 'var(--rx-m-foco)' }
];
const QUANDO = [['daily', 'Todo dia'], ['weekdays', 'Dias da semana'], ['times_per_week', 'Vezes por semana'], ['month_days', 'Dias do mês'], ['times_per_month', 'Vezes por mês'], ['custom', 'Intervalo']];
const UNIDADES = ['vezes', 'min', 'páginas', 'copos', 'km', 'ml', 'kcal', 'R$'];
const REPETIR = ['Nunca', 'Diário', 'Semanal', 'Quinzenal', 'Mensal'];
const PRIORIDADES = [['Alta', 'var(--rx-bad)'], ['Média', 'var(--rx-amber)'], ['Baixa', 'var(--rx-m-habitos)']];

const pad = (n) => String(n).padStart(2, '0');
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const alternar = (lista, v) => (lista.includes(v) ? (lista.length > 1 ? lista.filter((x) => x !== v) : lista) : [...lista, v]);

function estadoHabito(tags) {
  return {
    titulo: '', tipo: 'done', meta: 1, unidade: 'vez', periodo: 'day', quando: 'daily', dias: [1, 2, 3, 4, 5], vezesSemana: 3,
    diasMes: [1, 10, 20], vezesMes: 10, intervalo: 'every_x_days', aCada: 2, categoria: tags[0]?.name || 'Geral', sub: '',
    esforco: 'Médio', prioridade: 'Média'
  };
}
function estadoEvento(tags) {
  const hoje = hojeLocal();
  return {
    titulo: '', data: hoje, fim: hoje, inicio: '09:00', termino: '10:00', diaTodo: true, categoria: tags[0]?.name || 'Geral',
    local: '', notas: '', link: '', participantes: '', repetir: 'Nunca', repDias: [1, 2, 3, 4, 5], repFim: 'never', repAte: '',
    repVezes: 10, pular: [], novaPular: ''
  };
}

export function CriarModal({ isOpen, onClose, onAddHabit, onAddEvent, tags = [], onCreateCategory, initialMode = 'event' }) {
  const [modo, setModo] = useState(initialMode || 'event');
  const [h, setH] = useState(() => estadoHabito(tags));
  const [ev, setEv] = useState(() => estadoEvento(tags));
  const tituloRef = useRef(null);

  // Ao abrir: modo pedido e formulário limpo (como o modal antigo fazia ao abrir)
  const [aberto, setAberto] = useState(false);
  if (isOpen !== aberto) {
    setAberto(isOpen);
    if (isOpen) { setModo(initialMode || 'event'); setH(estadoHabito(tags)); setEv(estadoEvento(tags)); }
  }
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => tituloRef.current?.focus(), 0);
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', esc);
    return () => { clearTimeout(t); document.removeEventListener('keydown', esc); };
  }, [isOpen, modo, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const cats = tags.map((t, i) => ({ ...t, color: t.color || CORES_PADRAO[i % CORES_PADRAO.length], subclasses: t.subclasses || [] }));
  const catAtual = tags.find((t) => t.name === h.categoria) || tags[0];
  const temSub = Boolean(catAtual?.has_subclasses && Array.isArray(catAtual.subclasses) && catAtual.subclasses.length > 0);
  const ehHabito = modo === 'habit';
  const setHab = (p) => setH((s) => ({ ...s, ...p }));
  const setEvt = (p) => setEv((s) => ({ ...s, ...p }));

  const escolherTipo = (tipo) => {
    if (tipo === 'done') setHab({ tipo, meta: 1, unidade: 'vez' });
    else if (tipo === 'counter') setHab({ tipo, meta: h.meta < 2 ? 3 : h.meta, unidade: 'vezes' });
    else setHab({ tipo, meta: h.meta < 10 ? 30 : h.meta, unidade: 'min' });
  };
  const escolherQuando = (q) => {
    // Mesmo modelo do modal antigo: frequências dentro de "Ao dia" (periodType 'day'); intervalo é 'custom'
    setHab({ quando: q, periodo: q === 'custom' ? 'custom' : 'day' });
  };

  const criarHabito = (e) => {
    e.preventDefault();
    if (!h.titulo.trim()) return;
    const sub = temSub && h.sub ? catAtual.subclasses.find((s) => s.name === h.sub) : null;
    let repeatDays = h.dias;
    if (h.periodo === 'day' && h.quando === 'daily') repeatDays = [0, 1, 2, 3, 4, 5, 6];
    const dayFrequency = h.periodo === 'day' ? h.quando : 'daily';
    onAddHabit?.({
      id: `hab_${Date.now()}`,
      title: h.titulo.trim(),
      category: h.categoria,
      subclassId: sub?.id || null,
      subclassName: sub?.name || (h.sub || null),
      iconName: 'CheckCircle2',
      target: Math.max(1, Number(h.meta) || 1),
      current: 0,
      unit: String(h.unidade || '').trim() || (h.tipo === 'counter' ? 'vezes' : h.tipo === 'value' ? 'min' : 'vez'),
      effort: h.esforco,
      priority: h.prioridade,
      tagId: catAtual?.id || 'tag_geral',
      repeatDays,
      completed: false,
      completionStyle: h.tipo === 'counter' ? 'increment' : h.tipo === 'value' ? 'numeric' : 'quick',
      trackingType: h.tipo,
      periodType: h.periodo,
      periodConfig: {
        dayFrequency,
        selectedDays: repeatDays,
        timesPerWeek: Number(h.vezesSemana) || 3,
        selectedMonthDays: h.diasMes,
        timesPerMonth: Number(h.vezesMes) || 10,
        customIntervalType: h.intervalo,
        customIntervalDays: Number(h.aCada) || 2
      }
    });
    onClose?.();
  };

  const criarEvento = (e) => {
    e.preventDefault();
    if (!ev.titulo.trim() || !ev.data) return;
    onAddEvent?.({
      id: `ev_${Date.now()}`,
      title: ev.titulo.trim(),
      date: ev.data,
      endDate: ev.fim && ev.fim >= ev.data ? ev.fim : ev.data,
      allDay: ev.diaTodo,
      startTime: ev.diaTodo ? '00:00' : ev.inicio,
      endTime: ev.diaTodo ? '23:59' : ev.termino,
      category: ev.categoria,
      location: ev.local.trim(),
      description: ev.notas.trim(),
      repeat: ev.repetir,
      repeatConfig: {
        repeatDays: ev.repDias,
        repeatInterval: ev.repetir === 'Quinzenal' ? 2 : 1,
        repeatEndType: ev.repFim,
        repeatEndDate: ev.repAte,
        repeatCount: Number(ev.repVezes) || 10,
        blackoutDates: ev.pular
      },
      // Fora da tela (decisão do usuário): mesmos valores padrão que o modal antigo gravava
      reminders: [{ id: 'rem_1', time: '15 min antes', channel: 'app' }],
      bufferBefore: 0,
      bufferAfter: 0,
      isFloating: ev.diaTodo,
      energyLevel: 'deep_focus',
      meetingUrl: ev.link.trim(),
      visibility: 'private',
      conflictPolicy: 'allow',
      participantsText: ev.participantes.trim(),
      participants: [],
      completed: false
    });
    onClose?.();
  };

  const semCategorias = cats.length === 0 && (
    <div className="cr-note" role="note">
      <Info size={18} />
      <span>Você ainda não tem categorias. Este registro fica <b>sem categoria</b>.{onCreateCategory && <> <button type="button" className="rx-btn ghost tiny" onClick={onCreateCategory}>Criar categoria</button></>}</span>
    </div>
  );
  const chipsCategoria = (sel, onSel) => semCategorias || (
    <div className="cr-chips">
      {cats.map((c) => <button key={c.id || c.name} type="button" className="rx-chip" style={{ '--c': c.color }} aria-pressed={sel === c.name} onClick={() => onSel(c.name)}><span className="cr-dot" />{c.name}</button>)}
    </div>
  );
  const passo = (valor, onMenos, onMais, rotulo, cor) => (
    <div className="rx-stepper sm" style={{ '--c': cor }}>
      <button type="button" onClick={onMenos} aria-label={`Diminuir ${rotulo}`}><Minus size={16} /></button>
      <b>{valor}</b>
      <button type="button" className="plus" onClick={onMais} aria-label={`Aumentar ${rotulo}`}><Plus size={16} /></button>
    </div>
  );

  const resumoHabito = () => {
    const q = {
      daily: 'Todo dia', weekdays: DIAS.filter(([d]) => h.dias.includes(d)).map(([, l]) => l).join(', '), times_per_week: `${h.vezesSemana}x por semana`,
      month_days: `Dias ${[...h.diasMes].sort((a, b) => a - b).join(', ')} do mês`, times_per_month: `${h.vezesMes}x por mês`,
      custom: h.intervalo === 'every_x_days' ? `A cada ${h.aCada} dias` : h.intervalo === 'even_days' ? 'Dias pares' : 'Dias ímpares'
    }[h.quando];
    return [q, h.tipo === 'done' ? '1 vez' : `${h.meta} ${h.unidade}`, cats.length ? `${h.categoria}${h.sub ? ` › ${h.sub}` : ''}` : null].filter(Boolean).join(' · ');
  };
  const pode = (ehHabito ? h.titulo : ev.titulo).trim().length > 0;

  return createPortal(
    <div className="cr-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <form className="cr" role="dialog" aria-modal="true" aria-labelledby="crTitulo" onSubmit={ehHabito ? criarHabito : criarEvento}>
        <div className="cr-head">
          <span className="rx-tile solid" style={{ '--c': ehHabito ? 'var(--rx-m-habitos)' : 'var(--rx-m-agenda)' }}>{ehHabito ? <CheckCircle2 size={19} /> : <CalendarIcon size={19} />}</span>
          <h2 id="crTitulo">{ehHabito ? 'Novo hábito' : 'Novo evento'}</h2>
          <div className="cr-seg" role="group" aria-label="O que criar">
            <button type="button" aria-pressed={ehHabito} onClick={() => setModo('habit')}>Hábito</button>
            <button type="button" aria-pressed={!ehHabito} onClick={() => setModo('event')}>Evento</button>
          </div>
          <button type="button" className="rx-icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="cr-body">
          {ehHabito ? (<>
            <input ref={tituloRef} className="cr-title" aria-label="Nome do hábito" placeholder="O que você quer fazer? Ex.: Ler 20 páginas" maxLength={120} value={h.titulo} onChange={(e) => setHab({ titulo: e.target.value })} />

            <div>
              <p className="cr-l">Como você vai marcar</p>
              <div className="cr-cards">
                {TIPOS.map((t) => (
                  <button key={t.id} type="button" className="cr-card" style={{ '--c': t.cor }} aria-pressed={h.tipo === t.id} onClick={() => escolherTipo(t.id)}>
                    <span className="rx-tile solid"><t.Icon size={19} /></span>
                    <span><b>{t.titulo}</b><small>{t.desc}</small></span>
                  </button>
                ))}
              </div>
            </div>

            {h.tipo !== 'done' && (
              <div>
                <p className="cr-l">Meta <small>o que conta como feito</small></p>
                <div className="cr-row">
                  {passo(h.meta, () => setHab({ meta: Math.max(1, h.meta - 1) }), () => setHab({ meta: h.meta + 1 }), 'a meta', 'var(--rx-m-agenda)')}
                  <div className="cr-chips">
                    {UNIDADES.map((u) => <button key={u} type="button" className="rx-chip" aria-pressed={h.unidade === u} onClick={() => setHab({ unidade: u })}>{u}</button>)}
                  </div>
                  <input className="cr-in cr-unit" aria-label="Outra unidade" placeholder="outra" maxLength={20} value={UNIDADES.includes(h.unidade) ? '' : h.unidade} onChange={(e) => setHab({ unidade: e.target.value })} />
                </div>
              </div>
            )}

            <div>
              <p className="cr-l">Quando</p>
              <div className="cr-chips">{QUANDO.map(([k, l]) => <button key={k} type="button" className="rx-chip" aria-pressed={h.quando === k} onClick={() => escolherQuando(k)}>{l}</button>)}</div>
              {h.quando === 'weekdays' && <div className="cr-chips mt">{DIAS.map(([d, l]) => <button key={d} type="button" className="rx-chip cr-day" aria-pressed={h.dias.includes(d)} onClick={() => setHab({ dias: alternar(h.dias, d) })}>{l}</button>)}</div>}
              {h.quando === 'times_per_week' && <div className="cr-row mt">{passo(`${h.vezesSemana}x`, () => setHab({ vezesSemana: Math.max(1, h.vezesSemana - 1) }), () => setHab({ vezesSemana: Math.min(7, h.vezesSemana + 1) }), 'vezes por semana', 'var(--rx-m-habitos)')}<span className="cr-sub">por semana, em qualquer dia</span></div>}
              {h.quando === 'month_days' && <div className="cr-chips mt">{Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <button key={d} type="button" className="rx-chip cr-day" aria-pressed={h.diasMes.includes(d)} onClick={() => setHab({ diasMes: alternar(h.diasMes, d).sort((a, b) => a - b) })}>{d}</button>)}</div>}
              {h.quando === 'times_per_month' && <div className="cr-row mt">{passo(`${h.vezesMes}x`, () => setHab({ vezesMes: Math.max(1, h.vezesMes - 1) }), () => setHab({ vezesMes: Math.min(31, h.vezesMes + 1) }), 'vezes por mês', 'var(--rx-m-habitos)')}<span className="cr-sub">por mês</span></div>}
              {h.quando === 'custom' && (<>
                <div className="cr-chips mt">{[['every_x_days', 'A cada X dias'], ['even_days', 'Dias pares'], ['odd_days', 'Dias ímpares']].map(([k, l]) => <button key={k} type="button" className="rx-chip" aria-pressed={h.intervalo === k} onClick={() => setHab({ intervalo: k })}>{l}</button>)}</div>
                {h.intervalo === 'every_x_days' && <div className="cr-row mt"><span className="cr-sub">A cada</span><input className="cr-in cr-num" type="number" min="2" max="60" aria-label="Intervalo em dias" value={h.aCada} onChange={(e) => setHab({ aCada: Math.max(2, Number(e.target.value) || 2) })} /><span className="cr-sub">dias</span></div>}
              </>)}
            </div>

            <div>
              <p className="cr-l">Categoria</p>
              {chipsCategoria(h.categoria, (n) => setHab({ categoria: n, sub: '' }))}
              {temSub && cats.length > 0 && (
                <div className="cr-chips mt">
                  <button type="button" className="rx-chip" aria-pressed={!h.sub} onClick={() => setHab({ sub: '' })}>Geral</button>
                  {catAtual.subclasses.map((s) => <button key={s.id || s.name} type="button" className="rx-chip" aria-pressed={h.sub === s.name} onClick={() => setHab({ sub: s.name })}>{s.name}</button>)}
                </div>
              )}
            </div>

            <div className="cr-grid2">
              <div>
                <p className="cr-l">Prioridade</p>
                <div className="cr-chips">{PRIORIDADES.map(([p, c]) => <button key={p} type="button" className="rx-chip" style={{ '--c': c }} aria-pressed={h.prioridade === p} onClick={() => setHab({ prioridade: p })}><span className="cr-dot" />{p}</button>)}</div>
              </div>
              <div>
                <p className="cr-l">Esforço</p>
                <div className="cr-seg" role="group" aria-label="Esforço">{['Baixo', 'Médio', 'Alto'].map((x) => <button key={x} type="button" aria-pressed={h.esforco === x} onClick={() => setHab({ esforco: x })}>{x}</button>)}</div>
              </div>
            </div>
          </>) : (<>
            <input ref={tituloRef} className="cr-title" aria-label="Nome do evento" placeholder="Nome do compromisso. Ex.: Prova de Redes" maxLength={120} value={ev.titulo} onChange={(e) => setEvt({ titulo: e.target.value })} />

            <div className="cr-grid3">
              <label className="cr-field">Data<input className="cr-in" type="date" value={ev.data} onChange={(e) => setEvt({ data: e.target.value, fim: ev.fim < e.target.value ? e.target.value : ev.fim })} required /></label>
              {!ev.diaTodo && <label className="cr-field">Início<input className="cr-in" type="time" value={ev.inicio} onChange={(e) => setEvt({ inicio: e.target.value })} /></label>}
              {!ev.diaTodo && <label className="cr-field">Fim<input className="cr-in" type="time" value={ev.termino} onChange={(e) => setEvt({ termino: e.target.value })} /></label>}
            </div>
            <label className="cr-switch-row">
              <button type="button" className="cr-switch" role="switch" aria-checked={!ev.diaTodo} aria-label="Atribuir horário" onClick={() => setEvt({ diaTodo: !ev.diaTodo })}><i /></button>
              Atribuir horário
            </label>

            <div><p className="cr-l">Categoria</p>{chipsCategoria(ev.categoria, (n) => setEvt({ categoria: n }))}</div>

            <div>
              <p className="cr-l">Repetir</p>
              <div className="cr-chips">{REPETIR.map((r) => <button key={r} type="button" className="rx-chip" aria-pressed={ev.repetir === r} onClick={() => setEvt({ repetir: r })}>{r}</button>)}</div>
              {(ev.repetir === 'Semanal' || ev.repetir === 'Quinzenal') && <div className="cr-chips mt">{DIAS.map(([d, l]) => <button key={d} type="button" className="rx-chip cr-day" aria-pressed={ev.repDias.includes(d)} onClick={() => setEvt({ repDias: alternar(ev.repDias, d).sort((a, b) => a - b) })}>{l}</button>)}</div>}
              {ev.repetir !== 'Nunca' && (<>
                <div className="cr-chips mt">{[['never', 'Sem fim'], ['until_date', 'Até uma data'], ['count', 'Número de vezes']].map(([k, l]) => <button key={k} type="button" className="rx-chip" aria-pressed={ev.repFim === k} onClick={() => setEvt({ repFim: k })}>{l}</button>)}</div>
                {ev.repFim === 'until_date' && <input className="cr-in mt" type="date" aria-label="Repetir até" min={ev.data} value={ev.repAte} onChange={(e) => setEvt({ repAte: e.target.value })} />}
                {ev.repFim === 'count' && <div className="cr-row mt"><input className="cr-in cr-num" type="number" min="1" aria-label="Número de vezes" value={ev.repVezes} onChange={(e) => setEvt({ repVezes: Math.max(1, Number(e.target.value) || 1) })} /><span className="cr-sub">vezes</span></div>}
              </>)}
            </div>

            <label className="cr-field">Local <small>(opcional)</small><input className="cr-in" placeholder="Ex.: Sala 204, Prédio B" maxLength={160} value={ev.local} onChange={(e) => setEvt({ local: e.target.value })} /></label>

            <details className="cr-more">
              <summary><Plus size={18} />Mais detalhes<span className="cr-sub">notas, link, datas a pular, participantes</span><ChevronDown size={18} className="chev" /></summary>
              <div className="in">
                <label className="cr-field">Notas<textarea className="cr-in" placeholder="Pauta ou observações" maxLength={2000} value={ev.notas} onChange={(e) => setEvt({ notas: e.target.value })} /></label>
                <label className="cr-field">Link da reunião<input className="cr-in" placeholder="https://meet.google.com/…" maxLength={400} value={ev.link} onChange={(e) => setEvt({ link: e.target.value })} /></label>
                {ev.repetir !== 'Nunca' && (
                  <div>
                    <p className="cr-l">Pular datas <small>a repetição não acontece nesses dias</small></p>
                    <div className="cr-row">
                      <input className="cr-in" type="date" aria-label="Data a pular" value={ev.novaPular} onChange={(e) => setEvt({ novaPular: e.target.value })} />
                      <button type="button" className="rx-btn ghost tiny" disabled={!ev.novaPular} onClick={() => { if (!ev.pular.includes(ev.novaPular)) setEvt({ pular: [...ev.pular, ev.novaPular].sort(), novaPular: '' }); }}>Adicionar</button>
                    </div>
                    {ev.pular.length > 0 && <div className="cr-chips mt">{ev.pular.map((d) => <button key={d} type="button" className="rx-chip" aria-label={`Não pular ${d}`} onClick={() => setEvt({ pular: ev.pular.filter((x) => x !== d) })}>{d.split('-').reverse().join('/')} <X size={13} /></button>)}</div>}
                  </div>
                )}
                <label className="cr-field">Participantes <small>anotação sua; ninguém recebe convite</small><input className="cr-in" placeholder="Ex.: Ana, Bruno" maxLength={300} value={ev.participantes} onChange={(e) => setEvt({ participantes: e.target.value })} /></label>
                <label className="cr-field">Termina em outra data<input className="cr-in" type="date" min={ev.data} value={ev.fim} onChange={(e) => setEvt({ fim: e.target.value })} /></label>
              </div>
            </details>
          </>)}
        </div>

        <div className="cr-foot">
          <div className="cr-sum" aria-live="polite">
            <b>{(ehHabito ? h.titulo : ev.titulo).trim() || (ehHabito ? 'Novo hábito' : 'Novo evento')}</b>
            {ehHabito ? resumoHabito() : `${ev.diaTodo ? 'Dia inteiro' : `${ev.inicio} às ${ev.termino}`} · ${ev.repetir === 'Nunca' ? 'Não repete' : ev.repetir}`}
          </div>
          <button type="button" className="rx-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="rx-btn" disabled={!pode}><Check size={18} />{ehHabito ? 'Criar hábito' : 'Criar evento'}</button>
        </div>
      </form>
    </div>,
    document.body
  );
}
