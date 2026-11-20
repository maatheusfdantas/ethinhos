import React from 'react';
import './LumoMascot.css';

export type LumoStatus = 'focus' | 'completed' | 'paused';

export interface LumoMascotProps {
  status?: LumoStatus;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

export function LumoMascot({
  status = 'focus',
  size = 220,
  className = '',
  children
}: LumoMascotProps) {
  return (
    <div
      className={`lumo lumo--${status} ${className}`}
      style={{ width: size, height: size, position: 'relative' }}
      role="img"
      aria-label={`Mascote Lumo em estado ${status}`}
    >
      <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="lumo-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#F4F8FF" />
            <stop offset="70%" stopColor="#7FE7FF" />
            <stop offset="100%" stopColor="#4F8DFF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="lumo-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FE7FF" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#4F8DFF" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="lumo-ring-violet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7C5CFF" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="lumo-ring-blue" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F8DFF" />
            <stop offset="100%" stopColor="#4F8DFF" stopOpacity="0.15" />
          </linearGradient>

          <filter id="lumo-soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Aura externa */}
        <circle className="lumo__glow" cx="110" cy="110" r="78" fill="url(#lumo-glow)" />

        {/* Anel violeta — inclinado */}
        <g className="lumo__ring lumo__ring--violet">
          <ellipse
            cx="110"
            cy="110"
            rx="74"
            ry="28"
            stroke="url(#lumo-ring-violet)"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform="rotate(-24 110 110)"
          />
        </g>

        {/* Anel azul — inclinado no outro eixo */}
        <g className="lumo__ring lumo__ring--blue">
          <ellipse
            cx="110"
            cy="110"
            rx="58"
            ry="22"
            stroke="url(#lumo-ring-blue)"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(32 110 110)"
          />
        </g>

        {/* Fragmentos luminosos */}
        <g className="lumo__fragments" filter="url(#lumo-soft-glow)">
          <circle className="lumo__fragment lumo__fragment--1" cx="110" cy="36" r="3.4" fill="#7FE7FF" />
          <circle className="lumo__fragment lumo__fragment--2" cx="178" cy="112" r="2.8" fill="#7FE7FF" />
          <circle className="lumo__fragment lumo__fragment--3" cx="110" cy="184" r="3.2" fill="#7FE7FF" />
          <circle className="lumo__fragment lumo__fragment--4" cx="42" cy="112" r="2.6" fill="#7FE7FF" />
        </g>

        {/* Núcleo */}
        <g className="lumo__core-group">
          <circle className="lumo__core" cx="110" cy="110" r="26" fill="url(#lumo-core)" />
          <circle className="lumo__core-highlight" cx="104" cy="103" r="7" fill="#FFFFFF" opacity="0.85" />
        </g>
      </svg>

      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            zIndex: 2
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default LumoMascot;
