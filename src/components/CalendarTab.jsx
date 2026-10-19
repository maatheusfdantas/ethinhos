import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Droplets, 
  Timer, 
  Clock, 
  MapPin, 
  Activity 
} from 'lucide-react';

export function CalendarTab({ heatmapData, habits, events = [] }) {
  // Pill view toggle: 'month', 'week', 'day'
  const [viewMode, setViewMode] = useState('month');
  const [selectedDay, setSelectedDay] = useState(18); // Default to current day

  const currentMonthName = 'Outubro 2026';

  const dayOfWeekHeaders = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // 31 days in October
  const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  // Selected day details
  const selectedDayMetrics = heatmapData.find(d => d.day === selectedDay) || {
    day: selectedDay,
    level: selectedDay % 2 === 0 ? 3 : 2,
    tasks: 4,
    water: 2250,
    focusMins: 60
  };

  return (
    <div className="calendar-view">
      {/* SECTION HEADER & PILL TOGGLES */}
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="section-title-wrap">
          <CalendarIcon size={20} color="var(--accent-cyan)" />
          <h2 className="section-title">Calendário & Matriz Produtiva</h2>
        </div>

        {/* TOGGLES EM FORMATO PILL NO TOPO: MÊS, SEMANA, DIA */}
        <div className="segmented-control" style={{ width: 'auto', minWidth: '220px' }}>
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
      </div>

      {/* MONTH NAVIGATION BAR */}
      <div className="card-native" style={{ marginBottom: '18px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon-round">
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
          {currentMonthName}
        </span>
        <button className="btn-icon-round">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* US04: CALENDÁRIO MATRIZ MENSAL (MAPA DE CALOR POR CORES DOS DIAS PRODUTIVOS) */}
      {viewMode === 'month' && (
        <div className="card-native" style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Matriz de Produtividade Mensal (US04)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <span>Menos</span>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,229,255,0.2)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,229,255,0.5)' }} />
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-cyan)' }} />
              <span>Mais</span>
            </div>
          </div>

          {/* Weekday Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '8px' }}>
            {dayOfWeekHeaders.map((dh, i) => (
              <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {dh}
              </span>
            ))}
          </div>

          {/* Heatmap Grid with Dots below day number */}
          <div className="heatmap-matrix-grid">
            {monthDays.map((day) => {
              const heat = heatmapData.find(h => h.day === day);
              const level = heat ? heat.level : (day <= 18 ? ((day % 4) + 1) : 0);
              const isSelected = selectedDay === day;
              const isCurrentDay = day === 18;

              return (
                <div
                  key={day}
                  className={`matrix-cell level-${level} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    border: isSelected 
                      ? '2px solid var(--accent-cyan)' 
                      : isCurrentDay 
                      ? '1px solid rgba(0, 229, 255, 0.6)' 
                      : undefined,
                    boxShadow: isSelected ? '0 0 12px rgba(0, 229, 255, 0.5)' : undefined
                  }}
                  title={`Dia ${day}: Nível de produtividade ${level}`}
                >
                  <span style={{ fontSize: '0.85rem' }}>{day}</span>
                  
                  {/* Pequenos "dots" coloridos (sem emojis) abaixo da numeração para compromissos e tarefas */}
                  <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                    {level > 0 && (
                      <span 
                        style={{ 
                          width: 4, 
                          height: 4, 
                          borderRadius: '50%', 
                          background: level >= 3 ? '#030712' : 'var(--accent-cyan)' 
                        }} 
                      />
                    )}
                    {day % 3 === 0 && (
                      <span 
                        style={{ 
                          width: 4, 
                          height: 4, 
                          borderRadius: '50%', 
                          background: 'var(--accent-indigo)' 
                        }} 
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="card-native" style={{ marginBottom: '22px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '14px' }}>
            Visão Semanal Detalhada (12 a 18 de Outubro)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {[12, 13, 14, 15, 16, 17, 18].map((d, idx) => (
              <div 
                key={d} 
                className="day-bar-card"
                onClick={() => setSelectedDay(d)}
                style={{ borderColor: selectedDay === d ? 'var(--accent-cyan)' : undefined }}
              >
                <span className="day-label">{dayOfWeekHeaders[idx]}</span>
                <span className="day-date">{d}</span>
                <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                  <span className="mini-dot" style={{ background: 'var(--accent-cyan)' }} />
                  <span className="mini-dot" style={{ background: 'var(--accent-indigo)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="card-native" style={{ marginBottom: '22px' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Linha do Tempo - Dia {selectedDay} de Outubro
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Horários sincronizados e blocos de compromissos para o dia.
          </p>
        </div>
      )}

      {/* DETALHES DO DIA SELECIONADO NA MATRIZ */}
      <div className="card-native">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Telemetria Diária
            </span>
            <h4 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '2px' }}>
              Registro do Dia {selectedDay} de Outubro
            </h4>
          </div>

          <span className="vitality-status-pill">
            Nível {selectedDayMetrics.level} / 4
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={14} color="var(--accent-cyan)" />
              Tarefas Feitas
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {selectedDayMetrics.tasks || 5} concluídas
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Timer size={14} color="var(--accent-indigo)" />
              Tempo em Foco
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {selectedDayMetrics.focusMins || 75} minutos
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Droplets size={14} color="var(--accent-cyan)" />
              Água Registrada
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {(selectedDayMetrics.water || 2500) / 1000}L
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
