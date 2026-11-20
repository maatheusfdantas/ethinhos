/**
 * Água por dia (correção A, 20/11/2026).
 * O valor de água vale só para o dia em que foi registrado (waterDate, data local da pessoa).
 * Ao abrir o app em outro dia, ou na virada da meia-noite com o app aberto, a água começa em 0
 * e a lista de copos do dia anterior não entra no dia novo. Nada do servidor é apagado.
 */
export function todayLocal(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function normalizeHealthForToday(health, today = todayLocal()) {
  if (!health || typeof health !== 'object') return health;
  if (health.waterDate === today) return health;
  return { ...health, waterGlasses: 0, water: 0, waterHistory: [], waterDate: today };
}

/** Marca o registro de água como sendo de hoje (usar em toda gravação de água). */
export const withWaterToday = (health) => ({ ...health, waterDate: todayLocal() });
