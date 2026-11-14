import React, { useEffect, useRef, useState } from 'react';

/**
 * Barra de progresso com gradiente violeta -> azul e ponto luminoso na ponta.
 * - Brilho curto percorre o preenchimento quando o valor AUMENTA.
 * - Pulso único quando o valor chega a 100.
 * - A largura é sempre o valor real (pct); o efeito nunca altera o número.
 */
export function ProgressMeter({ pct, label, size = 'meter' }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
  const prev = useRef(value);
  const [shine, setShine] = useState(false);
  const [goal, setGoal] = useState(false);

  useEffect(() => {
    const before = prev.current;
    prev.current = value;
    if (value > before) {
      setShine(false);
      requestAnimationFrame(() => setShine(true));
      if (before < 100 && value >= 100) {
        setGoal(false);
        requestAnimationFrame(() => setGoal(true));
      }
    }
  }, [value]);

  return (
    <div
      className={`rx-${size}${goal ? ' goal' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
      onAnimationEnd={(e) => { if (e.animationName === 'rxGoal') setGoal(false); }}
    >
      <div className={`rx-fill${value <= 0 ? ' zero' : ''}${shine ? ' shine-on' : ''}`} style={{ width: `${value}%` }}>
        <span className="rx-clip">
          <span className="rx-shine" onAnimationEnd={() => setShine(false)} />
        </span>
      </div>
    </div>
  );
}

export default ProgressMeter;
