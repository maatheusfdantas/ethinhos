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
  Sliders,
  Settings,
  Layers,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CleanIcon } from './IconLibrary';

export function FocusTab({
  user,
  tags = [],
  syncedFocusRequest,
  onConfigureCategory,
  onCreateCategory,
  onLogSubclassEffort,
  onTriggerSharedPomodoro,
  onFocusComplete
}) {
  // Duração predefinida em minutos
  const [selectedDurationMins, setSelectedDurationMins] = useState(25);
  const [customInputMins, setCustomInputMins] = useState(30);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // REQUISITO 3: Seleção de Categorias Reais do Usuário
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    if (syncedFocusRequest?.category) {
      const match = tags.find(t => t.name.toLowerCase() === syncedFocusRequest.category.toLowerCase() || t.id === syncedFocusRequest.category);
      if (match) return match.id;
    }
    const studyCat = tags.find(t => t.has_subclasses || t.name.toLowerCase().includes('facul') || t.name.toLowerCase().includes('estudo'));
    return studyCat?.id || tags[0]?.id || 'tag_facul';
  });

  // REQUISITO 3: Sub-classe opcional (string vazia = "Geral / Sem subclasse")
  const [selectedSubclassName, setSelectedSubclassName] = useState(() => {
    return syncedFocusRequest?.subclass || '';
  });

  // Categoria ativa atual
  const currentCategory = tags.find(t => t.id === selectedCategoryId || t.name === selectedCategoryId) || tags[0] || {
    id: 'tag_default',
    name: 'Estudos',
    color: '#818cf8',
    icon: 'BookOpen',
    has_subclasses: false,
    subclasses: []
  };

  const hasSubclasses = Boolean(currentCategory.has_subclasses && Array.isArray(currentCategory.subclasses) && currentCategory.subclasses.length > 0);

  // Sincronização externa (ex: disparos compartilhados ou atalhos)
  useEffect(() => {
    if (syncedFocusRequest?.category) {
      const match = tags.find(t => t.name.toLowerCase() === syncedFocusRequest.category.toLowerCase() || t.id === syncedFocusRequest.category);
      if (match) {
        setSelectedCategoryId(match.id);
        if (syncedFocusRequest.subclass) {
          setSelectedSubclassName(syncedFocusRequest.subclass);
        }
      }
    }
  }, [syncedFocusRequest, tags]);

  // Ao trocar de categoria, reseta a subclasse para geral
  const handleSelectCategory = (catId) => {
    if (isActive) return;
    setSelectedCategoryId(catId);
    setSelectedSubclassName('');
  };

  // Timer states
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Anti-fraud pause limit
  const MAX_PAUSE_SECONDS = 120; // 2 minutes maximum cumulative pause
  const [pauseSecondsLeft, setPauseSecondsLeft] = useState(MAX_PAUSE_SECONDS);
  const [fraudWarning, setFraudWarning] = useState(false);

  // Celebration Modal & Canvas State
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
      handleSessionFinished();
    }

    return () => clearInterval(timer);
  }, [isActive, isPaused, secondsLeft]);

  // Anti-fraud pause countdown effect
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

  // Conclusão da sessão de foco
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

    const durationInHours = Number((selectedDurationMins / 60).toFixed(2));
    const categoryName = currentCategory?.name || 'Estudos';
    const subclassName = selectedSubclassName || null;
    const displaySubject = subclassName ? `${categoryName} • ${subclassName}` : categoryName;

    // Registra esforço na sub-classe se selecionada
    if (subclassName && onLogSubclassEffort) {
      onLogSubclassEffort(currentCategory.id || currentCategory.name, subclassName, durationInHours);
    }

    const sessionInfo = {
      subject: displaySubject,
      category: categoryName,
      subclass: subclassName,
      durationMins: selectedDurationMins,
      date: new Date().toLocaleDateString('pt-BR'),
      userName: user?.name || 'Eu Matheus',
      fraudProtected: pauseSecondsLeft > 0
    };

    setCompletedSessionData(sessionInfo);
    setShowCelebration(true);
    onFocusComplete?.(sessionInfo);
  };

  // Renderiza certificado comemorativo no Canvas
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

      // Círculo de minutos
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

      // Matéria / Categoria vinculada
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(completedSessionData.subject, width / 2, 280);

      // Usuário & Data
      ctx.fillStyle = '#818cf8';
      ctx.font = '600 15px Inter, sans-serif';
      ctx.fillText(`Conquistado por: ${completedSessionData.userName}`, width / 2, 315);

      ctx.fillStyle = '#64748b';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText(`Data de Conclusão: ${completedSessionData.date}`, width / 2, 345);

      // Selo de verificação
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

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `ethos-foco-${selectedDurationMins}min-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const currentSubjectDisplay = selectedSubclassName ? `${currentCategory.name} • ${selectedSubclassName}` : currentCategory.name;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-400/30 text-orange-400 flex items-center justify-center shadow-[0_0_15px_rgba(251,146,60,0.25)]">
            <Timer size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">Cronômetro de Foco & Produtividade</h2>
            <p className="text-xs text-slate-400 font-medium">Sessões imersivas vinculadas às suas categorias modulares</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-400/20 text-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.15)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c]" />
          Pomodoro
        </div>
      </div>

      {/* REQUISITO 3: VINCULAÇÃO A UMA CATEGORIA REAL + SELEÇÃO OPCIONAL DE SUB-CLASSE */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${currentCategory.color || '#818cf8'}20`,
                border: `1.5px solid ${currentCategory.color || '#818cf8'}40`,
                color: currentCategory.color || '#818cf8'
              }}
            >
              <CleanIcon name={currentCategory.icon || 'BookOpen'} size={18} color={currentCategory.color || '#818cf8'} strokeWidth={2.2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-200 block">
                Área & Classe de Estudo Vinculada
              </label>
              <span className="text-[11px] text-slate-400">
                Selecione a categoria de estudo e, opcionalmente, uma matéria ou sub-classe
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onConfigureCategory && (
              <button
                type="button"
                onClick={() => onConfigureCategory(currentCategory)}
                disabled={isActive}
                className="glass-pill-btn !py-1 !px-3 !text-xs !bg-white/[0.04] text-slate-300 hover:text-white disabled:opacity-40 flex items-center gap-1.5"
                title="Editar sub-classes ou detalhes desta categoria"
              >
                <Settings size={12} />
                <span>Editar Categoria</span>
              </button>
            )}

            {onCreateCategory && (
              <button
                type="button"
                onClick={onCreateCategory}
                disabled={isActive}
                className="glass-pill-btn !py-1 !px-3 !text-xs !bg-indigo-500/20 !border-indigo-400/40 text-indigo-200 hover:text-white disabled:opacity-40 flex items-center gap-1.5"
                title="Criar nova categoria modular"
              >
                <Plus size={12} />
                <span>Nova Categoria</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. SELETOR DE CATEGORIAS DO USUÁRIO */}
        <div className="space-y-2 mb-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            1. Selecione a Categoria de Foco:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {tags.map((cat) => {
              const isSelected = cat.id === currentCategory.id || cat.name === currentCategory.name;
              const subCount = Array.isArray(cat.subclasses) ? cat.subclasses.length : 0;
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  disabled={isActive}
                  onClick={() => handleSelectCategory(cat.id || cat.name)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-white/[0.08] shadow-[0_0_12px_rgba(255,255,255,0.06)]'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08]'
                  }`}
                  style={{
                    borderColor: isSelected ? (cat.color || '#818cf8') : 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <CleanIcon name={cat.icon || 'Bookmark'} size={16} color={cat.color || '#818cf8'} strokeWidth={2} />
                    {cat.has_subclasses && subCount > 0 && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        {subCount} subs
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white truncate w-full">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. SELETOR OPCIONAL DE SUB-CLASSE / MATÉRIA */}
        <div className="pt-3 border-t border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              2. Matéria / Sub-classe (Opcional):
            </span>
            {hasSubclasses && (
              <span className="text-[11px] text-slate-400">
                {selectedSubclassName ? (
                  <span className="text-emerald-400 font-semibold">✓ Sub-classe selecionada: {selectedSubclassName}</span>
                ) : (
                  <span className="text-slate-400">Nenhuma selecionada (estudo geral nesta categoria)</span>
                )}
              </span>
            )}
          </div>

          {hasSubclasses ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Opção 1: Sem subclasse (Geral) */}
                <button
                  type="button"
                  disabled={isActive}
                  onClick={() => setSelectedSubclassName('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedSubclassName === ''
                      ? 'bg-orange-500/20 border-orange-400/50 text-orange-200 shadow-[0_0_10px_rgba(251,146,60,0.2)]'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  ★ Geral ({currentCategory.name})
                </button>

                {/* Opção 2+: Cada Sub-classe da categoria */}
                {currentCategory.subclasses.map((sub) => {
                  const isSubSelected = selectedSubclassName === sub.name;
                  return (
                    <button
                      key={sub.id || sub.name}
                      type="button"
                      disabled={isActive}
                      onClick={() => setSelectedSubclassName(sub.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        isSubSelected
                          ? 'bg-indigo-500/25 border-indigo-400/60 text-white shadow-[0_0_12px_rgba(129,140,248,0.25)]'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span>{sub.name}</span>
                      {sub.priority && (
                        <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                          sub.priority === 'Alta' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-500/20 text-slate-300'
                        }`}>
                          {sub.priority}
                        </span>
                      )}
                      {Number(sub.hours) > 0 && (
                        <span className="text-[9.5px] text-slate-400">({sub.hours}h)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 flex-wrap">
              <span>
                A categoria <strong>{currentCategory.name}</strong> não possui sub-classes cadastradas. O foco será contabilizado na categoria geral.
              </span>
              {onConfigureCategory && (
                <button
                  type="button"
                  disabled={isActive}
                  onClick={() => onConfigureCategory(currentCategory)}
                  className="text-xs text-indigo-300 hover:text-indigo-200 underline font-medium"
                >
                  + Adicionar matérias a esta categoria
                </button>
              )}
            </div>
          )}
        </div>
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

      {/* FOCUS MAIN TIMER CARD */}
      <div className="bento-card p-10 flex flex-col items-center justify-center relative overflow-hidden text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* ANTI-FRAUD STATUS PILL */}
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

        {/* CIRCULAR TIMER */}
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

          {/* TIMER DIGITS */}
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
            {currentSubjectDisplay}
          </h3>
        </div>

        {/* TIMER CONTROLS */}
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

      {/* MODAL COMEMORATIVO COM GERAÇÃO DE IMAGEM NO CANVAS */}
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