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
  size = 360,
  className = '',
  children
}: LumoMascotProps) {
  const p = clamp(progress, 0, 100);

  // Intensidade cósmica proporcional ao progresso
  const energy = status === 'paused' ? 0.25 : p / 100;
  const coreScale = 0.8 + energy * 0.4;
  const coreOpacity = 0.6 + energy * 0.4;
  const glowScale = 0.8 + energy * 0.6;
  const ringOpacity = 0.3 + energy * 0.7;
  const shardOpacity = energy < 0.15 ? 0 : 0.35 + energy * 0.65;
  const trailOpacity = energy < 0.2 ? 0.2 : 0.4 + (energy - 0.2) * 0.75;
  const auraOpacity = 0.2 + energy * 0.7;

  // Camadas progressivas de foco
  const showInnerRing = p >= 15;
  const showShards = p >= 25;
  const showOuterRing = p >= 40;
  const showTrail = p >= 55;
  const showConstellation = p >= 80;

  // Circunferência da órbita principal (R = 126)
  const orbitRadius = 126;
  const orbitCircumference = 2 * Math.PI * orbitRadius;
  const progressOffset = orbitCircumference - (p / 100) * orbitCircumference;

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
      <svg viewBox="0 0 360 360" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Gradiente da aura e flare do Lumo */}
          <radialGradient id="lumoFlareGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="25%" stopColor="#7FE7FF" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#4F8DFF" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#7C5CFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </radialGradient>

          {/* Núcleo brilhante compacto */}
          <radialGradient id="lumoCoreGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="35%" stopColor="#E0F7FF" />
            <stop offset="70%" stopColor="#7FE7FF" />
            <stop offset="100%" stopColor="#4F8DFF" />
          </radialGradient>

          {/* Gradiente do rastro da órbita / cometa */}
          <linearGradient id="lumoTailGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0" />
            <stop offset="40%" stopColor="#4F8DFF" stopOpacity="0.35" />
            <stop offset="80%" stopColor="#7FE7FF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
          </linearGradient>

          {/* Gradiente de progresso circular (Padrão Ethos Roxo -> Azul) */}
          <linearGradient id="lumoProgressGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          {/* Gradiente de asteroides */}
          <linearGradient id="asteroidGrad1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B3558" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#211C38" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#120F24" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="asteroidGrad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4C3D6E" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#18152B" stopOpacity="0.4" />
          </linearGradient>

          {/* Filtros de blur cósmico */}
          <filter id="lumoBlurSmall" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="lumoBlurGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="lumoBlurNebula" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>

        {/* 1. Nebulosa cósmica de fundo */}
        <g className="lumo__cosmos">
          <circle
            className="lumo__nebula lumo__nebula--violet"
            cx="270"
            cy="90"
            r="80"
            fill="#7C5CFF"
            opacity="0.12"
            filter="url(#lumoBlurNebula)"
          />
          <circle
            className="lumo__nebula lumo__nebula--blue"
            cx="90"
            cy="270"
            r="85"
            fill="#38BDF8"
            opacity="0.09"
            filter="url(#lumoBlurNebula)"
          />

          {/* Micro-estrelas fixas no céu cósmico */}
          <circle cx="58" cy="84" r="1" fill="#FFFFFF" opacity="0.45" />
          <circle cx="92" cy="52" r="1.3" fill="#C4B5FD" opacity="0.6" />
          <circle cx="310" cy="74" r="1.2" fill="#7FE7FF" opacity="0.5" />
          <circle cx="328" cy="148" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <circle cx="42" cy="226" r="1.1" fill="#FFFFFF" opacity="0.5" />
          <circle cx="76" cy="312" r="1.4" fill="#C4B5FD" opacity="0.65" />
          <circle cx="294" cy="288" r="1" fill="#7FE7FF" opacity="0.45" />
          <circle cx="332" cy="242" r="1.2" fill="#FFFFFF" opacity="0.5" />
        </g>

        {/* 2. Asteroides flutuando / passando pelo espaço */}
        <g className="lumo__asteroids">
          {/* Asteroide 1 (superior direito) */}
          <g className="lumo__asteroid lumo__asteroid--1">
            <path
              d="M14 2 C18 6, 20 12, 17 18 C14 24, 7 26, 2 23 C-3 20, -4 14, -1 8 C2 2, 8 -1, 14 2 Z"
              fill="url(#asteroidGrad1)"
              stroke="rgba(167, 139, 250, 0.25)"
              strokeWidth="0.8"
            />
            {/* Crateras */}
            <circle cx="5" cy="10" r="1.8" fill="#120F24" opacity="0.7" />
            <circle cx="12" cy="15" r="1.2" fill="#120F24" opacity="0.6" />
          </g>

          {/* Asteroide 2 (inferior esquerdo) */}
          <g className="lumo__asteroid lumo__asteroid--2">
            <path
              d="M10 0 C15 3, 17 8, 14 13 C11 18, 5 19, 1 16 C-3 13, -3 7, 0 3 C3 0, 7 -2, 10 0 Z"
              fill="url(#asteroidGrad2)"
              stroke="rgba(127, 231, 255, 0.2)"
              strokeWidth="0.7"
            />
            <circle cx="5" cy="8" r="1.4" fill="#0C0A17" opacity="0.6" />
          </g>

          {/* Asteroide 3 (micro-rocha distante) */}
          <g className="lumo__asteroid lumo__asteroid--3">
            <path
              d="M6 1 C9 3, 10 7, 8 10 C6 13, 2 13, 0 11 C-2 9, -1 5, 1 3 C2 1, 4 0, 6 1 Z"
              fill="#26213B"
              opacity="0.45"
            />
          </g>
        </g>

        {/* 3. Estrelas cadentes cruzando o céu */}
        <g className="lumo__shooting-stars">
          <g className="lumo__shooting-star lumo__shooting-star--1">
            <line x1="0" y1="0" x2="-48" y2="-28" stroke="url(#lumoTailGrad)" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" filter="url(#lumoBlurSmall)" />
            <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
          </g>

          <g className="lumo__shooting-star lumo__shooting-star--2">
            <line x1="0" y1="0" x2="-36" y2="-22" stroke="url(#lumoTailGrad)" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="0" cy="0" r="1.8" fill="#FFFFFF" filter="url(#lumoBlurSmall)" />
            <circle cx="0" cy="0" r="1" fill="#FFFFFF" />
          </g>

          <g className="lumo__shooting-star lumo__shooting-star--3">
            <line x1="0" y1="0" x2="-54" y2="-32" stroke="url(#lumoTailGrad)" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="0" cy="0" r="2" fill="#FFFFFF" filter="url(#lumoBlurSmall)" />
            <circle cx="0" cy="0" r="1.1" fill="#FFFFFF" />
          </g>
        </g>

        {/* 4. Trilhas e anéis orbitais ao redor do timer central */}
        <g className="lumo__orbit-system">
          {/* Anel guia base (pontilhado suave cósmico) */}
          <circle
            cx="180"
            cy="180"
            r={orbitRadius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
            strokeDasharray="2 6"
          />

          {/* Barra de progresso circular real do foco */}
          <circle
            className="lumo__progress-arc"
            cx="180"
            cy="180"
            r={orbitRadius}
            fill="none"
            stroke="url(#lumoProgressGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={orbitCircumference}
            strokeDashoffset={progressOffset}
            transform="rotate(-90 180 180)"
          />

          {/* Anel interno secundário (>= 15%) */}
          <g className={`lumo__orbit lumo__orbit--inner ${showInnerRing ? 'is-visible' : ''}`}>
            <ellipse
              cx="180"
              cy="180"
              rx="106"
              ry="42"
              fill="none"
              stroke="rgba(167, 139, 250, 0.5)"
              strokeWidth="1.6"
              strokeDasharray="4 8"
              transform="rotate(-26 180 180)"
            />
          </g>

          {/* Anel externo secundário (>= 40%) */}
          <g className={`lumo__orbit lumo__orbit--outer ${showOuterRing ? 'is-visible' : ''}`}>
            <ellipse
              cx="180"
              cy="180"
              rx="148"
              ry="58"
              fill="none"
              stroke="rgba(56, 189, 248, 0.45)"
              strokeWidth="1.8"
              transform="rotate(34 180 180)"
            />
          </g>

          {/* Fragmentos orbitais dançantes (>= 25%) */}
          <g className={`lumo__shards ${showShards ? 'is-visible' : ''}`}>
            <g className="lumo__shard-orbit lumo__shard-orbit--1">
              <circle cx="180" cy="58" r="3.2" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
              <circle cx="180" cy="58" r="1.5" fill="#FFFFFF" />
            </g>
            <g className="lumo__shard-orbit lumo__shard-orbit--2">
              <circle cx="298" cy="180" r="2.8" fill="#C4B5FD" filter="url(#lumoBlurSmall)" />
              <circle cx="298" cy="180" r="1.2" fill="#FFFFFF" />
            </g>
            <g className="lumo__shard-orbit lumo__shard-orbit--3">
              <circle cx="180" cy="302" r="3" fill="#7FE7FF" filter="url(#lumoBlurSmall)" />
              <circle cx="180" cy="302" r="1.4" fill="#FFFFFF" />
            </g>
            <g className="lumo__shard-orbit lumo__shard-orbit--4">
              <circle cx="62" cy="180" r="2.6" fill="#C4B5FD" filter="url(#lumoBlurSmall)" />
              <circle cx="62" cy="180" r="1.1" fill="#FFFFFF" />
            </g>
          </g>

          {/* Constelação geométrica (>= 80%) */}
          <g className={`lumo__constellation ${showConstellation ? 'is-visible' : ''}`}>
            <path
              d="M98 116 L180 72 L262 116 L302 188 L180 274 L58 188 Z"
              stroke="#7FE7FF"
              strokeWidth="1"
              strokeLinejoin="round"
              opacity="0.35"
            />
            <circle cx="98" cy="116" r="2.2" fill="#7FE7FF" />
            <circle cx="180" cy="72" r="2.2" fill="#7FE7FF" />
            <circle cx="262" cy="116" r="2.2" fill="#7FE7FF" />
            <circle cx="302" cy="188" r="2.2" fill="#7FE7FF" />
            <circle cx="180" cy="274" r="2.2" fill="#7FE7FF" />
            <circle cx="58" cy="188" r="2.2" fill="#7FE7FF" />
          </g>
        </g>

        {/* 5. O Mascote Lumo Orbitando ao Redor do Timer com Flare Periódico */}
        <g className="lumo__orbital-carrier">
          {/* Rastro orbital luminoso do Lumo que se estende para trás */}
          <path
            className={`lumo__tail ${showTrail ? 'is-visible' : ''}`}
            d="M136 68 A126 126 0 0 1 180 54"
            fill="none"
            stroke="url(#lumoTailGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={trailOpacity}
          />

          {/* Entidade do Lumo situada exatamente sobre o raio da órbita (180, 54) */}
          <g className="lumo__sprite" transform="translate(180, 54)">
            {/* Aura periódica de flare (pulsa forte e volta ao normal) */}
            <circle
              className="lumo__flare"
              cx="0"
              cy="0"
              r="26"
              fill="url(#lumoFlareGrad)"
              filter="url(#lumoBlurGlow)"
            />

            {/* Núcleo cintilante do Lumo */}
            <g className="lumo__core-group">
              {/* Brilho imediato */}
              <circle
                className="lumo__core-glow"
                cx="0"
                cy="0"
                r="16"
                fill="#7FE7FF"
                opacity="0.75"
                filter="url(#lumoBlurSmall)"
              />
              {/* Corpo de plasma do mascote */}
              <circle
                className="lumo__core"
                cx="0"
                cy="0"
                r="10"
                fill="url(#lumoCoreGrad)"
              />
              {/* Ponto de consciência / brilho estelar */}
              <circle
                className="lumo__core-highlight"
                cx="-2.5"
                cy="-2.8"
                r="3.2"
                fill="#FFFFFF"
              />
              <circle
                cx="2.8"
                cy="2.5"
                r="1.4"
                fill="#FFFFFF"
                opacity="0.8"
              />
            </g>

            {/* Satélites de poeira do Lumo */}
            <circle
              className="lumo__spark lumo__spark--1"
              cx="12"
              cy="-6"
              r="1.6"
              fill="#FFFFFF"
            />
            <circle
              className="lumo__spark lumo__spark--2"
              cx="-10"
              cy="8"
              r="1.2"
              fill="#7FE7FF"
            />
          </g>
        </g>
      </svg>

      {/* Conteúdo central (Timer / Relógio) limpo, legível e desimpedido */}
      {children && (
        <div
          className="lumo__center-slot"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            zIndex: 10
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default LumoMascot;