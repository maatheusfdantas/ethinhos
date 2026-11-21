import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import { Sparkles, TrendingUp, BarChart3, Layers } from 'lucide-react';

/**
 * Tooltip Flutuante Glassmórfico com Contexto de Negócio
 */
function CustomEthosTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const currentObj = payload.find((p) => p.dataKey === 'current');
  const prevObj = payload.find((p) => p.dataKey === 'previous');
  const curVal = Number(currentObj?.value ?? 0);
  const prevVal = Number(prevObj?.value ?? 0);
  const delta = curVal - prevVal;

  return (
    <div
      style={{
        background: 'rgba(8, 12, 24, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '14px',
        padding: '12px 14px',
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.65)',
        minWidth: '175px',
        color: '#F8FAFC'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#F8FAFC' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '999px',
            background: delta >= 0 ? 'rgba(52, 211, 153, 0.16)' : 'rgba(244, 63, 94, 0.16)',
            color: delta >= 0 ? '#34D399' : '#FB7185'
          }}
        >
          {delta >= 0 ? `+${delta} vs sem. ant.` : `${delta} vs sem. ant.`}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.76rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#CBD5E1' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8' }} />
            Semana Atual
          </span>
          <strong style={{ color: '#38BDF8', fontVariantNumeric: 'tabular-nums' }}>
            {curVal} {curVal === 1 ? 'execução' : 'execuções'}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94A3B8' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#818CF8' }} />
            Semana Anterior
          </span>
          <strong style={{ color: '#A5B4FC', fontVariantNumeric: 'tabular-nums' }}>
            {prevVal} {prevVal === 1 ? 'execução' : 'execuções'}
          </strong>
        </div>
      </div>
    </div>
  );
}

/**
 * Estado Vazio (Empty State) Editorial para Visualização de Dados
 */
export function EmptyDataVizState({ title, description, icon: Icon = BarChart3, badgeText = 'Aguardando Primeiros Registros' }) {
  return (
    <div
      data-testid="dataviz-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '28px 20px',
        minHeight: '190px',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(7, 10, 19, 0.65) 100%)',
        border: '1px dashed rgba(148, 163, 184, 0.22)'
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38BDF8',
          marginBottom: '12px'
        }}
      >
        <Icon size={20} />
      </div>

      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#38BDF8',
          marginBottom: '4px'
        }}
      >
        {badgeText}
      </span>

      <h5 style={{ margin: '0 0 6px 0', fontSize: '0.92rem', fontWeight: 700, color: '#F8FAFC' }}>
        {title}
      </h5>

      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8', maxWidth: '340px', lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

/**
 * Gráfico Recharts Interativo: Execuções Concluídas por Dia (Semana Atual vs Anterior)
 */
export function WeeklyExecutionChart({ weeklyData = [], todayCompletedHabitsCount = 0, todayTotalHabitsCount = 0 }) {
  const dayLabelsMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const todayDayLabel = dayLabelsMap[new Date().getDay()];

  const normalizedData = (weeklyData.length > 0
    ? weeklyData
    : dayLabelsMap.map((day) => ({ day, current: 0, previous: 0 }))
  ).map((d) => {
    const isToday = d.day === todayDayLabel;
    const liveCurrent =
      isToday && todayTotalHabitsCount > 0
        ? Math.max(Number(d.current) || 0, todayCompletedHabitsCount)
        : Number(d.current) || 0;
    return {
      day: d.day,
      current: liveCurrent,
      previous: Number(d.previous) || 0,
      isToday
    };
  });

  const totalExecutions = normalizedData.reduce((acc, item) => acc + item.current + item.previous, 0);

  if (totalExecutions === 0 && todayTotalHabitsCount === 0) {
    return (
      <EmptyDataVizState
        icon={TrendingUp}
        badgeText="Série Temporal Limpa"
        title="Nenhuma execução registrada nesta semana"
        description="Conclua seu primeiro hábito do dia para destravar a curva comparativa entre a semana atual e a anterior."
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '210px' }} data-testid="recharts-weekly-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={normalizedData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="ethosCyanArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
          />
          <Tooltip content={<CustomEthosTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: 8 }} />
          <Area
            type="monotone"
            dataKey="current"
            stroke="#38BDF8"
            strokeWidth={2}
            fill="url(#ethosCyanArea)"
            activeDot={{ r: 5, fill: '#38BDF8', stroke: '#05070B', strokeWidth: 2 }}
          />
          <Bar dataKey="previous" name="Semana Anterior" fill="#818CF8" fillOpacity={0.45} radius={[6, 6, 0, 0]} barSize={12} />
          <Bar dataKey="current" name="Semana Atual" radius={[6, 6, 0, 0]} barSize={12}>
            {normalizedData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.isToday ? '#34D399' : '#38BDF8'}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Visualização de Aderência por Categoria com Estado Vazio Editorial
 */
export function CategoryAdherenceList({ categories = [] }) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return (
      <EmptyDataVizState
        icon={Layers}
        badgeText="Distribuição por Categoria"
        title="Nenhuma categoria hoje"
        description="Os hábitos de hoje aparecem aqui, agrupados por categoria."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {categories.map((c, idx) => {
        const adherence = Math.min(100, Math.max(0, Number(c.adherence) || 0));
        const barColor =
          adherence >= 80
            ? 'var(--accent-emerald)'
            : adherence >= 50
            ? 'var(--accent-cyan)'
            : 'var(--accent-amber)';

        return (
          <div key={idx} style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {c.category}
              </span>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: barColor,
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {adherence}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${adherence}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: '999px',
                  transition: 'width 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
                }}
              />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              {c.total_completed} de {c.total_expected} execuções no período • {c.habits_count} {c.habits_count === 1 ? 'hábito' : 'hábitos'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

