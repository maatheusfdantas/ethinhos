/** Proposta 15 (22/11/2026): Análise de progresso com o registro de cada dia. */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AnaliseProgresso } from '../components/analise/AnaliseProgresso';
import { consistencia, datasDoPeriodo, horasDeSono, isoDia, mesclarHoje, montarAnalise, sequencias, variacaoDeitar } from '../components/analise/analiseCalc';
import { habitsSnapshot, normalizeHabitsForToday, stampProgressDates } from '../utils/habitDay';
import { resumoDoDia } from '../hooks/useRegistroDiario';

const HOJE = '2026-11-22'; // domingo
const dia = (date, feitos, total, extra = {}) => ({
  date, habitsTotal: total, habitsDone: feitos, waterGlasses: 0, waterTarget: 0, glassMl: 250, sleepLogged: false, sleepBed: null, sleepWake: null, focusMin: 0,
  habits: Array.from({ length: total }, (_, i) => ({ id: `h${i}`, t: `Hábito ${i}`, c: i % 2 ? 'Mente' : 'Corpo', f: i < feitos })), ...extra
});

describe('hábitos por dia', () => {
  it('num dia novo, hábito com progresso de outro dia começa desmarcado; sem data não é zerado', () => {
    const hs = [
      { id: 'a', completed: true, current: 1, doneDate: '2026-11-21' },
      { id: 'b', completed: true, current: 1, doneDate: HOJE },
      { id: 'c', completed: true, current: 1 },
      { id: 'd', completed: false, current: 0, doneDate: '2026-11-01' }
    ];
    const out = normalizeHabitsForToday(hs, HOJE);
    expect(out[0]).toMatchObject({ completed: false, current: 0, doneDate: HOJE });
    expect(out[1]).toBe(hs[1]);
    expect(out[2]).toBe(hs[2]);
    expect(out[3]).toBe(hs[3]);
    const semMudanca = [hs[1]];
    expect(normalizeHabitsForToday(semMudanca, HOJE)).toBe(semMudanca);
  });

  it('mudança de progresso carimba o dia; lista sem mudança volta igual', () => {
    const antes = [{ id: 'a', completed: false, current: 0 }, { id: 'b', completed: true, current: 1, doneDate: '2026-11-20' }];
    const depois = [{ id: 'a', completed: true, current: 1 }, antes[1], { id: 'n', completed: false, current: 0 }];
    const out = stampProgressDates(antes, depois, HOJE);
    expect(out[0].doneDate).toBe(HOJE);
    expect(out[1]).toBe(antes[1]);
    expect(out[2].doneDate).toBeUndefined();
    expect(stampProgressDates(depois, depois, HOJE)).toBe(depois);
  });

  it('o resumo do dia leva hábitos, água, sono e foco', () => {
    const r = resumoDoDia({ habits: [{ id: 'a', title: 'Ler', category: 'Estudo', completed: true }], health: { waterGlasses: 3, waterTarget: 8, glassMl: 300, sleep: { logged: true, bedTime: '23:00', wakeTime: '07:00' } }, focusMin: 25 });
    expect(r).toEqual({ habits: [{ id: 'a', t: 'Ler', c: 'Estudo', f: true }], waterGlasses: 3, waterTarget: 8, glassMl: 300, sleepLogged: true, sleepBed: '23:00', sleepWake: '07:00', focusMin: 25 });
    expect(habitsSnapshot(null)).toEqual([]);
  });
});

describe('cálculos da Análise', () => {
  it('consistência, sequência e recorde só com dias registrados (lacuna quebra a sequência)', () => {
    const datas = datasDoPeriodo(6, HOJE);
    const m = new Map([
      [datas[0], dia(datas[0], 5, 5)], [datas[1], dia(datas[1], 4, 5)],
      // datas[2] sem registro
      [datas[3], dia(datas[3], 5, 5)], [datas[4], dia(datas[4], 4, 5)], [datas[5], dia(datas[5], 1, 5)]
    ]);
    expect(consistencia([...m.values()])).toBe(76);
    // hoje (1 de 5) ainda em andamento: conta a partir de ontem
    expect(sequencias(m, HOJE)).toEqual({ atual: 2, rec: 2 });
  });

  it('sono: horas atravessando a meia-noite e variação do horário de deitar', () => {
    expect(horasDeSono('23:30', '07:00')).toBe(7.5);
    expect(variacaoDeitar(['23:00', '01:00'])).toBe(60);
    expect(variacaoDeitar(['23:00'])).toBeNull();
  });

  it('com menos de 3 dias não há frase nem sugestões; com histórico, compara e sugere', () => {
    const pouco = montarAnalise({ porData: mesclarHoje([], HOJE, null), hoje: HOJE, n: 7 });
    expect(pouco.pouco).toBe(true);
    expect(pouco.frase).toBeNull();
    expect(pouco.notas).toBeNull();

    const datas = datasDoPeriodo(14, HOJE);
    const dias = datas.map((s, i) => dia(s, i < 7 ? 2 : 4, 5, { waterGlasses: 4, waterTarget: 8 }));
    const A = montarAnalise({ porData: new Map(dias.map((d) => [d.date, d])), hoje: HOJE, n: 7 });
    expect(A.c).toBe(80);
    expect(A.delta).toBe(40);
    expect(A.frase).toContain('80% dos hábitos previstos, 40 pontos acima dos 7 dias anteriores');
    expect(A.notas.sugestao).toMatch(/água ficou na meta em 0 de 7 dias/i);
    expect(A.habitos[0].pc).toBe(100);
  });

  it('hábito com menos de 3 dias registrados não vira "mais difícil" nem entra nos avisos', () => {
    const datas = datasDoPeriodo(5, HOJE);
    const dias = datas.map((s, i) => {
      const d = dia(s, 1, 2);
      if (i === 4) d.habits = [...d.habits, { id: 'novo', t: 'Criado hoje', c: 'Geral', f: false }];
      d.habitsTotal = d.habits.length; d.habitsDone = d.habits.filter((h) => h.f).length;
      return d;
    });
    const A = montarAnalise({ porData: new Map(dias.map((d) => [d.date, d])), hoje: HOJE, n: 7 });
    expect(A.habitos.some((h) => h.id === 'novo')).toBe(true);
    expect(A.low.id).not.toBe('novo');
    expect(A.notas.atencao).not.toContain('Criado hoje');
  });

  it('treino, agenda e maus hábitos usam o histórico que já existe', () => {
    const A = montarAnalise({
      porData: new Map(), hoje: HOJE, n: 7,
      sessoes: [{ startedAt: '2026-11-20T10:00:00', doneSets: 3 }, { startedAt: '2026-11-20T18:00:00', doneSets: 1 }, { startedAt: '2026-11-19T10:00:00', doneSets: 0 }],
      eventos: [{ date: '2026-11-21', completed: true }, { date: '2026-11-18', completed: false }, { date: '2026-10-01', completed: true }],
      maus: [{ id: 'm1', title: 'Refrigerante', started_at: '2026-11-12T00:00:00', best_streak_days: 4, relapses: [{ date: '2026-11-12T00:00:00', trigger: 'Tédio' }, { date: '2026-10-01T00:00:00', trigger: 'Tédio' }] }],
      agora: new Date('2026-11-22T12:00:00').getTime()
    });
    expect(A.treinoDias).toBe(1);
    expect(A.agConc).toBe(1);
    expect(A.evs).toHaveLength(2);
    expect(A.maus[0]).toMatchObject({ limpos: 10, recorde: 10, recaidas: 0, gatilho: 'Tédio' });
  });
});

describe('tela da Análise', () => {
  beforeEach(() => {
    localStorage.clear();
    const hoje = isoDia(new Date());
    const datas = datasDoPeriodo(10, hoje);
    const dias = datas.slice(0, -1).map((s, i) => dia(s, i % 2 ? 3 : 2, 3, { waterGlasses: 6, waterTarget: 8, sleepLogged: true, sleepBed: '23:30', sleepWake: '07:00' }));
    global.fetch = vi.fn((url) => {
      const json = (b) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(b) });
      if (String(url).startsWith('/api/dias')) return json({ days: dias, since: datas[0] });
      if (String(url).includes('/api/treino/historico')) return json({ sessions: [], exercises: [] });
      return json({});
    });
  });

  it('mostra resumo, mapa, ranking e gráficos com os dias registrados', async () => {
    render(<AnaliseProgresso user={{ id: 'u1' }} habits={[{ id: 'h0', title: 'Hábito 0', category: 'Corpo', completed: true }]} health={{ waterGlasses: 2, waterTarget: 8 }} events={[]} />);
    await waitFor(() => expect(screen.getByTestId('an-consistencia').textContent).toMatch(/\d+%/));
    expect(screen.getByText(/Nos últimos 30 dias você cumpriu/)).toBeTruthy();
    expect(screen.getByTestId('an-ranking').querySelectorAll('li').length).toBeGreaterThan(0);
    expect(screen.getByTestId('an-agua-graf')).toBeTruthy();
    expect(screen.getByTestId('an-sono-graf')).toBeTruthy();
    expect(document.querySelectorAll('[data-testid=an-mapa] .an-cel[aria-label*="sem registro"]').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '7 dias' }));
    expect(screen.getByText(/Nos últimos 7 dias/)).toBeTruthy();
  });

  it('sem o registro no servidor, avisa e não inventa números', async () => {
    global.fetch = vi.fn((url) => Promise.resolve(String(url).startsWith('/api/dias') ? { ok: false, status: 503, json: () => Promise.resolve({}) } : { ok: true, status: 200, json: () => Promise.resolve({ sessions: [] }) }));
    render(<AnaliseProgresso user={{ id: 'u1' }} habits={[]} health={{}} events={[]} />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/ainda não está disponível/));
    expect(screen.getByTestId('an-consistencia').textContent).toContain('–');
    expect(screen.getByText(/Com 3 dias registrados, este resumo passa a comparar/)).toBeTruthy();
  });
});
