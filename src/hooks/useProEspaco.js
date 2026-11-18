import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

/**
 * Perfil profissional da conta logada (null quando não tem, ou quando a função ainda não está disponível).
 * O servidor confere tudo de novo a cada pedido; isto só decide o que o menu mostra.
 */
export function useProEspaco(user) {
  // undefined = ainda carregando; null = sem perfil profissional.
  const [pro, setPro] = useState(undefined);
  const userId = user?.id;

  const reload = useCallback(async () => {
    if (!userId) { setPro(null); return; }
    try {
      const r = await apiFetch('/api/espacos/meu');
      if (!r.ok) { setPro(null); return; }
      const j = await r.json();
      setPro(j.pro || null);
    } catch {
      setPro(null);
    }
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);
  return { pro, reload };
}
