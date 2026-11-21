/**
 * Análise de progresso (`/api/analytics/:id`), só com dados reais (decisão Q4 de 15/11/2026).
 * Antes, o relatório inventava números (índice 64.5, tendência +6.4%, sequência 5/9, categorias e gráficos fixos,
 * e valores diferentes conforme o id da conta). Agora devolve apenas o que existe no banco:
 * - progresso de hoje (hábitos concluídos ÷ hábitos), a lista de hábitos de hoje e as categorias calculadas com eles.
 * Os hábitos ainda não guardam histórico diário, então índice, sequência, tendência, série, mapa de 30 dias e
 * comparativo semanal ficam vazios (`history_available: false`) e a tela não os mostra.
 */
export function buildEdgeAnalyticsReport(_userId, habitsList = []) {
  const total = habitsList.length;
  const done = habitsList.filter((h) => h.completed).length;
  const dailyPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byCategory = new Map();
  for (const h of habitsList) {
    const key = h.category || 'Sem categoria';
    const c = byCategory.get(key) || { category: key, total_expected: 0, total_completed: 0 };
    c.total_expected += 1;
    if (h.completed) c.total_completed += 1;
    byCategory.set(key, c);
  }
  const categories = [...byCategory.values()]
    .map((c) => ({ ...c, adherence: Math.round((c.total_completed / c.total_expected) * 100) }))
    .sort((a, b) => b.adherence - a.adherence || b.total_expected - a.total_expected);

  return {
    history_available: false,
    summary: {
      consistency_score: null,
      label: null,
      description: total > 0 ? `Hoje: ${done} de ${total} hábitos concluídos.` : 'Nenhum hábito cadastrado ainda.',
      main_streak: null,
      best_streak: null,
      daily_progress: dailyPct,
      completion_rate: dailyPct,
      trend_status: null,
      trend_delta: null
    },
    highlights: {},
    alerts: [],
    habits: habitsList.map((h) => ({
      habit_id: h.id,
      title: h.title,
      category: h.category,
      completed_today: Boolean(h.completed)
    })),
    categories,
    reports: {},
    charts: {}
  };
}
