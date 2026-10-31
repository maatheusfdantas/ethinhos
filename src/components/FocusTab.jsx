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

  // Classes de Estudo Customizáveis (Criar e Deletar)
  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = localStorage.getItem('ethos_focus_subjects');
      return saved ? JSON.parse(saved) : SUBJECT_OPTIONS;
    } catch {
      return SUBJECT_OPTIONS;
    }
  });
  const [subject, setSubject] = useState(() => {
    try {
      const saved = localStorage.getItem('ethos_focus_subjects');
      const parsed = saved ? JSON.parse(saved) : SUBJECT_OPTIONS;
      return parsed[0] || 'Sistemas Operacionais';
    } catch {
      return 'Sistemas Operacionais';
    }
  });
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [showSubjectManager, setShowSubjectManager] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('ethos_focus_subjects', JSON.stringify(subjects));
    } catch (e) {
      console.warn('Error saving subjects:', e);
    }
  }, [subjects]);

  const handleAddSubject = (e) => {
    e.preventDefault();
    const clean = newSubjectInput.trim();
    if (!clean) return;
    if (subjects.includes(clean)) {
      setSubject(clean);
      setNewSubjectInput('');
      return;
    }
    const updated = [...subjects, clean];
    setSubjects(updated);
    setSubject(clean);
    setNewSubjectInput('');
  };

  const handleDeleteSubject = (subToDelete) => {
    if (subjects.length <= 1) {
      alert('Você deve manter pelo menos uma classe de estudo.');
      return;
    }
    const updated = subjects.filter(s => s !== subToDelete);
    setSubjects(updated);
    if (subject === subToDelete) {
      setSubject(updated[0]);
    }
  };

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

      // Specular border frame
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(24, 24, width - 48, height - 48);

      // Título do Certificado
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 22px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFICADO DE FOCO ETHOS', width / 2, 70);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('PROTOCOLO ANTI-FRAUDE ATIVADO', width / 2, 98);

      // Big minutes circle / box
      ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
      ctx.beginPath();
      ctx.arc(width / 2, 180, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px Outfit, Inter, sans-serif';
      ctx.fillText(`${completedSessionData.durationMins}`, width / 2, 192);

      ctx.fillStyle = '#93c5fd';
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
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-400/30 text-orange-400 flex items-center justify-center shadow-[0_0_15px_rgba(251,146,60,0.25)]">
            <Timer size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Cronômetro de Foco & Produtividade</h2>
            <p className="text-xs text-slate-400 font-medium">Sessões imersivas com proteção anti-fraude</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-400/20 text-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.15)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
          Pomodoro
        </div>
      </div>

      {/* VINCULAÇÃO A UMA CLASSE DE ESTUDO (CRIAR E DELETAR) - BENTO CARD */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
              <BookOpen size={15} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block">
                Classe de Estudo Vinculada
              </label>
              <span className="text-[11px] text-slate-400">Direcione seu tempo de foco com precisão</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSubjectManager(!showSubjectManager)}
            disabled={isActive}
            className="glass-pill-btn !py-1 !px-3 !text-xs !bg-white/[0.04] text-slate-300 hover:text-white disabled:opacity-40"
          >
            {showSubjectManager ? 'Fechar Gerenciador' : '+ Gerenciar Classes'}
          </button>
        </div>

        {/* FORM INLINE PARA CRIAR E DELETAR CLASSES DE ESTUDO */}
        {showSubjectManager && (
          <div className="bento-subcard p-4 rounded-2xl border border-white/[0.08] mb-4 space-y-3">
            <span className="text-xs font-semibold text-white block">
              Cadastrar Nova Classe de Estudo:
            </span>
            <form onSubmit={handleAddSubject} className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-400/50"
                placeholder="Nome da classe (ex: Inteligência Artificial, Bioquímica)"
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                autoFocus
              />
              <button 
                type="submit" 
                className="glass-pill-btn !py-2 !px-4 !text-xs !bg-orange-500/20 !border-orange-400/40 text-orange-200 flex items-center gap-1.5 shrink-0 shadow-[0_0_10px_rgba(251,146,60,0.2)]"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </form>

            <span className="text-[11px] text-slate-400 block">
              Classes cadastradas (clique no X para deletar):
            </span>
            <div className="flex gap-2 flex-wrap">
              {subjects.map((subItem) => (
                <span
                  key={subItem}
                  className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-2 transition-all ${
                    subItem === subject
                      ? 'bg-orange-500/20 border border-orange-400/40 text-orange-200 shadow-[0_0_8px_rgba(251,146,60,0.25)]'
                      : 'bg-white/[0.04] border border-white/10 text-slate-300'
                  }`}
                >
                  {subItem}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubject(subItem);
                    }}
                    className="w-4 h-4 rounded-full bg-white/[0.1] hover:bg-rose-500/30 hover:text-rose-300 flex items-center justify-center text-slate-400 transition-colors"
                    title={`Deletar classe "${subItem}"`}
                  >
                    <X size={10} strokeWidth={2.8} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <select 
          className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-orange-400/50 disabled:opacity-50"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isActive}
        >
          {subjects.map((sub, idx) => (
            <option key={idx} value={sub} className="bg-[#0B0F17] text-white">{sub}</option>
          ))}
        </select>
      </div>

      {/* ADJUSTABLE DURATION PRESETS & CUSTOM TIME (GLASS PILLS) */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          {[15, 25, 45, 50, 60].map((mins) => {
            const isSelected = !isCustomMode && selectedDurationMins === mins;
            return (
              <button
                key={mins}
                type="button"
                className={`glass-pill-btn !py-2 !px-4 text-xs font-medium flex items-center gap-2 whitespace-nowrap ${
                  isSelected 
                    ? '!bg-white/[0.12] !border-orange-400/50 text-white shadow-[0_0_12px_rgba(251,146,60,0.25)]' 
                    : '!bg-white/[0.04] text-slate-400 hover:text-white'
                }`}
                onClick={() => handleSelectDuration(mins)}
                disabled={isActive}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />}
                {mins} min
              </button>
            );
          })}

          <button
            type="button"
            className={`glass-pill-btn !py-2 !px-4 text-xs font-medium flex items-center gap-2 whitespace-nowrap ${
              isCustomMode 
                ? '!bg-white/[0.12] !border-orange-400/50 text-white shadow-[0_0_12px_rgba(251,146,60,0.25)]' 
                : '!bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
            onClick={() => handleApplyCustomDuration(customInputMins)}
            disabled={isActive}
          >
            {isCustomMode && <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />}
            <Sliders size={13} />
            Personalizado {isCustomMode ? `(${selectedDurationMins} min)` : ''}
          </button>
        </div>

        {/* CUSTOM TIME CONTROLLER (SELEÇÃO LIVRE DE 1 A 180 MIN) */}
        {isCustomMode && (
          <div className="bento-subcard p-4 rounded-2xl border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-semibold text-orange-300">
                Defina os Minutos de Foco (1 a 180 min):
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins - 5)}
                  disabled={isActive || selectedDurationMins <= 5}
                  className="glass-pill-btn !py-1 !px-2.5 !text-xs !bg-white/[0.04] text-slate-300"
                  title="Diminuir 5 minutos"
                >
                  -5m
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins - 1)}
                  disabled={isActive || selectedDurationMins <= 1}
                  className="glass-pill-btn !py-1 !px-2.5 !text-xs !bg-white/[0.04] text-slate-300"
                  title="Diminuir 1 minuto"
                >
                  -1m
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customInputMins}
                    onChange={(e) => handleApplyCustomDuration(e.target.value)}
                    disabled={isActive}
                    className="w-12 bg-transparent text-center text-sm font-semibold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">min</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins + 1)}
                  disabled={isActive || selectedDurationMins >= 180}
                  className="glass-pill-btn !py-1 !px-2.5 !text-xs !bg-white/[0.04] text-slate-300"
                  title="Aumentar 1 minuto"
                >
                  +1m
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCustomDuration(selectedDurationMins + 5)}
                  disabled={isActive || selectedDurationMins >= 175}
                  className="glass-pill-btn !py-1 !px-2.5 !text-xs !bg-white/[0.04] text-slate-300"
                  title="Aumentar 5 minutos"
                >
                  +5m
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
              className="w-full accent-orange-400 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* FOCUS MAIN TIMER CARD (BENTO CARD WITH WARM GRADIENT & AMBIENT GLOW) */}
      <div className="bento-card p-10 flex flex-col items-center justify-center relative overflow-hidden text-center">
        {/* Ambient Backlight for Pomodoro */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* US24: ANTI-FRAUD STATUS PILL */}
        <div className={`px-3.5 py-1.5 rounded-full text-xs font-medium border mb-8 flex items-center gap-2 transition-all ${
          pauseSecondsLeft <= 20 
            ? 'bg-rose-500/15 border-rose-400/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
            : 'bg-white/[0.04] border-white/10 text-slate-300'
        }`}>
          {pauseSecondsLeft <= 20 ? (
            <>
              <ShieldAlert size={14} className="text-rose-400" />
              <span>Anti-Fraude: {pauseSecondsLeft}s de pausa restante!</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Anti-Fraude: Tolerância de Pausa ({pauseSecondsLeft}s max)</span>
            </>
          )}
        </div>

        {/* CIRCULAR TIMER WITH DUAL GRADIENT (AMBER TO CORAL) */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-8">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <defs>
              <linearGradient id="pomodoroGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="url(#pomodoroGlow)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              style={{ 
                transition: 'stroke-dashoffset 0.5s ease',
                filter: 'drop-shadow(0px 0px 10px rgba(251, 146, 60, 0.4))'
              }}
            />
          </svg>

          {/* TIMER DIGITS (PROTAGONIST NUMBERS) */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="text-5xl font-semibold tracking-tight text-white tabular-nums drop-shadow-[0_0_15px_rgba(251,146,60,0.35)]">
              {formatTime(secondsLeft)}
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-2">
              {isPaused ? 'Em Pausa' : isActive ? 'Foco Ativo' : 'Pronto'}
            </div>
          </div>
        </div>

        {/* CURRENT MATÉRIA DISPLAY */}
        <div className="mb-8">
          <span className="text-[11px] font-semibold text-orange-300 uppercase tracking-wider block mb-1">
            Foco Ativo em
          </span>
          <h3 className="text-base font-semibold text-white">
            {subject}
          </h3>
        </div>

        {/* TIMER CONTROLS (DATA-DRIVEN GLOW, TRANSLUCENT GLASS PILLS) */}
        <div className="flex items-center justify-center gap-3.5 flex-wrap">
          {!isActive ? (
            <button 
              type="button"
              className="glass-pill-btn !py-3.5 !px-8 text-sm font-semibold !bg-white/[0.08] hover:!bg-white/[0.14] !border-orange-400/40 text-white rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(251,146,60,0.25)] hover:scale-105 transition-all"
              onClick={handleStart}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
              <Play size={16} className="text-orange-300" fill="#fb923c" />
              <span>Começar Sessão</span>
            </button>
          ) : isPaused ? (
            <button 
              type="button"
              className="glass-pill-btn !py-3.5 !px-8 text-sm font-semibold !bg-white/[0.08] hover:!bg-white/[0.14] !border-orange-400/40 text-white rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(251,146,60,0.25)] hover:scale-105 transition-all"
              onClick={handleResume}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
              <Play size={16} className="text-orange-300" fill="#fb923c" />
              <span>Retomar Foco</span>
            </button>
          ) : (
            <button 
              type="button"
              className="glass-pill-btn !py-3.5 !px-8 text-sm font-semibold !bg-white/[0.06] hover:!bg-white/[0.12] !border-amber-400/30 text-amber-200 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
              onClick={handlePause}
            >
              <Pause size={16} />
              <span>Pausar ({pauseSecondsLeft}s rest.)</span>
            </button>
          )}

          {isActive && (
            <button 
              type="button"
              className="w-12 h-12 rounded-full glass-pill-btn !p-0 flex items-center justify-center text-slate-400 hover:text-white"
              onClick={handleReset}
              title="Cancelar / Reiniciar"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* MODAL COMEMORATIVO COM GERAÇÃO DE IMAGEM NO CANVAS (US06) */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setShowCelebration(false)}>
          <div className="bento-card max-w-lg w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-orange-400" />
                <h3 className="text-base font-semibold text-white">Sessão Finalizada com Sucesso!</h3>
              </div>
              <button 
                type="button"
                className="w-8 h-8 rounded-full glass-pill-btn !p-0 flex items-center justify-center text-slate-400 hover:text-white"
                onClick={() => setShowCelebration(false)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Aqui está sua imagem comemorativa gerada dinamicamente via Canvas:
            </p>

            {/* RENDERED HTML5 CANVAS */}
            <div className="flex justify-center mb-5">
              <canvas 
                ref={canvasRef} 
                width={440} 
                height={420} 
                className="rounded-2xl max-w-full border border-white/10 shadow-[0_0_20px_rgba(251,146,60,0.2)]"
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                className="flex-1 glass-pill-btn !py-2.5 !text-xs !bg-white/[0.04] text-slate-300 hover:text-white justify-center"
                onClick={() => setShowCelebration(false)}
              >
                Concluir
              </button>

              <button 
                type="button"
                className="flex-1 glass-pill-btn !py-2.5 !text-xs !bg-orange-500/20 !border-orange-400/40 text-orange-200 justify-center shadow-[0_0_15px_rgba(251,146,60,0.25)] flex items-center gap-2"
                onClick={handleDownloadImage}
              >
                <Download size={14} />
                Baixar Imagem PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
