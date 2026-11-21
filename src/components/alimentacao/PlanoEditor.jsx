import React, { useState } from 'react';
import { Plus, Repeat, X } from 'lucide-react';
import { blankMeal, blankOption, changeLayout, LAYOUT_LABEL, LAYOUTS, LIMITS } from './planoModel';
import '../../styles/alimentacao.css';

const UNITS = ['g', 'ml', 'unidade', 'unidades', 'fatia', 'fatias', 'colher de sopa', 'colher de chá', 'xícara', 'concha', 'porção', 'prato', 'copo', 'à vontade'];

/**
 * Editor estruturado do plano alimentar (prévia 04): divisão dos dias, refeições com horário,
 * opções, itens (quantidade, unidade, alimento) e substituições autorizadas.
 * Não guarda nada sozinho: quem usa decide quando salvar (o servidor valida tudo de novo).
 */
export function PlanoEditor({ value, onChange, idPrefix = 'ne' }) {
  const content = value?.days ? value : { layout: 'todos', notes: '', days: [{ key: 'todos', meals: [] }] };
  const groups = LAYOUTS[content.layout] || LAYOUTS.todos;
  const [gk, setGk] = useState(groups[0].key);
  const groupKey = groups.some((g) => g.key === gk) ? gk : groups[0].key;
  const day = content.days.find((d) => d.key === groupKey) || { key: groupKey, meals: [] };
  const meals = day.meals || [];

  const set = (fn) => {
    const next = JSON.parse(JSON.stringify(content));
    let d = next.days.find((x) => x.key === groupKey);
    if (!d) { d = { key: groupKey, meals: [] }; next.days.push(d); }
    fn(d.meals, next);
    onChange(next);
  };

  return (
    <div className="ne">
      <datalist id={`${idPrefix}-units`}>{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="es-field">
        <span className="lbl">Divisão dos dias</span>
        <div className="es-chips" role="group" aria-label="Divisão dos dias">
          {Object.keys(LAYOUTS).map((k) => (
            <button key={k} type="button" className="es-chip" aria-pressed={content.layout === k} onClick={() => { if (content.layout !== k) { onChange(changeLayout(content, k)); setGk(LAYOUTS[k][0].key); } }}>{LAYOUT_LABEL[k]}</button>
          ))}
        </div>
        <span className="es-sub" style={{ margin: 0 }}>Os dias novos copiam o primeiro cardápio.</span>
      </div>

      {groups.length > 1 && (
        <div className="es-tabs-row" role="group" aria-label="Grupo de dias">
          {groups.map((g) => <button key={g.key} type="button" aria-pressed={g.key === groupKey} onClick={() => setGk(g.key)}>{g.label}</button>)}
        </div>
      )}

      {meals.length === 0 && <div className="es-empty"><p>Nenhuma refeição em {groups.find((g) => g.key === groupKey)?.label.toLowerCase()} ainda.</p></div>}
      {meals.map((m, mi) => (
        <section className="ne-meal" key={m.key} aria-label={m.name || `Refeição ${mi + 1}`}>
          <div className="ne-meal-head">
            <input className="es-input t" type="time" aria-label={`Horário de ${m.name || 'refeição'}`} value={m.time || ''} onChange={(e) => set((ms) => { ms[mi].time = e.target.value; })} />
            <input className="es-input n" aria-label="Nome da refeição" placeholder="Ex.: Almoço" maxLength={60} value={m.name || ''} onChange={(e) => set((ms) => { ms[mi].name = e.target.value; })} />
            <button type="button" className="es-x" aria-label={`Tirar ${m.name || 'refeição'}`} onClick={() => set((ms) => { ms.splice(mi, 1); })}><X size={16} /></button>
          </div>
          {(m.options || []).map((o, oi) => (
            <div key={o.key}>
              <div className="ne-opt-label">
                {m.options.length > 1 ? (
                  <>
                    <input className="es-input" aria-label={`Nome da opção ${oi + 1} de ${m.name || 'refeição'}`} maxLength={60} value={o.name || ''} onChange={(e) => set((ms) => { ms[mi].options[oi].name = e.target.value; })} />
                    <button type="button" className="es-x" aria-label={`Tirar ${o.name || `opção ${oi + 1}`}`} onClick={() => set((ms) => { ms[mi].options.splice(oi, 1); if (ms[mi].options.length === 1) ms[mi].options[0].name = 'Opção única'; })}><X size={15} /></button>
                  </>
                ) : <span className="es-sub" style={{ margin: 0, fontWeight: 600 }}>Opção única</span>}
              </div>
              <div className="ne-items">
                {(o.items || []).map((it, ii) => (
                  <div className="ne-item" key={ii}>
                    <input className="es-input q" aria-label="Quantidade" placeholder="Qtd." maxLength={12} value={it.qty || ''} onChange={(e) => set((ms) => { ms[mi].options[oi].items[ii].qty = e.target.value; })} />
                    <input className="es-input u" aria-label="Unidade" placeholder="Unidade" list={`${idPrefix}-units`} maxLength={30} value={it.unit || ''} onChange={(e) => set((ms) => { ms[mi].options[oi].items[ii].unit = e.target.value; })} />
                    <input className="es-input f" aria-label="Alimento" placeholder="Alimento" maxLength={80} value={it.food || ''} onChange={(e) => set((ms) => { ms[mi].options[oi].items[ii].food = e.target.value; })} />
                    <button type="button" className="es-x x" aria-label="Tirar item" onClick={() => set((ms) => { ms[mi].options[oi].items.splice(ii, 1); })}><X size={15} /></button>
                  </div>
                ))}
              </div>
              {(o.subs || []).map((s, si) => (
                <div className="ne-sub" key={si}>
                  <Repeat size={15} />
                  <input className="es-input" aria-label="Substituição autorizada" placeholder="Ex.: pão integral por 4 colheres de sopa de tapioca" maxLength={140} value={s} onChange={(e) => set((ms) => { ms[mi].options[oi].subs[si] = e.target.value; })} />
                  <button type="button" className="es-x" aria-label="Tirar substituição" onClick={() => set((ms) => { ms[mi].options[oi].subs.splice(si, 1); })}><X size={15} /></button>
                </div>
              ))}
              <div className="ne-tools">
                <button type="button" className="rx-btn ghost tiny" disabled={(o.items || []).length >= LIMITS.items} onClick={() => set((ms) => { ms[mi].options[oi].items.push({ qty: '', unit: '', food: '' }); })}><Plus size={14} />Item</button>
                <button type="button" className="rx-btn ghost tiny" disabled={(o.subs || []).length >= LIMITS.subs} onClick={() => set((ms) => { ms[mi].options[oi].subs = [...(ms[mi].options[oi].subs || []), '']; })}><Repeat size={14} />Substituição</button>
                {oi === m.options.length - 1 && <button type="button" className="rx-btn ghost tiny" disabled={m.options.length >= LIMITS.options} onClick={() => set((ms) => { if (ms[mi].options.length === 1) ms[mi].options[0].name = 'Opção 1'; ms[mi].options.push(blankOption(`Opção ${ms[mi].options.length + 1}`)); })}><Plus size={14} />Opção</button>}
              </div>
            </div>
          ))}
        </section>
      ))}
      <button type="button" className="rx-btn ghost" style={{ marginTop: 10 }} disabled={meals.length >= LIMITS.meals} onClick={() => set((ms) => { ms.push(blankMeal('', '')); })}><Plus size={16} />Refeição</button>

      <div className="es-field" style={{ marginTop: 18 }}>
        <label htmlFor={`${idPrefix}-notes`}>Orientações gerais <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional, o paciente vê)</span></label>
        <textarea id={`${idPrefix}-notes`} className="es-input" style={{ height: 84, paddingTop: 10 }} maxLength={1000} value={content.notes || ''} onChange={(e) => onChange({ ...content, notes: e.target.value })} />
      </div>
    </div>
  );
}
