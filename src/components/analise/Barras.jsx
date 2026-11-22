import React, { useState } from 'react';

/**
 * Gráfico de barras em SVG (proposta 15): uma série, um eixo, linha de meta opcional e dica ao passar
 * o mouse ou focar pelo teclado. Itens: { rotulo, v (número ou null = sem registro), dica: [título, detalhe] }.
 */
export function Barras({ itens, cor, max, meta, metaTexto, titulo, testId }) {
  const [ativo, setAtivo] = useState(null);
  const W = 560; const H = 190; const pl = 30; const pb = 24; const pt = 12;
  const n = itens.length || 1;
  // Sem máximo fixo, o topo é par (a marca do meio fica inteira: 0, 1, 2 em vez de 0, 1, 1).
  const topo = max || Math.max(2, Math.ceil(Math.max(0, ...itens.map((i) => i.v || 0)) / 2) * 2);
  const y = (v) => pt + (H - pt - pb) * (1 - Math.min(v, topo) / topo);
  const passo = (W - pl) / n;
  const bw = Math.min(36, Math.max(2, passo * 0.7));
  const marcas = [0, topo / 2, topo];
  const cadaRotulo = Math.ceil(n / 10);
  const a = ativo != null ? itens[ativo] : null;
  return (
    <div className="an-chart" data-testid={testId} onMouseLeave={() => setAtivo(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo}>
        <g className="grade">{marcas.map((t) => <line key={t} x1={pl} x2={W} y1={y(t)} y2={y(t)} />)}</g>
        <g className="eixo">
          {marcas.map((t) => <text key={t} x={pl - 6} y={y(t) + 4} textAnchor="end">{Math.round(t)}</text>)}
          {itens.map((it, i) => {
            const cx = pl + passo * i + passo / 2;
            const x = cx - bw / 2;
            const v = it.v || 0;
            const yy = y(v); const h = Math.max(0, H - pb - yy); const r = Math.min(4, bw / 2, h);
            const d = h > 0 ? `M${x},${H - pb}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + bw - r}Q${x + bw},${yy} ${x + bw},${yy + r}V${H - pb}Z` : '';
            return (
              <g key={i}>
                {d && <path className={`barra ${ativo === i ? 'on' : ''}`} d={d} fill={cor} />}
                {it.v == null && <line className="sem" x1={x} x2={x + bw} y1={H - pb - 1} y2={H - pb - 1} />}
                {i % cadaRotulo === 0 && <text x={cx} y={H - 6} textAnchor="middle">{it.rotulo}</text>}
                <rect className="alvo" x={pl + passo * i} y={pt} width={passo} height={H - pt} tabIndex={0}
                  aria-label={`${it.dica?.[0] || ''}, ${it.dica?.[1] || ''}`}
                  onMouseEnter={() => setAtivo(i)} onFocus={() => setAtivo(i)} onBlur={() => setAtivo(null)} />
              </g>
            );
          })}
        </g>
        {meta != null && meta > 0 && (
          <g className="meta"><line x1={pl} x2={W} y1={y(meta)} y2={y(meta)} /><text x={W} y={y(meta) - 6} textAnchor="end">{metaTexto}</text></g>
        )}
      </svg>
      {a && (
        <div className="an-tip" style={{ left: `${((pl + passo * ativo + passo / 2) / W) * 100}%` }} role="status">
          <b>{a.dica?.[0]}</b>{a.dica?.[1]}
        </div>
      )}
    </div>
  );
}
