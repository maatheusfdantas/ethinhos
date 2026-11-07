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
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';

// =====================================================================
// PALETA DE TEMAS ESTILO HEADSPACE (CORES VIBRANTES E ILUSTRAÇÕES)
// =====================================================================
const WORKOUT_THEMES = [
  {
    id: 'orange',
    bg: '#E86A33',
    gradient: 'linear-gradient(135deg, #FA7B38 0%, #E86A33 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'meditation',
    accent: '#FA7B38',
    label: 'Laranja Energético'
  },
  {
    id: 'blue',
    bg: '#3B82F6',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'cloud',
    accent: '#38BDF8',
    label: 'Azul Céu'
  },
  {
    id: 'navy',
    bg: '#334155',
    gradient: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(255, 255, 255, 0.14)',
    illustration: 'night',
    accent: '#818CF8',
    label: 'Azul Noturno'
  },
  {
    id: 'red',
    bg: '#E54B4B',
    gradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'runner',
    accent: '#F87171',
    label: 'Vermelho Esporte'
  },
  {
    id: 'peach',
    bg: '#E09582',
    gradient: 'linear-gradient(135deg, #F2A995 0%, #D8816C 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.92)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'heart',
    accent: '#E09582',
    label: 'Pêssego Saúde'
  },
  {
    id: 'green',
    bg: '#52B788',
    gradient: 'linear-gradient(135deg, #74C69D 0%, #40916C 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'gears',
    accent: '#52B788',
    label: 'Verde Foco'
  }
];

function getWorkoutTheme(workout, index) {
  if (workout?.theme) {
    const found = WORKOUT_THEMES.find(t => t.id === workout.theme);
    if (found) return found;
  }
  return WORKOUT_THEMES[index % WORKOUT_THEMES.length];
}

// =====================================================================
// ILUSTRAÇÕES VETORIAIS FIÉIS AO ESTILO HEADSPACE DA REFERÊNCIA
// =====================================================================
function CardIllustration({ type }) {
  switch (type) {
    case 'meditation':
      // Personagem com headphone, rosto sorridente e ondas sonoras
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <path d="M 12 40 C 22 28, 32 50, 44 38" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 20 54 C 28 46, 36 60, 48 52" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          
          {/* Headphone Arch */}
          <path d="M 46 42 C 46 22, 90 22, 90 42" stroke="#211F38" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          
          {/* Head */}
          <circle cx="68" cy="45" r="23" fill="#FDBA74" />
          
          {/* Earcups */}
          <rect x="42" y="36" width="9" height="15" rx="4.5" fill="#F59E0B" stroke="#211F38" strokeWidth="1.5" />
          <rect x="85" y="36" width="9" height="15" rx="4.5" fill="#F59E0B" stroke="#211F38" strokeWidth="1.5" />
          
          {/* Closed Smiling Eyes */}
          <path d="M 59 43 Q 63 39, 67 43" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 73 43 Q 77 39, 81 43" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          
          {/* Rosy Cheeks */}
          <circle cx="56" cy="49" r="3.2" fill="#EA580C" opacity="0.45" />
          <circle cx="83" cy="49" r="3.2" fill="#EA580C" opacity="0.45" />
          
          {/* Cheerful Smile */}
          <path d="M 62 49 Q 69 57, 77 49" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'cloud':
      // Nuvenzinha fofa serena com olhos fechados e estrelinhas
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Nuvem de fundo sutil */}
          <path d="M 16 32 Q 22 24, 30 28 Q 38 24, 44 30 Q 48 36, 40 40 Q 20 40, 16 32 Z" fill="rgba(255,255,255,0.22)" />
          
          {/* Estrelinhas */}
          <circle cx="22" cy="18" r="1.8" fill="#FFFFFF" opacity="0.8" />
          <circle cx="98" cy="22" r="2.2" fill="#FFFFFF" opacity="0.8" />
          
          {/* Corpo da Nuvem */}
          <path 
            d="M 38 58 C 30 58, 24 50, 28 42 C 28 32, 40 26, 50 30 C 56 19, 74 19, 82 30 C 92 27, 102 34, 100 44 C 106 50, 102 58, 92 58 Z" 
            fill="#E0F2FE" 
          />
          
          {/* Olhos Serenos Fechados */}
          <path d="M 50 44 Q 55 42, 60 44" stroke="#0284C7" strokeWidth="2.3" strokeLinecap="round" fill="none" />
          <path d="M 70 44 Q 75 42, 80 44" stroke="#0284C7" strokeWidth="2.3" strokeLinecap="round" fill="none" />
          
          {/* Bochechas */}
          <circle cx="47" cy="49" r="3" fill="#38BDF8" opacity="0.6" />
          <circle cx="83" cy="49" r="3" fill="#38BDF8" opacity="0.6" />
          
          {/* Sorriso Tranquilo */}
          <path d="M 61 50 Q 65.5 54, 70 50" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'night':
      // Cama aconchegante, travesseiro macio e lua crescente
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Lua Crescente Dourada */}
          <path 
            d="M 28 16 C 26 21, 27 26, 31 29 C 34 31, 38 31, 41 29 C 37 34, 30 35, 25 31 C 21 27, 22 20, 28 16 Z" 
            fill="#FDE047" 
            opacity="0.9" 
          />
          <circle cx="16" cy="18" r="1.5" fill="#FFFFFF" opacity="0.75" />
          <circle cx="46" cy="14" r="1.3" fill="#FFFFFF" opacity="0.7" />
          
          {/* Cabeceira da Cama */}
          <rect x="46" y="24" width="6" height="44" rx="3" fill="#818CF8" opacity="0.6" />
          
          {/* Travesseiro Macio */}
          <rect x="52" y="32" width="22" height="26" rx="6" fill="#F8FAFC" transform="rotate(-6 52 32)" />
          
          {/* Rosto dormindo tranquilamente */}
          <ellipse cx="76" cy="42" rx="14" ry="12" fill="#FED7AA" />
          
          {/* Cobertor Aconchegante */}
          <path d="M 60 48 C 66 44, 75 45, 82 48 L 102 58 C 104 60, 102 68, 96 68 L 56 68 Z" fill="#6366F1" />
          
          {/* Olho dormindo */}
          <path d="M 72 41 Q 76 44, 80 41" stroke="#4338CA" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'runner':
      // Personagem dinâmico correndo com tênis esportivo e faixa na cabeça
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Linhas de movimento e poeira */}
          <path d="M 32 62 L 44 62" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 26 56 L 38 56" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="52" r="2" fill="rgba(255,255,255,0.35)" />
          
          {/* Cabeça */}
          <circle cx="75" cy="28" r="11" fill="#FED7AA" />
          
          {/* Faixa esportiva na cabeça */}
          <rect x="65" y="23" width="20" height="4.5" rx="2" fill="#38BDF8" />
          
          {/* Olho e Sorriso */}
          <circle cx="78" cy="27" r="1.4" fill="#991B1B" />
          <path d="M 74 30 Q 78 33, 81 30" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          
          {/* Tronco */}
          <path d="M 72 38 L 77 52 L 68 52 Z" fill="#1E293B" />
          
          {/* Braço Esquerdo */}
          <path d="M 70 40 Q 60 38, 57 44" stroke="#FED7AA" strokeWidth="3.8" strokeLinecap="round" fill="none" />
          
          {/* Braço Direito em Movimento */}
          <path d="M 74 40 Q 84 42, 90 36" stroke="#FED7AA" strokeWidth="3.8" strokeLinecap="round" fill="none" />
          
          {/* Perna Traseira com Tênis Turquesa */}
          <path d="M 69 52 L 58 60 L 52 60" stroke="#FED7AA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <rect x="46" y="58" width="10" height="5" rx="2.5" fill="#2DD4BF" />
          
          {/* Perna Dianteira em Passada Larga */}
          <path d="M 75 52 L 83 62 L 91 63" stroke="#FED7AA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <rect x="88" y="61" width="11" height="5" rx="2.5" fill="#2DD4BF" />
        </svg>
      );

    case 'heart':
      // Coração amigável exibindo bíceps fortão e olhão fofo
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Ondas concêntricas de vitalidade */}
          <circle cx="72" cy="42" r="26" stroke="rgba(255,255,255,0.24)" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Braço Esquerdo Flexionado */}
          <path d="M 56 43 C 48 43, 44 36, 47 30 C 49 26, 54 28, 54 32" stroke="#DC2626" strokeWidth="5.2" strokeLinecap="round" fill="none" />
          
          {/* Braço Direito Fortão (Bíceps) */}
          <path d="M 86 43 C 94 43, 100 36, 96 28 C 94 24, 88 26, 88 31" stroke="#DC2626" strokeWidth="5.2" strokeLinecap="round" fill="none" />
          
          {/* Corpo do Coração */}
          <path 
            d="M 72 62 C 64 54, 52 46, 52 36 C 52 28, 58 23, 65 23 C 69 23, 71 26, 72 28 C 73 26, 75 23, 79 23 C 86 23, 92 28, 92 36 C 92 46, 80 54, 72 62 Z" 
            fill="#EF4444" 
          />
          
          {/* Olho Amigável com Brilho */}
          <circle cx="72" cy="36" r="6" fill="#FFFFFF" />
          <circle cx="73" cy="36" r="3.2" fill="#1E293B" />
          <circle cx="74" cy="35" r="1.2" fill="#FFFFFF" />
          
          {/* Sorrisão Confiante */}
          <path d="M 66 45 Q 72 51, 78 45" stroke="#991B1B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'gears':
      // Engrenagens interconectadas e estrelinhas de produtividade
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          {/* Engrenagem Menor Esquerda */}
          <g transform="translate(44, 48)">
            <circle cx="0" cy="0" r="14" fill="#A7F3D0" />
            <circle cx="0" cy="0" r="6" fill="#047857" />
            <rect x="-2" y="-17" width="4" height="34" rx="2" fill="#A7F3D0" />
            <rect x="-17" y="-2" width="34" height="4" rx="2" fill="#A7F3D0" />
          </g>
          
          {/* Engrenagem Maior Direita */}
          <g transform="translate(78, 38)">
            <circle cx="0" cy="0" r="22" fill="#FEF08A" />
            <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="4.5" fill="#047857" />
            {/* Dentes da engrenagem */}
            <rect x="-3" y="-26" width="6" height="52" rx="2.5" fill="#FEF08A" />
            <rect x="-26" y="-3" width="52" height="6" rx="2.5" fill="#FEF08A" />
            <rect x="-18" y="-18" width="36" height="36" rx="4" fill="#FEF08A" transform="rotate(45)" />
          </g>
          
          {/* Estrelas Brilhantes de Sucesso */}
          <path d="M 94 14 Q 96 18, 100 20 Q 96 22, 94 26 Q 92 22, 88 20 Q 92 18, 94 14 Z" fill="#FFFFFF" opacity="0.85" />
          <circle cx="34" cy="24" r="2.2" fill="#FFFFFF" opacity="0.75" />
        </svg>
      );

    default:
      return null;
  }
}

// =====================================================================
// COMPONENTE PRINCIPAL: WORKOUT TAB
// =====================================================================
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
  const [newWorkoutSubtitle, setNewWorkoutSubtitle] = useState('');
  const [newWorkoutTheme, setNewWorkoutTheme] = useState('orange');
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

  // Contagem de séries feitas por exercício: { [exerciseId]: number }
  const [completedSetsMap, setCompletedSetsMap] = useState({});

  // Treinos concluídos na data de hoje: { [workoutId]: boolean }
  const [completedWorkoutsToday, setCompletedWorkoutsToday] = useState({});

  // Cronômetro de Descanso por atividade
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

  // Marcar/desmarcar séries feitas de um exercício
  const handleSetCountChange = (ex, nextDoneCount, autoRest = false) => {
    const totalSets = Math.max(1, Number(ex.sets) || 1);
    const clamped = Math.max(0, Math.min(totalSets, nextDoneCount));
    const prevDone = completedSetsMap[ex.id] || 0;

    setCompletedSetsMap(prev => ({
      ...prev,
      [ex.id]: clamped
    }));

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
      subtitle: newWorkoutSubtitle.trim() || 'Foco em força e hipertrofia progressiva',
      theme: newWorkoutTheme || 'orange',
      scheduledDays: newWorkoutDays,
      scheduledTime: newWorkoutTime || '18:30',
      exercises: []
    };

    setWorkouts(prev => [...prev, newWorkoutObj]);
    setActiveWorkoutId(newId);
    setNewWorkoutName('');
    setNewWorkoutSubtitle('');
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

  // Estimativa de volume de carga movimentada hoje
  const totalEstimatedWeightMoved = currentExercises.reduce((acc, ex) => {
    const done = completedSetsMap[ex.id] || 0;
    const repsCount = Number(ex.reps) || 10;
    const kg = Number(ex.weightKg) || 0;
    return acc + (done * repsCount * kg);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* ================================================================== */}
      {/* TOP CARDS: MÉTRICAS E RELATÓRIOS (MANTIDOS E APRIMORADOS)          */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* CARD 1 (7 COLUNAS): PROGRESSO DA SESSÃO & FORÇA */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#211F38" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0, letterSpacing: '-0.01em' }}>
                  Progresso da Sessão
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#5A5B75', marginTop: '2px', display: 'block' }}>
                {totalDoneSets} de {totalTargetSets} séries executadas ({completedExercisesCount}/{currentExercises.length} exercícios concluídos)
              </span>
            </div>

            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: isWorkoutCompleted ? '#10B981' : '#211F38',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isWorkoutCompleted ? <CheckCircle2 size={13} /> : null}
              {isWorkoutCompleted ? 'Treino Concluído' : `${effectiveProgress}% Concluído`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3A3C58', lineHeight: 1.3 }}>
              Strength<br />Gains
            </div>

            <div style={{ flex: 1, maxWidth: '170px', height: '52px' }}>
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
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="26" r="3" fill="#211F38" />
                <circle cx="72" cy="27" r="3" fill="#211F38" />
                <circle cx="118" cy="6" r="3.2" fill="#211F38" />
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
                  stroke={isWorkoutCompleted ? '#10B981' : '#211F38'}
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
                  color: isWorkoutCompleted ? '#059669' : '#1A1B2F'
                }}
              >
                {effectiveProgress}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(33, 31, 56, 0.08)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4E506B', backgroundColor: 'rgba(33, 31, 56, 0.06)', padding: '3px 9px', borderRadius: '8px' }}>
              ✓ {totalDoneSets}/{totalTargetSets} Séries
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4E506B', backgroundColor: 'rgba(33, 31, 56, 0.06)', padding: '3px 9px', borderRadius: '8px' }}>
              🏋️ {totalEstimatedWeightMoved} kg movimentados
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '3px 9px', borderRadius: '8px' }}>
              +50 pts por sessão
            </span>
          </div>
        </div>

        {/* CARD 2 (5 COLUNAS): RELATÓRIO SEMANAL & CONSISTÊNCIA */}
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
          className="lg:col-span-5"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#211F38" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                  Frequência Semanal
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                Consistência e divisão das rotinas
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEE2E2', padding: '4px 10px', borderRadius: '999px', color: '#DC2626', fontSize: '11.5px', fontWeight: 700 }}>
              <Flame size={14} />
              <span>7 Dias Streak</span>
            </div>
          </div>

          {/* Calendário Semanal com Indicadores */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
              const hasWorkout = workouts.some(w => (w.scheduledDays || []).includes(dIdx));
              const isToday = new Date().getDay() === dIdx;

              return (
                <div
                  key={dName}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '12px',
                    backgroundColor: isToday ? '#211F38' : hasWorkout ? 'rgba(86, 84, 138, 0.14)' : 'rgba(33, 31, 56, 0.05)',
                    color: isToday ? '#FFFFFF' : '#1A1B2F',
                    border: isToday ? '1px solid #211F38' : '1px solid transparent'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, opacity: isToday ? 0.8 : 0.6 }}>
                    {dName}
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
                    {hasWorkout ? (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isToday ? '#34D399' : '#56548A' }} />
                    ) : (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'transparent' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(33, 31, 56, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#56548A' }}>
              <Layers size={14} />
              <span>{workouts.length} fichas configuradas</span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewWorkoutModal(true)}
              style={{
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={13} />
              <span>Nova Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEÇÃO ABAIXO DAS MÉTRICAS: CARDS ESTILO HEADSPACE (REFERÊNCIA)     */}
      {/* ================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1B2F', margin: 0, letterSpacing: '-0.01em' }}>
              Minhas Fichas de Treino & Rotinas
            </h3>
            <span style={{ fontSize: '12.5px', color: '#5A5B75' }}>
              Selecione uma ficha abaixo para visualizar os exercícios ou iniciar sua sessão
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
              padding: '8px 18px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(33, 31, 56, 0.2)'
            }}
          >
            <Plus size={14} />
            <span>Adicionar Ficha</span>
          </button>
        </div>

        {/* LISTA DE CARDS ESTILO HEADSPACE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {workouts.map((w, idx) => {
            const theme = getWorkoutTheme(w, idx);
            const isActive = w.id === activeWorkoutId;
            const isDone = !!completedWorkoutsToday[w.id];
            const exerciseCount = w.exercises?.length || 0;
            const targetSets = w.exercises?.reduce((acc, ex) => acc + Math.max(1, Number(ex.sets) || 1), 0) || 0;

            return (
              <div key={w.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* CARD VISUAL PRINCIPAL FIEL À IMAGEM DE REFERÊNCIA */}
                <div
                  onClick={() => setActiveWorkoutId(w.id)}
                  style={{
                    background: theme.gradient,
                    borderRadius: '24px',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 12px 32px rgba(0,0,0,0.18)' : '0 6px 18px rgba(0,0,0,0.06)',
                    border: isActive ? '2.5px solid #FFFFFF' : '1.5px solid rgba(255,255,255,0.22)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isActive ? 'scale(1.008)' : 'scale(1)'
                  }}
                >
                  {/* LADO ESQUERDO: TÍTULO, SUBTÍTULO E TAGS */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '16px', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h4
                        style={{
                          fontSize: '19px',
                          fontWeight: 800,
                          color: theme.textColor,
                          margin: 0,
                          letterSpacing: '-0.01em',
                          textShadow: '0 1px 2px rgba(0,0,0,0.12)'
                        }}
                      >
                        {w.name}
                      </h4>

                      {isActive && (
                        <span
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.28)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            border: '1px solid rgba(255, 255, 255, 0.4)'
                          }}
                        >
                          ● Ativo Agora
                        </span>
                      )}

                      {isDone && (
                        <span
                          style={{
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Concluído (+50 pts)
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '13px',
                        color: theme.subColor,
                        margin: 0,
                        lineHeight: 1.4,
                        fontWeight: 500,
                        textShadow: '0 1px 2px rgba(0,0,0,0.08)'
                      }}
                    >
                      {w.subtitle || `${exerciseCount} exercícios • ${targetSets} séries • Foco em execução e hipertrofia`}
                    </p>

                    {/* DIAS AGENDADOS NA SEMANA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: theme.subColor, opacity: 0.9 }}>
                        Dias:
                      </span>
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
                        const isDay = (w.scheduledDays || []).includes(dIdx);
                        if (!isDay) return null;
                        return (
                          <span
                            key={dName}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(255,255,255,0.22)',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {dName}
                          </span>
                        );
                      })}
                      {(!w.scheduledDays || w.scheduledDays.length === 0) && (
                        <span style={{ fontSize: '10.5px', color: theme.subColor, opacity: 0.8 }}>
                          Livre / Sem agendamento
                        </span>
                      )}

                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, opacity: 0.95 }}>
                        {isActive ? 'Expandido' : 'Clique para treinar'}
                        {isActive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {/* LADO DIREITO: ILUSTRAÇÃO TEMÁTICA ESTILO HEADSPACE */}
                  <div style={{ flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CardIllustration type={theme.illustration} />
                  </div>
                </div>

                {/* PAINEL EXPANSÍVEL: ROTINA ATIVA COM CONTROLE DE EXERCÍCIOS, SÉRIES E DESCANSO */}
                {isActive && (
                  <div
                    style={{
                      backgroundColor: '#211F38',
                      borderRadius: '24px',
                      padding: '22px',
                      marginTop: '10px',
                      marginBottom: '10px',
                      color: '#FFFFFF',
                      boxShadow: '0 16px 36px rgba(33, 31, 56, 0.22)',
                      animation: 'fadeIn 0.25s ease'
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
                          <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
                            Rotina: {currentWorkout?.name}
                          </h2>
                          <span
                            style={{
                              backgroundColor: '#E6E7F2',
                              color: '#1A1B2F',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '999px'
                            }}
                          >
                            Hipertrofia & Força
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#A9ABC6', margin: '4px 0 0 0' }}>
                          Marque cada série executada e utilize o cronômetro para controlar o descanso entre as séries.
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
                            fontSize: '12px',
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
                              fontSize: '12px',
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
                              fontSize: '12px',
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
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dias de Agendamento da Ficha */}
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#D5D7E8', fontWeight: 600 }}>
                        <CalendarCheck size={14} color="#A6B4E8" />
                        <span>Dias agendados na Agenda Semanal:</span>
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
                                backgroundColor: isSelected ? '#56548A' : 'rgba(255, 255, 255, 0.08)',
                                color: isSelected ? '#FFFFFF' : '#A9ABC6',
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

                    {/* LISTA DE EXERCÍCIOS */}
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
                              {/* Linha superior: Check geral, nome, meta, carga, descanso, ações */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '14px',
                                  flexWrap: 'wrap'
                                }}
                              >
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

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  {/* Cronômetro e Seletor de Descanso */}
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

                                  {/* Ajuste de Carga */}
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
                                          fontSize: '13px',
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

                                  {/* Botões Editar / Excluir Exercício */}
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

                              {/* Barra de Marcação de Séries Feitas */}
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
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAIS FUNCIONAIS
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
                <label className="form-label">Nome da Ficha de Treino</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Treino D • Ombros & Abdômen"
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subtítulo / Descrição do Foco</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Elevação lateral, desenvolvimento e pranchas • Hipertrofia"
                  value={newWorkoutSubtitle}
                  onChange={(e) => setNewWorkoutSubtitle(e.target.value)}
                />
              </div>

              {/* Seletor de Tema Visual */}
              <div className="form-group">
                <label className="form-label">Estilo Visual do Card</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {WORKOUT_THEMES.map((theme) => {
                    const isSelected = newWorkoutTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setNewWorkoutTheme(theme.id)}
                        style={{
                          background: theme.gradient,
                          color: '#FFFFFF',
                          border: isSelected ? '2.5px solid #FFFFFF' : '1px solid transparent',
                          borderRadius: '12px',
                          padding: '10px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.25)' : 'none'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
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