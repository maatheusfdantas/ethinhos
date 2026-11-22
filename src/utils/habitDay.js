/**
 * Hábitos por dia (proposta 15, 22/11/2026; decisão Q5 de 15/11).
 * `doneDate` é o dia (data local) a que o progresso do hábito pertence.
 * - Num dia novo, um hábito com progresso de outro dia começa desmarcado (current 0). O dia anterior
 *   já foi guardado no registro diário (/api/dias), então nada se perde.
 * - Hábito sem doneDate (criado antes desta mudança) não é zerado: ele ganha a data na próxima marcação.
 * - Toda mudança de progresso carimba o dia de hoje.
 */
import { todayLocal } from './healthDay';

const progresso = (h) => `${h?.completed ? 1 : 0}|${Number(h?.current || 0)}`;

export function normalizeHabitsForToday(habits, today = todayLocal()) {
  if (!Array.isArray(habits)) return habits;
  let mudou = false;
  const out = habits.map((h) => {
    if (!h || !h.doneDate || h.doneDate === today) return h;
    if (!h.completed && !Number(h.current || 0)) return h;
    mudou = true;
    return { ...h, completed: false, current: 0, doneDate: today };
  });
  return mudou ? out : habits;
}

/** Carimba o dia de hoje nos hábitos cujo progresso mudou desde `antes`. Devolve a mesma lista se nada mudou. */
export function stampProgressDates(antes, depois, today = todayLocal()) {
  if (!Array.isArray(depois)) return depois;
  const prev = new Map((Array.isArray(antes) ? antes : []).filter((h) => h?.id).map((h) => [String(h.id), progresso(h)]));
  let mudou = false;
  const out = depois.map((h) => {
    if (!h?.id || h.doneDate === today) return h;
    const p = prev.get(String(h.id));
    const tem = h.completed || Number(h.current || 0) > 0;
    if (p === undefined ? !tem : p === progresso(h)) return h;
    mudou = true;
    return { ...h, doneDate: today };
  });
  return mudou ? out : depois;
}

/** Resumo dos hábitos do dia para o registro diário. */
export const habitsSnapshot = (habits) => (Array.isArray(habits) ? habits : [])
  .filter((h) => h?.id)
  .map((h) => ({ id: String(h.id), t: h.title || h.name || '', c: h.category || '', f: Boolean(h.completed) }));
