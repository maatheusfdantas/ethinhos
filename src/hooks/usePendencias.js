import { useCallback, useEffect, useState } from 'react';
import { espacosApi } from '../components/espacos/espacosApi';

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/**
 * Eventos aceitos dos espaços no formato da Agenda/Painel, SÓ PARA LEITURA.
 * Ficam fora da lista de eventos da pessoa (que é sincronizada): são referências, não cópias.
 */
export function toCalendarEvents(eventos = []) {
  return eventos.map((e) => {
    const s = new Date(e.startsAt);
    const f = new Date(e.endsAt);
    const cancelado = e.status === 'cancelado';
    return {
      id: `space_${e.inviteId}`,
      title: cancelado ? `${e.title} (cancelado)` : e.title,
      date: localDate(s),
      endDate: localDate(f),
      startTime: localTime(s),
      endTime: localTime(f),
      allDay: false,
      category: e.spaceName,
      location: e.location || '',
      completed: false,
      readOnly: true,
      cancelled: cancelado,
      spaceName: e.spaceName,
      // Cor fixa (já usada na Agenda): os eventos dos espaços não mudam de cor conforme a posição no dia.
      customColor: cancelado ? '#E2E4F0' : '#B3C3F3'
    };
  });
}

/**
 * Pendências dos espaços (convites, avisos, respostas) e eventos aceitos.
 * Sem push: atualiza ao abrir, a cada 2 minutos e quando a janela volta ao foco. Nada bloqueia a tela.
 * Se a função ainda não existir no servidor, tudo fica vazio e nada aparece.
 */
export function usePendencias(user) {
  const [data, setData] = useState({ convites: [], avisos: [], outras: [], total: 0 });
  const [spaceEvents, setSpaceEvents] = useState([]);
  const userId = user?.id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setData(await espacosApi.pendencias());
    } catch {
      setData({ convites: [], avisos: [], outras: [], total: 0 });
    }
    try {
      const from = new Date(Date.now() - 62 * 86400000).toISOString();
      const to = new Date(Date.now() + 186 * 86400000).toISOString();
      setSpaceEvents(toCalendarEvents((await espacosApi.agendaEspacos(from, to)).eventos || []));
    } catch {
      setSpaceEvents([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) { setData({ convites: [], avisos: [], outras: [], total: 0 }); setSpaceEvents([]); return undefined; }
    refresh();
    const t = setInterval(refresh, 120000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [userId, refresh]);

  return { data, spaceEvents, refresh };
}
