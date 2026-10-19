import React, { useState } from 'react';
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
  Palette
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
  health = {},
  setHealth,
  tags = [],
  onOpenAdd,
  onOpenWorkout,
  onAddTag,
  onToggleEvent
}) {
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  const [sleepEditMode, setSleepEditMode] = useState(false);
  const [bedTimeInput, setBedTimeInput] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeTimeInput, setWakeTimeInput] = useState(health?.sleep?.wakeTime || '07:00');

  // Requisito 4: Criador inline de temas/categorias
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(DEFAULT_PALETTES[0]);

  // Filter events for TODAY (Requisito 1: Onde cada um é alocado)
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);

  // Performance bar calculation
  const totalTasks = habits.length;
  const completedTasks = habits.filter(h => h.completed).length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Water calculation (US09, US27)
  const waterGlasses = health.waterGlasses || 0;
  const waterTarget = health.waterTarget || 10;
  const waterPercent = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));

  // Sleep calculation (US10)
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

  // US12: Média de Vitalidade (40% tarefas + 30% água + 30% sono)
  const vitalityScore = Math.round(
    (taskProgressPercent * 0.4) + 
    (waterPercent * 0.3) + 
    (sleepPercent * 0.3)
  );

  let vitalityStatus = 'Iniciando';
  if (vitalityScore >= 80) vitalityStatus = 'Excelente';
  else if (vitalityScore >= 50) vitalityStatus = 'Consistente';
  else if (vitalityScore > 0) vitalityStatus = 'Em Evolução';

  // US20: Prioridade
  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
  const pendingHabits = habits
    .filter(h => !h.completed)
    .sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

  const completedHabits = habits.filter(h => h.completed);

  // US09: Add water glass
  const handleAddWater = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newGlasses = waterGlasses + 1;
    const newHistory = [...(health.waterHistory || []), { id: Date.now(), timestamp: timeStr, amountMl: 250 }];
    setHealth({
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory
    });
  };

  // US27: Delete last water glass
  const handleDeleteLastWater = () => {
    if (waterGlasses <= 0) return;
    const newGlasses = waterGlasses - 1;
    const newHistory = (health.waterHistory || []).slice(0, -1);
    setHealth({
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory
    });
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

  // Habit toggles
  const toggleHabit = (id) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const nextCompleted = !h.completed;
        const nextCurrent = nextCompleted ? h.target : 0;
        return { ...h, completed: nextCompleted, current: nextCurrent };
      }
      return h;
    }));
  };

  const incrementHabit = (id) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const nextCurrent = Math.min(h.target, h.current + 1);
        const nextCompleted = nextCurrent >= h.target;
        return { ...h, current: nextCurrent, completed: nextCompleted };
      }
      return h;
    }));
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
            <span className="submetric-title">Índice Geral de Vitalidade Diária (US12)</span>
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
            <span className="submetric-value">{(waterGlasses * 0.25).toFixed(2)}L / 2.5L</span>
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
              Temas & Categorias das Atividades (US39)
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
            {todayEvents.length} Marcados
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
        {todayEvents.length === 0 ? (
          <div className="card-native" style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            Nenhum compromisso com data e horário marcado para hoje. Todos os seus eventos cadastrados ficam salvos na sua <strong>Agenda & Calendário</strong>.
          </div>
        ) : (
          todayEvents.map((ev) => (
            <div 
              key={ev.id} 
              className="card-native" 
              style={{ 
                borderLeft: '4px solid var(--accent-indigo)',
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
          ))
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
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Hidratação Diária (US09, US27)</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Meta: 10 copos (2.500 ml)</div>
                </div>
              </div>
              <span className="section-badge">{waterPercent}%</span>
            </div>

            <div className="water-controls">
              <div className="water-counter">
                {waterGlasses} <span>/ {waterTarget} copos</span>
              </div>

              <div className="water-btn-group">
                <button 
                  className="btn-icon-round"
                  onClick={handleDeleteLastWater}
                  disabled={waterGlasses <= 0}
                  title="Desfazer / Remover último copo de água (US27)"
                >
                  <Minus size={18} />
                </button>

                <button 
                  className="btn-icon-round primary"
                  onClick={handleAddWater}
                  title="Registrar +1 copo de água (US09)"
                >
                  <Plus size={20} strokeWidth={2.8} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div className="habit-progress-track">
              <div className="habit-progress-bar" style={{ width: `${waterPercent}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>{(waterGlasses * 250)} ml ingeridos</span>
              <span>Faltam {(Math.max(0, waterTarget - waterGlasses) * 250)} ml</span>
            </div>
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
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Ciclo de Sono (US10)</span>
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

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Treino de Força (US11):</span>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
              onClick={onOpenWorkout}
            >
              <Dumbbell size={13} color="var(--accent-rose)" />
              Abrir Ficha de Treino
            </button>
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

            return (
              <div key={habit.id} className="habit-card-wide">
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
