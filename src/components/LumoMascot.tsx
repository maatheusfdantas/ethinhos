import React, {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import './LumoMascot.css';

export type LumoStatus = 'idle' | 'focus' | 'completed' | 'paused';

export interface LumoMascotProps {
  /** Progresso da sessão: 0 a 100. */
  progress?: number;
  status?: LumoStatus;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}

const clamp = (n: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, n));

function smoothstep(start: number, end: number, value: number) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

const PLATES = [
  {
    angle: -48,
    threshold: 0.18,
    path: 'M-26-76 Q0-103 26-76 L18-57 Q0-69-18-57Z',
  },
  {
    angle: 48,
    threshold: 0.3,
    path: 'M-23-76 Q0-99 23-76 L17-56 Q0-67-17-56Z',
  },
  {
    angle: 138,
    threshold: 0.44,
    path: 'M-23-76 Q0-96 23-76 L16-58 Q0-68-16-58Z',
  },
  {
    angle: 222,
    threshold: 0.56,
    path: 'M-26-76 Q0-101 26-76 L18-57 Q0-69-18-57Z',
  },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);

    update();
    media.addEventListener?.('change', update);

    return () => media.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

export function LumoMascot({
  progress = 0,
  status = 'focus',
  size = 360,
  className = '',
  children,
}: LumoMascotProps) {
  const uid = useId().replace(/:/g, '');
  const id = (name: string) => `lumo-${uid}-${name}`;
  const paint = (name: string) => `url(#${id(name)})`;

  const reducedMotion = useReducedMotion();
  const safeProgress = Number.isFinite(progress) ? progress : 0;
  const targetProgress =
    status === 'completed' ? 1 : clamp(safeProgress / 100);

  const getSpeedAndLight = (s: LumoStatus) => {
    if (s === 'paused') return { speed: 0.12, light: 0.48 };
    if (s === 'completed') return { speed: 1.2, light: 1.2 };
    if (s === 'idle') return { speed: 0.35, light: 0.65 };
    return { speed: 1, light: 1 };
  };

  const initialProps = getSpeedAndLight(status);

  const target = useRef({
    progress: targetProgress,
    speed: initialProps.speed,
    light: initialProps.light,
  });

  const initial = {
    progress: targetProgress,
    speed: initialProps.speed,
    light: initialProps.light,
    phase: 0,
  };

  const simulation = useRef(initial);
  const [frame, setFrame] = useState(initial);
  const [burst, setBurst] = useState(0);
  const previousStatus = useRef(status);

  useEffect(() => {
    const nextVals = getSpeedAndLight(status);
    target.current = {
      progress: targetProgress,
      speed: nextVals.speed,
      light: nextVals.light,
    };
  }, [targetProgress, status]);

  useEffect(() => {
    if (
      status === 'completed' &&
      previousStatus.current !== 'completed'
    ) {
      setBurst((value) => value + 1);
    }

    previousStatus.current = status;
  }, [status]);

  useEffect(() => {
    if (reducedMotion) {
      const nextLight = status === 'paused' ? 0.48 : status === 'idle' ? 0.65 : 1;
      const next = {
        ...simulation.current,
        progress: targetProgress,
        light: nextLight,
      };

      simulation.current = next;
      setFrame(next);
      return;
    }

    let request = 0;
    let previousTime: number | undefined;

    const animate = (time: number) => {
      const dt =
        previousTime === undefined
          ? 0
          : Math.min((time - previousTime) / 1000, 0.05);

      previousTime = time;

      const current = simulation.current;
      const desired = target.current;
      const blend = 1 - Math.exp(-dt * 3.5);

      const p =
        current.progress + (desired.progress - current.progress) * blend;

      const speed =
        current.speed + (desired.speed - current.speed) * blend;

      const light =
        current.light + (desired.light - current.light) * blend;

      const next = {
        progress: p,
        speed,
        light,
        phase: current.phase + dt * speed * (0.65 + p * 0.55),
      };

      simulation.current = next;
      setFrame(next);
      request = requestAnimationFrame(animate);
    };

    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [reducedMotion, targetProgress, status]);

  const p = frame.progress;
  const t = frame.phase;
  const movement = reducedMotion ? 0 : 1;
  const opening = smoothstep(0.12, 0.92, p);
  const orbit = smoothstep(0.4, 0.87, p);
  const detail = smoothstep(0.7, 1, p);

  const floatingY = Math.sin(t * 1.1) * 5 * movement;
  const tilt = Math.sin(t * 0.67) * 3 * movement;
  const bodyScale = 0.83 + p * 0.17;
  const breath = 1 + Math.sin(t * 2.4) * 0.025 * movement;
  const coreScale =
    (0.67 + opening * 0.43) * (status === 'paused' ? 0.88 : 1);

  const label =
    status === 'completed'
      ? 'Lumo: sessão concluída'
      : status === 'paused'
        ? `Lumo em pausa, ${Math.round(safeProgress)}% da sessão`
        : status === 'idle'
          ? `Lumo em espera, ${Math.round(safeProgress)}% da sessão`
          : `Lumo em foco, ${Math.round(safeProgress)}% da sessão`;

  return (
    <div
      className={`lumo-mascot ${className}`}
      data-status={status}
      style={{ '--lumo-size': `${size}px` } as CSSProperties}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Corpo: base clara, sombra violeta e luz superior. */}
          <radialGradient
            id={id('pearl')}
            cx="30%"
            cy="20%"
            r="86%"
          >
            <stop offset="0" stopColor="#FCFEFF" />
            <stop offset=".32" stopColor="#DEE7F6" />
            <stop offset=".62" stopColor="#AAB7DA" />
            <stop offset=".84" stopColor="#767CA9" />
            <stop offset="1" stopColor="#45446E" />
          </radialGradient>

          <linearGradient
            id={id('rim')}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stopColor="#B9FAFF" />
            <stop offset=".3" stopColor="#EFF8FF" />
            <stop offset=".58" stopColor="#B1A0FF" />
            <stop offset=".8" stopColor="#EBA6EE" />
            <stop offset="1" stopColor="#FFDBAE" />
          </linearGradient>

          <radialGradient id={id('cyan-reflection')}>
            <stop stopColor="#7FE7FF" stopOpacity=".9" />
            <stop offset="1" stopColor="#7FE7FF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id('pink-reflection')}>
            <stop stopColor="#E5A0FF" stopOpacity=".95" />
            <stop offset="1" stopColor="#E5A0FF" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={id('aura')}>
            <stop stopColor="#8AEFFF" stopOpacity=".3" />
            <stop offset=".45" stopColor="#7755FF" stopOpacity=".2" />
            <stop offset="1" stopColor="#7755FF" stopOpacity="0" />
          </radialGradient>

          <linearGradient
            id={id('cavity')}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stopColor="#080D24" />
            <stop offset=".65" stopColor="#24234C" />
            <stop offset="1" stopColor="#48436D" />
          </linearGradient>

          <linearGradient
            id={id('energy')}
            x1="0"
            y1="0"
            x2=".8"
            y2="1"
          >
            <stop stopColor="#EEFFFF" />
            <stop offset=".28" stopColor="#7FE7FF" />
            <stop offset=".65" stopColor="#6394FF" />
            <stop offset="1" stopColor="#A85AFF" />
          </linearGradient>

          <linearGradient
            id={id('orbit')}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop stopColor="#7FE7FF" stopOpacity="0" />
            <stop offset=".38" stopColor="#7FE7FF" />
            <stop offset=".7" stopColor="#8A70FF" />
            <stop offset="1" stopColor="#D8A6FF" stopOpacity=".1" />
          </linearGradient>

          <filter
            id={id('glow')}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id={id('soft')}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="8" />
          </filter>

          <filter
            id={id('shadow')}
            x="-50%"
            y="-50%"
            width="200%"
            height="220%"
          >
            <feDropShadow
              dx="0"
              dy="9"
              stdDeviation="8"
              floodColor="#030619"
              floodOpacity=".55"
            />
          </filter>

          <path
            id={id('body')}
            d="
              M-8-83
              C37-91 78-58 83-13
              C90 36 57 78 12 84
              C-32 91-77 67-83 22
              C-91-27-57-74-8-83Z
            "
          />

          <clipPath id={id('body-clip')}>
            <use href={`#${id('body')}`} />
          </clipPath>
        </defs>

        {/* Halo de fundo : jamais de rectangle opaque. */}
        <circle
          cx="200"
          cy="195"
          r={95 + opening * 60}
          fill={paint('aura')}
          opacity={(0.38 + p * 0.62) * frame.light}
        />

        {/* Sombra para ancorar a sensação de flutuação. */}
        <ellipse
          cx="200"
          cy="326"
          rx={48 + p * 19 - floatingY * 0.35}
          ry="8"
          fill="#030619"
          opacity=".42"
          filter={paint('soft')}
        />

        <g transform={`translate(200 ${194 + floatingY}) rotate(${tilt})`}>
          {/* Órbita posterior. */}
          <g
            opacity={orbit * 0.75 * frame.light}
            transform={`rotate(${t * 9})`}
          >
            <ellipse
              rx={110 + opening * 15}
              ry="45"
              transform="rotate(-28)"
              stroke={paint('orbit')}
              strokeWidth="1.5"
            />
            <ellipse
              rx="108"
              ry="42"
              transform="rotate(55)"
              stroke={paint('orbit')}
              strokeWidth=".7"
              strokeDasharray="3 12"
              opacity=".55"
            />
          </g>

          <g transform={`scale(${bodyScale})`}>
            {/* Placas: surgem junto ao corpo e se afastam. */}
            {PLATES.map((plate, index) => {
              const growth = smoothstep(plate.threshold, 0.98, p);
              const drift =
                Math.sin(t * 1.25 + index * 1.7) *
                growth *
                3 *
                movement;

              const rotation =
                plate.angle +
                Math.sin(t * 0.55 + index) *
                  growth *
                  5 *
                  movement;

              return (
                <g
                  key={plate.angle}
                  transform={`rotate(${rotation})`}
                  opacity={growth}
                >
                  <g
                    transform={`translate(0 ${-growth * 37 + drift})`}
                    filter={paint('shadow')}
                  >
                    <path
                      d={plate.path}
                      fill={paint('pearl')}
                      stroke={paint('rim')}
                      strokeWidth="1.4"
                    />
                    <path
                      d="M-13-72 Q0-80 13-72"
                      stroke="#F4FBFF"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      opacity=".8"
                    />
                    <path
                      d="M-9-61 Q0-65 9-61"
                      stroke="#7FE7FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity={growth * frame.light}
                      filter={paint('glow')}
                    />
                  </g>
                </g>
              );
            })}

            {/* Corpo principal. */}
            <g filter={paint('shadow')}>
              <use
                href={`#${id('body')}`}
                fill={paint('pearl')}
                stroke={paint('rim')}
                strokeWidth="2"
              />

              <g clipPath={paint('body-clip')}>
                <ellipse
                  cx="-58"
                  cy="-32"
                  rx="46"
                  ry="72"
                  fill={paint('cyan-reflection')}
                  opacity=".6"
                />
                <ellipse
                  cx="70"
                  cy="14"
                  rx="44"
                  ry="86"
                  fill={paint('pink-reflection')}
                  opacity=".85"
                />

                <path
                  d="M-65-40 Q-43-76-4-72"
                  stroke="#FFFFFF"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity=".4"
                  filter={paint('soft')}
                />

                <path
                  d="M-57 51 Q-12 89 49 49"
                  stroke="#5B5793"
                  strokeWidth="15"
                  opacity=".25"
                  filter={paint('soft')}
                />
              </g>

              {/* Fenda central: a assinatura do Lumo. */}
              <g transform={`rotate(-16) scale(${0.68 + opening * 0.32} 1)`}>
                <path
                  d="
                    M0-55
                    C25-40 36-16 31 8
                    C27 33 12 47 0 58
                    C-20 43-34 21-31-5
                    C-29-27-16-45 0-55Z
                  "
                  fill={paint('cavity')}
                  stroke="#A4ACD8"
                  strokeWidth="2.5"
                />

                <path
                  d="M-23 20 Q-12 46 0 53 Q20 36 25 14"
                  stroke="#E3BDFF"
                  strokeWidth="1.4"
                  opacity=".7"
                />

                {/* Energia interna: fina no início, ampla no fim. */}
                <g
                  opacity={frame.light}
                  transform={`scale(${coreScale * breath})`}
                  className="lumo-mascot__energy"
                >
                  <path
                    d="
                      M0-42
                      C12-24 15-8 12 8
                      C10 23 4 34 0 42
                      C-12 26-17 10-13-8
                      C-11-23-5-35 0-42Z
                    "
                    fill={paint('energy')}
                    filter={paint('glow')}
                  />
                  <path
                    d="M0-29 Q-5-4 0 20"
                    stroke="#F3FFFF"
                    strokeWidth={1.3 + p * 1.2}
                    strokeLinecap="round"
                    opacity=".85"
                  />
                </g>
              </g>
            </g>

            {/* Faixas técnicas aparecem no último terço. */}
            <g opacity={detail * 0.8} strokeLinecap="round">
              <path
                d="M-61-5 Q-68 14-55 32"
                stroke="#C6FAFF"
                strokeWidth="2"
              />
              <path
                d="M55-35 Q67-18 65-3"
                stroke="#F0D1FF"
                strokeWidth="2"
              />
              <path
                d="M-14 66 Q0 70 14 65"
                stroke="#E7EDFF"
                strokeWidth="1.5"
              />
            </g>
          </g>

          {/* Frente orbital: arco parcial, não uma gaiola de linhas. */}
          <g
            transform={`rotate(${-24 - t * 5})`}
            opacity={orbit * frame.light}
          >
            <path
              d="M-121 2 C-107 53 62 75 119 7"
              stroke={paint('orbit')}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="119"
              cy="7"
              r="2.6"
              fill="#C1FAFF"
              filter={paint('glow')}
            />
          </g>

          {/* Quatro faíscas acompanhantes. */}
          {[0, 1, 2, 3].map((index) => {
            const angle = t * (0.2 + index * 0.025) + (index * Math.PI) / 2;
            const radius = 107 + opening * 28;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius * 0.8;

            return (
              <g
                key={index}
                transform={`translate(${x} ${y}) rotate(45)`}
                opacity={detail * frame.light * 0.8}
              >
                <rect
                  x="-2"
                  y="-2"
                  width="4"
                  height="4"
                  rx=".7"
                  fill="#B4F5FF"
                  filter={paint('glow')}
                />
              </g>
            );
          })}

          {/* Pulso único ao entrar em completed. */}
          {burst > 0 && !reducedMotion && (
            <g key={burst} className="lumo-mascot__completion">
              <circle
                r="83"
                stroke="#B5F6FF"
                strokeWidth="1.5"
                className="lumo-mascot__shockwave"
              />

              {Array.from({ length: 8 }, (_, index) => (
                <g
                  key={index}
                  transform={`rotate(${index * 45})`}
                >
                  <circle
                    cy="-86"
                    r="2.5"
                    fill="#B5F6FF"
                    className="lumo-mascot__burst-particle"
                  />
                </g>
              ))}
            </g>
          )}
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
            zIndex: 10,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default LumoMascot;
