import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  BookOpen, 
  X,
  Flame,
  Plus,
  Minus,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SUBJECT_OPTIONS = [
  'Sistemas Operacionais',
  'Estruturas de Dados e Algoritmos',
  'Arquitetura de Software',
  'Banco de Dados Distribuídos',
  'Engenharia de Requisitos',
  'Cálculo e Álgebra Linear'
];

export function FocusTab({ user, onFocusComplete }) {
  // Preset durations in minutes (US05 & Request 4)
  const [selectedDurationMins, setSelectedDurationMins] = useState(25);
  const [customInputMins, setCustomInputMins] = useState(30);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [subject, setSubject] = useState('Sistemas Operacionais'); // US25: Vinculação da sessão a matéria

  // Timer states
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // US24: Anti-fraud pause limit
  const MAX_PAUSE_SECONDS = 120; // 2 minutes maximum cumulative pause
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(MAX_PAUSE_SECONDS);
  const [fraudWarning, setFraudWarning] = useState(false);

  // US06: Celebration Modal & Canvas State
  const [showCelebration, setShowCelebration] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState(null);
  const canvasRef = useRef(null);

  // Adjust duration via preset
  const handleSelectDuration = (mins) => {
    if (isActive) return;
    setIsCustomMode(false);
    setSelectedDurationMins(mins);
    setTotalSeconds(mins * 60);
    setSecondsLeft(mins * 60);
    setPauseSecondsLeft(MAX_PAUSE_SECONDS);
    setFraudWarning(false);
  };

  // Adjust duration via custom time input
  const handleApplyCustomDuration = (val) => {
    if (isActive) return;
    const mins = Math.max(1, Math.min(180, Number(val) || 25));
    setCustomInputMins(mins);
    setSelectedDurationMins(mins);
    setIsCustomMode(true);
    setTotalSeconds(mins * 60);
    setSecondsLeft(mins * 60);
    setPauseSecondsLeft(MAX_PAUSE_SECONDS);
    setFraudWarning(false);
  };

  // Main countdown effect
  useEffect(() => {
    let timer = null;

    if (isActive && !isPaused && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (isActive && !isPaused && secondsLeft === 0) {
      // Completed Focus Session!
      handleSessionFinished();
    }

    return () => clearInterval(timer);
  }, [isActive, isPaused, secondsLeft]);

  // US24: Anti-fraud pause countdown effect
  useEffect(() => {
    let pauseTimer = null;

    if (isActive && isPaused) {
      pauseTimer = setInterval(() => {
        setPauseSecondsLeft(prev => {
          if (prev <= 1) {
            setFraudWarning(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(pauseTimer);
  }, [isActive, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!isActive) return;
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setSecondsLeft(selectedDurationMins * 60);
    setPauseSecondsLeft(MAX_PAUSE_SECONDS);
    setFraudWarning(false);
  };

  // US06: When focus finishes, trigger confetti and open celebration canvas modal
  const handleSessionFinished = () => {
    setIsActive(false);
    setIsPaused(false);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // safe fallback
    }

    const sessionInfo = {
      subject,
      durationMins: selectedDurationMins,
      date: new Date().toLocaleDateString('pt-BR'),
      userName: user?.name || 'Eu Matheus',
      fraudProtected: pauseSecondsLeft > 0
    };

    setCompletedSessionData(sessionInfo);
    setShowCelebration(true);
    onFocusComplete?.(sessionInfo);
  };

  // Draw commemorative image on Canvas (US06)
  useEffect(() => {
    if (showCelebration && completedSessionData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#0a101d');
      bgGrad.addColorStop(0.5, '#131e33');
      bgGrad.addColorStop(1, '#070b13');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Cyber glow frame
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, 24, width - 48, height - 48);

      // Title
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 22px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ETHOS FOCUS CERTIFICATE', width / 2, 70);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('PROTOCOLO ANTI-FRAUDE ATIVADO', width / 2, 98);

      // Big minutes circle / box
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.beginPath();
      ctx.arc(width / 2, 180, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px Outfit, Inter, sans-serif';
      ctx.fillText(`${completedSessionData.durationMins}`, width / 2, 192);

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('MINUTOS DE FOCO', width / 2, 216);

      // Subject Info
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(completedSessionData.subject, width / 2, 280);

      // User & Date
      ctx.fillStyle = '#818cf8';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(`Conquistado por: ${completedSessionData.userName}`, width / 2, 315);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText(`Data de Conclusão: ${completedSessionData.date}`, width / 2, 345);

      // Anti-fraud badge
      ctx.fillStyle = completedSessionData.fraudProtected ? '#34d399' : '#f43f5e';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(
        completedSessionData.fraudProtected 
          ? 'VERIFICADO: TEMPO DE PAUSA SEGURO' 
          : 'ALERTA: LIMITE DE PAUSA EXCEDIDO', 
        width / 2, 
        380
      );
    }
  }, [showCelebration, completedSessionData]);

  // Download commemorative PNG image (US06)
  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `ethos-foco-${completedSessionData?.subject?.replace(/\s+/g, '_') || 'sessao'}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100);

  return (
    <div className="focus-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <Timer size={20} color="var(--accent-cyan)" />
          <h2 className="section-title">Cronômetro de Foco & Produtividade</h2>
        </div>
        <span className="section-badge">Técnica Pomodoro</span>
      </div>

      {/* US25: VINCULAÇÃO A UMA MATÉRIA ESPECÍFICA */}
      <div className="card-native" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <BookOpen size={16} color="var(--accent-indigo)" />
          <label className="form-label" style={{ margin: 0 }}>
            Matéria ou Atividade Vinculada
          </label>
        </div>
        <select 
          className="input-dark"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isActive}
        >
          {SUBJECT_OPTIONS.map((sub, idx) => (
            <option key={idx} value={sub}>{sub}</option>
          ))}
        </select>
      </div>

      {/* ADJUSTABLE DURATION PRESETS & CUSTOM TIME (US05 & Request 4) */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', alignItems: 'center' }}>
          {[15, 25, 45, 50, 60].map((mins) => (
            <button
              key={mins}
              className="segmented-btn"
              style={{
                background: !isCustomMode && selectedDurationMins === mins ? 'var(--accent-cyan)' : 'var(--surface-card)',
                color: !isCustomMode && selectedDurationMins === mins ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                padding: '9px 18px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-pill)',
                cursor: isActive ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={() => handleSelectDuration(mins)}
              disabled={isActive}
            >
              {mins} min
            </button>
          ))}

          <button
            className="segmented-btn"
            style={{
              background: isCustomMode ? 'var(--accent-cyan)' : 'var(--surface-card)',
              color: isCustomMode ? '#030712' : 'var(--text-secondary)',
              fontWeight: 700,
              padding: '9px 18px',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              cursor: isActive ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => handleApplyCustomDuration(customInputMins)}
            disabled={isActive}
          >
            <Sliders size={14} />
            Tempo Personalizado {isCustomMode ? `(${selectedDurationMins} min)` : ''}
          </button>
        </div>

        {/* CUSTOM TIME CONTROLLER (SELEÇÃO LIVRE DE 1 A 180 MIN) */}
        {isCustomMode && (
          <div className="card-native" style={{ marginTop: '10px', padding: '14px 18px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                Defina os Minutos de Foco (1 a 180 min):
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins - 5)}
                  disabled={isActive || selectedDurationMins <= 5}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                  title="Diminuir 5 minutos"
                >
                  -5 min
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins - 1)}
                  disabled={isActive || selectedDurationMins <= 1}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                  title="Diminuir 1 minuto"
                >
                  -1 min
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customInputMins}
                    onChange={(e) => handleApplyCustomDuration(e.target.value)}
                    disabled={isActive}
                    style={{
                      width: '64px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid var(--accent-cyan)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>minutos</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins + 1)}
                  disabled={isActive || selectedDurationMins >= 180}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                  title="Aumentar 1 minuto"
                >
                  +1 min
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins + 5)}
                  disabled={isActive || selectedDurationMins >= 175}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                  title="Aumentar 5 minutos"
                >
                  +5 min
                </button>
              </div>
            </div>

            <input
              type="range"
              min="1"
              max="120"
              value={selectedDurationMins}
              onChange={(e) => handleApplyCustomDuration(e.target.value)}
              disabled={isActive}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: isActive ? 'not-allowed' : 'pointer' }}
            />
          </div>
        )}
      </div>

      {/* FOCUS MAIN TIMER CARD */}
      <div className="focus-timer-card">
        {/* US24: ANTI-FRAUD STATUS PILL */}
        <div className={`anti-fraud-pill ${pauseSecondsLeft <= 20 ? 'warning' : 'safe'}`}>
          {pauseSecondsLeft <= 20 ? (
            <>
              <ShieldAlert size={15} />
              <span>Regra Anti-Fraude: {pauseSecondsLeft}s de pausa restante!</span>
            </>
          ) : (
            <>
              <ShieldCheck size={15} />
              <span>Anti-Fraude: Tolerância de Pausa ({pauseSecondsLeft}s max)</span>
            </>
          )}
        </div>

        {/* TIMER CIRCLE */}
        <div className="timer-circle-wrap">
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle
              cx="110"
              cy="110"
              r="96"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="110"
              cy="110"
              r="96"
              stroke="var(--accent-cyan)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 96}
              strokeDashoffset={2 * Math.PI * 96 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>

          <div>
            <div className="timer-digits">{formatTime(secondsLeft)}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {isPaused ? 'EM PAUSA' : isActive ? 'EM ANDAMENTO' : 'PRONTO'}
            </div>
          </div>
        </div>

        {/* CURRENT MATÉRIA DISPLAY */}
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600, textTransform: 'uppercase' }}>
            Foco Ativo em
          </span>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            {subject}
          </h3>
        </div>

        {/* TIMER CONTROLS (US24) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {!isActive ? (
            <button 
              className="btn-primary" 
              style={{ padding: '14px 32px', fontSize: '1.05rem' }}
              onClick={handleStart}
            >
              <Play size={20} fill="#030712" />
              Começar Sessão
            </button>
          ) : isPaused ? (
            <button 
              className="btn-primary" 
              style={{ padding: '14px 28px', fontSize: '1rem' }}
              onClick={handleResume}
            >
              <Play size={18} fill="#030712" />
              Retomar Foco
            </button>
          ) : (
            <button 
              className="btn-secondary" 
              style={{ padding: '14px 28px', fontSize: '1rem', borderColor: 'var(--accent-amber)' }}
              onClick={handlePause}
            >
              <Pause size={18} />
              Pausar ({pauseSecondsLeft}s rest.)
            </button>
          )}

          {isActive && (
            <button 
              className="btn-icon-round" 
              style={{ width: 48, height: 48 }}
              onClick={handleReset}
              title="Cancelar / Reiniciar"
            >
              <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>

      {/* MODAL COMEMORATIVO COM GERAÇÃO DE IMAGEM NO CANVAS (US06) */}
      {showCelebration && (
        <div className="modal-overlay" onClick={() => setShowCelebration(false)}>
          <div className="modal-sheet" style={{ maxWidth: '520px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-cyan)" />
                <h3 className="modal-title">Sessão Finalizada com Sucesso!</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCelebration(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Aqui está sua imagem comemorativa gerada dinamicamente via Canvas:
            </p>

            {/* RENDERED HTML5 CANVAS */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <canvas 
                ref={canvasRef} 
                width={440} 
                height={420} 
                style={{ 
                  borderRadius: '16px', 
                  maxWidth: '100%', 
                  boxShadow: 'var(--shadow-cyan)', 
                  border: '1px solid var(--border-subtle)' 
                }} 
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, gap: '6px' }}
                onClick={() => setShowCelebration(false)}
              >
                Concluir
              </button>

              <button 
                className="btn-primary" 
                style={{ flex: 1.5, gap: '8px' }}
                onClick={handleDownloadImage}
              >
                <Download size={18} />
                Baixar Imagem PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
