import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Minus, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import '../../styles/espacos.css';
import '../../styles/telas.css';

/**
 * Hábitos e rotinas no visual atual do Ethos (lote 2 de 21/11/2026).
 * Mesmas props e as mesmas ações do HabitsTab antigo (que continua no código): marcar, contar (+1/−1),
 * somar valor (com atalhos), zerar, reabrir, excluir com desfazer, busca, filtros por situação, categoria,
 * tipo e período, seção de feitos recolhível, prioridade, subcategoria e esforço registrado na categoria.
 */
const trackOf = (h) => h.trackingType || (h.completionStyle === 'numeric' || h.completionStyle === 'increment' ? 'counter' : 'done');
const TYPE_LABEL = { done: 'Marcar', counter: 'Contar', value: 'Valor' };
const prioClass = (p) => (p === 'Alta' ? 'alta' : p === 'Baixa' ? 'baixa' : 'media');

export function periodoTexto(habit) {
  const p = habit.periodType || 'day';
  const c = habit.periodConfig || {};
  if (p === 'day') {
    const f = c.dayFrequency || 'daily';
    if (f === 'weekdays') return 'Dias da semana';
    if (f === 'times_per_week') return `${c.timesPerWeek || 3}x por semana`;
    if (f === 'month_days') return `${c.selectedMonthDays?.length || 3} dias no mês`;
    if (f === 'times_per_month') return `${c.timesPerMonth || 10}x por mês`;
    return 'Todo dia';
  }
  if (p === 'week') return `${habit.target} ${habit.unit} por semana`;
  if (p === 'month') return `${c.selectedMonthDays?.length || 'Alguns'} dias por mês`;
  if (p === 'custom') {
    if (c.customIntervalType === 'even_days') return 'Dias pares';
    if (c.customIntervalType === 'odd_days') return 'Dias ímpares';
    return `A cada ${c.customIntervalDays || 2} dias`;
  }
  return 'Todo dia';
}

export function HabitosTab({ habits = [], setHabits, tags = [], user = null, onOpenAddHabit, onLogSubclassEffort, showToast }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [tipo, setTipo] = useState('all');
  const [periodo, setPeriodo] = useState('all');
  const [status, setStatus] = useState('all');
  const [verFeitos, setVerFeitos] = useState(true);
  const [valor, setValor] = useState(null);
  const [quanto, setQuanto] = useState('');

  const save = async (habitId, patch) => {
    if (!user) return;
    try {
      await fetch(`/api/user/${user.id}/habit/${habitId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    } catch (err) { console.error('Erro ao atualizar hábito:', err); }
  };

  const toggle = async (habitId) => {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    const completed = !h.completed;
    const current = completed ? h.target : 0;
    setHabits((prev) => prev.map((x) => (x.id === habitId ? { ...x, completed, current } : x)));
    if (completed && h.subclassName && onLogSubclassEffort) onLogSubclassEffort(h.category, h.subclassName, 1);
    const antes = { current: h.current || 0, completed: Boolean(h.completed) };
    const desfazer = () => { setHabits((prev) => prev.map((x) => (x.id === habitId ? { ...x, ...antes } : x))); save(habitId, antes); };
    showToast?.(completed ? `${h.title} concluído.` : `${h.title} reaberto.`, desfazer);
    await save(habitId, { current, completed });
  };

  const step = async (habitId, delta) => {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    const current = Math.max(0, (h.current || 0) + delta);
    const completed = current >= h.target;
    setHabits((prev) => prev.map((x) => (x.id === habitId ? { ...x, current, completed } : x)));
    if (completed && !h.completed) {
      showToast?.(`Meta de ${h.title} atingida (${current}/${h.target} ${h.unit}).`);
      if (h.subclassName && onLogSubclassEffort) onLogSubclassEffort(h.category, h.subclassName, 1);
    }
    await save(habitId, { current, completed });
  };

  const somar = async (e) => {
    e.preventDefault();
    if (!valor) return;
    const add = parseFloat(String(quanto).replace(',', '.'));
    if (Number.isNaN(add) || add <= 0) return;
    const h = valor;
    const current = Number(((h.current || 0) + add).toFixed(2));
    const completed = current >= h.target;
    setHabits((prev) => prev.map((x) => (x.id === h.id ? { ...x, current, completed } : x)));
    setValor(null); setQuanto('');
    showToast?.(`+${add} ${h.unit} em ${h.title} (${current}/${h.target}).`);
    await save(h.id, { current, completed });
  };

  const zerar = async (habitId) => {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    setHabits((prev) => prev.map((x) => (x.id === habitId ? { ...x, current: 0, completed: false } : x)));
    showToast?.(`Progresso de ${h.title} zerado.`);
    await save(habitId, { current: 0, completed: false });
  };

  const excluir = async (habitId) => {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return;
    setHabits((prev) => prev.filter((x) => x.id !== habitId));
    showToast?.(`${h.title} excluído.`, () => setHabits((prev) => [h, ...prev]));
    if (user) {
      try { await fetch(`/api/user/${user.id}/habit/${habitId}`, { method: 'DELETE' }); } catch (err) { console.error('Erro ao excluir hábito:', err); }
    }
  };

  const total = habits.length;
  const feitos = habits.filter((h) => h.completed).length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const filtrados = habits.filter((h) => {
    const s = q.trim().toLowerCase();
    if (s && !`${h.title || ''} ${h.category || ''} ${h.subclassName || ''}`.toLowerCase().includes(s)) return false;
    if (cat !== 'all' && h.category !== cat) return false;
    if (tipo !== 'all' && trackOf(h) !== tipo) return false;
    if (periodo !== 'all' && (h.periodType || 'day') !== periodo) return false;
    if (status === 'pending' && h.completed) return false;
    if (status === 'completed' && !h.completed) return false;
    return true;
  });
  const pendentes = filtrados.filter((h) => !h.completed);
  const concluidos = filtrados.filter((h) => h.completed);
  const categorias = [...new Set(habits.map((h) => h.category).filter(Boolean))];
  const temFiltro = q || cat !== 'all' || tipo !== 'all' || periodo !== 'all' || status !== 'all';

  const linha = (h) => {
    const t = trackOf(h);
    const prog = h.target > 0 ? Math.min(100, Math.round(((h.current || 0) / h.target) * 100)) : 0;
    return (
      <div className={`hb-row ${h.completed ? 'done' : ''}`} key={h.id} data-testid="habito">
        {t === 'done' || h.completed
          ? <button type="button" className="rx-check" aria-pressed={Boolean(h.completed)} aria-label={`${h.completed ? 'Reabrir' : 'Concluir'} ${h.title}`} onClick={() => toggle(h.id)}><Check strokeWidth={2.6} /></button>
          : <span className="ring" style={{ '--p': prog }} aria-hidden="true"><span>{prog}%</span></span>}
        <div>
          <div className="t">{h.title}</div>
          <div className="m">
            {h.category && <span>{h.category}{h.subclassName ? `, ${h.subclassName}` : ''}</span>}
            <span>{periodoTexto(h)}</span>
            <span className={`prio ${prioClass(h.priority)}`}><i aria-hidden="true" />{h.priority || 'Média'}</span>
            {t !== 'done' && <span>{h.current || 0} de {h.target} {h.unit}</span>}
          </div>
        </div>
        <div className="hb-acts">
          {!h.completed && t === 'counter' && (
            <>
              <button type="button" className="step" aria-label={`Menos 1 em ${h.title}`} onClick={() => step(h.id, -1)}><Minus size={16} /></button>
              <span className="val">{h.current || 0}<small>de {h.target}</small></span>
              <button type="button" className="step" aria-label={`Mais 1 em ${h.title}`} onClick={() => step(h.id, 1)}><Plus size={16} /></button>
            </>
          )}
          {!h.completed && t === 'value' && <button type="button" className="rx-btn ghost tiny" onClick={() => { setValor(h); setQuanto(''); }}><Plus size={14} />Somar {h.unit}</button>}
          {h.completed && t !== 'done' && <button type="button" className="del" aria-label={`Zerar ${h.title}`} title="Zerar progresso" onClick={() => zerar(h.id)}><RotateCcw size={16} /></button>}
          <button type="button" className="del" aria-label={`Excluir ${h.title}`} title="Excluir" onClick={() => excluir(h.id)}><Trash2 size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="es">
      <div className="es-head">
        <div><h1>Hábitos e rotinas</h1><p>{total ? `${feitos} de ${total} feitos hoje.` : 'Nenhum hábito ainda.'}</p></div>
        <div className="acts"><button type="button" className="rx-btn" onClick={onOpenAddHabit}><Plus size={16} />Novo hábito</button></div>
      </div>
      <div className="es-grid">
        <article className="es-card">
          <div className="tl-tools">
            <input className="es-input" type="search" placeholder="Buscar por nome, categoria ou subcategoria" aria-label="Buscar hábito" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="tl-seg" role="group" aria-label="Situação">
              {[['all', 'Todos'], ['pending', 'Pendentes'], ['completed', 'Feitos']].map(([k, l]) => <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
            </div>
          </div>
          <div className="tl-tools">
            <select className="es-input" aria-label="Tipo de marcação" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="all">Todos os tipos</option><option value="done">Marcar</option><option value="counter">Contar</option><option value="value">Valor</option>
            </select>
            <select className="es-input" aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              <option value="all">Todos os períodos</option><option value="day">Diários</option><option value="week">Semanais</option><option value="month">Mensais</option><option value="custom">Personalizados</option>
            </select>
          </div>
          {categorias.length > 0 && (
            <div className="es-chips" role="group" aria-label="Categoria" style={{ marginBottom: 8 }}>
              <button type="button" className="es-chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Todas</button>
              {categorias.map((c) => {
                const tag = tags.find((t) => t.name === c);
                return <button key={c} type="button" className="es-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{tag?.color && <span className="rx-dot" style={{ '--rx-dot': tag.color }} aria-hidden="true" />}{c}</button>;
              })}
            </div>
          )}

          {total === 0 ? (
            <div className="es-empty"><h3>Nenhum hábito ainda</h3><p>Crie o primeiro: dá para marcar, contar ou registrar um valor.</p><button type="button" className="rx-btn" onClick={onOpenAddHabit}><Plus size={16} />Criar hábito</button></div>
          ) : filtrados.length === 0 ? (
            <div className="es-empty"><p>Nada com esses filtros.</p>{temFiltro && <button type="button" className="rx-btn ghost tiny" onClick={() => { setQ(''); setCat('all'); setTipo('all'); setPeriodo('all'); setStatus('all'); }}>Limpar filtros</button>}</div>
          ) : (
            <>
              {pendentes.map(linha)}
              {pendentes.length === 0 && status !== 'completed' && <p className="es-sub">Tudo feito por aqui.</p>}
              {concluidos.length > 0 && (
                <>
                  <button type="button" className="hb-fold" aria-expanded={verFeitos} onClick={() => setVerFeitos((v) => !v)}>
                    <span>Feitos hoje ({concluidos.length})</span>{verFeitos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {verFeitos && concluidos.map(linha)}
                </>
              )}
            </>
          )}
        </article>

        <aside className="rx-rail">
          <section className="summary">
            <h2>Hoje</h2>
            <div className="tl-big" style={{ marginTop: 12 }}>{pct}%<small> feito</small></div>
            <div className="rx-meter" style={{ marginTop: 12, maxWidth: 'none' }} role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos} aria-label="Hábitos feitos hoje"><div className={`rx-fill ${feitos ? '' : 'zero'}`} style={{ width: `${pct}%` }} /></div>
          </section>
          {categorias.length > 0 && (
            <section>
              <h2>Por categoria</h2>
              {categorias.map((c) => { const hs = habits.filter((h) => h.category === c); const d = hs.filter((h) => h.completed).length; return <div className="tl-cat" key={c}><span>{c}</span><span className="bar"><i style={{ width: `${(d / hs.length) * 100}%` }} /></span><span>{d}/{hs.length}</span></div>; })}
            </section>
          )}
          <section>
            <h2>Tipos</h2>
            <p className="rx-sub">{['done', 'counter', 'value'].map((k) => `${TYPE_LABEL[k]}: ${habits.filter((h) => trackOf(h) === k).length}`).join(', ')}.</p>
          </section>
        </aside>
      </div>

      {valor && (
        <div className="rx-overlay" onClick={() => setValor(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="hb-v-t" onClick={(e) => e.stopPropagation()} onSubmit={somar}>
            <h2 id="hb-v-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Somar em {valor.title}<button type="button" className="es-x" aria-label="Fechar" onClick={() => setValor(null)}><X size={18} /></button></h2>
            <p>Agora: {valor.current || 0} de {valor.target} {valor.unit}.</p>
            <div className="es-field"><label htmlFor="hb-v">Quanto ({valor.unit})</label><input id="hb-v" className="es-input" inputMode="decimal" autoFocus value={quanto} onChange={(e) => setQuanto(e.target.value)} /></div>
            <div className="es-chips" style={{ marginBottom: 14 }}>{[5, 10, 15, 25].map((v) => <button key={v} type="button" className="es-chip" onClick={() => setQuanto(String(v))}>+{v}</button>)}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setValor(null)}>Cancelar</button><button type="submit" className="rx-btn" disabled={!quanto}>Somar</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
