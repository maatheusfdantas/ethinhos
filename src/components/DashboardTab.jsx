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
  Sparkles
} from 'lucide-react';

// Category Icon Mapper using ONLY Lucide Vector Icons
const CATEGORY_ICONS = {
  Faculdade: BookOpen,
  Trabalho: Bookmark,
  Saúde: Dumbbell,
  Casa: Home,
  Pessoal: Sparkles,
  Finanças: Activity,
  CheckCircle2: CheckCircle2
};

export function DashboardTab({
  habits,
  setHabits,
  health,
  setHealth,
  tags,
  onOpenAdd,
  onOpenWorkout
}) {
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  const [sleepEditMode, setSleepEditMode] = useState(false);
  const [bedTimeInput, setBedTimeInput] = useState(health?.sleep?.bedTime || '23:30');
  const [wakeTimeInput, setWakeTimeInput] = useState(health?.sleep?.wakeTime || '07:00');

  // Days of week for weekly performance
  const weekDays = [
    { label: 'Seg', date: '12', progress: 85, isToday: false },
    { label: 'Ter', date: '13', progress: 70, isToday: false },
    { label: 'Qua', date: '14', progress: 95, isToday: false },
    { label: 'Qui', date: '15', progress: 60, isToday: false },
    { label: 'Sex', date: '16', progress: 90, isToday: false },
    { label: 'Sáb', date: '17', progress: 75, isToday: false },
    { label: 'Dom', date: '18', progress: 82, isToday: true }
  ];

  // US01 & US02: Calculate daily tasks progress (0-100%)
  const totalTasks = habits.length;
  const completedTasks = habits.filter(h => h.completed).length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Water calculation (US09, US27)
  const waterGlasses = health.waterGlasses;
  const waterTarget = health.waterTarget || 10;
  const waterPercent = Math.min(100, Math.round((waterGlasses / waterTarget) * 100));

  // Sleep calculation (US10)
  const calculateSleepHours = (bed, wake) => {
    try {
      const [bH, bM] = bed.split(':').map(Number);
      const [wH, wM] = wake.split(':').map(Number);
      let diffMins = (wH * 60 + wM) - (bH * 60 + bM);
      if (diffMins < 0) diffMins += 24 * 60;
      return +(diffMins / 60).toFixed(1);
    } catch {
      return 7.5;
    }
  };

  const sleepHours = calculateSleepHours(health.sleep.bedTime, health.sleep.wakeTime);
  const sleepPercent = Math.min(100, Math.round((sleepHours / (health.sleep.targetHours || 8)) * 100));

  // US12: Cálculo diário da Média de Vitalidade (cruzando tarefas 40%, água 30% e sono 30%)
  const vitalityScore = Math.round(
    (taskProgressPercent * 0.4) + 
    (waterPercent * 0.3) + 
    (sleepPercent * 0.3)
  );

  let vitalityStatus = 'Em Evolução';
  if (vitalityScore >= 80) vitalityStatus = 'Excelente';
  else if (vitalityScore >= 60) vitalityStatus = 'Consistente';

  // US20: Categorização por prioridade (Alta, Média, Baixa) com ordenação automática
  const priorityWeight = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };

  const pendingHabits = habits
    .filter(h => !h.completed)
    .sort((a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0));

  const completedHabits = habits.filter(h => h.completed);

  // US09: Add water glass
  const handleAddWater = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newGlasses = health.waterGlasses + 1;
    const newHistory = [...health.waterHistory, { id: Date.now(), timestamp: timeStr, amountMl: 250 }];
    setHealth({
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory
    });
  };

  // US27: Delete last water glass (correção de erro do usuário)
  const handleDeleteLastWater = () => {
    if (health.waterGlasses <= 0) return;
    const newGlasses = health.waterGlasses - 1;
    const newHistory = health.waterHistory.slice(0, -1);
    setHealth({
      ...health,
      waterGlasses: newGlasses,
      waterHistory: newHistory
    });
  };

  // US10: Save manual sleep cycle
  const handleSaveSleep = (e) => {
    e.preventDefault();
    setHealth({
      ...health,
      sleep: {
        ...health.sleep,
        bedTime: bedTimeInput,
        wakeTime: wakeTimeInput,
        logged: true
      }
    });
    setSleepEditMode(false);
  };

  // Toggle habit completion (US01, US02)
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

  // Quick increment for numeric habits (+1)
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

  return (
    <div className="dashboard-view">
      {/* SEÇÃO 1: DESEMPENHO SEMANAL */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Activity size={18} className="text-cyan" />
          <h2 className="section-title">Desempenho Semanal</h2>
        </div>
        <span className="section-badge">Semana 42</span>
      </div>

      <div className="weekly-perf-grid">
        {weekDays.map((day, idx) => (
          <div 
            key={idx} 
            className={`day-bar-card ${day.isToday ? 'active-day' : ''}`}
            title={`${day.label}: ${day.progress}% de conclusão`}
          >
            <span className="day-label">{day.label}</span>
            <span className="day-date">{day.date}</span>
            <div className="day-bar-track">
              <div 
                className="day-bar-fill" 
                style={{ height: `${day.progress}%` }}
              />
            </div>
            <div className="day-dots-indicator">
              <span 
                className="mini-dot" 
                style={{ background: day.progress > 70 ? 'var(--accent-cyan)' : 'var(--accent-indigo)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* SEÇÃO 2: VITALIDADE DIÁRIA (US12, US02) */}
      <div className="vitality-hero-card">
        <div className="vitality-header">
          <div>
            <span className="submetric-title">Índice Geral de Performance</span>
            <div className="vitality-score-block">
              <span className="vitality-number">{vitalityScore}</span>
              <span className="vitality-unit">/100</span>
            </div>
          </div>
          <span className="vitality-status-pill">{vitalityStatus}</span>
        </div>

        {/* Real-time 0-100% daily progress bar (US02) */}
        <div className="vitality-progress-bar-wrap">
          <div 
            className="vitality-progress-fill" 
            style={{ width: `${vitalityScore}%` }}
          />
        </div>

        <div className="vitality-submetrics">
          <div className="submetric-item">
            <span className="submetric-title">
              <CheckCircle2 size={14} color="var(--accent-cyan)" />
              Tarefas (40%)
            </span>
            <span className="submetric-value">{completedTasks}/{totalTasks} ({taskProgressPercent}%)</span>
          </div>

          <div className="submetric-item">
            <span className="submetric-title">
              <Droplets size={14} color="var(--accent-cyan)" />
              Água (30%)
            </span>
            <span className="submetric-value">{(waterGlasses * 0.25).toFixed(2)}L / 2.5L</span>
          </div>

          <div className="submetric-item">
            <span className="submetric-title">
              <Moon size={14} color="var(--accent-indigo)" />
              Sono (30%)
            </span>
            <span className="submetric-value">{sleepHours}h ({sleepPercent}%)</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: SAÚDE E RECUPERAÇÃO (US09, US27, US10, US11) */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Droplets size={18} color="var(--accent-cyan)" />
          <h2 className="section-title">Saúde & Recuperação Rápida</h2>
        </div>
        <span className="section-badge">Inputs Instantâneos</span>
      </div>

      <div className="quick-health-grid">
        {/* WIDGET ÁGUA (US09, US27) */}
        <div className="health-widget">
          <div>
            <div className="health-widget-header">
              <div className="widget-icon-title">
                <div className="widget-icon-box water">
                  <Droplets size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Hidratação Diária</span>
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
                {/* US27: Opção de deletar o último copo inserido */}
                <button 
                  className="btn-icon-round"
                  onClick={handleDeleteLastWater}
                  disabled={waterGlasses <= 0}
                  title="Desfazer / Remover último copo de água"
                >
                  <Minus size={18} />
                </button>

                {/* US09: Botão "+" para registrar copos de água */}
                <button 
                  className="btn-icon-round primary"
                  onClick={handleAddWater}
                  title="Registrar +1 copo de água (250ml)"
                >
                  <Plus size={20} strokeWidth={2.8} />
                </button>
              </div>
            </div>
          </div>

          {/* Mini progress line for water */}
          <div style={{ marginTop: '14px' }}>
            <div className="habit-progress-track">
              <div 
                className="habit-progress-bar" 
                style={{ width: `${waterPercent}%` }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>Último: {health.waterHistory?.slice(-1)[0]?.timestamp || '08:00'}</span>
              <span>{(waterGlasses * 250)} ml ingeridos</span>
            </div>
          </div>
        </div>

        {/* WIDGET SONO (US10) */}
        <div className="health-widget">
          <div>
            <div className="health-widget-header">
              <div className="widget-icon-title">
                <div className="widget-icon-box sleep">
                  <Moon size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Ciclo de Sono</span>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Registro manual preciso</div>
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
                    {sleepHours}h <span style={{ fontSize: '0.85rem', color: 'var(--accent-indigo)' }}>dormidas</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {health.sleep.bedTime} às {health.sleep.wakeTime}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="priority-badge low" style={{ fontSize: '0.7rem' }}>
                    {sleepHours >= 7 ? 'Sono Ideal' : 'Sono Curto'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Treino do Dia:</span>
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

      {/* SEÇÃO 4: PENDENTES DE HOJE (US01, US19, US20, US39) */}
      <div className="section-header">
        <div className="section-title-wrap">
          <Clock size={18} color="var(--accent-cyan)" />
          <h2 className="section-title">Pendentes de Hoje</h2>
          <span className="section-badge">{pendingHabits.length}</span>
        </div>

        <button 
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          onClick={onOpenAdd}
        >
          <Plus size={16} strokeWidth={2.6} />
          Adicionar
        </button>
      </div>

      <div className="habits-list">
        {pendingHabits.length === 0 ? (
          <div className="card-native" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '4px' }}>Tudo Concluído por Hoje!</h3>
            <p style={{ fontSize: '0.82rem' }}>Você zerou suas tarefas pendentes. Excelente trabalho!</p>
          </div>
        ) : (
          pendingHabits.map((habit) => {
            const IconComponent = CATEGORY_ICONS[habit.category] || CATEGORY_ICONS[habit.iconName] || BookOpen;
            const habitTag = tags.find(t => t.id === habit.tagId);
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

                    {/* US39: Tag de cores */}
                    {habitTag && (
                      <span 
                        className="tag-badge"
                        style={{ color: habitTag.color, background: habitTag.bg, border: `1px solid ${habitTag.color}40` }}
                      >
                        {habitTag.name}
                      </span>
                    )}

                    {/* US20: Prioridade */}
                    <span className={`priority-badge ${priorityClass}`}>
                      {habit.priority}
                    </span>

                    {/* US01: Nível de esforço */}
                    <span className="effort-badge">
                      Esforço: {habit.effort}
                    </span>
                  </div>

                  {/* Horizontal Cyan Progress Bar */}
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

                {/* Quick Action Button */}
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

      {/* SEÇÃO 5: ACORDEÃO RECOLHIDO PARA HÁBITOS CONCLUÍDOS */}
      {completedHabits.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div 
            className="accordion-header"
            onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span>Concluídos de Hoje ({completedHabits.length})</span>
            </div>
            {showCompletedAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>

          {showCompletedAccordion && (
            <div className="habits-list" style={{ marginTop: '10px' }}>
              {completedHabits.map((habit) => {
                const IconComponent = CATEGORY_ICONS[habit.category] || BookOpen;
                return (
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
                      title="Desmarcar / Reabrir tarefa"
                    >
                      <Check size={16} strokeWidth={2.6} />
                      <span>Feito</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
