/**
 * Sincronização no navegador (auditoria 15/11/2026: A1, S5, F1, F2).
 */
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const calls = [];
let dataResponse = null;
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    if (url.endsWith('/data')) {
      if (dataResponse instanceof Error) throw dataResponse;
      return { ok: true, json: async () => dataResponse };
    }
    return { ok: true, json: async () => ({ success: true }) };
  })
}));

const { useUserSync, diffCollection, MASS_DELETE_GUARD } = await import('../hooks/useUserSync');

const H = (id, title = id) => ({ id, title });
function useHarness() {
  const [user, setUser] = useState({ id: 'u1', weight: 70 });
  const [habits, setHabits] = useState([]);
  const [events, setEvents] = useState([]);
  const [tags, setTags] = useState([]);
  const [health, setHealth] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const sync = useUserSync({ user, setUser, habits, setHabits, events, setEvents, tags, setTags, health, setHealth, workouts, setWorkouts });
  return { habits, setHabits, sync };
}
const syncCalls = () => calls.filter((c) => c.url.endsWith('/sync'));
const deleteCalls = () => calls.filter((c) => c.method === 'DELETE');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  calls.length = 0;
  localStorage.clear();
  dataResponse = { habits: [H('h1', 'Água'), H('h2', 'Ler')], events: [], tags: [], workouts: [], health: null, user: { postIts: [{ id: 'n1', text: 'nota do servidor' }] } };
});

describe('diffCollection', () => {
  it('envia só o que mudou e lista o que foi excluído', () => {
    const snap = new Map([['a', JSON.stringify(H('a'))], ['b', JSON.stringify(H('b'))]]);
    const d = diffCollection(snap, [H('a'), H('c')]);
    expect(d.upserts.map((i) => i.id)).toEqual(['c']);
    expect(d.deletes).toEqual(['b']);
  });
  it(`lista esvaziada de uma vez (${MASS_DELETE_GUARD}+ itens) não gera exclusões`, () => {
    const snap = new Map(Array.from({ length: MASS_DELETE_GUARD }, (_, i) => [`x${i}`, '{}']));
    const d = diffCollection(snap, []);
    expect(d.deletes).toEqual([]);
    expect(d.blocked).toBe(true);
  });
});

describe('useUserSync', () => {
  it('S5: se a carga do servidor falha, nada é sincronizado', async () => {
    dataResponse = new Error('offline');
    localStorage.setItem('ethos_habits_u1', JSON.stringify([H('velho')]));
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.sync.isHydrated).toBe(true));
    act(() => result.current.setHabits([]));
    await pause(600);
    expect(syncCalls()).toHaveLength(0);
    expect(deleteCalls()).toHaveLength(0);
  });

  it('F1: o servidor manda; item só do cache local não é reenviado, fica guardado à parte', async () => {
    localStorage.setItem('ethos_habits_u1', JSON.stringify([H('h1', 'Água'), H('apagado_em_outro_aparelho')]));
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.habits.map((h) => h.id)).toEqual(['h1', 'h2']));
    await pause(600);
    expect(JSON.stringify(syncCalls())).not.toMatch(/apagado_em_outro_aparelho/);
    expect(localStorage.getItem('ethos_unsynced_backup_u1')).toMatch(/apagado_em_outro_aparelho/);
  });

  it('A1/F1: excluir um hábito vira DELETE explícito; editar envia só o item editado', async () => {
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.habits).toHaveLength(2));
    await pause(600);
    calls.length = 0;
    act(() => result.current.setHabits([{ ...H('h1', 'Água'), completed: true }]));
    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
    expect(deleteCalls()[0].url).toBe('/api/user/u1/habit/h2');
    const last = syncCalls().at(-1);
    expect(last.body.habits.map((h) => h.id)).toEqual(['h1']);
  });

  it('esvaziar a lista inteira de uma vez não apaga nada no servidor', async () => {
    dataResponse.habits = Array.from({ length: 6 }, (_, i) => H(`m${i}`));
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.habits).toHaveLength(6));
    await pause(600);
    act(() => result.current.setHabits([]));
    await pause(600);
    expect(deleteCalls()).toHaveLength(0);
  });

  it('F2: as notas não vão na sincronização e o cache usa a mesma chave das Notas', async () => {
    localStorage.setItem('ethos_profile_postits_u1', JSON.stringify([{ id: 'antiga', text: 'apagada' }]));
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.habits).toHaveLength(2));
    act(() => result.current.setHabits((p) => [...p, H('h3')]));
    await waitFor(() => expect(syncCalls().length).toBeGreaterThan(0));
    for (const c of syncCalls()) expect(c.body.postIts).toBeUndefined();
    expect(localStorage.getItem('ethos_postits_u1')).toMatch(/nota do servidor/);
  });

  it('sair da conta envia na hora o que estava pendente', async () => {
    const { result } = renderHook(() => useHarness());
    await waitFor(() => expect(result.current.habits).toHaveLength(2));
    await pause(600);
    calls.length = 0;
    act(() => result.current.setHabits((p) => [...p, H('h_ultimo')]));
    act(() => result.current.sync.resetSyncState());
    expect(syncCalls()).toHaveLength(1);
    expect(syncCalls()[0].body.habits.map((h) => h.id)).toEqual(['h_ultimo']);
  });
});
