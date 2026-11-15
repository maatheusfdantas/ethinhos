import React, { useEffect, useRef } from 'react';

/**
 * Poeira flutuante: partículas pequenas, lentas e sem piscar.
 * Fica atrás do conteúdo (z-index -1, pointer-events none) e a máscara CSS da variante
 * a afasta do texto. Pausa fora da tela; com "reduzir movimento" fica estática.
 * O estado das partículas é guardado por `variant`, para não reiniciar a cada renderização.
 */
const STATE = {};
const TINTS = ['196,181,253', '196,181,253', '167,139,250', '96,165,250'];

function particles(key, n) {
  if (!STATE[key]) {
    STATE[key] = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 6, vy: -(3 + Math.random() * 7),
      a: 0.18 + Math.random() * 0.3, t: TINTS[Math.floor(Math.random() * TINTS.length)]
    }));
  }
  return STATE[key];
}

export function DustCanvas({ variant, count = 22 }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext('2d');
    if (!ctx) return undefined;
    const ps = particles(variant, count);
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, visible = true, raf = 0, last = performance.now();

    const fit = () => {
      const r = c.getBoundingClientRect();
      const d = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      c.width = Math.max(1, Math.round(w * d)); c.height = Math.max(1, Math.round(h * d));
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const edge = Math.max(0, Math.min(1, (p.y * h) / 28, ((1 - p.y) * h) / 28));
        const alpha = p.a * edge;
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.t},${(alpha * 0.12).toFixed(3)})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.t},${alpha.toFixed(3)})`; ctx.fill();
      }
    };

    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { fit(); if (still) draw(); }) : null;
    ro?.observe(c);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }) : null;
    io?.observe(c);

    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (visible && w > 0 && h > 0) {
        for (const p of ps) {
          p.x += (p.vx * dt) / w; p.y += (p.vy * dt) / h;
          if (p.y < 0) { p.y = 1; p.x = Math.random(); }
          if (p.x < 0) p.x += 1; else if (p.x > 1) p.x -= 1;
        }
        draw();
      }
      raf = requestAnimationFrame(frame);
    };
    if (still) draw(); else raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); };
  }, [variant, count]);

  return <canvas ref={ref} className={`rx-dust ${variant}`} aria-hidden="true" />;
}

export default DustCanvas;
