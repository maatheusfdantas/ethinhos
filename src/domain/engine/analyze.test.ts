// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays } from '../date';
import { analyze } from './analyze';
import { bestDay, bestTime, bucketOf, calendarHeatmap, weeklyComparison } from './patterns';
import { buildOccurrences } from './occurrences';
import { commitment, days, entriesOn, entry, mark, measure, rec } from './test-helpers';

const TZ = 'America/Sao_Paulo';
const run = (
  commitments: ReturnType<typeof commitment>[],
  entries: ReturnType<typeof entry>[],
  today: string,
  extra: Partial<Parameters<typeof analyze>[0]> = {}
) => analyze({ commitments, entries, today, timezone: TZ, ...extra });

afterEach(() => {
  vi.useRealTimers();
});

describe('analyze: dados insuficientes e usuário novo', () => {
  it('menos de 3 períodos resolvidos: sem nota e sem insights (não inventa elogio nem alerta)', () => {
    const c = commitment('h', { startDate: '2026-10-18' });
    const a = run([c], [entry('h', '2026-10-18')], '2026-10-19'); // só 1 dia resolvido
    expect(a.hasEnoughData).toBe(false);
    expect(a.summary.consistencyScore).toBeNull();
    expect(a.summary.label).toBeNull();
    expect(a.insights).toEqual([]);
  });

  it('o legado dava "precisa de ajuste" (47) a quem acabou de começar; aqui não há nota', () => {
    const c = commitment('h', { startDate: '2026-10-19' });
    const a = run([c], [], '2026-10-19');
    expect(a.summary.consistencyScore).toBeNull();
  });

  it('registros ausentes não quebram: tudo zerado e seguro', () => {
    const c = commitment('h', { startDate: '2026-09-01' });
    const a = run([c], [], '2026-10-19');
    expect(a.summary.completionRate).toBe(0);
    expect(a.summary.currentStreak).toBe(0);
    expect(a.summary.coverage).toBe(0);
    expect(a.summary.consistencyScore).not.toBeNull();
    expect(a.summary.consistencyScore).toBeLessThan(40);
    expect(a.summary.label).toBe('fragile');
  });
});

describe('analyze: escopo', () => {
  it('por padrão só hábitos entram (tarefas ficam de fora); kinds permite incluí-las', () => {
    const h = commitment('h', { startDate: '2026-10-01' });
    const t = commitment('t', { kind: 'task', recurrence: rec({ freq: 'once', date: '2026-10-10' }), startDate: '2026-10-01' });
    const only = run([h, t], [], '2026-10-19');
    expect(only.commitments.map((c) => c.commitmentId)).toEqual(['h']);
    const both = run([h, t], [], '2026-10-19', { kinds: ['habit', 'task'] });
    expect(both.commitments.map((c) => c.commitmentId).sort()).toEqual(['h', 't']);
  });

  it('arquivados ficam de fora por padrão', () => {
    const c = commitment('h', { status: 'archived', startDate: '2026-10-01' });
    expect(run([c], [], '2026-10-19').commitments).toEqual([]);
  });

  it('janela configurável muda a taxa, mas não a sequência (que usa o histórico)', () => {
    const c = commitment('h', { startDate: '2026-09-01' });
    const es = [...mark('h', '2026-09-01', '0000000000000000000000000000'), ...entriesOn('h', days('2026-09-29', 21))]; // 29/09..19/10
    const a7 = run([c], es, '2026-10-19', { windowDays: 7 });
    const a30 = run([c], es, '2026-10-19', { windowDays: 30 });
    expect(a7.summary.completionRate).toBe(100);
    expect(a30.summary.completionRate).toBeLessThan(100);
    expect(a7.summary.currentStreak).toBe(a30.summary.currentStreak);
    expect(a7.summary.currentStreak).toBe(21);
  });
});

describe('analyze: weekly_count', () => {
  // seg 10-19 .. dom 10-25; hoje quarta 10-21
  const w = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), startDate: '2026-09-01' });

  it('streakUnit é semana e a sequência conta semanas cumpridas', () => {
    const weeks = ['2026-09-28', '2026-10-05', '2026-10-12']; // segundas
    const es = weeks.flatMap((monday) => [0, 1, 2].map((i) => entry('w', addDays(monday, i))));
    const a = run([w], es, '2026-10-21');
    const m = a.commitments[0]!;
    expect(m.streakUnit).toBe('week');
    expect(m.currentStreak).toBe(3); // semana corrente em aberto não quebra
    expect(a.summary.currentStreak).toBe(0); // a sequência diária global ignora weekly_count
  });

  it('não é cobrado como diário: ficar parado em um dia não gera falha', () => {
    const a = run([w], [entry('w', '2026-10-19')], '2026-10-21');
    expect(a.summary.dailyProgress).toBeNull();
    expect(a.summary.dueToday).toBe(0);
  });
});

describe('analyze: determinismo e pureza', () => {
  it('mesma entrada, mesma saída, qualquer que seja o relógio do sistema', () => {
    const c = commitment('h', { startDate: '2026-09-01' });
    const es = mark('h', '2026-09-01', '1110111011110111011101110111');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2001-01-01T00:00:00Z'));
    const a = run([c], es, '2026-10-19');
    vi.setSystemTime(new Date('2099-12-31T23:59:59Z'));
    const b = run([c], es, '2026-10-19');
    expect(b).toEqual(a);
  });

  it('não altera os dados de entrada', () => {
    const c = commitment('h', { startDate: '2026-09-01' });
    const es = mark('h', '2026-09-01', '11011');
    const before = JSON.stringify({ c, es });
    run([c], es, '2026-10-19');
    expect(JSON.stringify({ c, es })).toBe(before);
  });
});

describe('analyze: janelas reais (o legado projetava com fatores inventados)', () => {
  it('7, 30 e 90 dias são calculados sobre os dados de cada janela', () => {
    const c = commitment('h', { startDate: '2026-07-01' });
    // últimos 7 dias perfeitos; antes disso, nada
    const es = entriesOn('h', days('2026-10-13', 7));
    const a = run([c], es, '2026-10-19');
    expect(a.windows.d7.completionRate).toBe(100);
    expect(a.windows.d30.completionRate).toBeLessThan(a.windows.d7.completionRate);
    expect(a.windows.d90.completionRate).toBeLessThan(a.windows.d30.completionRate);
    expect(a.windows.d7.days).toBe(7);
    expect(a.windows.d90.from).toBe('2026-07-22');
  });
});

describe('insights', () => {
  const kinds = (a: ReturnType<typeof run>) => a.insights.map((i) => i.kind);

  it('sequência de 3 ou mais dias vira insight positivo', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const a = run([c], entriesOn('h', days('2026-10-10', 10)), '2026-10-19');
    const s = a.insights.find((i) => i.kind === 'streak');
    expect(s).toMatchObject({ tone: 'positive', value: 10 });
  });

  it('sequência interrompida aparece quando a falha é o resultado mais recente', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const a = run([c], entriesOn('h', days('2026-10-01', 10)), '2026-10-12'); // 11/10 falhou; hoje (12) em aberto
    const b = a.insights.find((i) => i.kind === 'streak_broken');
    expect(b).toMatchObject({ tone: 'neutral', value: 10 });
    expect(kinds(a)).not.toContain('streak');
  });

  it('queda recente, poucos registros e risco geram alertas de atenção, e atenção vem primeiro', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    // semana anterior (06..12) completa; semana atual com 13..16 feitos e depois nada
    const a = run([c], [...entriesOn('h', days('2026-10-06', 7)), ...entriesOn('h', days('2026-10-13', 4))], '2026-10-19');
    expect(kinds(a)).toContain('decline');
    const firstNonAttention = a.insights.findIndex((i) => i.tone !== 'attention');
    const lastAttention = a.insights.map((i) => i.tone).lastIndexOf('attention');
    expect(lastAttention).toBeLessThan(firstNonAttention === -1 ? Infinity : firstNonAttention);
  });

  it('compromisso com menos de 40% de conclusão em 7+ ocorrências está em risco', () => {
    const c = commitment('h', { title: 'Meditar', startDate: '2026-10-01' });
    const a = run([c], mark('h', '2026-10-01', '1000000000'), '2026-10-12');
    expect(a.commitments[0]).toMatchObject({ isAtRisk: true, status: 'at_risk' });
    const risk = a.insights.find((i) => i.kind === 'at_risk');
    expect(risk?.commitmentId).toBe('h');
    expect(risk?.title).toContain('Meditar');
  });

  it('falhas concentradas em um dia da semana viram gargalo, com o nome certo do dia', () => {
    const c = commitment('h', { startDate: '2026-10-05' });
    const wednesdays = ['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11'];
    const done = days('2026-10-05', 41).filter((d) => !wednesdays.includes(d)); // até 14/11 (sábado)
    const a = run([c], done.map((d) => entry('h', d)), '2026-11-14');
    const conflict = a.insights.find((i) => i.kind === 'weekday_conflict');
    expect(conflict?.title).toBe('Gargalo em quarta-feira');
    expect(conflict?.value).toBe(3);
    const best = a.insights.find((i) => i.kind === 'best_day');
    expect(best?.message).toContain('quarta-feira');
  });

  it('o nome dos dias não ganha o sufixo "-feira" indevido (legado: "Sábado-feira")', () => {
    const c = commitment('h', { startDate: '2026-10-05' });
    const saturdays = ['2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07'];
    const done = days('2026-10-05', 40).filter((d) => !saturdays.includes(d)); // até 13/11
    const a = run([c], done.map((d) => entry('h', d)), '2026-11-14');
    const conflict = a.insights.find((i) => i.kind === 'weekday_conflict');
    expect(conflict?.title).toBe('Gargalo em sábado');
  });

  it('consistência semanal só aparece com 3 ou mais semanas encerradas', () => {
    const c = commitment('h', { startDate: '2026-09-01' });
    const a = run([c], entriesOn('h', days('2026-09-01', 49)), '2026-10-19');
    const w = a.insights.find((i) => i.kind === 'weekly_consistency');
    expect(w).toBeDefined();
    expect(a.weekly.consistency.weeksOnTarget).toBe(a.weekly.consistency.weeksCounted);
    const young = run([commitment('y', { startDate: '2026-10-10' })], entriesOn('y', days('2026-10-10', 10)), '2026-10-19');
    expect(young.insights.find((i) => i.kind === 'weekly_consistency')).toBeUndefined();
  });

  it('todo insight carrega o período analisado', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const a = run([c], entriesOn('h', days('2026-10-01', 19)), '2026-10-19');
    expect(a.insights.length).toBeGreaterThan(0);
    for (const i of a.insights) expect(i.period).toEqual({ from: '2026-09-20', to: '2026-10-19' });
  });
});

describe('melhor dia da semana', () => {
  const occsFor = (pattern: (d: string) => boolean) => {
    const c = commitment('h', { startDate: '2026-08-01' });
    const es = days('2026-08-01', 80).filter(pattern).map((d) => entry('h', d));
    return buildOccurrences({ commitments: [c], entries: es, from: '2026-08-01', to: '2026-10-19', today: '2026-10-19' });
  };
  const wd = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

  it('encontra melhor e pior dia', () => {
    const r = bestDay(occsFor((d) => wd(d) !== 0)); // nunca cumpre aos domingos
    expect(r?.worst.weekday).toBe(0);
    expect(r?.worst.rate).toBe(0);
    expect(r?.best.rate).toBe(100);
  });

  it('sem diferença relevante, não afirma padrão', () => {
    expect(bestDay(occsFor(() => true))).toBeNull();
  });

  it('com poucas amostras por dia da semana, não afirma padrão', () => {
    const c = commitment('h', { startDate: '2026-10-12' });
    const o = buildOccurrences({ commitments: [c], entries: [], from: '2026-10-12', to: '2026-10-19', today: '2026-10-19' });
    expect(bestDay(o)).toBeNull();
  });
});

describe('melhor horário (fuso do usuário)', () => {
  const ids = new Set(['h']);
  const at = (date: string, utc: string, over = {}) => entry('h', date, 1, { recordedAt: utc, ...over });

  it('usa a hora LOCAL do usuário, não UTC', () => {
    // 11:00 UTC = 08:00 em São Paulo (manhã); = 20:00 em Tóquio (noite)
    const es = days('2026-10-10', 6).map((d) => at(d, `${d}T11:00:00.000Z`));
    expect(bestTime(es, ids, 'America/Sao_Paulo', '2026-10-01', '2026-10-19')).toMatchObject({ bucket: 'morning', peakHour: 8, share: 1, samples: 6 });
    const tokyo = days('2026-10-10', 6).map((d) => at(d, `${d}T11:00:00.000Z`));
    // em Tóquio 11:00Z = 20:00 do MESMO dia local
    expect(bestTime(tokyo, ids, 'Asia/Tokyo', '2026-10-01', '2026-10-19')).toMatchObject({ bucket: 'evening', peakHour: 20 });
  });

  it('descarta registro manual/importado e o feito em outro dia que não o da data', () => {
    const base = days('2026-10-10', 5).map((d) => at(d, `${d}T11:00:00.000Z`));
    const manual = at('2026-10-15', '2026-10-15T03:00:00.000Z', { source: 'manual' });
    const retro = at('2026-10-14', '2026-10-16T11:00:00.000Z'); // registrado dois dias depois
    expect(bestTime([...base, manual, retro], ids, 'America/Sao_Paulo', '2026-10-01', '2026-10-19')).toMatchObject({ samples: 5 });
  });

  it('exige pelo menos 5 registros', () => {
    const es = days('2026-10-10', 4).map((d) => at(d, `${d}T11:00:00.000Z`));
    expect(bestTime(es, ids, 'America/Sao_Paulo', '2026-10-01', '2026-10-19')).toBeNull();
  });

  it('ignora registros excluídos e de outros compromissos', () => {
    const es = [
      ...days('2026-10-10', 5).map((d) => at(d, `${d}T11:00:00.000Z`)),
      at('2026-10-16', '2026-10-16T11:00:00.000Z', { deletedAt: '2026-10-16T12:00:00.000Z' }),
      entry('outro', '2026-10-17', 1, { recordedAt: '2026-10-17T11:00:00.000Z' })
    ];
    expect(bestTime(es, ids, 'America/Sao_Paulo', '2026-10-01', '2026-10-19')?.samples).toBe(5);
  });

  it('uma hora que cruza a meia-noite pelo fuso (02:30Z = 23:30 do dia anterior em São Paulo)', () => {
    const es = days('2026-10-10', 5).map((d) => {
      const local = d; // dia local
      const next = addDays(d, 1);
      return at(local, `${next}T02:30:00.000Z`); // 23:30 local do dia `local`
    });
    expect(bestTime(es, ids, 'America/Sao_Paulo', '2026-10-01', '2026-10-19')).toMatchObject({ bucket: 'evening', peakHour: 23, samples: 5 });
  });

  it('faixas do dia', () => {
    expect([0, 5, 6, 11, 12, 17, 18, 23].map(bucketOf)).toEqual(['night', 'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
  });
});

describe('dados de gráfico', () => {
  it('mapa de calor: intensidade 0..1 e dias sem previsão ficam em zero', () => {
    const c = commitment('h', { recurrence: rec({ freq: 'weekdays', days: [1] }), startDate: '2026-10-01', measure: measure('check', 1, null) });
    const o = buildOccurrences({ commitments: [c], entries: [entry('h', '2026-10-19')], from: '2026-10-19', to: '2026-10-21', today: '2026-10-21' });
    expect(calendarHeatmap(o, '2026-10-19', '2026-10-21')).toEqual([
      { date: '2026-10-19', total: 1, completed: 1, intensity: 1 },
      { date: '2026-10-20', total: 0, completed: 0, intensity: 0 },
      { date: '2026-10-21', total: 0, completed: 0, intensity: 0 }
    ]);
  });

  it('comparação semanal alinha cada dia com o mesmo dia da semana anterior', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const o = buildOccurrences({ commitments: [c], entries: [entry('h', '2026-10-19'), entry('h', '2026-10-12')], from: '2026-10-01', to: '2026-10-19', today: '2026-10-19' });
    const last = weeklyComparison(o, '2026-10-19').at(-1);
    expect(last).toMatchObject({ date: '2026-10-19', weekday: 1, current: 1, previous: 1 });
  });
});
