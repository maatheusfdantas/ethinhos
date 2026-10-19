import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Plus, 
  Tag, 
  CalendarCheck, 
  FileText,
  AlertCircle,
  Dumbbell
} from 'lucide-react';
import { isEventForDate } from '../services/storage';

export function CalendarTab({ events = [], habits = [], workouts = [], onOpenAdd, onToggleEvent }) {
  // Views: 'month', 'week', 'day'
  const [viewMode, setViewMode] = useState('month');

  // Month & Day state
  const today = new Date();
  const todayDateStr = today.toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState(todayDateStr);

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = Outubro

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayOfWeekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Calculate calendar days for current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Dom
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format date helper: YYYY-MM-DD
  const formatIsoDate = (year, monthIndex, dayNum) => {
    const m = String(monthIndex + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Get activities for a specific date (inclui eventos com repetição)
  const getActivitiesForDate = (dateStr) => {
    const dayEvents = events.filter(e => isEventForDate(e, dateStr));
    
    // Also include habits that repeat on this day of week
    const targetDate = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = targetDate.getDay(); // 0-6
    const repeatingHabits = habits.filter(h => (h.repeatDays || []).includes(dayOfWeek));

    // Also include workouts scheduled on this day of week
    const scheduledWorkouts = workouts.filter(w => (w.scheduledDays || []).includes(dayOfWeek));

    return { events: dayEvents, habits: repeatingHabits, workouts: scheduledWorkouts };
  };

  // Selected date activities
  const selectedDayActivities = getActivitiesForDate(selectedDateStr);
  const selectedDateObj = new Date(`${selectedDateStr}T12:00:00`);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="calendar-view">
      {/* HEADER & VIEW MODE SELECTOR */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="section-title-wrap">
          <CalendarIcon size={20} color="var(--accent-cyan)" />
          <h2 className="section-title">Calendário & Planejamento de Atividades</h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* PILL TOGGLES: MÊS, SEMANA, DIA */}
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Mês
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              type="button"
              className={`segmented-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Dia
            </button>
          </div>

          <button 
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={onOpenAdd}
          >
            <Plus size={16} strokeWidth={2.6} />
            Agendar
          </button>
        </div>
      </div>

      {/* MONTH NAVIGATION BAR */}
      <div className="card-native" style={{ marginBottom: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon-round" onClick={prevMonth}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {monthNames[currentMonth]} de {currentYear}
        </span>
        <button className="btn-icon-round" onClick={nextMonth}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 1. VISÃO MENSAL RICA COM ATIVIDADES VISÍVEIS EM CADA DIA (REQUISITO 2) */}
      {viewMode === 'month' && (
        <div className="card-native" style={{ padding: '16px', marginBottom: '20px' }}>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '8px' }}>
            {dayOfWeekHeaders.map((dh, i) => (
              <span key={i} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                {dh}
              </span>
            ))}
          </div>

          {/* Month Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {/* Blank leading days */}
            {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
              <div key={`blank_${idx}`} style={{ minHeight: '84px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', opacity: 0.2 }} />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = formatIsoDate(currentYear, currentMonth, dayNum);
              const isSelected = selectedDateStr === dateStr;
              const isToday = todayDateStr === dateStr;
              const { events: dayEvents, habits: dayHabits, workouts: dayWorkouts } = getActivitiesForDate(dateStr);
              const totalItems = dayEvents.length + dayHabits.length + (dayWorkouts?.length || 0);

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateStr)}
                  style={{
                    minHeight: '86px',
                    background: isSelected 
                      ? 'rgba(0, 229, 255, 0.08)' 
                      : isToday 
                      ? 'rgba(129, 140, 248, 0.06)' 
                      : 'var(--surface-elevated)',
                    border: isSelected 
                      ? '2px solid var(--accent-cyan)' 
                      : isToday 
                      ? '1px solid rgba(129, 140, 248, 0.4)' 
                      : '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Ver planejamentos do dia ${dayNum}`}
                >
                  {/* Top row: day number and counter */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: isSelected || isToday ? 800 : 600,
                      color: isToday ? 'var(--accent-cyan)' : 'var(--text-primary)'
                    }}>
                      {dayNum}
                    </span>
                    {totalItems > 0 && (
                      <span style={{ fontSize: '0.65rem', background: 'rgba(0, 229, 255, 0.2)', color: 'var(--accent-cyan)', padding: '1px 5px', borderRadius: '8px', fontWeight: 700 }}>
                        {totalItems}
                      </span>
                    )}
                  </div>

                  {/* VISUALIZAÇÃO DIRETA DAS ATIVIDADES MARCADAS PARA AQUELA DATA (REQUISITO 2) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', overflow: 'hidden' }}>
                    {dayWorkouts?.slice(0, 1).map((w) => (
                      <div 
                        key={w.id}
                        style={{
                          fontSize: '0.63rem',
                          background: 'rgba(244, 63, 94, 0.16)',
                          color: 'var(--accent-rose)',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderLeft: '2px solid var(--accent-rose)'
                        }}
                      >
                        {w.name.split(' - ')[0]}
                      </div>
                    ))}

                    {dayEvents.slice(0, 2).map((ev) => (
                      <div 
                        key={ev.id}
                        style={{
                          fontSize: '0.65rem',
                          background: 'rgba(0, 229, 255, 0.18)',
                          color: '#fff',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          borderLeft: '2px solid var(--accent-cyan)'
                        }}
                      >
                        {ev.startTime ? `${ev.startTime} ` : ''}{ev.title}
                      </div>
                    ))}

                    {dayHabits.slice(0, 1).map((hab) => (
                      <div 
                        key={hab.id}
                        style={{
                          fontSize: '0.63rem',
                          background: 'rgba(129, 140, 248, 0.14)',
                          color: 'var(--accent-indigo)',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {hab.title}
                      </div>
                    ))}

                    {totalItems > 3 && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                        +{totalItems - 3} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. VISÃO SEMANAL DETALHADA COM COLUNAS E HORÁRIOS */}
      {viewMode === 'week' && (
        <div className="card-native" style={{ padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
            Visão da Semana com Linha do Tempo
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
              const baseDate = new Date(`${selectedDateStr}T12:00:00`);
              baseDate.setDate(baseDate.getDate() + offset);
              const dateStr = baseDate.toISOString().split('T')[0];
              const { events: dayEvents, habits: dayHabits, workouts: dayWorkouts } = getActivitiesForDate(dateStr);
              const isSelected = selectedDateStr === dateStr;

              return (
                <div 
                  key={offset}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className="card-native"
                  style={{
                    background: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'var(--surface-elevated)',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    padding: '10px 8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {dayOfWeekHeaders[baseDate.getDay()]}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {baseDate.getDate()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {dayWorkouts?.map(w => (
                      <div key={w.id} style={{ fontSize: '0.66rem', background: 'rgba(244, 63, 94, 0.18)', color: 'var(--accent-rose)', padding: '2px 4px', borderRadius: '4px', borderLeft: '2px solid var(--accent-rose)' }}>
                        <strong>{w.scheduledTime || '18:30'}</strong> {w.name.split(' - ')[0]}
                      </div>
                    ))}
                    {dayEvents.map(e => (
                      <div key={e.id} style={{ fontSize: '0.68rem', background: 'rgba(0, 229, 255, 0.15)', color: '#fff', padding: '3px 4px', borderRadius: '4px' }}>
                        <strong>{e.startTime}</strong> {e.title}
                      </div>
                    ))}
                    {dayHabits.map(h => (
                      <div key={h.id} style={{ fontSize: '0.65rem', background: 'rgba(129, 140, 248, 0.12)', color: 'var(--accent-indigo)', padding: '2px 4px', borderRadius: '4px' }}>
                        {h.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VISÃO DIÁRIA EM LINHA DO TEMPO */}
      {viewMode === 'day' && (
        <div className="card-native" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              Linha do Tempo: {selectedDateFormatted}
            </h3>
            <span className="section-badge">{selectedDayActivities.events.length} Eventos Agendados</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedDayActivities.events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Nenhum evento com horário marcado para este dia. Clique em "Agendar" acima para adicionar.
              </div>
            ) : (
              selectedDayActivities.events.map((e) => (
                <div 
                  key={e.id}
                  className="card-native"
                  style={{
                    background: 'var(--surface-elevated)',
                    borderLeft: '4px solid var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={15} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {e.allDay ? 'Dia Todo' : `${e.startTime} às ${e.endTime}`}
                      </span>
                      <span className="tag-badge" style={{ background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent-indigo)' }}>
                        {e.category}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                      {e.title}
                    </h4>

                    {e.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <MapPin size={13} />
                        <span>{e.location}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    className={e.completed ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    onClick={() => onToggleEvent?.(e.id, !e.completed)}
                  >
                    {e.completed ? 'Concluído' : 'Marcar Feito'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PAINEL DE PLANEJAMENTO DETALHADO DA DATA SELECIONADA (REQUISITO 2) */}
      <div className="card-native">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Planejamento Detalhado do Dia
            </span>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', textTransform: 'capitalize', marginTop: '2px' }}>
              {selectedDateFormatted}
            </h3>
          </div>

          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
            onClick={onOpenAdd}
          >
            <Plus size={14} />
            Agendar Nesta Data
          </button>
        </div>

        {/* 1. SEÇÃO DE EVENTOS / COMPROMISSOS COM DATA E HORÁRIO */}
        <div style={{ marginBottom: '18px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <CalendarCheck size={16} color="var(--accent-cyan)" />
            Compromissos & Provas com Horário Marcado ({selectedDayActivities.events.length}):
          </span>

          {selectedDayActivities.events.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
              Nenhum evento ou prova agendada para esta data.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayActivities.events.map((e) => {
                const priorityClass = e.priority === 'Alta' ? 'high' : e.priority === 'Baixa' ? 'low' : 'medium';
                const priorityBorder = e.priority === 'Alta' 
                  ? 'var(--accent-rose)' 
                  : e.priority === 'Baixa' 
                    ? 'var(--accent-emerald)' 
                    : 'var(--accent-amber)';

                return (
                  <div 
                    key={e.id} 
                    className="card-native" 
                    style={{ 
                      background: 'var(--surface-elevated)', 
                      padding: '12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      borderLeft: `3px solid ${priorityBorder}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                          {e.allDay ? 'Dia Todo' : `${e.startTime} - ${e.endTime}`}
                        </span>
                        <span className="section-badge">{e.category}</span>
                        <span className={`priority-badge ${priorityClass}`}>
                          {e.priority || 'Média'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {e.title}
                      </div>
                    {e.location && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        {e.location}
                      </div>
                    )}
                  </div>

                  <button 
                    className="habit-action-btn"
                    style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    onClick={() => onToggleEvent?.(e.id, !e.completed)}
                  >
                    <CheckCircle2 size={14} color={e.completed ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                    <span>{e.completed ? 'Feito' : 'Concluir'}</span>
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* 2. SEÇÃO DE TREINOS DE MUSCULAÇÃO AGENDADOS PARA ESTE DIA DA SEMANA */}
        {selectedDayActivities.workouts && selectedDayActivities.workouts.length > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Dumbbell size={16} color="var(--accent-rose)" />
              Treinos de Musculação Agendados ({selectedDayActivities.workouts.length}):
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayActivities.workouts.map((w) => (
                <div key={w.id} className="card-native" style={{ background: 'var(--surface-elevated)', borderLeft: '4px solid var(--accent-rose)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-rose)' }}>
                        {w.scheduledTime || '18:30'}
                      </span>
                      <span className="priority-badge low" style={{ background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)' }}>Musculação</span>
                    </div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {w.name}
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      {w.exercises?.length || 0} exercícios cadastrados nesta ficha
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SEÇÃO DE HÁBITOS DE ROTINA QUE REPETEM NESTE DIA DA SEMANA */}
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <CheckCircle2 size={16} color="var(--accent-indigo)" />
            Hábitos Diários Programados para este Dia da Semana ({selectedDayActivities.habits.length}):
          </span>

          {selectedDayActivities.habits.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '8px' }}>
              Nenhum hábito diário programado para este dia da semana.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedDayActivities.habits.map((h) => (
                <div key={h.id} className="card-native" style={{ background: 'var(--surface-elevated)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: h.completed ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {h.title}
                    </span>
                    <span className="section-badge" style={{ fontSize: '0.65rem' }}>{h.category}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: h.completed ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                    {h.completed ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
