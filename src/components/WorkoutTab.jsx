import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Minus, 
  Play,
  Pause,
  RotateCcw, 
  Check, 
  CheckCircle2, 
  X, 
  Clock, 
  Trash2,
  Edit3,
  Award,
  CalendarCheck
} from 'lucide-react';

export function WorkoutTab({ workouts, setWorkouts, onCompleteWorkout }) {
  const [activeWorkoutId, setActiveWorkoutId] = useState(workouts[0]?.id || 'wo_a');
  
  // Estados dos Modais
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(null);

  // Estados do Formulário de Nova Ficha de Treino
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutDays, setNewWorkoutDays] = useState([1]);
  const [newWorkoutTime, setNewWorkoutTime] = useState('18:30');

  // Estados do Formulário de Exercício (Adicionar / Editar)
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(60);
  const [showWeight, setShowWeight] = useState(true);
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [restSec, setRestSec] = useState(60);

  // REQUISITO 7: Contagem de séries feitas por exercício: { [exerciseId]: number }
  const [completedSetsMap, setCompletedSetsMap] = useState({});

  // Treinos concluídos na data de hoje: { [workoutId]: boolean }
  const [completedWorkoutsToday, setCompletedWorkoutsToday] = useState({});

  // REQUISITO 6: Cronômetro de Descanso por atividade
  const [restingExerciseId, setRestingExerciseId] = useState(null);
  const [activeRestSeconds, setActiveRestSeconds] = useState(0);
  const [initialRestSeconds, setInitialRestSeconds] = useState(60);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isResting && activeRestSeconds > 0) {
      interval = setInterval(() => {
        setActiveRestSeconds(prev => prev - 1);
      }, 1000);
    } else if (activeRestSeconds === 0 && isResting) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, activeRestSeconds]);

  const currentWorkout = workouts.find(w => w.id === activeWorkoutId) || workouts[0] || { id: 'wo_empty', name: 'Meu Treino', exercises: [] };
  const isWorkoutCompleted = !!completedWorkoutsToday[currentWorkout?.id];

  // Iniciar ou reiniciar descanso em uma atividade específica
  const handleStartExerciseRest = (exId, seconds) => {
    const duration = seconds || 60;
    setRestingExerciseId(exId);
    setInitialRestSeconds(duration);
    setActiveRestSeconds(duration);
    setIsResting(true);
  };

  const handleTogglePauseRest = () => {
    setIsResting(prev => !prev);
  };

  const handleStopRest = () => {
    setIsResting(false);
    setActiveRestSeconds(0);
    setRestingExerciseId(null);
  };

  // Alterar rapidamente o tempo de descanso padrão de um exercício
  const handleChangeExerciseRestSec = (exId, newSec) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => ex.id === exId ? { ...ex, restSec: newSec, showRestTimer: true } : ex)
        };
      }
      return w;
    }));
  };

  // REQUISITO 7: Marcar/desmarcar séries feitas de um exercício
  const handleSetCountChange = (ex, nextDoneCount, autoRest = false) => {
    const totalSets = Math.max(1, Number(ex.sets) || 1);
    const clamped = Math.max(0, Math.min(totalSets, nextDoneCount));
    const prevDone = completedSetsMap[ex.id] || 0;

    setCompletedSetsMap(prev => ({
      ...prev,
      [ex.id]: clamped
    }));

    // Se o usuário acabou de avançar uma série e autoRest estiver ativo, pode iniciar o descanso
    if (autoRest && clamped > prevDone && ex.showRestTimer !== false) {
      handleStartExerciseRest(ex.id, ex.restSec || 60);
    }
  };

  // Marcar ou desmarcar todas as séries do exercício de uma vez
  const handleToggleAllSets = (ex) => {
    const totalSets = Math.max(1, Number(ex.sets) || 1);
    const currentDone = completedSetsMap[ex.id] || 0;
    const nextDone = currentDone >= totalSets ? 0 : totalSets;
    handleSetCountChange(ex, nextDone, false);
  };

  // Ajuste rápido de carga (-1kg / +1kg)
  const handleAdjustWeight = (exId, delta) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exId) {
              const newWeight = Math.max(0, (ex.weightKg || 0) + delta);
              return { ...ex, weightKg: newWeight };
            }
            return ex;
          })
        };
      }
      return w;
    }));
  };

  // Abrir modal para adicionar exercício
  const handleOpenAddExercise = () => {
    setExerciseName('');
    setSets(4);
    setReps(10);
    setWeightKg(50);
    setShowWeight(true);
    setShowRestTimer(true);
    setRestSec(60);
    setShowNewExerciseModal(true);
  };

  // Abrir modal para editar exercício
  const handleOpenEditExercise = (ex) => {
    setEditingExerciseId(ex.id);
    setExerciseName(ex.name);
    setSets(ex.sets || 3);
    setReps(ex.reps || 10);
    setWeightKg(ex.weightKg || 0);
    setShowWeight(ex.showWeight !== false);
    setShowRestTimer(ex.showRestTimer !== false);
    setRestSec(ex.restSec || 60);
    setShowEditExerciseModal(true);
  };

  // Submeter Adição de Exercício
  const handleAddExerciseSubmit = (e) => {
    e.preventDefault();
    if (!exerciseName.trim()) return;

    const newEx = {
      id: `ex_${Date.now()}`,
      name: exerciseName.trim(),
      sets,
      reps,
      weightKg: showWeight ? weightKg : 0,
      restSec,
      showWeight,
      showRestTimer
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: [...(w.exercises || []), newEx]
        };
      }
      return w;
    }));

    setShowNewExerciseModal(false);
  };

  // Submeter Edição de Exercício
  const handleEditExerciseSubmit = (e) => {
    e.preventDefault();
    if (!exerciseName.trim() || !editingExerciseId) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === editingExerciseId) {
              return {
                ...ex,
                name: exerciseName.trim(),
                sets,
                reps,
                weightKg: showWeight ? weightKg : 0,
                restSec,
                showWeight,
                showRestTimer
              };
            }
            return ex;
          })
        };
      }
      return w;
    }));

    setShowEditExerciseModal(false);
    setEditingExerciseId(null);
  };

  // Excluir exercício
  const handleDeleteExercise = (exId) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => ex.id !== exId)
        };
      }
      return w;
    }));
    setShowDeleteExerciseConfirm(null);
  };

  // Excluir ficha de treino inteira
  const handleDeleteWorkout = (wId) => {
    if (workouts.length <= 1) {
      alert('Você deve manter pelo menos uma ficha de treino.');
      return;
    }
    const remaining = workouts.filter(w => w.id !== wId);
    setWorkouts(remaining);
    setActiveWorkoutId(remaining[0]?.id);
  };

  // Confirmar Finalização do Treino
  const handleConfirmFinishWorkout = () => {
    if (!currentWorkout) return;
    setCompletedWorkoutsToday(prev => ({
      ...prev,
      [currentWorkout.id]: true
    }));
    setShowFinishConfirmModal(false);
    onCompleteWorkout(currentWorkout.name);
  };

  // Confirmar Reinício do Treino
  const handleConfirmResetWorkout = () => {
    if (!currentWorkout) return;
    setCompletedWorkoutsToday(prev => ({
      ...prev,
      [currentWorkout.id]: false
    }));
    const exIds = currentWorkout.exercises?.map(e => e.id) || [];
    setCompletedSetsMap(prev => {
      const next = { ...prev };
      exIds.forEach(id => delete next[id]);
      return next;
    });
    setShowResetConfirmModal(false);
    handleStopRest();
  };

  // Alternar dia de execução na agenda semanal
  const handleToggleWorkoutDay = (workoutId, dayIdx) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        const currentDays = w.scheduledDays || [];
        const nextDays = currentDays.includes(dayIdx)
          ? currentDays.filter(d => d !== dayIdx)
          : [...currentDays, dayIdx];
        return {
          ...w,
          scheduledDays: nextDays
        };
      }
      return w;
    }));
  };

  // Submeter criação de nova ficha de treino
  const handleCreateWorkoutSubmit = (e) => {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;

    const newId = `wo_${Date.now()}`;
    const newWorkoutObj = {
      id: newId,
      name: newWorkoutName.trim(),
      scheduledDays: newWorkoutDays,
      scheduledTime: newWorkoutTime || '18:30',
      exercises: []
    };

    setWorkouts(prev => [...prev, newWorkoutObj]);
    setActiveWorkoutId(newId);
    setNewWorkoutName('');
    setNewWorkoutDays([1]);
    setShowNewWorkoutModal(false);
  };

  // Métricas gerais da sessão atual baseadas nas séries feitas
  const currentExercises = currentWorkout?.exercises || [];
  const totalTargetSets = currentExercises.reduce((acc, ex) => acc + Math.max(1, Number(ex.sets) || 1), 0);
  const totalDoneSets = currentExercises.reduce((acc, ex) => {
    const maxS = Math.max(1, Number(ex.sets) || 1);
    return acc + Math.min(maxS, completedSetsMap[ex.id] || 0);
  }, 0);
  const completedExercisesCount = currentExercises.filter(ex => {
    const maxS = Math.max(1, Number(ex.sets) || 1);
    return (completedSetsMap[ex.id] || 0) >= maxS;
  }).length;

  const progressPercent = totalTargetSets > 0 ? Math.round((totalDoneSets / totalTargetSets) * 100) : 0;

  // Cálculo para o anel circular de progresso
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const effectiveProgress = isWorkoutCompleted ? 100 : progressPercent;
  const ringOffset = ringCircumference - (effectiveProgress / 100) * ringCircumference;

  const restingExerciseObj = currentExercises.find(e => e.id === restingExerciseId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* ================================================================== */}
      {/* LINHA 1: SELETOR DE FICHAS DE TREINO + PROGRESSO MENSAL / SESSÃO   */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* CARD ESQUERDO (7 COLUNAS): MINHAS FICHAS DE TREINO & AGENDAMENTO SEMANAL */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '24px',
            padding: '20px 22px',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 10px 28px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}
          className="lg:col-span-7"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0, letterSpacing: '-0.01em' }}>
                Minhas Fichas de Treino
              </h3>
              <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                Selecione a ficha ativa ou crie uma nova divisão muscular
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewWorkoutModal(true)}
              style={{
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(33, 31, 56, 0.22)'
              }}
            >
              <Plus size={14} />
              <span>Nova Ficha</span>
            </button>
          </div>

          {/* Botões das Fichas (A, B, C + Nome Completo) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {workouts.map((w, idx) => {
              const isActive = w.id === activeWorkoutId;
              const isDone = !!completedWorkoutsToday[w.id];
              const matchLetter = w.name.match(/Treino\s+([A-Z0-9])/i);
              const shortLabel = matchLetter ? matchLetter[1].toUpperCase() : String.fromCharCode(65 + idx);

              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setActiveWorkoutId(w.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '14px',
                    border: isDone
                      ? '1.5px solid #10B981'
                      : isActive
                      ? '1.5px solid #211F38'
                      : '1px solid rgba(33, 31, 56, 0.12)',
                    backgroundColor: isActive ? '#211F38' : 'rgba(255, 255, 255, 0.72)',
                    color: isActive ? '#FFFFFF' : '#1A1B2F',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isActive ? '0 6px 16px rgba(33, 31, 56, 0.22)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '7px',
                      backgroundColor: isActive ? '#56548A' : '#E2E4F0',
                      color: isActive ? '#FFFFFF' : '#211F38',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '11.5px'
                    }}
                  >
                    {shortLabel}
                  </span>
                  <span>{w.name}</span>
                  {isDone && <CheckCircle2 size={14} color="#34D399" />}
                </button>
              );
            })}
          </div>

          {/* Dias da semana em que esta ficha se repete na Agenda */}
          <div
            style={{
              paddingTop: '10px',
              borderTop: '1px solid rgba(33, 31, 56, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#4E506B', fontWeight: 600 }}>
              <CalendarCheck size={14} color="#56548A" />
              <span>Dias desta ficha na Agenda:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
                const isSelected = (currentWorkout?.scheduledDays || []).includes(dIdx);
                return (
                  <button
                    key={dName}
                    type="button"
                    onClick={() => handleToggleWorkoutDay(currentWorkout.id, dIdx)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? '#56548A' : 'rgba(33, 31, 56, 0.08)',
                      color: isSelected ? '#FFFFFF' : '#4E506B',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {dName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD DIREITO (5 COLUNAS): PROGRESSO DA SESSÃO & STRENGTH GAINS */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '24px',
            padding: '20px 22px',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 10px 28px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          className="lg:col-span-5"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                Progresso do Treino
              </h3>
              <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                {totalDoneSets} de {totalTargetSets} séries concluídas ({completedExercisesCount}/{currentExercises.length} exercícios)
              </span>
            </div>
            <span
              style={{
                padding: '4px 11px',
                borderRadius: '999px',
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700
              }}
            >
              {effectiveProgress}%
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#3A3C58', lineHeight: 1.3 }}>
              Strength<br />Gains
            </div>

            <div style={{ flex: 1, maxWidth: '150px', height: '50px' }}>
              <svg viewBox="0 0 130 48" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="strengthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D6B9E" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#6D6B9E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 6 42 Q 25 22, 42 28 T 78 24 T 118 6 L 118 44 L 6 44 Z"
                  fill="url(#strengthGrad)"
                />
                <path
                  d="M 6 42 Q 25 22, 42 28 T 78 24 T 118 6"
                  fill="none"
                  stroke="#4D4B7C"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="26" r="2.8" fill="#211F38" />
                <circle cx="72" cy="27" r="2.8" fill="#211F38" />
                <circle cx="118" cy="6" r="3" fill="#211F38" />
              </svg>
            </div>

            <div style={{ width: '66px', height: '66px', position: 'relative', flexShrink: 0 }}>
              <svg width="66" height="66" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r={ringRadius} fill="none" stroke="#CFCFD9" strokeWidth="6.5" />
                <circle
                  cx="34"
                  cy="34"
                  r={ringRadius}
                  fill="none"
                  stroke="#211F38"
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 34 34)"
                  style={{ transition: 'stroke-dashoffset 0.35s ease' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#1A1B2F'
                }}
              >
                {effectiveProgress}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CARD PRINCIPAL ESCURO (#211F38): ROTINA ATIVA & EXERCÍCIOS         */}
      {/* ================================================================== */}
      <div
        style={{
          backgroundColor: '#211F38',
          borderRadius: '26px',
          padding: '24px',
          color: '#FFFFFF',
          boxShadow: '0 16px 40px rgba(33, 31, 56, 0.25)'
        }}
      >
        {/* Cabeçalho da Rotina Ativa */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '18px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                Rotina Ativa: {currentWorkout?.name}
              </h2>
              <span
                style={{
                  backgroundColor: '#E6E7F2',
                  color: '#1A1B2F',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '999px'
                }}
              >
                Hypertrophy
              </span>
              {isWorkoutCompleted && (
                <span
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(52, 211, 153, 0.45)',
                    color: '#6EE7B7',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Award size={13} />
                  Treino Concluído Hoje (+50 pts)
                </span>
              )}
            </div>
            <p style={{ fontSize: '12.5px', color: '#A9ABC6', margin: '4px 0 0 0' }}>
              Marque cada série executada abaixo e ative o cronômetro de descanso entre as séries.
            </p>
          </div>

          {/* Botões de Ação da Ficha */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleOpenAddExercise}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Novo Exercício</span>
            </button>

            {!isWorkoutCompleted ? (
              <button
                type="button"
                onClick={() => setShowFinishConfirmModal(true)}
                style={{
                  backgroundColor: '#56548A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 18px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 6px 16px rgba(86, 84, 138, 0.45)'
                }}
              >
                <CheckCircle2 size={14} />
                <span>Finalizar Treino</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#E2E4F0',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={13} />
                <span>Reiniciar Sessão</span>
              </button>
            )}

            {workouts.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteWorkout(currentWorkout.id)}
                title="Excluir esta ficha de treino"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#FCA5A5',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* BANNER DE CRONÔMETRO DE DESCANSO ATIVO */}
        {activeRestSeconds > 0 && (
          <div
            style={{
              backgroundColor: '#35335A',
              border: '1px solid rgba(166, 180, 232, 0.35)',
              borderRadius: '18px',
              padding: '14px 18px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#56548A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#A6B4E8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Descanso em Andamento {restingExerciseObj ? `• ${restingExerciseObj.name}` : ''}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15 }}>
                  {activeRestSeconds}s <span style={{ fontSize: '12px', fontWeight: 500, color: '#C5C7DE' }}>restantes</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleTogglePauseRest}
                style={{
                  padding: '6px 13px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {isResting ? <Pause size={13} /> : <Play size={13} />}
                <span>{isResting ? 'Pausar' : 'Retomar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRestSeconds(prev => prev + 15)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                +15s
              </button>

              <button
                type="button"
                onClick={handleStopRest}
                style={{
                  padding: '6px 13px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: '#E6E7F2',
                  color: '#1A1B2F',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Encerrar Descanso
              </button>
            </div>
          </div>
        )}

        {/* LISTA DE EXERCÍCIOS COM CONTADOR DE SÉRIES FEITAS E DESCANSO INDIVIDUAL */}
        {currentExercises.length === 0 ? (
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: '18px',
              padding: '32px 24px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '14px', color: '#C5C7DE', margin: '0 0 14px 0' }}>
              Nenhum exercício cadastrado nesta ficha ainda.
            </p>
            <button
              type="button"
              onClick={handleOpenAddExercise}
              style={{
                backgroundColor: '#E6E7F2',
                color: '#1A1B2F',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 18px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={14} />
              <span>Adicionar Primeiro Exercício</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentExercises.map((ex, index) => {
              const totalSets = Math.max(1, Number(ex.sets) || 1);
              const doneSets = Math.min(totalSets, completedSetsMap[ex.id] || 0);
              const isAllSetsDone = doneSets >= totalSets;
              const isThisResting = restingExerciseId === ex.id && activeRestSeconds > 0;
              const setPercent = Math.round((doneSets / totalSets) * 100);

              return (
                <div
                  key={ex.id || index}
                  style={{
                    backgroundColor: isAllSetsDone ? '#D6DFEB' : '#E6E7F2',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: isAllSetsDone ? '1.5px solid #10B981' : isThisResting ? '1.5px solid #56548A' : '1px solid transparent',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {/* LINHA SUPERIOR DO EXERCÍCIO: Check Geral + Nome/Meta + Carga/Descanso/Ações */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Esquerda: Botão de concluir todas as séries + Nome + Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleAllSets(ex)}
                        title={isAllSetsDone ? 'Reiniciar séries deste exercício' : 'Marcar todas as séries como feitas'}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          border: isAllSetsDone ? 'none' : '2px solid #56548A',
                          backgroundColor: isAllSetsDone ? '#10B981' : '#FFFFFF',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 0
                        }}
                      >
                        {isAllSetsDone && <Check size={15} strokeWidth={3} />}
                      </button>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '15.5px',
                              fontWeight: 700,
                              color: '#1A1B2F',
                              textDecoration: isAllSetsDone ? 'line-through' : 'none',
                              opacity: isAllSetsDone ? 0.72 : 1
                            }}
                          >
                            {ex.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 9px',
                              borderRadius: '999px',
                              backgroundColor: isAllSetsDone ? 'rgba(16, 185, 129, 0.18)' : 'rgba(33, 31, 56, 0.1)',
                              color: isAllSetsDone ? '#065F46' : '#211F38'
                            }}
                          >
                            {doneSets}/{totalSets} séries ({setPercent}%)
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#4E506B', fontWeight: 500, marginTop: '2px' }}>
                          Meta: {totalSets} séries × {ex.reps} repetições
                        </div>
                      </div>
                    </div>

                    {/* Direita: Ativador de Descanso + Controle de Carga + Editar/Excluir */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      
                      {/* REQUISITO 6: Botão e Seletor de Tempo de Descanso em Cada Atividade */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: isThisResting ? '#211F38' : '#D5D7E8',
                          borderRadius: '999px',
                          padding: '3px 4px 3px 10px',
                          gap: '6px'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleStartExerciseRest(ex.id, ex.restSec || 60)}
                          title="Clique para ativar o cronômetro de descanso desta atividade"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isThisResting ? '#6EE7B7' : '#211F38',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 4px'
                          }}
                        >
                          <Clock size={13} />
                          <span>
                            {isThisResting ? `Descansando: ${activeRestSeconds}s` : 'Ativar Descanso'}
                          </span>
                        </button>

                        <select
                          value={ex.restSec || 60}
                          onChange={(e) => handleChangeExerciseRestSec(ex.id, Number(e.target.value))}
                          title="Escolher tempo de descanso desta atividade"
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#1A1B2F',
                            border: 'none',
                            borderRadius: '999px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value={30}>30s</option>
                          <option value={45}>45s</option>
                          <option value={60}>60s</option>
                          <option value={90}>90s</option>
                          <option value={120}>120s</option>
                          <option value={180}>180s</option>
                        </select>
                      </div>

                      {/* Controle de Peso (- 65 kg +) */}
                      {ex.showWeight !== false && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#D5D7E8',
                            borderRadius: '999px',
                            padding: '3px 6px'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleAdjustWeight(ex.id, -1)}
                            title="Diminuir carga (-1 kg)"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: '#FFFFFF',
                              color: '#211F38',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '14px',
                              padding: 0
                            }}
                          >
                            −
                          </button>

                          <span
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color: '#1A1B2F',
                              minWidth: '46px',
                              textAlign: 'center'
                            }}
                          >
                            {ex.weightKg} kg
                          </span>

                          <button
                            type="button"
                            onClick={() => handleAdjustWeight(ex.id, 1)}
                            title="Aumentar carga (+1 kg)"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: '#FFFFFF',
                              color: '#211F38',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '14px',
                              padding: 0
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}

                      {/* Editar e Excluir */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditExercise(ex)}
                        title="Editar exercício"
                        style={{
                          background: 'rgba(33, 31, 56, 0.08)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#3A3C58',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowDeleteExerciseConfirm(ex.id)}
                        title="Excluir exercício"
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#991B1B',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* REQUISITO 7: BARRA DE MARCAÇÃO DE SÉRIES FEITAS (SÉRIE 1, SÉRIE 2, SÉRIE 3...) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(33, 31, 56, 0.09)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4E506B', marginRight: '4px' }}>
                        Marcar Séries:
                      </span>

                      {Array.from({ length: totalSets }, (_, sIdx) => {
                        const setNumber = sIdx + 1;
                        const isSetDone = setNumber <= doneSets;

                        return (
                          <button
                            key={setNumber}
                            type="button"
                            onClick={() => {
                              // Se clicar na última série já marcada, desmarca ela; caso contrário marca até esta série e inicia descanso
                              const nextVal = isSetDone && doneSets === setNumber ? setNumber - 1 : setNumber;
                              handleSetCountChange(ex, nextVal, nextVal > doneSets);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '9px',
                              border: isSetDone ? 'none' : '1px solid #B8BACF',
                              backgroundColor: isSetDone ? '#211F38' : '#FFFFFF',
                              color: isSetDone ? '#FFFFFF' : '#3A3C58',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: isSetDone ? '0 3px 8px rgba(33, 31, 56, 0.2)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {isSetDone && <Check size={11} strokeWidth={3} color="#34D399" />}
                            <span>{setNumber}ª Série</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Botões rápidos -1 / +1 série */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleSetCountChange(ex, doneSets - 1, false)}
                        disabled={doneSets <= 0}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: 'rgba(33, 31, 56, 0.1)',
                          color: '#211F38',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: doneSets <= 0 ? 'not-allowed' : 'pointer',
                          opacity: doneSets <= 0 ? 0.45 : 1
                        }}
                      >
                        −1 Série
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetCountChange(ex, doneSets + 1, true)}
                        disabled={doneSets >= totalSets}
                        style={{
                          padding: '4px 11px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: doneSets >= totalSets ? '#10B981' : '#56548A',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: doneSets >= totalSets ? 'default' : 'pointer'
                        }}
                      >
                        {doneSets >= totalSets ? 'Concluído ✓' : '+1 Série Feita'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAIS FUNCIONAIS (ADICIONAR/EDITAR EXERCÍCIO, NOVA FICHA, FINALIZAR)
         ===================================================================== */}

      {/* MODAL: NOVO EXERCÍCIO */}
      {showNewExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowNewExerciseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Exercício Personalizado</h2>
              <button className="modal-close-btn" onClick={() => setShowNewExerciseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExerciseSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Supino Inclinado, Agachamento Livre, etc."
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Séries</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setSets(Math.max(1, sets - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {sets}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setSets(sets + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Repetições</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setReps(Math.max(1, reps - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {reps}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setReps(reps + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Carga (Peso em Kg)</span>
                  <div 
                    className={`switch-track ${showWeight ? 'on' : ''}`}
                    onClick={() => setShowWeight(!showWeight)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showWeight && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label">Carga Inicial (kg)</label>
                    <input 
                      type="number" 
                      className="input-dark" 
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                      min="0"
                      step="1"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Tempo de Descanso Entre Séries</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {[30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className="segmented-btn"
                        style={{
                          background: restSec === sec ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: restSec === sec ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          border: '1px solid var(--border-subtle)'
                        }}
                        onClick={() => setRestSec(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowNewExerciseModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Adicionar à Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EXERCÍCIO EXISTENTE */}
      {showEditExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowEditExerciseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Exercício</h2>
              <button className="modal-close-btn" onClick={() => setShowEditExerciseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditExerciseSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Séries</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setSets(Math.max(1, sets - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {sets}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setSets(sets + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Repetições</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setReps(Math.max(1, reps - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {reps}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setReps(reps + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Carga (Peso em Kg)</span>
                  <div 
                    className={`switch-track ${showWeight ? 'on' : ''}`}
                    onClick={() => setShowWeight(!showWeight)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showWeight && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label">Carga Atual (kg)</label>
                    <input 
                      type="number" 
                      className="input-dark" 
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                      min="0"
                      step="1"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Tempo de Descanso Entre Séries</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {[30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className="segmented-btn"
                        style={{
                          background: restSec === sec ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: restSec === sec ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          border: '1px solid var(--border-subtle)'
                        }}
                        onClick={() => setRestSec(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowEditExerciseModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR FINALIZAÇÃO DE TREINO */}
      {showFinishConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowFinishConfirmModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Award size={30} color="var(--accent-emerald)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Finalizar Treino de Hoje?
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Você executou a ficha <strong>{currentWorkout.name}</strong> ({totalDoneSets}/{totalTargetSets} séries feitas). Ao confirmar, seu treino será marcado como concluído e você ganhará <strong>+50 pontos</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowFinishConfirmModal(false)}
              >
                Voltar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.5, background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)', color: '#030712' }}
                onClick={handleConfirmFinishWorkout}
              >
                <CheckCircle2 size={16} /> Confirmar e Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR REINÍCIO DE TREINO */}
      {showResetConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowResetConfirmModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <RotateCcw size={28} color="var(--accent-cyan)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Reiniciar Treino de Hoje?
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Deseja zerar a contagem de séries desta sessão (<strong>{currentWorkout.name}</strong>) para realizar o treino novamente?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowResetConfirmModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.5 }}
                onClick={handleConfirmResetWorkout}
              >
                <RotateCcw size={16} /> Sim, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE EXERCÍCIO */}
      {showDeleteExerciseConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteExerciseConfirm(null)}>
          <div className="modal-sheet" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Trash2 size={24} color="var(--accent-rose)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Excluir Exercício?
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tem certeza que deseja remover este exercício desta ficha de treino?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowDeleteExerciseConfirm(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.2, background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                onClick={() => handleDeleteExercise(showDeleteExerciseConfirm)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO TREINO */}
      {showNewWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowNewWorkoutModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="var(--accent-rose)" />
                <h2 className="modal-title">Criar Nova Ficha de Treino</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowNewWorkoutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkoutSubmit}>
              <div className="form-group">
                <label className="form-label">Nome ou Foco da Ficha</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Treino D (Ombros e Abdômen)"
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dias na Agenda Semanal</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLetter, dayIdx) => {
                    const isSelected = newWorkoutDays.includes(dayIdx);
                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewWorkoutDays(prev => prev.filter(d => d !== dayIdx));
                          } else {
                            setNewWorkoutDays(prev => [...prev, dayIdx]);
                          }
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                          background: isSelected ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: isSelected ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {dayLetter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Horário Sugerido na Agenda</label>
                <input 
                  type="time" 
                  className="input-dark" 
                  value={newWorkoutTime}
                  onChange={(e) => setNewWorkoutTime(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowNewWorkoutModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Criar Ficha de Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
