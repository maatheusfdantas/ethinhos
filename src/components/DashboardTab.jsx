import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Plus, 
  Minus, 
  Droplets, 
  Moon, 
  Dumbbell, 
  BookOpen, 
  Bookmark, 
  Home, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Clock,
  Sparkles,
  Calendar,
  Tag,
  Target,
  X,
  Sliders
} from 'lucide-react';
import { isEventForDate } from '../services/storage';

const CATEGORY_ICONS = {
  Faculdade: BookOpen,
  Trabalho: Bookmark,
  Saúde: Dumbbell,
  Casa: Home,
  Pessoal: Sparkles,
  Finanças: Activity,
  CheckCircle2: CheckCircle2
};

const DEFAULT_PALETTES = [
  { name: 'Roxo', color: '#6A67CE', bg: 'rgba(106, 103, 206, 0.14)' },
  { name: 'Esmeralda', color: '#10B981', bg: 'rgba(16, 185, 129, 0.14)' },
  { name: 'Rosa', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.14)' },
  { name: 'Âmbar', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)' },
  { name: 'Azul', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)' },
  { name: 'Violeta', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.14)' }
];

export function DashboardTab({
  habits = [],
  setHabits,
  events = [],
  workouts = [],
  health = {},
  setHealth,
  tags = [],
  user = null,
  onOpenAdd,
  onOpenWorkout,
  onAddTag,
  onDeleteTag,
  onToggleEvent,
  onSwitchTab,
  showToast
}) {
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  
  // Estados do Ciclo de Sono
  const [sleepEditMode, setSleepEditMode] = useState(false);
  const [bedTimeInput, setBedTimeInput] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeTimeInput, setWakeTimeInput] = useState(health?.sleep?.wakeTime || '07:00');

  // Estados da Hidratação Diária (Meta de Copos e ml por copo)
  const [waterEditMode, setWaterEditMode] = useState(false);
  const [waterTargetInput, setWaterTargetInput] = useState(health?.waterTarget || 10);
  const [glassMlInput, setGlassMlInput] = useState(health?.glassMl || 250);

  // Estados de Categorias / Temas
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_PALETTES[0]);

  // Estado de criação rápida inline de hábito
  const [quickHabitInput, setQuickHabitInput] = useState('');

  useEffect(() => {
    if (health?.waterTarget) setWaterTargetInput(health.waterTarget);
    if (health?.glassMl) setGlassMlInput(health.glassMl);
  }, [health?.waterTarget, health?.glassMl]);

  useEffect(() => {
    if (health?.sleep?.bedTime) setBedTimeInput(health.sleep.bedTime);
    if (health?.sleep?.wakeTime) setWakeTimeInput(health.sleep.wakeTime);
  }, [health?.sleep?.bedTime, health?.sleep?.wakeTime]);

  // Pesos para ordenação por prioridade (Alta > Média > Baixa)
  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

  // Filtra compromissos e fichas de treino agendados para HOJE
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split('T')[0];
  const todayDayOfWeek = todayDateObj.getDay();

  const todayEvents = events
    .filter(e => isEventForDate(e, todayStr))
    .sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));

  const todayScheduledWorkouts = (workouts || []).filter(w => (w.scheduledDays || []).includes(todayDayOfWeek));

  // 1. Cálculo de Tarefas
  const totalTasks = habits.length;
  const completedTasks = habits.filter(h => h.completed).length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Cálculo de Hidratação
  const waterGlasses = health?.waterGlasses || 0;
  const waterTarget = health?.waterTarget || 10;
  const glassMl = health?.glassMl || 250;
  const waterPercent = Math.min(100, Math.round((waterGlasses / Math.max(1, waterTarget)) * 100));

  // 3. Cálculo de Horas de Sono
  const calculateSleepHours = (bed, wake) => {
    try {
      if (!bed || !wake) return 0;
      const [bH, bM] = String(bed).split(':').map(Number);
      const [wH, wM] = String(wake).split(':').map(Number);
      if (isNaN(bH) || isNaN(bM) || isNaN(wH) || isNaN(wM)) return 0;
      let diffMins = (wH * 60 + wM) - (bH * 60 + bM);
      if (diffMins < 0) diffMins += 24 * 60;
      return +(diffMins / 60).toFixed(1);
    } catch {
      return 8.0;
    }
  };

  const currentBedTime = health?.sleep?.bedTime || bedTimeInput || '23:30';
  const currentWakeTime = health?.sleep?.wakeTime || wakeTimeInput || '07:00';
  const sleepHours = calculateSleepHours(currentBedTime, currentWakeTime);
  const sleepPercent = Math.min(100, Math.round((sleepHours / (health?.sleep?.targetHours || 8)) * 100));

  // Índice Geral de Vitalidade Diária (40% Tarefas + 30% Água + 30% Sono)
  const vitalityScore = Math.round(
    (taskProgressPercent * 0.4) + 
    (waterPercent * 0.3) + 
    (sleepPercent * 0.3)
  );

  let vitalityStatus = 'Iniciando';
  let statusBadgeStyle = { bg: 'rgba(255,255,255,0.12)', color: '#E2E4F0' };
  if (vitalityScore >= 80) {
    vitalityStatus = 'Excelente';
    statusBadgeStyle = { bg: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' };
  } else if (vitalityScore >= 50) {
    vitalityStatus = 'Consistente';
    statusBadgeStyle = { bg: 'rgba(106, 103, 206, 0.35)', color: '#E0E7FF' };
  } else if (vitalityScore > 0) {
    vitalityStatus = 'Em Evolução';
    statusBadgeStyle = { bg: 'rgba(245, 158, 11, 0.22)', color: '#FDE68A' };
  }

  // Hábitos pendentes ordenados por prioridade e Hábitos concluídos
  const pendingHabits = habits
    .filter(h => !h.completed)
    .sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

  const completedHabits = habits.filter(h => h.completed);

  // Handlers de Hidratação
  const handleAddWater = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newGlasses = waterGlasses + 1;
    const newHistory = [...(health.waterHistory || []), { id: Date.now(), timestamp: timeStr, amountMl: glassMl }];
    const nextHealth = {
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory,
      waterTarget,
      glassMl
    };
    setHealth(nextHealth);
    if (user) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextHealth)
      }).catch(() => {});
    }
  };

  const handleDeleteLastWater = () => {
    if (waterGlasses <= 0) return;
    const newGlasses = waterGlasses - 1;
    const newHistory = (health.waterHistory || []).slice(0, -1);
    const nextHealth = {
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory,
      waterTarget,
      glassMl
    };
    setHealth(nextHealth);
    if (user) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextHealth)
      }).catch(() => {});
    }
  };

  const handleSaveWaterOptions = (e) => {
    e.preventDefault();
    const newTarget = Math.max(1, parseInt(waterTargetInput, 10) || 10);
    const newMl = Math.max(50, parseInt(glassMlInput, 10) || 250);
    const nextHealth = {
      ...health,
      waterTarget: newTarget,
      glassMl: newMl
    };
    setHealth(nextHealth);
    setWaterEditMode(false);
    showToast?.(`Meta de hidratação salva: ${newTarget} copos de ${newMl}ml`);
    if (user) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextHealth)
      }).catch(() => {});
    }
  };

  // Handler de Sono
  const handleSaveSleep = (e) => {
    e.preventDefault();
    const calculatedHours = calculateSleepHours(bedTimeInput, wakeTimeInput);
    const nextHealth = {
      ...health,
      sleep: {
        ...(health.sleep || {}),
        bedTime: bedTimeInput,
        wakeTime: wakeTimeInput,
        hours: calculatedHours,
        logged: true
      }
    };
    setHealth(nextHealth);
    setSleepEditMode(false);
    showToast?.(`Ciclo de sono atualizado: ${calculatedHours}h`);
    if (user) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextHealth)
      }).catch(() => {});
    }
  };

  // Handlers de Hábitos
  const toggleHabit = async (id) => {
    const targetHabit = habits.find(h => h.id === id);
    const nextCompleted = targetHabit ? !targetHabit.completed : true;
    const nextCurrent = nextCompleted ? (targetHabit?.target || 1) : 0;

    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        return { ...h, completed: nextCompleted, current: nextCurrent };
      }
      return h;
    }));

    showToast?.(
      nextCompleted ? `Hábito "${targetHabit?.title || 'Rotina'}" concluído` : `Hábito "${targetHabit?.title || 'Rotina'}" desmarcado`,
      () => toggleHabit(id)
    );

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextCurrent, completed: nextCompleted })
        });
        await fetch(`/api/user/${user.id}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId: id,
            value: nextCurrent,
            statusOverride: nextCompleted ? 'done' : 'missed',
            note: nextCompleted ? 'Concluído no Dashboard' : 'Desmarcado'
          })
        });
      } catch (err) {
        console.error('Checkin sync error:', err);
      }
    }
  };

  const incrementHabit = async (id) => {
    const targetHabit = habits.find(h => h.id === id);
    const nextCurrent = Math.min(targetHabit?.target || 1, (targetHabit?.current || 0) + 1);
    const nextCompleted = nextCurrent >= (targetHabit?.target || 1);

    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        return { ...h, current: nextCurrent, completed: nextCompleted };
      }
      return h;
    }));

    if (nextCompleted) {
      showToast?.(`Meta atingida em "${targetHabit?.title}"!`, () => toggleHabit(id));
    }

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextCurrent, completed: nextCompleted })
        });
        await fetch(`/api/user/${user.id}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId: id,
            value: nextCurrent,
            statusOverride: nextCompleted ? 'done' : 'partial',
            note: `Incrementado para ${nextCurrent}`
          })
        });
      } catch (err) {
        console.error('Checkin sync error:', err);
      }
    }
  };

  // Criar Categoria / Tema
  const handleCreateTagSubmit = (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    onAddTag({
      id: `tag_${Date.now()}`,
      name: newTagName.trim(),
      color: newTagColor.color,
      bg: newTagColor.bg,
      icon: 'Tag'
    });

    showToast?.(`Categoria "${newTagName.trim()}" adicionada`);
    setNewTagName('');
    setShowTagCreator(false);
  };

  // Criar hábito rápido inline
  const handleQuickHabitKeyDown = (e) => {
    if (e.key === 'Enter' && quickHabitInput.trim()) {
      e.preventDefault();
      const title = quickHabitInput.trim();
      const newHabit = {
        id: `hab_${Date.now()}`,
        title,
        category: tags[0]?.name || 'Pessoal',
        priority: 'Média',
        effort: 'Médio',
        current: 0,
        target: 1,
        unit: 'vez',
        completed: false,
        completionStyle: 'quick',
        repeatDays: [0, 1, 2, 3, 4, 5, 6]
      };
      setHabits(prev => [newHabit, ...prev]);
      setQuickHabitInput('');
      showToast?.(`Hábito "${title}" criado`, () => {
        setHabits(prev => prev.filter(h => h.id !== newHabit.id));
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* ================================================================== */}
      {/* LINHA 1: ÍNDICE GERAL DE VITALIDADE DIÁRIA + AGENDA DE HOJE        */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* CARD 1: ÍNDICE GERAL DE VITALIDADE DIÁRIA (DARK PLUM #211F38) */}
        <div 
          style={{
            backgroundColor: '#211F38',
            borderRadius: '26px',
            padding: '24px',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 14px 34px rgba(33, 31, 56, 0.18)'
          }}
          className="lg:col-span-7"
        >
          <div>
            {/* Topo: Título + Status Atual (Iniciando, Em Evolução, Consistente, Excelente) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#A9ABC6', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                  Resumo de Vitalidade
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', margin: '2px 0 0 0' }}>
                  Índice Geral de Vitalidade Diária
                </h2>
              </div>

              <span
                style={{
                  padding: '5px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: statusBadgeStyle.bg,
                  color: statusBadgeStyle.color
                }}
              >
                {vitalityStatus}
              </span>
            </div>

            {/* Pontuação de 0 a 100 + Pesos */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '42px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                  {vitalityScore}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#A9ABC6' }}>
                  / 100 PONTOS
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#A9ABC6', fontWeight: 500 }}>
                40% Tarefas • 30% Água • 30% Sono
              </span>
            </div>

            {/* Barra de Progresso de Vitalidade */}
            <div style={{ width: '100%', height: '8px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '18px' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, vitalityScore))}%`,
                  height: '100%',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, #6A67CE 0%, #38BDF8 50%, #34D399 100%)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* 3 Sub-cards de Resumo (Tarefas, Água, Sono) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sub-card 1: Tarefas */}
            <div
              style={{
                backgroundColor: '#353358',
                borderRadius: '18px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#D0D2E8', fontWeight: 500 }}>
                  Tarefas ({taskProgressPercent}%)
                </span>
                <Target size={14} color="#A5B4FC" />
              </div>
              <div style={{ fontSize: '19px', fontWeight: 700, color: '#FFFFFF' }}>
                {completedTasks}/{totalTasks} <span style={{ fontSize: '12px', fontWeight: 500, color: '#C5C7DE' }}>Feitas</span>
              </div>
            </div>

            {/* Sub-card 2: Água */}
            <div
              style={{
                backgroundColor: '#353358',
                borderRadius: '18px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#D0D2E8', fontWeight: 500 }}>
                  Água ({waterPercent}%)
                </span>
                <Droplets size={14} color="#38BDF8" />
              </div>
              <div style={{ fontSize: '19px', fontWeight: 700, color: '#FFFFFF' }}>
                {((waterGlasses * glassMl) / 1000).toFixed(2)}L <span style={{ fontSize: '12px', fontWeight: 500, color: '#C5C7DE' }}>/ {((waterTarget * glassMl) / 1000).toFixed(2)}L</span>
              </div>
            </div>

            {/* Sub-card 3: Sono */}
            <div
              style={{
                backgroundColor: '#353358',
                borderRadius: '18px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#D0D2E8', fontWeight: 500 }}>
                  Sono ({sleepPercent}%)
                </span>
                <Moon size={14} color="#FDE68A" />
              </div>
              <div style={{ fontSize: '19px', fontWeight: 700, color: '#FFFFFF' }}>
                {sleepHours}h <span style={{ fontSize: '11px', fontWeight: 400, color: '#C5C7DE' }}>({currentBedTime}-{currentWakeTime})</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: AGENDA DE HOJE (COMPROMISSOS DO DIA + FICHAS DE TREINO DO DIA) */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '26px',
            padding: '24px',
            color: '#1A1B2F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.68)',
            boxShadow: '0 12px 32px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)'
          }}
          className="lg:col-span-5"
        >
          <div>
            {/* Header da Agenda de Hoje */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#56548A' }} />
                <h3 style={{ fontSize: '16.5px', fontWeight: 600, color: '#1A1B2F', margin: 0 }}>
                  Agenda de Hoje
                </h3>
                <span
                  style={{
                    padding: '2px 9px',
                    borderRadius: '999px',
                    backgroundColor: '#E5E5EE',
                    color: '#1A1B2F',
                    fontSize: '11.5px',
                    fontWeight: 600
                  }}
                >
                  {todayEvents.length + todayScheduledWorkouts.length}
                </span>
              </div>

              <button
                type="button"
                onClick={onOpenAdd}
                style={{
                  padding: '6px 13px',
                  borderRadius: '999px',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} />
                <span>Agendar</span>
              </button>
            </div>

            {/* Lista de Treinos Programados para Hoje + Compromissos de Hoje */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '215px', overflowY: 'auto', paddingRight: '2px' }}>
              
              {/* Fichas de treino programadas para o dia da semana atual */}
              {todayScheduledWorkouts.map((w) => (
                <div
                  key={`wo_${w.id}`}
                  style={{
                    backgroundColor: '#EBEBF2',
                    borderRadius: '16px',
                    padding: '11px 14px',
                    borderLeft: '4px solid #56548A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#56548A' }}>
                        {w.scheduledTime || '18:30'}
                      </span>
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '6px', backgroundColor: '#D8D8E6', color: '#211F38', fontWeight: 600 }}>
                        Treino do Dia
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1B2F', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenWorkout}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: '#56548A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <Dumbbell size={12} />
                    <span>Abrir</span>
                  </button>
                </div>
              ))}

              {/* Compromissos agendados para a data de hoje com Check imediato */}
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    backgroundColor: ev.completed ? '#F0F0F5' : '#EBEBF2',
                    borderRadius: '16px',
                    padding: '11px 14px',
                    borderLeft: `4px solid ${ev.completed ? '#10B981' : '#3B82F6'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    opacity: ev.completed ? 0.75 : 1
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3B82F6' }}>
                        {ev.allDay ? 'Dia Todo' : `${ev.startTime} - ${ev.endTime}`}
                      </span>
                      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '6px', backgroundColor: '#D8D8E6', color: '#1A1B2F', fontWeight: 500 }}>
                        {ev.category}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1B2F', marginTop: '2px', textDecoration: ev.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.title}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleEvent?.(ev.id, !ev.completed)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      backgroundColor: ev.completed ? '#10B981' : '#FFFFFF',
                      color: ev.completed ? '#FFFFFF' : '#1A1B2F',
                      border: ev.completed ? 'none' : '1px solid #C5C7DE',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>{ev.completed ? 'Feito' : 'Check'}</span>
                  </button>
                </div>
              ))}

              {todayEvents.length === 0 && todayScheduledWorkouts.length === 0 && (
                <div
                  style={{
                    backgroundColor: '#EBEBF2',
                    borderRadius: '18px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#5A5B75',
                    fontSize: '12.5px'
                  }}
                >
                  <Calendar size={22} style={{ margin: '0 auto 6px', opacity: 0.6 }} />
                  <div>Nenhum compromisso marcado para hoje.</div>
                  <div style={{ fontSize: '11px', color: '#7E7F9A', marginTop: '2px' }}>
                    Clique em "Agendar" para adicionar um evento na data de hoje.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ paddingTop: '12px', marginTop: '10px', borderTop: '1px solid #E2E2EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#5A5B75' }}>
            <span>Sincronizado com Agenda Semanal</span>
            <button
              type="button"
              onClick={() => onSwitchTab?.('calendar')}
              style={{ background: 'none', border: 'none', color: '#56548A', fontWeight: 700, cursor: 'pointer', fontSize: '11.5px' }}
            >
              Ver Calendário →
            </button>
          </div>
        </div>

      </div>

      {/* ================================================================== */}
      {/* LINHA 2: HIDRATAÇÃO DIÁRIA + CICLO DE SONO + CATEGORIAS / TEMAS    */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        
        {/* COLUNA 1: HIDRATAÇÃO DIÁRIA */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.52)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '26px',
            padding: '22px',
            color: '#1A1B2F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 12px 32px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#211F38', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Droplets size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1B2F', margin: 0 }}>Hidratação Diária</h3>
                  <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>
                    Meta: {waterTarget} copos ({(waterTarget * glassMl).toLocaleString('pt-BR')} ml)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setWaterEditMode(!waterEditMode)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: waterEditMode ? '#211F38' : '#DCDCE6',
                    color: waterEditMode ? '#FFFFFF' : '#1A1B2F',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {waterEditMode ? 'Fechar' : 'Opções'}
                </button>
                <span style={{ padding: '4px 9px', borderRadius: '999px', backgroundColor: '#211F38', color: '#FFFFFF', fontSize: '11px', fontWeight: 700 }}>
                  {waterPercent}%
                </span>
              </div>
            </div>

            {waterEditMode ? (
              <form onSubmit={handleSaveWaterOptions} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#5A5B75', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Meta (Copos):</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={waterTargetInput}
                      onChange={(e) => setWaterTargetInput(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #C5C7DE', backgroundColor: '#FFFFFF', fontSize: '12.5px', color: '#1A1B2F' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#5A5B75', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Volume (ml):</label>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      max="2000"
                      value={glassMlInput}
                      onChange={(e) => setGlassMlInput(e.target.value)}
                      required
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #C5C7DE', backgroundColor: '#FFFFFF', fontSize: '12.5px', color: '#1A1B2F' }}
                    />
                  </div>
                </div>

                {/* Atalhos de volume de copo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#5A5B75' }}>Volume rápido:</span>
                  {[200, 250, 300, 500].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGlassMlInput(preset)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: Number(glassMlInput) === preset ? '#56548A' : '#DCDCE6',
                        color: Number(glassMlInput) === preset ? '#FFFFFF' : '#1A1B2F'
                      }}
                    >
                      {preset}ml
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Meta de Água
                </button>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 14px 0' }}>
                  <div>
                    <span style={{ fontSize: '28px', fontWeight: 700, color: '#1A1B2F' }}>
                      {waterGlasses}
                    </span>
                    <span style={{ fontSize: '13px', color: '#5A5B75', fontWeight: 500, marginLeft: '6px' }}>
                      / {waterTarget} copos ({glassMl}ml)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleDeleteLastWater}
                      disabled={waterGlasses <= 0}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: '#DCDCE6',
                        color: '#1A1B2F',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: waterGlasses <= 0 ? 'not-allowed' : 'pointer',
                        opacity: waterGlasses <= 0 ? 0.4 : 1
                      }}
                      title="Remover 1 copo"
                    >
                      <Minus size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleAddWater}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Adicionar +1 copo"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', backgroundColor: '#DCDCE6', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, waterPercent)}%`,
                        height: '100%',
                        borderRadius: '999px',
                        backgroundColor: '#56548A',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#5A5B75', fontWeight: 500 }}>
                    <span>{(waterGlasses * glassMl).toLocaleString('pt-BR')} ml ingeridos</span>
                    <span>Faltam {(Math.max(0, waterTarget - waterGlasses) * glassMl).toLocaleString('pt-BR')} ml</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COLUNA 2: CICLO DE SONO */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '26px',
            padding: '22px',
            color: '#1A1B2F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.68)',
            boxShadow: '0 12px 32px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#211F38', color: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Moon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1B2F', margin: 0 }}>Ciclo de Sono</h3>
                  <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>Registro diário de descanso</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSleepEditMode(!sleepEditMode)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  backgroundColor: sleepEditMode ? '#211F38' : '#E5E5EE',
                  color: sleepEditMode ? '#FFFFFF' : '#1A1B2F',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {sleepEditMode ? 'Fechar' : 'Ajustar'}
              </button>
            </div>

            {sleepEditMode ? (
              <form onSubmit={handleSaveSleep} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#5A5B75', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Dormiu às:</label>
                    <input
                      type="time"
                      value={bedTimeInput}
                      onChange={(e) => setBedTimeInput(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #C5C7DE', backgroundColor: '#FFFFFF', fontSize: '12.5px', color: '#1A1B2F' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#5A5B75', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Acordou às:</label>
                    <input
                      type="time"
                      value={wakeTimeInput}
                      onChange={(e) => setWakeTimeInput(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '10px', border: '1px solid #C5C7DE', backgroundColor: '#FFFFFF', fontSize: '12.5px', color: '#1A1B2F' }}
                    />
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#56548A', fontWeight: 600 }}>
                  Total calculado: {calculateSleepHours(bedTimeInput, wakeTimeInput)}h de sono
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Horários
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#1A1B2F' }}>
                    {sleepHours}h <span style={{ fontSize: '13px', fontWeight: 500, color: '#5A5B75' }}>dormidas</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#5A5B75', marginTop: '4px' }}>
                    Das <strong>{currentBedTime}</strong> às <strong>{currentWakeTime}</strong>
                  </div>
                </div>

                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: sleepHours >= 7 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.18)',
                    color: sleepHours >= 7 ? '#047857' : '#B45309'
                  }}
                >
                  {sleepHours >= 7 ? 'Sono Ideal (≥7h)' : 'Sono Curto (<7h)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA 3: CATEGORIAS / TEMAS */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.52)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '26px',
            padding: '22px',
            color: '#1A1B2F',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 12px 32px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#211F38', color: '#C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1B2F', margin: 0 }}>Categorias / Temas</h3>
                  <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>{tags.length} temas ativos</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTagCreator(!showTagCreator)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} />
                <span>{showTagCreator ? 'Fechar' : 'Nova'}</span>
              </button>
            </div>

            {/* Criador Rápido Inline de Categorias com Paleta */}
            {showTagCreator && (
              <form onSubmit={handleCreateTagSubmit} style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '14px', marginBottom: '12px', border: '1px solid #D5D6E0' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Nome da categoria..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    autoFocus
                    required
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #C5C7DE', fontSize: '12px', color: '#1A1B2F', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#56548A', color: '#FFFFFF', border: 'none', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Adicionar
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 600 }}>Paleta:</span>
                  {DEFAULT_PALETTES.map((pal, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewTagColor(pal)}
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: pal.color,
                        border: newTagColor.color === pal.color ? '2px solid #1A1B2F' : '2px solid transparent',
                        cursor: 'pointer'
                      }}
                      title={pal.name}
                    />
                  ))}
                </div>
              </form>
            )}

            {/* Lista de Tags Coloridas com opção de Excluir */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', maxHeight: '115px', overflowY: 'auto' }}>
              {tags.map((t) => (
                <span
                  key={t.id || t.name}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '999px',
                    backgroundColor: '#FFFFFF',
                    border: `1.5px solid ${t.color || '#56548A'}`,
                    color: '#1A1B2F',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: t.color || '#56548A' }} />
                  <span>{t.name}</span>
                  {onDeleteTag && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTag(t.id, t.name);
                        showToast?.(`Categoria "${t.name}" excluída`, () => onAddTag?.(t));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7E7F9A',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={`Excluir ${t.name}`}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ================================================================== */}
      {/* LINHA 3: ROTINA DE HÁBITOS DIÁRIOS + ACORDEÃO DE CONCLUÍDOS        */}
      {/* ================================================================== */}
      <div
        style={{
          backgroundColor: '#211F38',
          borderRadius: '28px',
          padding: '26px',
          color: '#FFFFFF',
          boxShadow: '0 16px 38px rgba(33, 31, 56, 0.2)'
        }}
      >
        {/* Header da Rotina de Hábitos */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '14px', backgroundColor: '#56548A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>
                  Rotina de Hábitos Diários
                </h2>
                <span style={{ padding: '3px 10px', borderRadius: '999px', backgroundColor: '#353358', color: '#D0D2E8', fontSize: '11.5px', fontWeight: 600 }}>
                  {pendingHabits.length} Pendentes
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#A9ABC6' }}>
                Ordenados por prioridade (Alta, Média, Baixa) com controle de esforço e consistência
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAdd}
            style={{
              padding: '9px 18px',
              borderRadius: '999px',
              backgroundColor: '#56548A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(86, 84, 138, 0.4)'
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Adicionar Hábito</span>
          </button>
        </div>

        {/* Campo de Criação Rápida Inline ("Criar hábito rápido... Pressione Enter") */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '16px',
            backgroundColor: '#2C2A4A',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '18px'
          }}
        >
          <Plus size={16} color="#A9ABC6" />
          <input
            type="text"
            placeholder="Criar hábito rápido... (Pressione Enter)"
            value={quickHabitInput}
            onChange={(e) => setQuickHabitInput(e.target.value)}
            onKeyDown={handleQuickHabitKeyDown}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Lista de Hábitos Pendentes Ordenados por Prioridade */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pendingHabits.length === 0 ? (
            <div
              style={{
                backgroundColor: '#2C2A4A',
                borderRadius: '20px',
                padding: '28px 20px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <CheckCircle2 size={28} color="#34D399" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                Todos os hábitos de hoje foram concluídos!
              </div>
              <div style={{ fontSize: '12px', color: '#A9ABC6', marginTop: '4px' }}>
                Use o campo acima ou clique em "+ Adicionar Hábito" para criar uma nova rotina.
              </div>
            </div>
          ) : (
            pendingHabits.map((habit) => {
              const IconComponent = CATEGORY_ICONS[habit.category] || BookOpen;
              const habitTag = tags.find(t => t.id === habit.tagId || t.name === habit.category);
              const progress = habit.target > 0 ? Math.round((habit.current / habit.target) * 100) : 0;

              const priorityColors = habit.priority === 'Alta'
                ? { bg: 'rgba(244, 63, 94, 0.2)', color: '#FDA4AF', dot: '#F43F5E' }
                : habit.priority === 'Baixa'
                  ? { bg: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7', dot: '#10B981' }
                  : { bg: 'rgba(245, 158, 11, 0.2)', color: '#FDE68A', dot: '#F59E0B' };

              return (
                <div
                  key={habit.id}
                  style={{
                    backgroundColor: '#353358',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    border: '1px solid rgba(255,255,255,0.07)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#211F38',
                        color: '#C4B5FD',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <IconComponent size={19} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Linha de Título + Categoria + Prioridade + Esforço */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#FFFFFF' }}>
                          {habit.title}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 9px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: habitTag?.color || '#E2E4F0',
                            fontWeight: 600
                          }}
                        >
                          {habit.category || 'Geral'}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 9px',
                            borderRadius: '999px',
                            backgroundColor: priorityColors.bg,
                            color: priorityColors.color,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: priorityColors.dot }} />
                          Prioridade {habit.priority || 'Média'}
                        </span>

                        <span style={{ fontSize: '11px', color: '#A9ABC6' }}>
                          Esforço: <strong>{habit.effort || 'Médio'}</strong>
                        </span>
                      </div>

                      {/* Barra de Progresso do Hábito */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${progress}%`,
                              height: '100%',
                              borderRadius: '999px',
                              backgroundColor: '#A5B4FC',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#D0D2E8', fontWeight: 600, flexShrink: 0 }}>
                          {habit.current} / {habit.target} {habit.unit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Conclusão: Toque Rápido ou Incremento Numérico (+1) */}
                  {habit.completionStyle === 'numeric' || (habit.target && habit.target > 1) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => incrementHabit(habit.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '12px',
                          backgroundColor: '#56548A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Incrementar +1 no progresso"
                      >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>+1</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleHabit(habit.id)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Concluir tudo agora"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleHabit(habit.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#56548A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="Marcar hábito como concluído"
                    >
                      <Check size={15} strokeWidth={2.5} />
                      <span>Concluir</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Acordeão de Hábitos Concluídos (Seção recolhível com botão "Desfazer") */}
        {completedHabits.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                backgroundColor: '#2C2A4A',
                color: '#E2E4F0',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34D399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span>Hábitos Concluídos Hoje ({completedHabits.length})</span>
              </div>
              {showCompletedAccordion ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>

            {showCompletedAccordion && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {completedHabits.map((habit) => (
                  <div
                    key={habit.id}
                    style={{
                      backgroundColor: '#2A2845',
                      borderRadius: '14px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      opacity: 0.85
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#C5C7DE', textDecoration: 'line-through' }}>
                          {habit.title}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8E90B0' }}>
                          {habit.category} • {habit.target} {habit.unit} • Concluído
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleHabit(habit.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#E2E4F0',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      Desfazer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
