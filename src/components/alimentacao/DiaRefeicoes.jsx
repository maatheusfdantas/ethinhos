import React, { useState } from 'react';
import { Repeat } from 'lucide-react';
import { itemText, LOG_STATUS, subsOf } from './planoModel';
import '../../styles/alimentacao.css';

const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Opções de uma refeição, com os itens e as substituições autorizadas. */
export function OpcoesRefeicao({ meal, single = false }) {
  return (
    <div className="al-opts" style={single ? { gridTemplateColumns: '1fr' } : undefined}>
      {(meal.options || []).map((o) => (
        <div className="al-opt" key={o.key}>
          <h4>{o.name}</h4>
          <ul>{(o.items || []).map((it, i) => <li key={i}>{itemText(it)}</li>)}</ul>
          {(o.subs || []).map((s) => <div className="al-subs" key={s}><Repeat size={14} /><span>Pode trocar: {s}</span></div>)}
        </div>
      ))}
    </div>
  );
}

/**
 * Linha do tempo das refeições do dia (mesma espinha do Painel). A refeição atual ou a próxima sem registro
 * aparece aberta, com as opções. Em `preview`, todas aparecem abertas e nada é registrado.
 */
export function DiaRefeicoes({ meals = [], registros = {}, isToday = false, podeRegistrar = false, preview = false, onRegistrar }) {
  const now = nowHHMM();
  const pending = meals.filter((m) => !registros[m.key]);
  const live = isToday ? (pending.find((m) => (m.time || '00:00') >= now) || pending[pending.length - 1]) : null;
  const done = meals.filter((m) => registros[m.key]).length;
  return (
    <ul className="rx-spine" style={{ marginTop: 18, '--lived': `${Math.max(0, done * 62 - 10)}px` }}>
      {meals.map((m) => {
        const lg = registros[m.key];
        const st = lg ? LOG_STATUS[lg.status] : null;
        const isLive = !preview && live?.key === m.key;
        const open = preview || isLive;
        const opt = lg ? (m.options || []).find((o) => o.key === lg.optionKey) : null;
        return (
          <li key={m.key} className={`rx-row ${lg ? 'done' : ''} ${isLive ? 'live' : ''}`} data-testid="al-refeicao">
            <div className="time">{m.time}</div>
            <div className="node" />
            <div className="body">
              <div className="title">{m.name}</div>
              <div className="rx-meta">
                {lg ? (
                  <>
                    <span className={`rx-pill ${st?.inPlan ? 'es-pill-on' : ''}`}>{st?.label || lg.status}</span>
                    <span>{[(m.options || []).length > 1 ? opt?.name : null, lg.substitution].filter(Boolean).join(', ')}</span>
                  </>
                ) : isLive ? (
                  <><span className="rx-pill now">Agora</span><span>{(m.options || []).length > 1 ? `${m.options.length} opções` : 'Opção única'}</span></>
                ) : <span>{(m.options || []).length > 1 ? `${m.options.length} opções` : 'Opção única'}{subsOf(m).length ? ', com substituição' : ''}</span>}
              </div>
              {open && <OpcoesRefeicao meal={m} single={preview} />}
            </div>
            <div className="rx-act">
              {!preview && podeRegistrar && (
                <button type="button" className={lg ? 'rx-btn ghost tiny' : isLive ? 'rx-btn tiny' : 'rx-btn ghost tiny'} onClick={() => onRegistrar?.(m)} aria-label={`${lg ? 'Editar registro de' : 'Registrar'} ${m.name}`}>{lg ? 'Editar' : 'Registrar'}</button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Diálogo "Como foi esta refeição?" (prévia 04): opção, situação, substituição e observação. */
export function RegistroDialog({ meal, log, proName, onClose, onSave, onDelete, busy }) {
  const subs = subsOf(meal);
  const [optionKey, setOptionKey] = useState(log?.optionKey || meal.options?.[0]?.key || null);
  const [status, setStatus] = useState(log?.status || 'conforme');
  const [substitution, setSubstitution] = useState(log?.substitution || subs[0] || '');
  const [note, setNote] = useState(log?.note || '');
  const statuses = Object.entries(LOG_STATUS).filter(([k]) => k !== 'alternativa' || subs.length);
  return (
    <div className="rx-overlay" onClick={onClose}>
      <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="al-reg-t" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); onSave({ status, optionKey: status === 'nao_realizada' ? null : optionKey, substitution: status === 'alternativa' ? substitution : null, note }); }}>
        <h2 id="al-reg-t">{meal.name}{meal.time ? `, ${meal.time}` : ''}</h2>
        <p>Como foi esta refeição?</p>
        {(meal.options || []).length > 1 && status !== 'nao_realizada' && (
          <div className="es-field"><span className="lbl">Opção</span>
            <div className="es-chips">{meal.options.map((o) => <button key={o.key} type="button" className="es-chip" aria-pressed={optionKey === o.key} onClick={() => setOptionKey(o.key)}>{o.name}</button>)}</div>
          </div>
        )}
        <div className="es-radio" role="radiogroup" aria-label="Situação">
          {statuses.map(([k, s]) => (
            <label key={k}><input type="radio" name="al-st" value={k} checked={status === k} onChange={() => setStatus(k)} /><span>{s.label}<small>{s.hint}</small></span></label>
          ))}
        </div>
        {status === 'alternativa' && subs.length > 0 && (
          <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="al-sub">Substituição usada</label>
            <select id="al-sub" className="es-input" value={substitution} onChange={(e) => setSubstitution(e.target.value)}>{subs.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        )}
        <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="al-note">Observação <span style={{ color: 'var(--rx-ink-3)', fontWeight: 450 }}>(opcional{proName ? `, ${proName} vê` : ''})</span></label>
          <textarea id="al-note" className="es-input" style={{ height: 70, paddingTop: 10 }} maxLength={280} placeholder="Ex.: troquei o feijão por lentilha" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {log && <button type="button" className="es-danger" disabled={busy} onClick={onDelete}>Apagar registro</button>}
          <button type="button" className="rx-btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="rx-btn" disabled={busy}>Salvar registro</button>
        </div>
      </form>
    </div>
  );
}
