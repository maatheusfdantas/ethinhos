/**
 * Relatório analítico legado.
 * Extraído de functions/api/[[path]].js sem mudança de comportamento (Fase 1).
 */

// ============================================================================
// 6. MOTOR ANALÍTICO NATIVO PARA CLOUDFLARE EDGE (`/api/analytics/:id`)
// ============================================================================
export function buildEdgeAnalyticsReport(userId, habitsList = []) {
  const total = habitsList.length;
  const done = habitsList.filter((h) => h.completed).length;
  const dailyPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const isPro = userId.includes('matheus') || userId.includes('pro');
  const isLow = userId.includes('bruno') || userId.includes('low');
  const score = isPro ? 91.4 : isLow ? 34.2 : Math.max(64.5, dailyPct);

  const today = new Date();
  const scoreSeries = [];
  const calendarHeatmap = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const iso = d.toISOString().split('T')[0];
    scoreSeries.push({ date: iso, score: Number((score - 8 + i * 0.6).toFixed(1)) });
  }
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (29 - i));
    const iso = d.toISOString().split('T')[0];
    calendarHeatmap.push({
      date: iso,
      total: Math.max(1, total),
      completed: done,
      intensity: total > 0 ? Number((done / total).toFixed(2)) : 0.6
    });
  }

  return {
    summary: {
      consistency_score: score,
      label: score >= 80 ? 'excelente' : score >= 60 ? 'consistente' : 'em_evolucao',
      description: 'Telemetria processada na borda via Cloudflare Edge.',
      main_streak: isPro ? 14 : 5,
      best_streak: isPro ? 21 : 9,
      daily_progress: dailyPct,
      completion_rate: score,
      trend_status: 'improving',
      trend_delta: 6.4,
      logging_reliability: 92.0,
      recovery_rate: 80.0,
      variability: 12.5
    },
    highlights: {
      best_habit: habitsList[0]?.title || 'Revisar Pull Requests no GitHub',
      critical_habit: habitsList[habitsList.length - 1]?.title || 'Estudar Algoritmos',
      strongest_category: 'Trabalho',
      weakest_category: 'Casa'
    },
    alerts: [],
    habits: habitsList.map((h) => ({
      habit_id: h.id,
      title: h.title,
      category: h.category,
      completion_rate: h.completed ? 100 : 50,
      current_streak: h.completed ? 4 : 0,
      best_streak: 7,
      status: h.completed ? 'forte' : 'atencao'
    })),
    categories: [
      { category: 'Trabalho', adherence: 88, total_expected: 10, total_completed: 9 },
      { category: 'Saúde', adherence: 82, total_expected: 8, total_completed: 7 },
      { category: 'Faculdade', adherence: 75, total_expected: 8, total_completed: 6 }
    ],
    reports: {
      quick: { headline: 'Desempenho estável na semana', summary_text: 'Mantenha o foco nos hábitos de alta prioridade.' },
      expanded: { overview: 'Consistência sólida nos blocos matinais e evolução contínua.' },
      analytical: { methodology: 'Score ponderado na Cloudflare Edge com dados do D1.' }
    },
    charts: {
      score_series: scoreSeries,
      weekly_completion: [
        { day: 'Seg', current: 3, previous: 2 },
        { day: 'Ter', current: 4, previous: 3 },
        { day: 'Qua', current: 3, previous: 3 },
        { day: 'Qui', current: 4, previous: 2 },
        { day: 'Sex', current: 3, previous: 3 },
        { day: 'Sáb', current: 2, previous: 1 },
        { day: 'Dom', current: 2, previous: 2 }
      ],
      calendar_heatmap: calendarHeatmap
    }
  };
}

