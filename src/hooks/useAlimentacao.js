import { useCallback, useEffect, useState } from 'react';
import { alimentacaoApi } from '../components/alimentacao/alimentacaoApi';

/**
 * A pessoa tem plano alimentar publicado? (A aba Alimentação só aparece com plano: docs/10, 7.5.)
 * Confere ao entrar e quando as pendências mudam (por exemplo, "plano publicado"). Sem a função no servidor, fica oculta.
 */
export function useMealPlans(user, refreshKey = 0) {
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const userId = user?.id;
  const refresh = useCallback(async () => {
    if (!userId) { setHasMealPlan(false); return; }
    try {
      setHasMealPlan(((await alimentacaoApi.planos()).planos || []).length > 0);
    } catch {
      setHasMealPlan(false);
    }
  }, [userId]);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  return { hasMealPlan, refresh };
}
