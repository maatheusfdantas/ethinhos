import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { isEventForDate } from '../services/storage';

export function GlobalProgressBar({ habits = [], events = [], activeTab }) {
  // Ocultar estritamente na aba Social conforme solicitado
  if (activeTab === 'social') return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => isEventForDate(e, todayStr));

  const totalActivities = habits.length + todayEvents.length;
  const completedHabits = habits.filter(h => h.completed).length;
  const completedEvents = todayEvents.filter(e => e.completed).length;
  const totalCompleted = completedHabits + completedEvents;

  // Auto-padronização proporcional (0% a 100%) independente da quantidade de atividades
  const percentage = totalActivities > 0 
    ? Math.round((totalCompleted / totalActivities) * 100) 
    : 0;

  const isFull = percentage >= 100;

  return (
    <div 
      className="global-activity-bar-container"
      style={{
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.85) 0%, rgba(10, 15, 29, 0.95) 100%)',
        border: `1px solid ${isFull ? 'rgba(52, 211, 153, 0.3)' : 'rgba(0, 229, 255, 0.2)'}`,
        borderRadius: '14px',
        padding: '12px 18px',
        marginBottom: '20px',
        backdropFilter: 'blur(12px)',
        boxShadow: isFull ? '0 0 20px rgba(52, 211, 153, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '9px',
            background: isFull ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0, 229, 255, 0.15)',
            color: isFull ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isFull ? <CheckCircle2 size={18} strokeWidth={2.5} /> : <Target size={18} strokeWidth={2.5} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Progresso Global das Atividades
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                background: isFull ? 'rgba(52, 211, 153, 0.15)' : percentage > 0 ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                color: isFull ? 'var(--accent-emerald)' : percentage > 0 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: `1px solid ${isFull ? 'rgba(52, 211, 153, 0.3)' : percentage > 0 ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`
              }}>
                {isFull ? 'Metas Concluídas' : percentage >= 50 ? 'Bom Ritmo' : percentage > 0 ? 'Em Andamento' : 'Início do Dia'}
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {totalActivities === 0 
                ? 'Nenhuma atividade cadastrada para hoje' 
                : `${totalCompleted} de ${totalActivities} atividades concluídas hoje (${completedHabits} hábitos + ${completedEvents} compromissos)`}
            </span>
          </div>
        </div>

        {/* Porcentagem em tempo real */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: isFull ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
            letterSpacing: '-0.5px'
          }}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Barra de Progresso Fluida Auto-padronizada */}
      <div style={{
        width: '100%',
        height: '8px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <div 
          style={{
            width: `${Math.min(100, Math.max(0, percentage))}%`,
            height: '100%',
            background: isFull 
              ? 'linear-gradient(90deg, var(--accent-emerald), #10b981)' 
              : 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))',
            borderRadius: '4px',
            boxShadow: isFull ? '0 0 10px rgba(52, 211, 153, 0.5)' : '0 0 10px rgba(0, 229, 255, 0.4)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
    </div>
  );
}
