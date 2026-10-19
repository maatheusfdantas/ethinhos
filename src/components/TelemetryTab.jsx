import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  Flame, 
  ShieldCheck, 
  RotateCcw, 
  Lightbulb, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  Sparkles, 
  Cpu, 
  Target, 
  Clock, 
  Zap, 
  ChevronRight, 
  RefreshCw,
  User,
  Droplets,
  Moon,
  Radio,
  Check
} from 'lucide-react';

export function TelemetryTab({ habits = [], health = {}, user = null }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLevel, setReportLevel] = useState('expanded'); // 'quick', 'expanded', 'analytical'
  const [analyticalWindow, setAnalyticalWindow] = useState('30d'); // '7d', '30d', '90d'

  // Fetch analytics from Python Engine via backend API
  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        console.warn('Falha ao obter telemetria do backend.');
      }
    } catch (e) {
      console.error('Erro na requisição analítica:', e);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic tracking: re-fetch whenever the user or their habit completions change
  const habitsKey = habits.map(h => `${h.id}:${h.completed}`).join(',');
  useEffect(() => {
    fetchAnalytics();
  }, [user?.id, habitsKey]);

  // Compute live user stats directly from props & backend accompaniment
  const todayCompletedHabitsCount = habits.filter(h => h.completed).length;
  const todayTotalHabitsCount = habits.length;
  const liveHabitsPct = todayTotalHabitsCount > 0 
    ? Math.round((todayCompletedHabitsCount / todayTotalHabitsCount) * 100) 
    : 0;

  const waterGlasses = health?.waterGlasses ?? (analytics?.accompaniment?.water_glasses || 0);
  const waterTarget = health?.waterTarget || (analytics?.accompaniment?.water_target || 10);
  const glassMl = health?.glassMl || (analytics?.accompaniment?.glass_ml || 250);
  const waterMl = waterGlasses * glassMl;
  const waterTargetMl = waterTarget * glassMl;
  const waterPct = Math.min(100, Math.round((waterMl / Math.max(1, waterTargetMl)) * 100));

  const sleepBedTime = health?.sleep?.bedTime || (analytics?.accompaniment?.sleep_bed_time || '23:30');
  const sleepWakeTime = health?.sleep?.wakeTime || (analytics?.accompaniment?.sleep_wake_time || '07:00');
  const sleepLogged = health?.sleep?.logged ?? Boolean(analytics?.accompaniment?.sleep_logged);

  const userProfileLabel = user?.role === 'admin' 
    ? 'Administrador Geral' 
    : user?.id?.includes('pro') || user?.id?.includes('matheus')
      ? 'Matheus Pro (Alto Desempenho)' 
      : user?.id?.includes('lucas') || user?.id?.includes('mid')
        ? 'Lucas Dev (Intermediário)'
        : user?.id?.includes('bruno') || user?.id?.includes('preguica') || user?.id?.includes('low')
          ? 'Bruno (Baixo Engajamento)'
          : user?.id?.includes('clean')
            ? 'Clean (Novo Usuário)'
            : 'Usuário Ativo';

  if (loading && !analytics) {
    return (
      <div className="telemetry-view" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <RefreshCw size={36} color="var(--accent-cyan)" className="spin-icon" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Processando Engine Analítica Python</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Calculando séries temporais, matrizes de regularidade e detecção de padrões...
        </p>
      </div>
    );
  }

  const summary = analytics?.summary || {
    consistency_score: 75.0,
    label: 'consistente',
    description: 'Calculando telemetria...',
    main_streak: 5,
    best_streak: 10,
    daily_progress: liveHabitsPct,
    completion_rate: 75.0,
    trend_status: 'stable',
    trend_delta: 0.0,
    logging_reliability: 85.0,
    recovery_rate: 70.0,
    variability: 18.0
  };

  const highlights = analytics?.highlights || {
    top_strength: 'Treino e Hidratação',
    top_risk: 'Sem riscos detectados',
    suggested_action: 'Mantenha os registros regulares.'
  };

  const alerts = analytics?.alerts || [];
  const habitItems = analytics?.habits || [];
  const categories = analytics?.categories || [];
  const reports = analytics?.reports || {};
  const charts = analytics?.charts || {};

  // Score color
  const getScoreColor = (score) => {
    if (score >= 85) return 'var(--accent-emerald)';
    if (score >= 70) return 'var(--accent-cyan)';
    if (score >= 55) return 'var(--accent-amber)';
    return 'var(--accent-rose)';
  };

  const scoreColor = getScoreColor(summary.consistency_score);
  const dailyProgress = todayTotalHabitsCount > 0 ? liveHabitsPct : (analytics?.accompaniment?.today_completion_rate ?? summary.daily_progress);

  return (
    <div className="telemetry-view">
      {/* SECTION HEADER & ENGINE BADGE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Cpu size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Engine Analítica & Telemetria
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Acompanhamento individual contínuo baseado em modelagem comportamental com Python.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchAnalytics}
            className="segmented-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: 'var(--surface-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer'
            }}
            title="Recalcular métricas"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            Sincronizar Telemetria
          </button>
          <span className="section-badge" style={{ borderColor: 'rgba(0, 229, 255, 0.3)', color: 'var(--accent-cyan)' }}>
            Garmin Connect Core
          </span>
        </div>
      </div>

      {/* PAINEL DE ACOMPANHAMENTO AO VIVO DO USUÁRIO (Acompanhamento Real) */}
      <div className="card-native" style={{ 
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(2, 6, 23, 0.9) 100%)', 
        border: '1px solid rgba(0, 229, 255, 0.25)', 
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow accent */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, background: 'rgba(0, 229, 255, 0.1)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {/* User bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#030712' }}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : <User size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.name || 'Usuário Ethos'}
                </h3>
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 700, 
                  background: 'rgba(0, 229, 255, 0.12)', 
                  color: 'var(--accent-cyan)', 
                  border: '1px solid rgba(0, 229, 255, 0.25)', 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  {userProfileLabel}
                </span>
              </div>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                {user?.email || 'telemetria@ethos.io'} • Telemetria individual ao vivo
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-emerald)', background: 'rgba(52, 211, 153, 0.1)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(52, 211, 153, 0.25)' }}>
            <Radio size={12} className="spin-icon" style={{ animationDuration: '3s' }} />
            <span>Acompanhamento Ativo</span>
          </div>
        </div>

        {/* 3 Live Companion Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Pillar 1: Hábitos do dia */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={14} color="var(--accent-cyan)" />
                Hábitos de Hoje
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: liveHabitsPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                {liveHabitsPct}%
              </span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {todayCompletedHabitsCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>de {todayTotalHabitsCount} concluídos</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ width: `${Math.min(100, liveHabitsPct)}%`, height: '100%', background: liveHabitsPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)', transition: 'width 0.4s ease' }} />
            </div>

            {/* Quick mini-list of live habits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
              {habits.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Nenhum hábito cadastrado ainda.</span>
              ) : (
                habits.map((h, i) => (
                  <div key={h.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: h.completed ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: h.completed ? 'line-through' : 'none' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {h.title || h.name}
                    </span>
                    {h.completed ? (
                      <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', fontWeight: 700 }}>
                        <Check size={12} /> Feito
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.68rem' }}>Pendente</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pillar 2: Hidratação Real */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplets size={14} color="var(--accent-cyan)" />
                Hidratação Atual
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: waterPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
                {waterPct}%
              </span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {waterGlasses} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>de {waterTarget} copos</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ width: `${Math.min(100, waterPct)}%`, height: '100%', background: waterPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)', transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Volume total:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{waterMl} ml / {waterTargetMl} ml</strong>
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.72rem', color: waterPct >= 100 ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}>
              {waterPct >= 100 ? 'Meta de hidratação atingida hoje!' : `Faltam ${Math.max(0, waterTargetMl - waterMl)} ml para a meta.`}
            </div>
          </div>

          {/* Pillar 3: Sono & Descanso */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Moon size={14} color="var(--accent-indigo)" />
                Sono & Recuperação
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                color: sleepLogged ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                background: sleepLogged ? 'rgba(52, 211, 153, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {sleepLogged ? 'Confirmado' : 'Pendente'}
              </span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {sleepBedTime} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>→ {sleepWakeTime}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Janela de descanso programada no perfil
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: sleepLogged ? 'var(--accent-emerald)' : 'var(--text-tertiary)' }}>
              <CheckCircle2 size={13} color={sleepLogged ? 'var(--accent-emerald)' : 'var(--text-tertiary)'} />
              <span>{sleepLogged ? 'Descanso registrado com sucesso.' : 'Confirmar registro matinal no Dashboard.'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 TOP OVERVIEW CARDS (Princípio: Resumo primeiro, detalhe depois) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {/* Card 1: Progresso do Dia */}
        <div className="card-native" style={{ background: 'var(--surface-elevated)', borderLeft: '4px solid var(--accent-cyan)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Progresso do Dia
            </span>
            <Target size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {dailyProgress}%
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, dailyProgress)}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '6px', display: 'block' }}>
            {todayCompletedHabitsCount} de {todayTotalHabitsCount} hábitos concluídos hoje
          </span>
        </div>

        {/* Card 2: Consistency Score */}
        <div className="card-native" style={{ background: 'var(--surface-elevated)', borderLeft: `4px solid ${scoreColor}`, padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Consistency Score
            </span>
            <ShieldCheck size={18} color={scoreColor} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: scoreColor }}>
              {summary.consistency_score}
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: scoreColor, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
              {summary.label}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, summary.consistency_score)}%`, height: '100%', background: scoreColor, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '6px', display: 'block' }}>
            Nota ponderada de 6 pilares
          </span>
        </div>

        {/* Card 3: Streak Principal */}
        <div className="card-native" style={{ background: 'var(--surface-elevated)', borderLeft: '4px solid var(--accent-amber)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Streak Principal
            </span>
            <Flame size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-amber)', marginBottom: '4px' }}>
            {summary.main_streak} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>dias</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Recorde histórico:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{summary.best_streak} dias</strong>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '6px', display: 'block' }}>
            Continuidade e automaticidade
          </span>
        </div>

        {/* Card 4: Tendência Semanal */}
        <div className="card-native" style={{ background: 'var(--surface-elevated)', borderLeft: '4px solid var(--accent-indigo)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Tendência Recente
            </span>
            {summary.trend_status === 'improving' ? (
              <TrendingUp size={18} color="var(--accent-emerald)" />
            ) : summary.trend_status === 'declining' ? (
              <TrendingDown size={18} color="var(--accent-rose)" />
            ) : (
              <Minus size={18} color="var(--accent-cyan)" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
            <span style={{ 
              fontSize: '1.8rem', 
              fontWeight: 800, 
              color: summary.trend_status === 'improving' ? 'var(--accent-emerald)' : summary.trend_status === 'declining' ? 'var(--accent-rose)' : 'var(--text-primary)' 
            }}>
              {summary.trend_delta > 0 ? `+${summary.trend_delta}%` : `${summary.trend_delta}%`}
            </span>
            <span style={{ 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              textTransform: 'uppercase',
              color: summary.trend_status === 'improving' ? 'var(--accent-emerald)' : summary.trend_status === 'declining' ? 'var(--accent-rose)' : 'var(--accent-cyan)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              {summary.trend_status === 'improving' ? 'Em Alta' : summary.trend_status === 'declining' ? 'Em Queda' : 'Estável'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '6px', display: 'block' }}>
            Últimos 7 dias vs semana anterior
          </span>
        </div>
      </div>

      {/* HIGHLIGHTS STRIP: Ponto Forte, Risco e Sugestão */}
      <div className="card-native" style={{ marginBottom: '24px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(0, 229, 255, 0.2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={18} color="var(--accent-emerald)" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
                Ponto Mais Forte
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {highlights.top_strength}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={18} color="var(--accent-rose)" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase' }}>
                Atenção / Risco
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {highlights.top_risk}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lightbulb size={18} color="var(--accent-cyan)" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Ação Prática Sugerida
              </span>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>
                {highlights.suggested_action}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIAGNOSTIC ALERTS BANNER (Se houver alertas de queda, conflito semanal ou baixa confiabilidade) */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {alerts.map((al, idx) => (
            <div 
              key={idx} 
              className="card-native" 
              style={{ 
                background: al.type === 'conflict' ? 'rgba(251, 191, 36, 0.08)' : al.type === 'decline' ? 'rgba(244, 63, 94, 0.08)' : 'rgba(129, 140, 248, 0.08)',
                borderLeft: `4px solid ${al.type === 'conflict' ? 'var(--accent-amber)' : al.type === 'decline' ? 'var(--accent-rose)' : 'var(--accent-indigo)'}`,
                padding: '12px 16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <AlertCircle size={16} color={al.type === 'conflict' ? 'var(--accent-amber)' : al.type === 'decline' ? 'var(--accent-rose)' : 'var(--accent-indigo)'} />
                <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{al.title}</strong>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {al.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 3-LEVEL REPORT SYSTEM SWITCHER (Requisito: Rápido, Expandido, Analítico) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>
              Geração de Relatórios por Camadas
            </h3>
          </div>

          <div style={{ display: 'flex', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-pill)', padding: '4px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setReportLevel('quick')}
              style={{
                background: reportLevel === 'quick' ? 'var(--accent-cyan)' : 'transparent',
                color: reportLevel === 'quick' ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Rápido
            </button>
            <button
              onClick={() => setReportLevel('expanded')}
              style={{
                background: reportLevel === 'expanded' ? 'var(--accent-cyan)' : 'transparent',
                color: reportLevel === 'expanded' ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Expandido
            </button>
            <button
              onClick={() => setReportLevel('analytical')}
              style={{
                background: reportLevel === 'analytical' ? 'var(--accent-cyan)' : 'transparent',
                color: reportLevel === 'analytical' ? '#030712' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '6px 14px',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Analítico (7d/30d/90d)
            </button>
          </div>
        </div>

        {/* NÍVEL 1: RELATÓRIO RÁPIDO */}
        {reportLevel === 'quick' && reports.quick && (
          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="section-badge" style={{ color: 'var(--accent-cyan)' }}>Resumo Executivo</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Leitura em 30 segundos</span>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '16px' }}>
              {reports.quick.summary_text}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Score Geral</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: scoreColor }}>
                  {reports.quick.consistency_score} ({reports.quick.label})
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sequência Ativa</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                  {reports.quick.main_streak} dias
                </div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Recomendação Imediata</span>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {reports.quick.suggested_action}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NÍVEL 2: RELATÓRIO EXPANDIDO */}
        {reportLevel === 'expanded' && reports.expanded && (
          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '20px' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '20px' }}>
              {reports.expanded.summary_paragraph}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Fatores que puxaram para baixo */}
              <div style={{ padding: '16px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <TrendingDown size={18} color="var(--accent-rose)" />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Fatores de Atenção</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reports.expanded.negative_factors?.map((f, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sugestões Práticas */}
              <div style={{ padding: '16px', background: 'rgba(0, 229, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Sugestões Comportamentais</strong>
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reports.expanded.practical_suggestions?.map((s, i) => (
                    <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ranking dos Hábitos */}
            <div>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Ranking de Consistência por Hábito
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reports.expanded.ranking?.map((h, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', width: 16 }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {h.name}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {h.category} • Regularidade: {Math.round(h.regularity * 100)}%
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: h.completion_rate >= 80 ? 'var(--accent-emerald)' : h.completion_rate >= 50 ? 'var(--accent-cyan)' : 'var(--accent-rose)' }}>
                          {h.completion_rate}%
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          {h.streak}d streak
                        </span>
                      </div>

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: h.status === 'Em Risco' ? 'rgba(244, 63, 94, 0.15)' : h.status === 'Em Alta' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255,255,255,0.06)',
                        color: h.status === 'Em Risco' ? 'var(--accent-rose)' : h.status === 'Em Alta' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                      }}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* NÍVEL 3: RELATÓRIO ANALÍTICO EXPANDIDO */}
        {reportLevel === 'analytical' && reports.analytical && (
          <div className="card-native" style={{ background: 'var(--surface-elevated)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <span className="section-badge" style={{ color: 'var(--accent-cyan)' }}>Janelas de Análise Histórica</span>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  Comparativo de Tendência (7, 30 e 90 dias)
                </h4>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['7d', '30d', '90d'].map(w => (
                  <button
                    key={w}
                    onClick={() => setAnalyticalWindow(w)}
                    style={{
                      background: analyticalWindow === w ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.04)',
                      color: analyticalWindow === w ? '#030712' : 'var(--text-secondary)',
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-pill)',
                      cursor: 'pointer'
                    }}
                  >
                    {w === '7d' ? '7 Dias' : w === '30d' ? '30 Dias' : '90 Dias'}
                  </button>
                ))}
              </div>
            </div>

            {/* Window stats cards */}
            {(() => {
              const activeWindowData = reports.analytical[`window_${analyticalWindow}`] || reports.analytical.window_30d;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Taxa de Conclusão</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                      {Math.round(activeWindowData.completion_rate)}%
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Consistency Score</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: scoreColor, marginTop: '4px' }}>
                      {Math.round(activeWindowData.consistency_score)}
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Taxa de Recuperação</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                      {Math.round(activeWindowData.recovery_rate)}%
                    </div>
                  </div>
                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Confiabilidade Registro</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '4px' }}>
                      {Math.round(activeWindowData.logging_reliability)}%
                    </div>
                  </div>
                </div>
              );
            })()}

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              {reports.analytical.deep_explanation}
            </p>

            <div style={{ padding: '14px', background: 'rgba(0, 229, 255, 0.05)', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
              <strong style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '6px' }}>
                Recomendações Adaptativas Baseadas em Dados
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {reports.analytical.adaptive_recommendations?.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* HEATMAP MENSAL DE CONSISTÊNCIA (30 Dias) */}
      <div className="card-native" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Frequência Diária
            </span>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
              Heatmap de Atividade nos Últimos 30 Dias
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <span>0%</span>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0, 229, 255, 0.3)' }} />
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0, 229, 255, 0.7)' }} />
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-cyan)' }} />
            <span>100%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(28px, 1fr))', gap: '6px' }}>
          {(charts.calendar_heatmap || []).map((cell, idx) => {
            const isToday = cell.date === new Date().toISOString().split('T')[0];
            const completedCount = isToday && todayTotalHabitsCount > 0 ? todayCompletedHabitsCount : (cell.completed || 0);
            const totalCount = isToday && todayTotalHabitsCount > 0 ? todayTotalHabitsCount : (cell.total || 0);
            const intensity = totalCount > 0 ? completedCount / totalCount : (cell.intensity || 0.0);

            let bg = 'rgba(255,255,255,0.04)';
            if (intensity >= 0.8) bg = 'var(--accent-cyan)';
            else if (intensity >= 0.5) bg = 'rgba(0, 229, 255, 0.6)';
            else if (intensity > 0.0) bg = 'rgba(0, 229, 255, 0.25)';

            return (
              <div
                key={idx}
                style={{
                  height: 38,
                  borderRadius: 6,
                  background: bg,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: isToday ? '2px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: isToday ? '0 0 10px rgba(0, 229, 255, 0.4)' : 'none',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
                title={isToday 
                  ? `Hoje (${cell.date}): ${completedCount} de ${totalCount} hábitos concluídos (${Math.round(intensity * 100)}%) - Ao Vivo`
                  : `${cell.date}: ${cell.completed} de ${cell.total} hábitos concluídos (${Math.round(intensity * 100)}%)`}
              >
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: intensity >= 0.5 ? '#030712' : 'var(--text-secondary)' }}>
                  {cell.date ? cell.date.split('-')[2] : ''}
                </span>
                {isToday && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPARATIVO SEMANAL E ADERÊNCIA POR CATEGORIA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Gráfico de Barras: Semana Atual vs Semana Anterior */}
        <div className="card-native">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                Comparativo
              </span>
              <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
                Execuções Concluídas por Dia
              </h4>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Atual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent-indigo)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Anterior</span>
              </div>
            </div>
          </div>

          <div style={{ height: '160px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', alignItems: 'flex-end', paddingTop: '10px' }}>
            {(() => {
              const dayLabelsMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
              const todayDayLabel = dayLabelsMap[new Date().getDay()];

              const weeklyList = charts.weekly_completion || [];
              const maxVal = Math.max(5, ...weeklyList.map(x => Math.max(x.current, x.previous)), todayCompletedHabitsCount);

              return weeklyList.map((d, i) => {
                const isTodayDay = d.day === todayDayLabel;
                const actualCur = isTodayDay && todayTotalHabitsCount > 0 ? Math.max(d.current, todayCompletedHabitsCount) : d.current;
                const curH = Math.round((actualCur / maxVal) * 100);
                const prevH = Math.round((d.previous / maxVal) * 100);

                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100%', width: '100%', justifyContent: 'center' }}>
                      <div 
                        style={{ 
                          width: '10px', 
                          height: `${Math.max(4, prevH)}%`, 
                          background: 'var(--accent-indigo)', 
                          borderRadius: '3px 3px 0 0',
                          opacity: 0.7 
                        }} 
                        title={`Semana anterior (${d.day}): ${d.previous}`}
                      />
                      <div 
                        style={{ 
                          width: '10px', 
                          height: `${Math.max(4, curH)}%`, 
                          background: isTodayDay ? 'var(--accent-emerald)' : 'var(--accent-cyan)', 
                          borderRadius: '3px 3px 0 0',
                          boxShadow: isTodayDay ? '0 0 10px rgba(52, 211, 153, 0.6)' : '0 0 8px rgba(0, 229, 255, 0.4)' 
                        }} 
                        title={isTodayDay ? `Hoje (${d.day}): ${actualCur} concluídos (Ao Vivo)` : `Semana atual (${d.day}): ${actualCur}`}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: isTodayDay ? 'var(--accent-emerald)' : 'var(--text-secondary)', fontWeight: isTodayDay ? 800 : 600 }}>
                      {d.day}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Aderência por Categoria */}
        <div className="card-native">
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              Distribuição
            </span>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
              Aderência por Categoria
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categories.map((c, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.category}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: c.adherence >= 80 ? 'var(--accent-emerald)' : c.adherence >= 50 ? 'var(--accent-cyan)' : 'var(--accent-amber)' }}>
                    {c.adherence}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.min(100, c.adherence)}%`, 
                      height: '100%', 
                      background: c.adherence >= 80 ? 'var(--accent-emerald)' : c.adherence >= 50 ? 'var(--accent-cyan)' : 'var(--accent-amber)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '2px', display: 'block' }}>
                  {c.total_completed} de {c.total_expected} execuções no período • {c.habits_count} hábitos
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXPLICAÇÃO TÉCNICA DAS FÓRMULAS & NOTA IDEAL */}
      <div className="card-native" style={{ background: 'rgba(7, 11, 18, 0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>
            Estrutura Ponderada do Consistency Score
          </h4>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {summary.description}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '14px' }}>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>30% Conclusão</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Aderência às metas</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>20% Regularidade</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Espaçamento temporal</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>15% Retomada</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Resiliência pós-falha</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>15% Confiabilidade</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Qualidade do log</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>10% Tendência</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Delta 7d vs 7d ant.</div>
          </div>
          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>10% Equilíbrio</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Estabilidade categorias</div>
          </div>
        </div>
      </div>
    </div>
  );
}
