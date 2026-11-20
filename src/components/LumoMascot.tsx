import React from 'react';
import './LumoMascot.css';

export type LumoStatus = 'idle' | 'focus' | 'completed' | 'paused';

export interface LumoMascotProps {
  /** 0 a 100 — progresso do Pomodoro atual */
  progress?: number;
  status?: LumoStatus;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function LumoMascot({
  progress = 0,
  status = 'focus',
  size = 280,
  className = '',
  children
}: LumoMascotProps) {
  const p = clamp(progress, 0, 100);

  // A intensidade cresce conforme o Pomodoro avança
  const energy = status === 'paused' ? 0.25 : p / 100;
  const coreScale = 0.72 + energy * 0.42;
  const coreOpacity = 0.55 + energy * 0.45;
  const glowScale = 0.7 + energy * 0.65;
  const ringOpacity = 0.25 + energy * 0.75;
  const shardOpacity = energy < 0.15 ? 0 : 0.35 + energy * 0.65;
  const trailOpacity = energy < 0.3 ? 0 : (energy - 0.3) * 1.25;
  const auraOpacity = 0.18 + energy * 0.72;

  // Aparecimento progressivo das camadas
  const showInnerRing = p >= 15;
  const showOuterRing = p >= 40;
  const showShards = p >= 25;
  const showTrail = p >= 55;
  const showConstellation = p >= 80;

  return (
    <div
      className={`lumo lumo--${status} ${className}`}
      style={
        {
          width: size,
          height: size,
          position: 'relative',
          '--lumo-core-scale': coreScale,
          '--lumo-core-opacity': coreOpacity,
          '--lumo-glow-scale': glowScale,
          '--lumo-ring-opacity': ringOpacity,
          '--lumo-shard-opacity': shardOpacity,
          '--lumo-trail-opacity': trailOpacity,
          '--lumo-aura-opacity': auraOpacity,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Lumo com ${Math.round(p)}% de energia de foco`}
    >
      <svg viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="lumoCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="18%" stopColor="#F4F8FF" />
            <stop offset="42%" stopColor="#7FE7FF" />
            <stop offset="72%" stopColor="#4F8DFF" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="lumoAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7FE7FF" stopOpacity="0.38" />
            <stop offset="45%" stopColor="#4F8DFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="lumoViolet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFF" />
            <stop offset="55%" stopColor="#7C5CFF" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="lumoBlue" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FE7FF" />
            <stop offset="55%" stopColor="#4F8DFF" />
            <stop offset="100%" stopColor="#4F8DFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="lumoTrail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7FE7FF" stopOpacity="0" />
            <stop offset="45%" stopColor="#7FE7FF" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <filter id="lumoBlurSmall" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          <filter id="lumoBlurLarge" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        {/* Aura externa */}
        <circle
          className="lumo__aura"
          cx="160"
          cy="160"
          r="118"
          fill="url(#lumoAura)"
          filter="url(#lumoBlurLarge)"
        />

        {/* Rastro orbital */}
        <g className="lumo__trail" opacity={trailOpacity}>
          <path
            d="M42 176 C 72 84, 186 44, 272 108"
            stroke="url(#lumoTrail)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M52 210 C 96 132, 204 92, 284 146"
            stroke="url(#lumoTrail)"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>

        {/* Anel interno */}
        <g className={`lumo__orbit lumo__orbit--inner ${showInnerRing ? 'is-visible' : ''}`}>
          <ellipse
            cx="160"
            cy="160"
            rx="94"
            ry="34"
            stroke="url(#lumoViolet)"
            strokeWidth="2.6"
            strokeLinecap="round"
            transform="rotate(-28 160 160)"
          />
        </g>

        {/* Anel externo */}
        <g className={`lumo__orbit lumo__orbit--outer ${showOuterRing ? 'is-visible' : ''}`}>
          <ellipse
            cx="160"
            cy="160"
            rx="122"
            ry="44"
            stroke="url(#lumoBlue)"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(34 160 160)"
          />
        </g>

        {/* Fragmentos orbitais */}
        <g className={`lumo__shards ${showShards ? 'is-visible' : ''}`}>
          <g className="lumo__shard-orbit lumo__shard-orbit--1">
            <circle cx="160" cy="52" r="4.2" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
            <circle cx="160" cy="52" r="1.8" fill="#FFFFFF" />
          </g>

          <g className="lumo__shard-orbit lumo__shard-orbit--2">
            <circle cx="268" cy="160" r="3.4" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
            <circle cx="268" cy="160" r="1.4" fill="#FFFFFF" />
          </g>

          <g className="lumo__shard-orbit lumo__shard-orbit--3">
            <circle cx="160" cy="268" r="3.8" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
            <circle cx="160" cy="268" r="1.6" fill="#FFFFFF" />
          </g>

          <g className="lumo__shard-orbit lumo__shard-orbit--4">
            <circle cx="52" cy="160" r="3" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
            <circle cx="52" cy="160" r="1.2" fill="#FFFFFF" />
          </g>
        </g>

        {/* Constelação final */}
        <g className={`lumo__constellation ${showConstellation ? 'is-visible' : ''}`}>
          <path
            d="M88 104 L160 60 L232 104 L268 176 L160 252 L52 176 Z"
            stroke="#7FE7FF"
            strokeWidth="1"
            strokeLinejoin="round"
            opacity="0.35"
          />
          <circle cx="88" cy="104" r="2.4" fill="#7FE7FF" />
          <circle cx="160" cy="60" r="2.4" fill="#7FE7FF" />
          <circle cx="232" cy="104" r="2.4" fill="#7FE7FF" />
          <circle cx="268" cy="176" r="2.4" fill="#7FE7FF" />
          <circle cx="160" cy="252" r="2.4" fill="#7FE7FF" />
          <circle cx="52" cy="176" r="2.4" fill="#7FE7FF" />
        </g>

        {/* Núcleo */}
        <g className="lumo__core-group">
          <circle
            className="lumo__core-glow"
            cx="160"
            cy="160"
            r="46"
            fill="url(#lumoAura)"
            filter="url(#lumoBlurLarge)"
          />
          <circle
            className="lumo__core"
            cx="160"
            cy="160"
            r="30"
            fill="url(#lumoCore)"
          />
          <circle
            className="lumo__core-highlight"
            cx="151"
            cy="150"
            r="8"
            fill="#FFFFFF"
          />
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
