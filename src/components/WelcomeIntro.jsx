import React, { useEffect, useRef, useState } from 'react';

/**
 * WelcomeIntro — Animação cinematográfica em alta resolução (Retina 60fps Canvas + CSS 3D)
 * inspirada no vídeo de referência:
 * - Fundo atmosférico azul/índigo com feixe diagonal de luz quente
 * - Constelações neurais e circuitos geométricos em 45° convergindo para o centro
 * - Orbe central em Liquid Glass 3D com ondas internas, plasma e anéis concêntricos
 * - Tipografia monumental "BEM-VINDO" com brilho especular e transição fluida para o sistema
 */
export function WelcomeIntro({ userName = 'Usuário', onComplete }) {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('ignite'); // 'ignite' -> 'welcome' -> 'expand'
  const firstName = userName ? userName.split(' ')[0].toUpperCase() : 'VOCÊ';
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('welcome'), 450);
    const t2 = setTimeout(() => setPhase('expand'), 2800);
    const t3 = setTimeout(() => {
      onCompleteRef.current?.();
    }, 3500);

    const handleKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        onCompleteRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // 1. NÓS DE CONSTELAÇÃO (0.0s a 4.0s)
    const numNodes = 56;
    const nodes = Array.from({ length: numNodes }, (_, i) => {
      const angle = (i / numNodes) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 160 + Math.random() * Math.max(width, height) * 0.48;
      return {
        x: width / 2 + Math.cos(angle) * dist,
        y: height / 2 + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.65,
        vy: (Math.random() - 0.5) * 0.65,
        radius: 1.8 + Math.random() * 2.8,
        alpha: 0.35 + Math.random() * 0.65,
        pulseSpeed: 1.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2
      };
    });

    // 2. TRILHAS DE CIRCUITO GEOMÉTRICO EM 45° (inspiradas nos segundos 00:05–00:07 do vídeo)
    const createCircuits = () => {
      const paths = [];
      const directions = 18;
      for (let i = 0; i < directions; i++) {
        const baseAngle = (i / directions) * Math.PI * 2;
        const snappedAngle = Math.round(baseAngle / (Math.PI / 4)) * (Math.PI / 4);
        const startR = 145 + (i % 3) * 18;
        const seg1Len = 90 + (i * 37) % 140;
        const turnAngle = snappedAngle + ((i % 2 === 0 ? 1 : -1) * Math.PI) / 4;
        const seg2Len = 80 + (i * 53) % 160;
        const seg3Len = 110 + (i * 29) % 190;

        const p0 = {
          x: Math.cos(baseAngle) * startR,
          y: Math.sin(baseAngle) * startR
        };
        const p1 = {
          x: p0.x + Math.cos(snappedAngle) * seg1Len,
          y: p0.y + Math.sin(snappedAngle) * seg1Len
        };
        const p2 = {
          x: p1.x + Math.cos(turnAngle) * seg2Len,
          y: p1.y + Math.sin(turnAngle) * seg2Len
        };
        const p3 = {
          x: p2.x + Math.cos(snappedAngle) * seg3Len,
          y: p2.y + Math.sin(snappedAngle) * seg3Len
        };

        paths.push({
          points: [p0, p1, p2, p3],
          speed: 0.45 + (i % 4) * 0.18,
          offset: (i * 0.13) % 1,
          nodeSize: 3 + (i % 3) * 1.5
        });
      }
      return paths;
    };

    const circuits = createCircuits();
    const startTime = performance.now();

    const render = (now) => {
      const elapsed = (now - startTime) / 1000; // segundos
      const cx = width / 2;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // =====================================================================
      // CAMADA 1: ATMOSFERA PROFUNDA + FEIXE DIAGONAL DE LUZ QUENTE (4K CRISP)
      // =====================================================================
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#576898');
      bgGrad.addColorStop(0.35, '#7282AD');
      bgGrad.addColorStop(0.68, '#4F5E8D');
      bgGrad.addColorStop(1, '#2D3A68');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Feixe luminoso diagonal suave (como no vídeo e wallpaper)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.42);
      const beamHeight = Math.max(width, height) * 0.48;
      const beamGrad = ctx.createLinearGradient(0, -beamHeight, 0, beamHeight);
      beamGrad.addColorStop(0, 'rgba(255, 248, 235, 0)');
      beamGrad.addColorStop(0.35, 'rgba(255, 246, 230, 0.22)');
      beamGrad.addColorStop(0.5, 'rgba(255, 250, 242, 0.58)');
      beamGrad.addColorStop(0.65, 'rgba(255, 246, 230, 0.22)');
      beamGrad.addColorStop(1, 'rgba(255, 248, 235, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(-width * 1.2, -beamHeight, width * 2.4, beamHeight * 2);
      ctx.restore();

      // =====================================================================
      // CAMADA 2: REDE DE CONSTELAÇÕES NEURAIS (NÓS E CONEXÕES NÍTIDAS)
      // =====================================================================
      const constellationFade = Math.min(1, elapsed * 1.8);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        // Atração sutil ao centro após 1.5s
        if (elapsed > 1.2 && elapsed < 3.2) {
          n.x += (cx - n.x) * 0.0025;
          n.y += (cy - n.y) * 0.0025;
        }

        // Conexões entre nós próximos
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 185) {
            const lineAlpha = (1 - dist / 185) * 0.34 * constellationFade;
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      // Desenha cada nó da constelação com brilho
      for (const n of nodes) {
        const pulse = 0.65 + 0.35 * Math.sin(elapsed * n.pulseSpeed + n.phase);
        const a = n.alpha * pulse * constellationFade;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a * 0.18})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fill();
      }

      // =====================================================================
      // CAMADA 3: CIRCUITOS GEOMÉTRICOS DE ALTA PRECISÃO (45° TECH TRACES)
      // =====================================================================
      const circuitProgress = Math.max(0, Math.min(1, (elapsed - 0.35) / 1.4));
      if (circuitProgress > 0) {
        ctx.save();
        ctx.translate(cx, cy);

        circuits.forEach((c) => {
          const pts = c.points;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.32 * circuitProgress})`;
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) {
            ctx.lineTo(pts[k].x, pts[k].y);
          }
          ctx.stroke();

          // Nós de junção do circuito (círculos vazados e preenchidos como no vídeo 00:05-00:07)
          pts.forEach((pt, idx) => {
            if (idx === 0) return;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, c.nodeSize, 0, Math.PI * 2);
            if (idx % 2 === 1) {
              ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * circuitProgress})`;
              ctx.fill();
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * circuitProgress})`;
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
          });

          // Pulso de fóton viajando pela trilha em direção ao orbe central
          const t = (1 - ((elapsed * c.speed + c.offset) % 1));
          const totalSegments = pts.length - 1;
          const segFloat = t * totalSegments;
          const segIdx = Math.min(totalSegments - 1, Math.floor(segFloat));
          const localT = segFloat - segIdx;
          const px = pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * localT;
          const py = pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * localT;

          const photonGrad = ctx.createRadialGradient(px, py, 0, px, py, 10);
          photonGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * circuitProgress})`);
          photonGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = photonGrad;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      }

      // =====================================================================
      // CAMADA 4: ORBE CENTRAL 3D LIQUID GLASS + ONDAS INTERNAS + ANÉIS
      // =====================================================================
      const baseOrbRadius = Math.min(width, height) * 0.23;
      const expandBoost = elapsed > 3.3 ? Math.pow((elapsed - 3.3) * 3.2, 2.4) * 420 : 0;
      const orbRadius = baseOrbRadius + Math.sin(elapsed * 2.6) * 6 + expandBoost;

      ctx.save();
      ctx.translate(cx, cy);

      // 4.1 Halo luminoso externo do Orbe
      const outerHalo = ctx.createRadialGradient(0, 0, orbRadius * 0.2, 0, 0, orbRadius * 1.65);
      outerHalo.addColorStop(0, 'rgba(255, 250, 240, 0.65)');
      outerHalo.addColorStop(0.55, 'rgba(220, 232, 255, 0.28)');
      outerHalo.addColorStop(1, 'rgba(180, 200, 255, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(0, 0, orbRadius * 1.65, 0, Math.PI * 2);
      ctx.fill();

      // 4.2 Esfera principal de Liquid Glass com deformação orgânica suave
      ctx.save();
      ctx.beginPath();
      const steps = 120;
      for (let s = 0; s <= steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const morph =
          Math.sin(theta * 3 + elapsed * 2.4) * 4.5 +
          Math.cos(theta * 2 - elapsed * 1.8) * 3.5;
        const r = orbRadius + morph;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const sphereGrad = ctx.createRadialGradient(
        -orbRadius * 0.25,
        -orbRadius * 0.25,
        orbRadius * 0.05,
        0,
        0,
        orbRadius
      );
      sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
      sphereGrad.addColorStop(0.45, 'rgba(240, 244, 255, 0.28)');
      sphereGrad.addColorStop(0.82, 'rgba(195, 210, 245, 0.22)');
      sphereGrad.addColorStop(1, 'rgba(255, 255, 255, 0.62)');
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Borda especular de vidro líquido
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.stroke();

      // Recorte interno para desenhar as ondas senoidais (como em 00:03–00:05 do vídeo)
      ctx.clip();

      // 4.3 Filamentos de ondas fluidas atravessando o interior do Orbe
      for (let w = 0; w < 5; w++) {
        ctx.beginPath();
        const waveAlpha = 0.22 + (w % 2) * 0.14;
        ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
        ctx.lineWidth = 1.6;
        for (let x = -orbRadius; x <= orbRadius; x += 6) {
          const normX = x / orbRadius;
          const env = Math.cos(normX * (Math.PI / 2)); // atenua nas bordas
          const y =
            Math.sin(normX * 4.2 + elapsed * (2.6 + w * 0.35) + w * 0.7) *
            (28 + w * 7) *
            env;
          if (x === -orbRadius) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // 4.4 Núcleo solar pulsante interno (como em 00:01 e 00:07 do vídeo)
      const corePulse = 0.42 + 0.12 * Math.sin(elapsed * 3.8);
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, orbRadius * corePulse);
      coreGrad.addColorStop(0, 'rgba(255, 252, 242, 0.92)');
      coreGrad.addColorStop(0.65, 'rgba(255, 244, 224, 0.38)');
      coreGrad.addColorStop(1, 'rgba(255, 244, 224, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, orbRadius * corePulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Fim do clip da esfera

      // 4.5 Anéis concêntricos harmônicos (como em 00:02 e 00:07–00:08 do vídeo)
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const ringScale = 0.72 + rIdx * 0.19 + Math.sin(elapsed * 2 + rIdx) * 0.03;
        ctx.save();
        ctx.rotate(elapsed * (0.25 - rIdx * 0.12));
        ctx.beginPath();
        ctx.arc(0, 0, orbRadius * ringScale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.42 - rIdx * 0.1})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      onClick={() => onCompleteRef.current?.()}
      title="Clique para pular introdução"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        opacity: phase === 'expand' ? 0 : 1,
        transform: phase === 'expand' ? 'scale(1.12)' : 'scale(1)',
        filter: phase === 'expand' ? 'blur(18px)' : 'blur(0px)',
        transition: 'opacity 0.72s cubic-bezier(0.22, 1, 0.36, 1), transform 0.72s cubic-bezier(0.22, 1, 0.36, 1), filter 0.72s ease'
      }}
    >
      {/* CANVAS 4K RETINA COM O ORBE LIQUID GLASS E CIRCUITOS */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* CONTEÚDO CENTRAL: LOGO ETHOS + "BEM-VINDO" GIGANTE */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
          opacity: phase === 'ignite' ? 0 : 1,
          transform: phase === 'ignite' ? 'scale(0.84) translateY(18px)' : 'scale(1) translateY(0)',
          transition: 'all 0.85s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Símbolo Ethos Luminoso */}
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 20px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.55)',
            boxShadow: '0 8px 32px rgba(33, 31, 56, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <svg width="34" height="18" viewBox="0 0 68 34" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 34 17 C 28 5, 6 5, 6 17 C 6 29, 28 29, 34 17 C 40 5, 62 5, 62 17 C 62 29, 40 29, 34 17 Z"
              stroke="#1E2448"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="6" y1="17" x2="23" y2="17" stroke="#1E2448" strokeWidth="5.5" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: '#1E2448'
            }}
          >
            ETHOS OS
          </span>
        </div>

        {/* TEXTO MONUMENTAL "BEM-VINDO" */}
        <h1
          style={{
            fontSize: 'clamp(3.6rem, 8.8vw, 7.4rem)',
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '0.12em',
            margin: 0,
            color: '#1A1E3B',
            textShadow: '0 4px 36px rgba(255, 255, 255, 0.95), 0 18px 48px rgba(26, 30, 59, 0.25)',
            fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}
        >
          BEM-VINDO
        </h1>

        {/* Subtítulo com o nome do usuário e status de inicialização */}
        <div
          style={{
            marginTop: '16px',
            padding: '8px 24px',
            borderRadius: '999px',
            background: 'rgba(33, 31, 56, 0.76)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            boxShadow: '0 12px 32px rgba(20, 18, 40, 0.28)'
          }}
        >
          OLÁ, {firstName} • SINCRONIZANDO PAINEL
        </div>
      </div>

      {/* Botão discreto para pular animação se desejar */}
      <button
        type="button"
        onClick={() => onComplete?.()}
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '32px',
          zIndex: 20,
          padding: '8px 18px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.45)',
          color: '#1A1E3B',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: 'pointer'
        }}
      >
        Pular Intro →
      </button>
    </div>
  );
}

