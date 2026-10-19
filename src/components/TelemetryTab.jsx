import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  Droplets, 
  Moon, 
  Timer, 
  Zap, 
  Award, 
  ArrowUpRight 
} from 'lucide-react';

export function TelemetryTab({ habits, health, heatmapData }) {
  // Metric selector for weekly comparison: 'tasks', 'focus', 'water', 'sleep'
  const [activeMetric, setActiveMetric] = useState('tasks');

  // Comparison metrics for current week vs previous week (US13)
  const comparisonData = {
    tasks: {
      title: 'Tarefas Concluídas',
      unit: 'tarefas',
      currentWeekTotal: 38,
      previousWeekTotal: 31,
      changePercent: '+22%',
      days: [
        { day: 'Seg', current: 6, previous: 4 },
        { day: 'Ter', current: 5, previous: 5 },
        { day: 'Qua', current: 7, previous: 4 },
        { day: 'Qui', current: 4, previous: 3 },
        { day: 'Sex', current: 6, previous: 6 },
        { day: 'Sáb', current: 5, previous: 4 },
        { day: 'Dom', current: 5, previous: 5 },
      ]
    },
    focus: {
      title: 'Tempo em Foco Pomodoro',
      unit: 'horas',
      currentWeekTotal: 14.5,
      previousWeekTotal: 11.2,
      changePercent: '+29%',
      days: [
        { day: 'Seg', current: 2.5, previous: 1.5 },
        { day: 'Ter', current: 2.0, previous: 2.0 },
        { day: 'Qua', current: 3.0, previous: 1.5 },
        { day: 'Qui', current: 1.5, previous: 1.0 },
        { day: 'Sex', current: 2.5, previous: 2.0 },
        { day: 'Sáb', current: 1.5, previous: 1.2 },
        { day: 'Dom', current: 1.5, previous: 2.0 },
      ]
    },
    water: {
      title: 'Consumo Médio de Água',
      unit: 'L/dia',
      currentWeekTotal: 2.4,
      previousWeekTotal: 1.9,
      changePercent: '+26%',
      days: [
        { day: 'Seg', current: 2.5, previous: 1.8 },
        { day: 'Ter', current: 2.2, previous: 2.0 },
        { day: 'Qua', current: 2.8, previous: 1.9 },
        { day: 'Qui', current: 2.0, previous: 1.7 },
        { day: 'Sex', current: 2.5, previous: 2.1 },
        { day: 'Sáb', current: 2.4, previous: 1.8 },
        { day: 'Dom', current: 2.5, previous: 2.0 },
      ]
    },
    sleep: {
      title: 'Média de Sono Reparador',
      unit: 'h/dia',
      currentWeekTotal: 7.6,
      previousWeekTotal: 6.8,
      changePercent: '+12%',
      days: [
        { day: 'Seg', current: 7.5, previous: 6.5 },
        { day: 'Ter', current: 7.0, previous: 6.8 },
        { day: 'Qua', current: 8.0, previous: 6.2 },
        { day: 'Qui', current: 7.2, previous: 7.0 },
        { day: 'Sex', current: 8.5, previous: 7.5 },
        { day: 'Sáb', current: 8.0, previous: 7.0 },
        { day: 'Dom', current: 7.0, previous: 6.6 },
      ]
    }
  };

  const selectedData = comparisonData[activeMetric];

  // Maximum value for bar height scaling
  const maxBarValue = Math.max(
    ...selectedData.days.map(d => Math.max(d.current, d.previous))
  ) * 1.15;

  return (
    <div className="telemetry-view">
      <div className="section-header">
        <div className="section-title-wrap">
          <BarChart3 size={20} color="var(--accent-cyan)" />
          <h2 className="section-title">Telemetria & Gráficos Semanais</h2>
        </div>
        <span className="section-badge">Análise Comparativa (US13)</span>
      </div>

      {/* METRIC SELECTOR PILLS */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        <button
          className="segmented-btn"
          style={{
            background: activeMetric === 'tasks' ? 'var(--accent-cyan)' : 'var(--surface-card)',
            color: activeMetric === 'tasks' ? '#030712' : 'var(--text-secondary)',
            fontWeight: 700,
            padding: '8px 16px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)'
          }}
          onClick={() => setActiveMetric('tasks')}
        >
          Tarefas
        </button>

        <button
          className="segmented-btn"
          style={{
            background: activeMetric === 'focus' ? 'var(--accent-cyan)' : 'var(--surface-card)',
            color: activeMetric === 'focus' ? '#030712' : 'var(--text-secondary)',
            fontWeight: 700,
            padding: '8px 16px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)'
          }}
          onClick={() => setActiveMetric('focus')}
        >
          Foco Pomodoro
        </button>

        <button
          className="segmented-btn"
          style={{
            background: activeMetric === 'water' ? 'var(--accent-cyan)' : 'var(--surface-card)',
            color: activeMetric === 'water' ? '#030712' : 'var(--text-secondary)',
            fontWeight: 700,
            padding: '8px 16px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)'
          }}
          onClick={() => setActiveMetric('water')}
        >
          Água
        </button>

        <button
          className="segmented-btn"
          style={{
            background: activeMetric === 'sleep' ? 'var(--accent-cyan)' : 'var(--surface-card)',
            color: activeMetric === 'sleep' ? '#030712' : 'var(--text-secondary)',
            fontWeight: 700,
            padding: '8px 16px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)'
          }}
          onClick={() => setActiveMetric('sleep')}
        >
          Sono
        </button>
      </div>

      {/* COMPARISON SUMMARY BANNER (US13) */}
      <div className="card-native" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Comparativo Semanal
            </span>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '2px' }}>
              {selectedData.title}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Semana Atual</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--accent-indigo)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Semana Anterior</span>
            </div>
          </div>
        </div>

        {/* STATS TILES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Semana Atual</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
              {selectedData.currentWeekTotal} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedData.unit}</span>
            </div>
          </div>

          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Semana Anterior</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '4px' }}>
              {selectedData.previousWeekTotal} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedData.unit}</span>
            </div>
          </div>

          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '14px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Variação</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={20} />
              {selectedData.changePercent}
            </div>
          </div>
        </div>

        {/* GRÁFICO DE BARRAS COMPARATIVO (US13) */}
        <div style={{ background: 'rgba(7, 11, 18, 0.6)', borderRadius: '16px', padding: '20px 14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ height: '180px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', alignItems: 'flex-end' }}>
            {selectedData.days.map((d, i) => {
              const currentHeightPercent = Math.min(100, Math.round((d.current / maxBarValue) * 100));
              const prevHeightPercent = Math.min(100, Math.round((d.previous / maxBarValue) * 100));

              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100%', width: '100%', justifyContent: 'center' }}>
                    {/* Previous week bar (Indigo) */}
                    <div 
                      style={{ 
                        width: '12px', 
                        height: `${prevHeightPercent}%`, 
                        background: 'var(--accent-indigo)', 
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                      title={`Semana Anterior (${d.day}): ${d.previous}`}
                    />
                    {/* Current week bar (Cyan) */}
                    <div 
                      style={{ 
                        width: '12px', 
                        height: `${currentHeightPercent}%`, 
                        background: 'var(--accent-cyan)', 
                        borderRadius: '4px 4px 0 0',
                        boxShadow: '0 0 10px rgba(0, 229, 255, 0.4)',
                        transition: 'height 0.4s ease'
                      }}
                      title={`Semana Atual (${d.day}): ${d.current}`}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CÁLCULO DA MÉDIA DE VITALIDADE (US12) EXPLANATION */}
      <div className="card-native">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
            Fórmula da Média de Vitalidade (US12)
          </h4>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          O índice de Vitalidade do Ethos cruza dados de três pilares fundamentais da rotina:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--surface-elevated)', borderRadius: '12px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.8rem' }}>40% Tarefas</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Percentual de conclusão diária</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--surface-elevated)', borderRadius: '12px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.8rem' }}>30% Hidratação</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Copos de água vs meta</div>
          </div>
          <div style={{ padding: '10px', background: 'var(--surface-elevated)', borderRadius: '12px' }}>
            <span style={{ color: 'var(--accent-indigo)', fontWeight: 700, fontSize: '0.8rem' }}>30% Sono</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Ciclo e horas reparadoras</div>
          </div>
        </div>
      </div>
    </div>
  );
}
