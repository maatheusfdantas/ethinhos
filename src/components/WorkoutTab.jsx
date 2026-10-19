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
  Share2 
} from 'lucide-react';

export function WorkoutTab({ workouts, setWorkouts, onCompleteWorkout }) {
  const [activeWorkoutId, setActiveWorkoutId] = useState(workouts[0]?.id || 'wo_a');
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);

  // New Exercise Form State
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(60);
  const [showWeight, setShowWeight] = useState(true);
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [restSec, setRestSec] = useState(60); // 30, 45, 60, 90, 120

  // Rest Timer State
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

  const currentWorkout = workouts.find(w => w.id === activeWorkoutId) || workouts[0];

  const handleStartRest = (seconds) => {
    setActiveRestSeconds(seconds);
    setIsResting(true);
  };

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
          exercises: [...w.exercises, newEx]
        };
      }
      return w;
    }));

    setExerciseName('');
    setSets(4);
    setReps(10);
    setShowNewExerciseModal(false);
  };

  const handleFinishWorkout = () => {
    onCompleteWorkout(currentWorkout.name);
  };

  return (
    <div className="workout-view">
      {/* SECTION HEADER */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Dumbbell size={20} color="var(--accent-rose)" />
          <h2 className="section-title">Módulo de Musculação & Treino</h2>
        </div>
        <button 
          className="btn-primary" 
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          onClick={() => setShowNewExerciseModal(true)}
        >
          <Plus size={16} strokeWidth={2.6} />
          Novo Exercício
        </button>
      </div>

      {/* HORIZONTAL WORKOUT TABS (Treino A, Treino B, Treino C) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '14px' }}>
        {workouts.map((w) => {
          const isActive = w.id === activeWorkoutId;
          return (
            <button
              key={w.id}
              onClick={() => setActiveWorkoutId(w.id)}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-pill)',
                background: isActive ? 'var(--accent-cyan)' : 'var(--surface-card)',
                color: isActive ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                boxShadow: isActive ? 'var(--shadow-cyan)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              {w.name.split(' - ')[0]}
            </button>
          );
        })}
      </div>

      {/* CURRENT WORKOUT INFO BANNER */}
      <div className="card-native" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
            Ficha Ativa
          </span>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '2px' }}>
            {currentWorkout?.name}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {currentWorkout?.exercises?.length || 0} exercícios planejados
          </span>
        </div>

        <button 
          className="btn-indigo"
          onClick={handleFinishWorkout}
          style={{ padding: '8px 18px', fontSize: '0.85rem' }}
        >
          <CheckCircle2 size={16} />
          Finalizar Treino de Hoje (US11)
        </button>
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
            Pular
          </button>
        </div>
      )}

      {/* EXERCISES LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {currentWorkout?.exercises?.map((ex, index) => (
          <div key={ex.id || index} className="card-native" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="habit-category-box" style={{ width: 42, height: 42, color: 'var(--accent-rose)' }}>
                <Dumbbell size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {ex.name}
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span className="section-badge" style={{ background: 'var(--surface-elevated)' }}>
                    {ex.sets} séries × {ex.reps} reps
                  </span>
                  {ex.showWeight && (
                    <span className="section-badge" style={{ color: 'var(--accent-cyan)', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
                      {ex.weightKg} kg
                    </span>
                  )}
                  {ex.showRestTimer && (
                    <span className="section-badge">
                      Descanso: {ex.restSec}s
                    </span>
                  )}
                </div>
              </div>
            </div>

            {ex.showRestTimer && (
              <button 
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '6px' }}
                onClick={() => handleStartRest(ex.restSec)}
              >
                <Clock size={14} color="var(--accent-cyan)" />
                Iniciar Descanso ({ex.restSec}s)
              </button>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: NOVO EXERCÍCIO COM CONTROLES '+' E '-' E TOGGLE SWITCHES CIANO */}
      {showNewExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowNewExerciseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Exercício</h2>
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
                  placeholder="ex: Supino Inclinado com Halteres"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* CONTROLES COM BOTÕES DE '+' E '-' ARREDONDADOS PARA 'SÉRIES' E 'REPETIÇÕES' */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                {/* SÉRIES */}
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

                {/* REPETIÇÕES */}
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

              {/* TOGGLE SWITCH COLORIDO (CIANO) PARA 'EXIBIR CARGA' */}
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
                      onChange={(e) => setWeightKg(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {/* TOGGLE SWITCH COLORIDO (CIANO) PARA 'EXIBIR CRONÔMETRO DE DESCANSO' */}
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
    </div>
  );
}
