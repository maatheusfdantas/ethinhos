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
  Flame, 
  Share2,
  CalendarCheck,
  Trash2,
  Edit3,
  Award,
  AlertCircle,
  HelpCircle,
  Sparkles
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

  // Exercícios concluídos na sessão ativa: { [exerciseId]: boolean }
  const [completedExerciseIds, setCompletedExerciseIds] = useState({});

  // Treinos concluídos na data de hoje: { [workoutId]: boolean }
  const [completedWorkoutsToday, setCompletedWorkoutsToday] = useState({});

  // Estados do Cronômetro de Descanso entre Séries
  const [activeRestSeconds, setActiveRestSeconds] = useState(0);
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

  const handleStartRest = (seconds) => {
    setActiveRestSeconds(seconds);
    setIsResting(true);
  };

  // Alternar Exercício Concluído / Feito na sessão atual
  const handleToggleExerciseCheck = (exId) => {
    setCompletedExerciseIds(prev => ({
      ...prev,
      [exId]: !prev[exId]
    }));
  };

  // Ajuste rápido de carga (+2kg / -2kg)
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
    // Desmarcar exercícios concluídos deste treino
    const exIds = currentWorkout.exercises?.map(e => e.id) || [];
    setCompletedExerciseIds(prev => {
      const next = { ...prev };
      exIds.forEach(id => delete next[id]);
      return next;
    });
    setShowResetConfirmModal(false);
    setIsResting(false);
    setActiveRestSeconds(0);
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

  const currentExercises = currentWorkout?.exercises || [];
  const completedCount = currentExercises.filter(ex => !!completedExerciseIds[ex.id]).length;
  const progressPercent = currentExercises.length > 0 ? Math.round((completedCount / currentExercises.length) * 100) : 0;

  return (
    <div className="workout-view">
      {/* SECTION HEADER */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Dumbbell size={20} color="var(--accent-rose)" />
          <h2 className="section-title">Módulo de Musculação & Treino</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px' }}
            onClick={() => setShowNewWorkoutModal(true)}
          >
            <Plus size={16} strokeWidth={2.6} />
            Novo Treino
          </button>
          <button 
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px' }}
            onClick={handleOpenAddExercise}
          >
            <Plus size={16} strokeWidth={2.6} />
            Novo Exercício
          </button>
        </div>
      </div>

      {/* HORIZONTAL WORKOUT TABS */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '14px', alignItems: 'center' }}>
        {workouts.map((w) => {
          const isActive = w.id === activeWorkoutId;
          const isDone = !!completedWorkoutsToday[w.id];

          return (
            <button
              key={w.id}
              onClick={() => setActiveWorkoutId(w.id)}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                background: isActive ? (isDone ? 'var(--accent-emerald)' : 'var(--accent-cyan)') : 'var(--surface-card)',
                color: isActive ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: '1px solid',
                borderColor: isActive ? (isDone ? 'var(--accent-emerald)' : 'var(--accent-cyan)') : 'var(--border-subtle)',
                boxShadow: isActive ? '0 0 12px rgba(0, 229, 255, 0.3)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--transition-fast)'
              }}
            >
              {isDone && <CheckCircle2 size={14} />}
              {w.name}
            </button>
          );
        })}

        <button
          onClick={() => setShowNewWorkoutModal(true)}
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-elevated)',
            color: 'var(--accent-cyan)',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: '1px dashed var(--accent-cyan)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Criar nova ficha de treino"
        >
          <Plus size={14} />
          Nova Ficha
        </button>
      </div>

      {/* BANNER COMEMORATIVO DE CONCLUSÃO DE TREINO HOJE */}
      {isWorkoutCompleted && (
        <div 
          className="card-native"
          style={{ 
            background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.18) 0%, rgba(15, 23, 42, 0.8) 100%)',
            borderColor: 'var(--accent-emerald)',
            marginBottom: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} color="var(--accent-emerald)" />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Treino Finalizado com Sucesso Hoje
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {currentWorkout.name} • +50 pontos creditados
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowResetConfirmModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            Reiniciar Treino
          </button>
        </div>
      )}

      {/* CURRENT WORKOUT INFO BANNER WITH AGENDA DAYS SELECTOR & ACTION BUTTONS */}
      <div className="card-native" style={{ marginBottom: '18px', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: isWorkoutCompleted ? 'var(--accent-emerald)' : 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
                {isWorkoutCompleted ? 'Treino Concluído' : 'Ficha em Execução'}
              </span>
              <span className="section-badge" style={{ fontSize: '0.72rem' }}>
                {currentExercises.length} exercícios
              </span>
              <span className="section-badge" style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                {completedCount}/{currentExercises.length} feitos ({progressPercent}%)
              </span>
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '4px', margin: 0 }}>
              {currentWorkout?.name}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* BOTÃO PRINCIPAL DE FINALIZAR TREINO OU TRAVADO */}
            {isWorkoutCompleted ? (
              <button 
                disabled
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(52, 211, 153, 0.2)',
                  color: 'var(--accent-emerald)',
                  border: '1px solid var(--accent-emerald)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'not-allowed',
                  opacity: 0.95
                }}
              >
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
                Treino Concluído
              </button>
            ) : (
              <button 
                className="btn-primary"
                onClick={() => setShowFinishConfirmModal(true)}
                style={{ padding: '9px 20px', fontSize: '0.85rem', gap: '8px' }}
              >
                <CheckCircle2 size={16} />
                Finalizar Treino de Hoje
              </button>
            )}

            {isWorkoutCompleted && (
              <button 
                className="btn-secondary"
                onClick={() => setShowResetConfirmModal(true)}
                style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
                title="Deseja treinar novamente hoje?"
              >
                <RotateCcw size={14} />
                Reiniciar Treino
              </button>
            )}

            {workouts.length > 1 && (
              <button
                onClick={() => handleDeleteWorkout(currentWorkout.id)}
                className="btn-icon-round"
                style={{ width: 36, height: 36, color: 'var(--accent-rose)' }}
                title="Excluir esta ficha de treino"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* PROGRESSO DA SESSÃO ATUAL */}
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
          <div 
            style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: progressPercent === 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)', 
              transition: 'width 0.3s ease' 
            }} 
          />
        </div>

        {/* DIAS NA AGENDA PELO TIPO DE TREINO */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <CalendarCheck size={15} color="var(--accent-cyan)" />
              <span>Dias fixos na agenda semanal:</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {currentWorkout?.scheduledDays && currentWorkout.scheduledDays.length > 0 
                ? `Agendado para: ${currentWorkout.scheduledDays.slice().sort((a,b)=>a-b).map(d => ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'][d]).join(', ')} às ${currentWorkout.scheduledTime || '18:30'}`
                : 'Nenhum dia fixado na agenda semanal'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLetter, dayIdx) => {
              const isSelected = (currentWorkout?.scheduledDays || []).includes(dayIdx);
              return (
                <button
                  key={dayIdx}
                  type="button"
                  onClick={() => handleToggleWorkoutDay(currentWorkout.id, dayIdx)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    background: isSelected ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                    color: isSelected ? '#030712' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)'
                  }}
                  title={`Agendar para ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIdx]}`}
                >
                  {dayLetter}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* REST TIMER BANNER IF ACTIVE */}
      {isResting && (
        <div 
          className="card-native" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15) 0%, var(--surface-card) 100%)',
            borderColor: 'var(--accent-cyan)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-logo-badge" style={{ width: 44, height: 44 }}>
              <Clock size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Cronômetro de Descanso
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeRestSeconds}s restantes
              </div>
            </div>
          </div>

          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={() => setIsResting(false)}
          >
            Pular Descanso
          </button>
        </div>
      )}

      {/* EXERCISES LIST TOTALMENTE PERSONALIZÁVEL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {currentExercises.length === 0 ? (
          <div className="card-native" style={{ textAlign: 'center', padding: '36px 16px' }}>
            <Dumbbell size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Nenhum exercício nesta ficha</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Adicione os exercícios que você costuma praticar com séries, repetições, peso e descanso personalizados.
            </p>
            <button className="btn-primary" onClick={handleOpenAddExercise} style={{ margin: '0 auto' }}>
              <Plus size={16} /> Adicionar Exercício
            </button>
          </div>
        ) : (
          currentExercises.map((ex, index) => {
            const isChecked = !!completedExerciseIds[ex.id];

            return (
              <div 
                key={ex.id || index} 
                className="card-native" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '14px', 
                  flexWrap: 'wrap',
                  borderColor: isChecked ? 'rgba(52, 211, 153, 0.4)' : 'var(--border-subtle)',
                  background: isChecked ? 'rgba(52, 211, 153, 0.04)' : 'var(--surface-card)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {/* CHECKBOX & INFO */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handleToggleExerciseCheck(ex.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: isChecked ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                      background: isChecked ? 'var(--accent-emerald)' : 'transparent',
                      color: '#030712',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                    title={isChecked ? 'Marcar como não executado' : 'Marcar como executado na sessão'}
                  >
                    {isChecked && <Check size={16} strokeWidth={3} />}
                  </button>

                  <div>
                    <h4 style={{ 
                      fontSize: '0.98rem', 
                      fontWeight: 700, 
                      color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: isChecked ? 'line-through' : 'none',
                      margin: 0
                    }}>
                      {ex.name}
                    </h4>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span className="section-badge" style={{ background: 'var(--surface-elevated)' }}>
                        {ex.sets} séries × {ex.reps} reps
                      </span>

                      {ex.showWeight && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="section-badge" style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
                            {ex.weightKg} kg
                          </span>
                          {/* Botões rápidos de ajuste de peso */}
                          <button
                            type="button"
                            onClick={() => handleAdjustWeight(ex.id, -2)}
                            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '4px', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                            title="-2 kg"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustWeight(ex.id, 2)}
                            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', borderRadius: '4px', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
                            title="+2 kg"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {ex.showRestTimer && (
                        <span className="section-badge">
                          Descanso: {ex.restSec}s
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS: START REST, EDIT, DELETE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {ex.showRestTimer && (
                    <button 
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '6px' }}
                      onClick={() => handleStartRest(ex.restSec)}
                    >
                      <Clock size={14} color="var(--accent-cyan)" />
                      Descanso ({ex.restSec}s)
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditExercise(ex)}
                    className="btn-icon-round"
                    style={{ width: 34, height: 34 }}
                    title="Editar exercício (séries, repetições, peso e descanso)"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    onClick={() => setShowDeleteExerciseConfirm(ex.id)}
                    className="btn-icon-round"
                    style={{ width: 34, height: 34, color: 'var(--accent-rose)' }}
                    title="Excluir exercício"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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

              {/* SÉRIES E REPETIÇÕES */}
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

              {/* CARGA / PESO */}
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

              {/* CRONÔMETRO DE DESCANSO */}
              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Cronômetro de Descanso</span>
                  <div 
                    className={`switch-track ${showRestTimer ? 'on' : ''}`}
                    onClick={() => setShowRestTimer(!showRestTimer)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showRestTimer && (
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
                )}
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

              {/* SÉRIES E REPETIÇÕES */}
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

              {/* CARGA / PESO */}
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

              {/* CRONÔMETRO DE DESCANSO */}
              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Cronômetro de Descanso</span>
                  <div 
                    className={`switch-track ${showRestTimer ? 'on' : ''}`}
                    onClick={() => setShowRestTimer(!showRestTimer)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showRestTimer && (
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
                )}
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
                Você executou a ficha <strong>{currentWorkout.name}</strong>. Ao confirmar, seu treino será marcado como concluído no dashboard e você ganhará <strong>+50 pontos</strong>.
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
                Deseja reiniciar a sessão desta ficha (<strong>{currentWorkout.name}</strong>)? O botão de finalização será destravado e os exercícios ficarão disponíveis para nova execução.
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
                <h2 className="modal-title">Criar Novo Treino</h2>
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
                  placeholder="ex: Treino C - Pernas e Abdômen"
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* DIAS NA AGENDA */}
              <div className="form-group">
                <label className="form-label">Dias na Agenda Semanal (ex: às segundas)</label>
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
                          justifyContent: 'center',
                          transition: 'all var(--transition-fast)'
                        }}
                        title={['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIdx]}
                      >
                        {dayLetter}
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block' }}>
                  {newWorkoutDays.length > 0
                    ? `Dias selecionados: ${newWorkoutDays.slice().sort((a,b)=>a-b).map(d => ['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'][d]).join(', ')}`
                    : 'Nenhum dia selecionado ainda (você pode selecionar a qualquer momento)'}
                </span>
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
