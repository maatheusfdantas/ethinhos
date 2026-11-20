import React, { useState } from 'react';
import { aggregateMuscles, BACK, FRONT, MUSCLES } from './musculos';
import '../../styles/treino.css';

const SIL = (
  <>
    <circle className="sil" cx="60" cy="17" r="11" />
    <rect className="sil" x="54" y="27" width="12" height="9" rx="3" />
    <rect className="sil" x="31" y="36" width="58" height="102" rx="16" />
    <rect className="sil" x="13" y="42" width="17" height="86" rx="8.5" />
    <rect className="sil" x="90" y="42" width="17" height="86" rx="8.5" />
    <rect className="sil" x="36" y="132" width="23" height="122" rx="11" />
    <rect className="sil" x="61" y="132" width="23" height="122" rx="11" />
  </>
);

function Region({ r, lv, active, interactive, onPick }) {
  const [k, kind] = r;
  const props = {
    className: `r l${lv}${active ? ' hl' : ''}`,
    ...(interactive ? {
      tabIndex: 0, role: 'button', 'data-m': k,
      'aria-label': `${MUSCLES[k]}: ${lv === 2 ? 'principal' : lv === 1 ? 'secundário' : 'não trabalhado'}`,
      onMouseEnter: () => onPick(k), onFocus: () => onPick(k), onClick: () => onPick(k),
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(k); } }
    } : {})
  };
  if (kind === 'e') return <ellipse {...props} cx={r[2]} cy={r[3]} rx={r[4]} ry={r[5]} />;
  if (kind === 'r') return <rect {...props} x={r[2]} y={r[3]} width={r[4]} height={r[5]} rx="6" />;
  return <polygon {...props} points={r[2]} />;
}

function Corpo({ agg, side, hover, interactive, onPick, label }) {
  const regions = side === 'front' ? FRONT : BACK;
  return (
    <figure>
      <svg viewBox="0 0 120 262" aria-label={label}>
        {SIL}
        {regions.map((r, i) => <Region key={`${r[0]}-${i}`} r={r} lv={agg[r[0]]?.lv || 0} active={hover === r[0]} interactive={interactive} onPick={onPick} />)}
      </svg>
      <figcaption>{side === 'front' ? 'Frente' : 'Costas'}</figcaption>
    </figure>
  );
}

/**
 * Mapa corporal da ficha: ênfase estimada a partir dos exercícios (não é medição).
 * `exercises`: [{ id, name, primary, secondary }]. Principal prevalece sobre secundário.
 * Sem depender de cor: secundário tem borda tracejada, e as listas em texto repetem a informação.
 */
export function MapaCorporal({ exercises = [], semMusculos = 0 }) {
  const [hover, setHover] = useState(null);
  const agg = aggregateMuscles(exercises);
  const prim = Object.keys(agg).filter((k) => agg[k].lv === 2).map((k) => MUSCLES[k]);
  const sec = Object.keys(agg).filter((k) => agg[k].lv === 1).map((k) => MUSCLES[k]);
  const h = hover && agg[hover];
  return (
    <section className="bm-box" data-testid="mapa-corporal">
      <h3>Músculos trabalhados nesta ficha</h3>
      <p className="tr-sub">Ênfase estimada a partir dos exercícios. Não é medição do corpo.</p>
      <div className="bm">
        <Corpo agg={agg} side="front" hover={hover} interactive onPick={setHover} label="Frente do corpo" />
        <Corpo agg={agg} side="back" hover={hover} interactive onPick={setHover} label="Costas" />
      </div>
      <div className="bm-legend"><span><i className="k2" />Principal</span><span><i className="k1" />Secundário (tracejado)</span><span><i className="k0" />Não trabalhado</span></div>
      <div className="bm-tip" aria-live="polite">
        {!hover ? 'Toque ou passe o mouse num músculo para ver os exercícios relacionados.' : h ? (
          <><b>{MUSCLES[hover]}</b>: {h.lv === 2 ? 'principal' : 'secundário'} nesta ficha.<br />{h.ex.map((x) => `${x.name} (${x.lv === 2 ? 'principal' : 'secundário'})`).join(', ')}</>
        ) : <><b>{MUSCLES[hover]}</b>: nenhum exercício desta ficha.</>}
      </div>
      <p className="tr-sub" style={{ marginTop: 10 }}><b>Principais:</b> {prim.length ? prim.join(', ') : 'nenhum'}.<br /><b>Secundários:</b> {sec.length ? sec.join(', ') : 'nenhum'}.</p>
      {semMusculos > 0 && <p className="tr-sub">{semMusculos === 1 ? '1 exercício está' : `${semMusculos} exercícios estão`} sem músculos definidos e fora do mapa.</p>}
    </section>
  );
}

/** "Foto" do exercício: o corpo com os músculos daquele exercício (decisão 3). */
export function CorpoExercicio({ exercise, thumb = false }) {
  const agg = aggregateMuscles(exercise ? [exercise] : []);
  if (thumb) {
    const backOnly = (exercise?.primary || []).length > 0 && exercise.primary.every((k) => BACK.some((b) => b[0] === k) && !FRONT.some((f) => f[0] === k));
    const regions = backOnly ? BACK : FRONT;
    return (
      <svg className="bm-mini" viewBox="0 0 120 262" width="30" height="40" aria-hidden="true">
        {SIL}
        {regions.map((r, i) => <Region key={i} r={r} lv={agg[r[0]]?.lv || 0} />)}
      </svg>
    );
  }
  return (
    <div className="bm" role="img" aria-label={`Músculos de ${exercise?.name || 'exercício'}. Principais: ${(exercise?.primary || []).map((k) => MUSCLES[k]).join(', ') || 'não definidos'}`}>
      <Corpo agg={agg} side="front" />
      <Corpo agg={agg} side="back" />
    </div>
  );
}
