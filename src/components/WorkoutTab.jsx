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
  CalendarCheck
} from 'lucide-react';

export function WorkoutTab({ workouts, setWorkouts, onCompleteWorkout }) {
  const [activeWorkoutId, setActiveWorkoutId] = useState(workouts[0]?.id || 'wo_a');
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);

  // New Workout Form State
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutDays, setNewWorkoutDays] = useState([1]);
  const [newWorkoutTime, setNewWorkoutTime] = useState('18:30');

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

  // Alternar dia de execução na agenda semanal para este tipo de treino
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

  return (
    <div className="workout-view">
      {/* SECTION HEADER */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Dumbbell size={20} color="var(--accent-rose)" />
          <h2 className="section-title">Módulo de Musculação & Treino</h2>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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
            onClick={() => setShowNewExerciseModal(true)}
          >
            <Plus size={16} strokeWidth={2.6} />
            Novo Exercício
          </button>
        </div>
      </div>

      {/* HORIZONTAL WORKOUT TABS (Treino A, Treino B, Treino C) */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '14px', alignItems: 'center' }}>
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

      {/* CURRENT WORKOUT INFO BANNER WITH AGENDA DAYS SELECTOR */}
      <div className="card-native" style={{ marginBottom: '18px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
                Ficha Ativa
              </span>
              <span className="section-badge" style={{ fontSize: '0.72rem' }}>
                {currentWorkout?.exercises?.length || 0} exercícios
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginTop: '3px' }}>
              {currentWorkout?.name}
            </h3>
          </div>

          <button 
            className="btn-indigo"
            onClick={handleFinishWorkout}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            <CheckCircle2 size={16} />
            Finalizar Treino de Hoje
          </button>
        </div>

        {/* DIAS NA AGENDA PELO TIPO DE TREINO (ex: Treino A às segundas) */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              <CalendarCheck size={15} color="var(--accent-cyan)" />
              <span>Dias na Agenda para {currentWorkout?.name?.split(' - ')[0] || 'este treino'}:</span>
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
                  title={`Agendar ${currentWorkout?.name?.split(' - ')[0]} para ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayIdx]}`}
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

      {/* MODAL: CRIAR NOVO TREINO (COM DIAS NA AGENDA) */}
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
                  placeholder="ex: Treino C - Pernas, Glúteos e Abdômen"
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
