/**
 * Funções Puras de Domínio — Biometria, Vitalidade, XP e Telemetria Comportamental
 * Projetadas com alta testabilidade (Pure Functions, Zero Side-Effects)
 */

export const WATER_ML_PER_KG = 35;
export const DEFAULT_GLASS_ML = 250;
export const XP_PER_LEVEL = 300;

/**
 * Calcula a meta diária ideal de água com base no peso corporal:
 * Fórmula: Peso (em kg) × 35 ml = quantidade diária de água
 *
 * @param {number|string} weightKg Peso corporal em quilogramas
 * @param {number|string} glassMl Capacidade do recipiente em ml (padrão: 250ml)
 * @returns {{ weightKg: number, glassMl: number, dailyMl: number, dailyLiters: string, targetGlasses: number }}
 */
export function calculateDailyWaterTarget(weightKg, glassMl = DEFAULT_GLASS_ML) {
  const cleanWeight = typeof weightKg === 'string'
    ? parseFloat(weightKg.replace(',', '.'))
    : Number(weightKg);
  const validWeight = Number.isFinite(cleanWeight) && cleanWeight > 0 ? cleanWeight : 0;

  const cleanGlass = Number(glassMl);
  const validGlass = Number.isFinite(cleanGlass) && cleanGlass > 0 ? cleanGlass : DEFAULT_GLASS_ML;

  if (validWeight <= 0) {
    return {
      weightKg: 0,
      glassMl: validGlass,
      dailyMl: 0,
      dailyLiters: '0,00',
      targetGlasses: 8
    };
  }

  const dailyMl = Math.round(validWeight * WATER_ML_PER_KG);
  const dailyLiters = (dailyMl / 1000).toFixed(2).replace('.', ',');
  const targetGlasses = Math.max(1, Math.ceil(dailyMl / validGlass));

  return {
    weightKg: validWeight,
    glassMl: validGlass,
    dailyMl,
    dailyLiters,
    targetGlasses
  };
}

/**
 * Retorna o título de maestria correspondente ao nível do usuário.
 * @param {number} level
 * @returns {string}
 */
export function getLevelTitle(level) {
  const safeLevel = Math.max(1, Number(level) || 1);
  if (safeLevel <= 2) return 'Iniciante Consciente';
  if (safeLevel <= 4) return 'Praticante Consistente';
  if (safeLevel <= 7) return 'Estrategista da Rotina';
  if (safeLevel <= 11) return 'Arquiteto de Performance';
  return 'Mestre do Ethos';
}

/**
 * Calcula o XP total acumulado, o nível atual e o progresso percentual para o próximo nível.
 */
export function calculateUserLevelAndXp({
  basePoints = 0,
  habits = [],
  streakDays = 0,
  workouts = [],
  postIts = [],
  playlists = [],
  bonusXp = 0
} = {}) {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const safeWorkouts = Array.isArray(workouts) ? workouts : [];
  const safePostIts = Array.isArray(postIts) ? postIts : [];
  const safePlaylists = Array.isArray(playlists) ? playlists : [];

  const completedHabitsCount = safeHabits.filter((h) => Boolean(h?.completed)).length;
  const habitsXp = completedHabitsCount * 25 + safeHabits.length * 10;
  const streakXp = Math.max(0, Number(streakDays) || 0) * 15;
  const workoutsXp = safeWorkouts.reduce(
    (acc, w) => acc + (Array.isArray(w?.exercises) ? w.exercises.length : 0) * 20,
    0
  );
  const postItsXp = safePostIts.length * 10;
  const playlistsXp = safePlaylists.length * 15;

  const totalXp =
    Math.max(0, Number(basePoints) || 0) +
    habitsXp +
    streakXp +
    workoutsXp +
    postItsXp +
    playlistsXp +
    Math.max(0, Number(bonusXp) || 0);

  const currentLevel = Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
  const currentLevelProgressXp = totalXp % XP_PER_LEVEL;
  const xpProgressPercent = Math.min(100, Math.round((currentLevelProgressXp / XP_PER_LEVEL) * 100));

  return {
    totalXp,
    currentLevel,
    currentLevelProgressXp,
    xpProgressPercent,
    xpPerLevel: XP_PER_LEVEL,
    levelTitle: getLevelTitle(currentLevel),
    completedHabitsCount
  };
}

/**
 * Calcula o Consistency Score ponderado (0 a 100):
 * - 30% Taxa de Conclusão (completionRate)
 * - 20% Regularidade Temporal (regularityRate)
 * - 15% Taxa de Retomada pós-falha (recoveryRate)
 * - 15% Confiabilidade de Registro (loggingReliability)
 * - 10% Tendência Semanal (trendScore)
 * - 10% Equilíbrio entre Categorias (categoryBalance)
 */
export function calculateConsistencyScore({
  completionRate = 0,
  regularityRate = 0,
  recoveryRate = 0,
  loggingReliability = 0,
  trendScore = 0,
  categoryBalance = 0
} = {}) {
  const clamp = (val) => Math.max(0, Math.min(100, Number(val) || 0));
  const weighted =
    clamp(completionRate) * 0.3 +
    clamp(regularityRate) * 0.2 +
    clamp(recoveryRate) * 0.15 +
    clamp(loggingReliability) * 0.15 +
    clamp(trendScore) * 0.1 +
    clamp(categoryBalance) * 0.1;

  return Math.round(weighted * 10) / 10;
}

/**
 * Calcula o Resumo de Vitalidade Diária (0 a 100%).
 * Retorna 0% quando o usuário recém-cadastrado não possui registros realizados no dia.
 */
export function calculateVitalityScore({ habits = [], health = {} } = {}) {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const waterConsumed = Math.max(0, Number(health?.water ?? health?.waterGlasses) || 0);
  const waterTarget = Math.max(1, Number(health?.waterTarget) || 8);
  const sleepHours = Math.max(0, Number(health?.sleep?.hours ?? health?.sleep) || 0);
  const sleepGoal = Math.max(1, Number(health?.sleepGoal) || 8);

  const completedHabits = safeHabits.filter((h) => Boolean(h?.completed)).length;
  const hasAnyActivity = completedHabits > 0 || waterConsumed > 0 || sleepHours > 0;
  if (!hasAnyActivity) {
    return 0;
  }

  const habitsPct = safeHabits.length > 0 ? Math.min(100, (completedHabits / safeHabits.length) * 100) : 0;
  const waterPct = Math.min(100, (waterConsumed / waterTarget) * 100);
  const sleepPct = Math.min(100, (sleepHours / sleepGoal) * 100);

  const activePillars = [
    safeHabits.length > 0 ? habitsPct : null,
    waterConsumed > 0 ? waterPct : 0,
    sleepHours > 0 ? sleepPct : 0
  ].filter((v) => v !== null);

  if (activePillars.length === 0) return 0;
  return Math.round(activePillars.reduce((a, b) => a + b, 0) / activePillars.length);
}

