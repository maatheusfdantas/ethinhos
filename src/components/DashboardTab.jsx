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
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  MapPin,
  Tag,
  Palette,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react';

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
  { name: 'Ciano', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' },
  { name: 'Índigo', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  { name: 'Esmeralda', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { name: 'Rosa', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  { name: 'Âmbar', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { name: 'Violeta', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' }
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
  onToggleEvent,
  onSwitchTab
}) {
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  const [sleepEditMode, setSleepEditMode] = useState(false);
  const [bedTimeInput, setBedTimeInput] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeTimeInput, setWakeTimeInput] = useState(health?.sleep?.wakeTime || '07:00');

  // Customização de Água (Meta de Copos e ml por copo)
  const [waterEditMode, setWaterEditMode] = useState(false);
  const [waterTargetInput, setWaterTargetInput] = useState(health?.waterTarget || 10);
  const [glassMlInput, setGlassMlInput] = useState(health?.glassMl || 250);

  useEffect(() => {
    if (health?.waterTarget) setWaterTargetInput(health.waterTarget);
    if (health?.glassMl) setGlassMlInput(health.glassMl);
  }, [health?.waterTarget, health?.glassMl]);

  // Requisito 4: Criador inline de temas/categorias
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_PALETTES[0]);

  // Pesos para ordenação por prioridade
  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

  // Filter events and scheduled workouts for TODAY (ordenados por prioridade Alta > Média > Baixa)
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split('T')[0];
  const todayDayOfWeek = todayDateObj.getDay();
  const todayEvents = events
    .filter(e => e.date === todayStr)
    .sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));
  const todayScheduledWorkouts = (workouts || []).filter(w => (w.scheduledDays || []).includes(todayDayOfWeek));

  // Performance bar calculation
  const totalTasks = habits.length;
  const completedTasks = habits.filter(h => h.completed).length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Water calculation (com copos e ml customizáveis)
  const waterGlasses = health.waterGlasses || 0;
  const waterTarget = health.waterTarget || 10;
  const glassMl = health.glassMl || 250;
  const waterPercent = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));

  // Sleep calculation
  const calculateSleepHours = (bed, wake) => {
    try {
      const [bH, bM] = (bed || '23:30').split(':').map(Number);
      const [wH, wM] = (wake || '07:00').split(':').map(Number);
      let diffMins = (wH * 60 + wM) - (bH * 60 + bM);
      if (diffMins < 0) diffMins += 24 * 60;
      return +(diffMins / 60).toFixed(1);
    } catch {
      return 7.5;
    }
  };

  const sleepHours = calculateSleepHours(health?.sleep?.bedTime, health?.sleep?.wakeTime);
  const sleepPercent = health?.sleep?.logged 
    ? Math.min(100, Math.round((sleepHours / (health?.sleep?.targetHours || 8)) * 100))
    : 0;

  // Média de Vitalidade (40% tarefas + 30% água + 30% sono)
  const vitalityScore = Math.round(
    (taskProgressPercent * 0.4) + 
    (waterPercent * 0.3) + 
    (sleepPercent * 0.3)
  );

  let vitalityStatus = 'Iniciando';
  if (vitalityScore >= 80) vitalityStatus = 'Excelente';
  else if (vitalityScore >= 50) vitalityStatus = 'Consistente';
  else if (vitalityScore > 0) vitalityStatus = 'Em Evolução';

  // Hábitos pendentes ordenados por prioridade (Alta > Média > Baixa)
  const pendingHabits = habits
    .filter(h => !h.completed)
    .sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

  const completedHabits = habits.filter(h => h.completed);

  // Add water glass (usando glassMl configurado pelo usuário)
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

  // Delete last water glass
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

  // Salvar opções de água (quantos copos e quantos ml)
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
    if (user) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextHealth)
      }).catch(() => {});
    }
  };

  // US10: Save sleep
  const handleSaveSleep = (e) => {
    e.preventDefault();
    setHealth({
      ...health,
      sleep: {
        ...(health.sleep || {}),
        bedTime: bedTimeInput,
        wakeTime: wakeTimeInput,
        logged: true
      }
    });
    setSleepEditMode(false);
  };

  // Habit toggles with live checkin recording
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

  // Create Tag
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

    setNewTagName('');
    setShowTagCreator(false);
  };

  return (
    <div className="dashboard-view">
      {/* 1. VITALIDADE DIÁRIA HERO */}
      <div className="vitality-hero-card">
        <div className="vitality-header">
          <div>
            <span className="submetric-title">Índice Geral de Vitalidade Diária</span>
            <div className="vitality-score-block">
              <span className="vitality-number">{vitalityScore}</span>
              <span className="vitality-unit">/100</span>
            </div>
          </div>
          <span className="vitality-status-pill">{vitalityStatus}</span>
        </div>

        <div className="vitality-progress-bar-wrap">
          <div className="vitality-progress-fill" style={{ width: `${vitalityScore}%` }} />
        </div>

        <div className="vitality-submetrics">
          <div className="submetric-item">
            <span className="submetric-title">
              <CheckCircle2 size={14} color="var(--accent-cyan)" />
              Tarefas ({taskProgressPercent}%)
            </span>
            <span className="submetric-value">{completedTasks}/{totalTasks} Feitas</span>
          </div>

          <div className="submetric-item">
            <span className="submetric-title">
              <Droplets size={14} color="var(--accent-cyan)" />
              Água ({waterPercent}%)
            </span>
            <span className="submetric-value">{((waterGlasses * glassMl) / 1000).toFixed(2)}L / {((waterTarget * glassMl) / 1000).toFixed(2)}L</span>
          </div>

          <div className="submetric-item">
            <span className="submetric-title">
              <Moon size={14} color="var(--accent-indigo)" />
              Sono ({sleepPercent}%)
            </span>
            <span className="submetric-value">{health?.sleep?.logged ? `${sleepHours}h` : 'Não reg.'}</span>
          </div>
        </div>
      </div>

      {/* 2. REQUISITO 4: GERENCIADOR FÁCIL DE TEMAS & CATEGORIAS */}
      <div className="card-native" style={{ marginBottom: '22px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={18} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Temas & Categorias das Atividades
            </span>
          </div>

          <button 
            className="btn-secondary" 
            style={{ padding: '6px 14px', fontSize: '0.78rem', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
            onClick={() => setShowTagCreator(!showTagCreator)}
          >
            <Plus size={14} />
            {showTagCreator ? 'Fechar' : 'Nova Categoria / Tema'}
          </button>
        </div>

        {/* CRIADOR INLINE DE CATEGORIAS */}
        {showTagCreator && (
          <form onSubmit={handleCreateTagSubmit} style={{ background: 'var(--surface-elevated)', borderRadius: '12px', padding: '14px', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Cadastrar Novo Tema Personalizado:
            </span>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="Nome da Categoria (ex: Mestrado, Finanças, Academia)"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                autoFocus
                required
              />
              <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                Salvar Categoria
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Escolha uma cor de destaque:</span>
              {DEFAULT_PALETTES.map((pal, idx) => (
                <span 
                  key={idx}
                  onClick={() => setNewTagColor(pal)}
                  style={{ 
                    width: 22, 
                    height: 22, 
                    borderRadius: '50%', 
                    background: pal.color, 
                    cursor: 'pointer',
                    border: newTagColor.color === pal.color ? '2px solid #fff' : 'none'
                  }}
                  title={pal.name}
                />
              ))}
            </div>
          </form>
        )}

        {/* LISTAGEM DE CATEGORIAS ATIVAS */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <span 
              key={t.id || t.name}
              className="tag-badge"
              style={{
                padding: '6px 14px',
                border: `1px solid ${t.color}50`,
                background: t.bg,
                color: t.color,
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      {/* 3. REQUISITO 1: AGENDA & COMPROMISSOS COM DATA E HORÁRIO (ALOCAÇÃO CLARA) */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Calendar size={18} color="var(--accent-indigo)" />
          <h2 className="section-title">Agenda & Compromissos de Hoje</h2>
          <span className="section-badge" style={{ color: 'var(--accent-indigo)', borderColor: 'var(--accent-indigo)' }}>
            {todayEvents.length + todayScheduledWorkouts.length} Marcados
          </span>
        </div>

        <button 
          className="btn-secondary" 
          style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px' }}
          onClick={onOpenAdd}
        >
          <Plus size={14} />
          Agendar Evento
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {todayScheduledWorkouts.map((w) => (
          <div 
            key={`wo_${w.id}`}
            className="card-native" 
            style={{ 
              borderLeft: '4px solid var(--accent-rose)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={14} color="var(--accent-rose)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                  {w.scheduledTime || '18:30'}
                </span>
                <span className="priority-badge low" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>
                  Musculação
                </span>
              </div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {w.name}
              </h3>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {w.exercises?.length || 0} exercícios cadastrados nesta ficha
              </div>
            </div>

            <button 
              className="btn-secondary" 
              style={{ padding: '6px 14px', fontSize: '0.78rem', gap: '6px' }}
              onClick={onOpenWorkout}
            >
              <Dumbbell size={13} color="var(--accent-rose)" />
              Abrir Treino
            </button>
          </div>
        ))}

        {todayEvents.length === 0 && todayScheduledWorkouts.length === 0 ? (
          <div className="card-native" style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            Nenhum compromisso com data e horário marcado para hoje. Todos os seus eventos cadastrados ficam salvos na sua <strong>Agenda & Calendário</strong>.
          </div>
        ) : (
          todayEvents.map((ev) => {
            const priorityClass = ev.priority === 'Alta' ? 'high' : ev.priority === 'Baixa' ? 'low' : 'medium';
            const priorityBorder = ev.priority === 'Alta' 
              ? 'var(--accent-rose)' 
              : ev.priority === 'Baixa' 
                ? 'var(--accent-emerald)' 
                : 'var(--accent-amber)';

            return (
              <div 
                key={ev.id} 
                className="card-native" 
                style={{ 
                  borderLeft: `4px solid ${priorityBorder}`,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} color="var(--accent-indigo)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-indigo)' }}>
                      {ev.allDay ? 'Dia Todo' : `${ev.startTime} - ${ev.endTime}`}
                    </span>
                    <span className="section-badge">{ev.category}</span>
                    <span className={`priority-badge ${priorityClass}`}>
                      {ev.priority || 'Média'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {ev.title}
                  </h3>
                  {ev.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <MapPin size={12} />
                      <span>{ev.location}</span>
                    </div>
                  )}
                </div>

                <button 
                  className={ev.completed ? 'btn-primary' : 'btn-secondary'}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={() => onToggleEvent?.(ev.id, !ev.completed)}
                >
                  {ev.completed ? 'Concluído' : 'Marcar Feito'}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 4. SAÚDE RÁPIDA: ÁGUA & SONO */}
      <div className="quick-health-grid">
        {/* ÁGUA */}
        <div className="health-widget">
          <div>
            <div className="health-widget-header">
              <div className="widget-icon-title">
                <div className="widget-icon-box water">
                  <Droplets size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Hidratação Diária</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Meta: {waterTarget} copos ({((waterTarget * glassMl)).toLocaleString('pt-BR')} ml)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  className="section-badge"
                  style={{ cursor: 'pointer', background: 'var(--surface-elevated)' }}
                  onClick={() => setWaterEditMode(!waterEditMode)}
                  title="Configurar meta diária de copos e ml por copo"
                >
                  {waterEditMode ? 'Fechar' : 'Opções'}
                </button>
                <span className="section-badge">{waterPercent}%</span>
              </div>
            </div>

            {waterEditMode ? (
              <form onSubmit={handleSaveWaterOptions} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Meta de Copos:</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="30" 
                      className="input-dark" 
                      value={waterTargetInput}
                      onChange={(e) => setWaterTargetInput(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Tamanho do Copo (ml):</label>
                    <input 
                      type="number" 
                      min="50" 
                      step="50" 
                      max="2000" 
                      className="input-dark" 
                      value={glassMlInput}
                      onChange={(e) => setGlassMlInput(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                {/* Presets rápidos de volume */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Atalhos ml:</span>
                  {[200, 250, 300, 500].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      className="section-badge"
                      style={{
                        cursor: 'pointer',
                        background: Number(glassMlInput) === preset ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                        color: Number(glassMlInput) === preset ? '#030712' : 'var(--text-secondary)',
                        padding: '2px 8px',
                        fontSize: '0.72rem'
                      }}
                      onClick={() => setGlassMlInput(preset)}
                    >
                      {preset}ml
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>
                  Total calculado: {waterTargetInput || 0} copos × {glassMlInput || 0} ml = {((Number(waterTargetInput) || 0) * (Number(glassMlInput) || 0)).toLocaleString('pt-BR')} ml
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Salvar Preferências
                </button>
              </form>
            ) : (
              <>
                <div className="water-controls">
                  <div className="water-counter">
                    {waterGlasses} <span>/ {waterTarget} copos</span>
                  </div>

                  <div className="water-btn-group">
                    <button 
                      className="btn-icon-round"
                      onClick={handleDeleteLastWater}
                      disabled={waterGlasses <= 0}
                      title="Desfazer / Remover último copo de água"
                    >
                      <Minus size={18} />
                    </button>

                    <button 
                      className="btn-icon-round primary"
                      onClick={handleAddWater}
                      title="Registrar +1 copo de água"
                    >
                      <Plus size={20} strokeWidth={2.8} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <div className="habit-progress-track">
                    <div className="habit-progress-bar" style={{ width: `${waterPercent}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    <span>{(waterGlasses * glassMl).toLocaleString('pt-BR')} ml ingeridos ({glassMl}ml/copo)</span>
                    <span>Faltam {(Math.max(0, waterTarget - waterGlasses) * glassMl).toLocaleString('pt-BR')} ml</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SONO */}
        <div className="health-widget">
          <div>
            <div className="health-widget-header">
              <div className="widget-icon-title">
                <div className="widget-icon-box sleep">
                  <Moon size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Ciclo de Sono</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Registro manual</div>
                </div>
              </div>
              <button 
                className="section-badge"
                style={{ cursor: 'pointer', background: 'var(--surface-elevated)' }}
                onClick={() => setSleepEditMode(!sleepEditMode)}
              >
                {sleepEditMode ? 'Fechar' : 'Ajustar'}
              </button>
            </div>

            {sleepEditMode ? (
              <form onSubmit={handleSaveSleep} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Dormiu:</label>
                    <input 
                      type="time" 
                      className="input-dark" 
                      value={bedTimeInput}
                      onChange={(e) => setBedTimeInput(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Acordou:</label>
                    <input 
                      type="time" 
                      className="input-dark" 
                      value={wakeTimeInput}
                      onChange={(e) => setWakeTimeInput(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Salvar Ciclo
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {health?.sleep?.logged ? `${sleepHours}h` : '0h'} <span style={{ fontSize: '0.85rem', color: 'var(--accent-indigo)' }}>dormidas</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {health?.sleep?.logged ? `${health.sleep.bedTime} às ${health.sleep.wakeTime}` : 'Nenhum registro hoje'}
                  </div>
                </div>
                <span className="priority-badge low" style={{ fontSize: '0.7rem' }}>
                  {health?.sleep?.logged ? (sleepHours >= 7 ? 'Sono Ideal' : 'Sono Curto') : 'Pendente'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. REQUISITO 1: ROTINA DE HÁBITOS DIÁRIOS (ONDE SÃO ALOCADOS OS HÁBITOS) */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Clock size={18} color="var(--accent-cyan)" />
          <h2 className="section-title">Rotina de Hábitos Diários</h2>
          <span className="section-badge">{pendingHabits.length} Pendentes</span>
        </div>

        <button 
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          onClick={onOpenAdd}
        >
          <Plus size={16} strokeWidth={2.6} />
          Adicionar Hábito
        </button>
      </div>

      <div className="habits-list">
        {pendingHabits.length === 0 ? (
          <div className="card-native" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '4px' }}>
              Nenhum Hábito Pendente!
            </h3>
            <p style={{ fontSize: '0.82rem' }}>
              Todos os seus hábitos da rotina diária foram concluídos ou você está em uma conta limpa. Clique em "Adicionar Hábito" para registrar um novo.
            </p>
          </div>
        ) : (
          pendingHabits.map((habit) => {
            const IconComponent = CATEGORY_ICONS[habit.category] || BookOpen;
            const habitTag = tags.find(t => t.id === habit.tagId || t.name === habit.category);
            const progress = habit.target > 0 ? Math.round((habit.current / habit.target) * 100) : 0;
            const priorityClass = habit.priority === 'Alta' ? 'high' : habit.priority === 'Média' ? 'medium' : 'low';
            const priorityBorder = habit.priority === 'Alta' 
              ? 'var(--accent-rose)' 
              : habit.priority === 'Baixa' 
                ? 'var(--accent-emerald)' 
                : 'var(--accent-amber)';

            return (
              <div key={habit.id} className="habit-card-wide" style={{ borderLeft: `4px solid ${priorityBorder}` }}>
                <div className="habit-category-box">
                  <IconComponent size={24} />
                </div>

                <div className="habit-content-wrap">
                  <div className="habit-top-row">
                    <span className="habit-title">{habit.title}</span>

                    {habitTag && (
                      <span 
                        className="tag-badge"
                        style={{ color: habitTag.color, background: habitTag.bg, border: `1px solid ${habitTag.color}40` }}
                      >
                        {habitTag.name}
                      </span>
                    )}

                    <span className={`priority-badge ${priorityClass}`}>
                      {habit.priority}
                    </span>

                    <span className="effort-badge">
                      Esforço: {habit.effort}
                    </span>
                  </div>

                  <div className="habit-progress-line-wrap">
                    <div className="habit-progress-track">
                      <div 
                        className="habit-progress-bar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="habit-meta-text">
                      {habit.current} / {habit.target} {habit.unit}
                    </span>
                  </div>
                </div>

                {habit.completionStyle === 'numeric' ? (
                  <button 
                    className="habit-action-btn"
                    onClick={() => incrementHabit(habit.id)}
                    title="Adicionar +1 progresso"
                  >
                    <Plus size={16} strokeWidth={2.6} />
                    <span>+1</span>
                  </button>
                ) : (
                  <button 
                    className="habit-action-btn"
                    onClick={() => toggleHabit(habit.id)}
                    title="Concluir Hábito"
                  >
                    <Check size={18} strokeWidth={2.6} />
                    <span>Concluir</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ACORDEÃO PARA HÁBITOS CONCLUÍDOS */}
      {completedHabits.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div 
            className="accordion-header"
            onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span>Hábitos Concluídos Hoje ({completedHabits.length})</span>
            </div>
            {showCompletedAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {showCompletedAccordion && (
            <div className="habits-list" style={{ marginTop: '10px' }}>
              {completedHabits.map((habit) => (
                <div 
                  key={habit.id} 
                  className="habit-card-wide" 
                  style={{ opacity: 0.75, background: 'rgba(17, 23, 36, 0.6)' }}
                >
                  <div className="habit-category-box" style={{ color: 'var(--accent-emerald)' }}>
                    <Check size={22} strokeWidth={2.6} />
                  </div>

                  <div className="habit-content-wrap">
                    <div className="habit-top-row">
                      <span className="habit-title" style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                        {habit.title}
                      </span>
                      <span className="priority-badge low">Concluído</span>
                    </div>
                    <div className="habit-progress-line-wrap">
                      <div className="habit-progress-track">
                        <div className="habit-progress-bar" style={{ width: '100%', background: 'var(--accent-emerald)' }} />
                      </div>
                      <span className="habit-meta-text">{habit.target} {habit.unit}</span>
                    </div>
                  </div>

                  <button 
                    className="habit-action-btn completed"
                    onClick={() => toggleHabit(habit.id)}
                    title="Desmarcar tarefa"
                  >
                    <Check size={16} strokeWidth={2.6} />
                    <span>Feito</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
