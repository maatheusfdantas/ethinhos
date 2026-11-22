import { useEffect, useRef } from 'react';
import { apiFetch } from '../utils/api';
import { todayLocal } from '../utils/healthDay';
import { habitsSnapshot } from '../utils/habitDay';
import { loadState as loadFoco } from '../components/rx/focoStore';

/** Minutos de foco de um dia (o Foco guarda neste aparelho). */
export function focoMinutos(userId, dia = todayLocal()) {
  try {
    return Math.round(Number(loadFoco(userId)?.days?.[dia]?.min || 0));
  } catch {
    return 0;
  }
}

/** O que vai para /api/dias: hábitos de hoje, água, sono e foco. */
export function resumoDoDia({ habits, health, focusMin }) {
  const sono = health?.sleep || {};
  return {
    habits: habitsSnapshot(habits),
    waterGlasses: Number(health?.waterGlasses || 0),
    waterTarget: Number(health?.waterTarget || 0),
    glassMl: Number(health?.glassMl || 250),
    sleepLogged: Boolean(sono.logged),
    sleepBed: sono.bedTime || null,
    sleepWake: sono.wakeTime || null,
    focusMin: Number(focusMin || 0)
  };
}

/**
 * Registro diário (proposta 15, 22/11/2026): grava no servidor um resumo do dia de hoje sempre que
 * hábitos, água ou sono mudam (com espera de 1,5 s), e confere o foco a cada 2 minutos.
 * A data é a do momento da mudança: uma alteração às 23:59 vai para aquele dia, mesmo enviada depois.
 * Falhas são silenciosas: a próxima mudança regrava o dia inteiro.
 */
export function useRegistroDiario({ user, habits, health, isHydrated }) {
  const timer = useRef(null);
  const ultimo = useRef('');
  const latest = useRef({ habits, health });
  useEffect(() => { latest.current = { habits, health }; }, [habits, health]);

  useEffect(() => {
    if (!user?.id || !isHydrated) return undefined;
    const uid = user.id;
    const agendar = () => {
      const dia = todayLocal();
      const corpo = resumoDoDia({ ...latest.current, focusMin: focoMinutos(uid, dia) });
      const chave = `${dia}|${JSON.stringify(corpo)}`;
      if (chave === ultimo.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        apiFetch(`/api/dias/${dia}`, { method: 'PUT', body: JSON.stringify(corpo) })
          .then((r) => { if (r.ok) ultimo.current = chave; })
          .catch(() => {});
      }, 1500);
    };
    agendar();
    const t = setInterval(agendar, 120000);
    return () => { clearInterval(t); };
  }, [user?.id, isHydrated, habits, health]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
}
