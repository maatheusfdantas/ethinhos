import { describe, it, expect } from 'vitest';
import {
  emptyState, recordSession, addNote, recordPause, setGoal, toggleRest, weekView, report,
  levelIndex, hideMission, missionsFor, loadState, saveState, FOCO
} from './focoStore';

const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h, 0);
const SAT = at(2026, 11, 14);

const run = (s, n, now = SAT, extra = {}) => {
  let st = s; const all = [];
  for (let i = 0; i < n; i++) { const r = recordSession(st, { subject: 'Estudo', mins: 25, now, ...extra }); st = r.state; all.push(...r.events); }
  return { st, all };
};

describe('focoStore', () => {
  it('sessão completa dá Foco, emblema de primeira sessão e conta no dia', () => {
    const { st, all } = run(emptyState(), 1);
    expect(st.foco).toBe(FOCO.session);
    expect(st.badges.first).toBe(true);
    expect(st.days['2026-11-14']).toEqual({ n: 1, min: 25 });
    expect(all.some((e) => e.type === 'badge' && e.id === 'first')).toBe(true);
  });

  it('parada antecipada guarda o tempo sem Foco e sem tirar nada', () => {
    const base = run(emptyState(), 2).st;
    const r = recordSession(base, { subject: 'Estudo', mins: 12, full: false, now: SAT });
    expect(r.state.foco).toBe(base.foco);
    expect(r.state.cycle).toBe(base.cycle);
    expect(r.state.days['2026-11-14']).toEqual({ n: 2, min: 62 });
    // voltar depois de parar conta como retorno
    const back = recordSession(r.state, { subject: 'Estudo', mins: 25, now: SAT });
    expect(back.state.badges.return).toBe(true);
  });

  it('cinco sessões fecham o ciclo; pausa longa zera os blocos', () => {
    const { st, all } = run(emptyState(), 5);
    expect(st.cycle).toBe(0);
    expect(st.badges.cycle).toBe(true);
    expect(all.filter((e) => e.type === 'cycle')).toHaveLength(1);
    expect(st.blocks).toBe(5);
    expect(recordPause(st, { action: '', long: true }).state.blocks).toBe(0);
  });

  it('meta mínima conta o dia uma vez e o nível nunca desce', () => {
    let s = run(emptyState(), 3).st;
    expect(s.metDates).toEqual(['2026-11-14']);
    s = setGoal(s, 8).state;
    expect(s.metDates).toEqual(['2026-11-14']);
    expect(levelIndex(s)).toBe(0);
    for (let d = 1; d <= 3; d++) s = run(s, 8, at(2026, 11, 14 + d)).st;
    expect(levelIndex(s)).toBe(1); // Corrente com 3+ dias
  });

  it('missões dão Foco uma vez; tiradas não dão; renovam no dia seguinte', () => {
    let s = run(emptyState(), 1).st;
    const r = addNote(s, s.sessions[0].id, 'Lista 3 feita', SAT);
    expect(r.state.foco).toBe(s.foco + FOCO.note + FOCO.mission);
    expect(addNote(r.state, s.sessions[0].id, 'de novo', SAT).state).toBe(r.state);
    s = hideMission(r.state, 'longe', SAT);
    const p = recordPause(s, { action: 'longe' }, SAT).state;
    expect(p.foco).toBe(s.foco + FOCO.pause);
    expect(missionsFor(p, '2026-11-15').hidden).toEqual([]);
  });

  it('semana começa na segunda; pausa planejada só em dia futuro', () => {
    let s = run(emptyState(), 2).st;
    s = toggleRest(s, '2026-11-15', SAT);
    s = toggleRest(s, '2026-11-10', SAT); // passado: ignorado
    const w = weekView(s, SAT);
    expect(w[0].iso).toBe('2026-11-09');
    expect(w.map((d) => d.st)).toEqual(['below', 'below', 'below', 'below', 'below', 'met', 'rest']);
  });

  it('relatório só mostra padrões com dados suficientes', () => {
    const one = report(run(emptyState(), 1).st, SAT);
    expect(one.patterns).toEqual([]);
    let s = run(emptyState(), 3, at(2026, 11, 12, 10)).st;
    s = run(s, 2, at(2026, 11, 14, 15)).st;
    const r = report(s, SAT);
    expect(r.sessions).toBe(5);
    expect(r.minutes).toBe(125);
    expect(r.patterns[0]).toMatch(/quinta/);
    expect(r.patterns[1]).toMatch(/60% .* manhã/);
  });

  it('salva e carrega por usuário, tolerando armazenamento quebrado', () => {
    const mem = {}; const storage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
    saveState('u1', { ...emptyState(), foco: 42 }, storage);
    expect(loadState('u1', storage).foco).toBe(42);
    expect(loadState('u2', storage).foco).toBe(0);
    expect(loadState('u1', { getItem: () => { throw new Error('x'); } }).foco).toBe(0);
  });
});
