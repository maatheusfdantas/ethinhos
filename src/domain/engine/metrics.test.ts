// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  categoryAdherence,
  completionRate,
  computeStreaks,
  computeTrend,
  consistencyLabel,
  consistencyScore,
  coverage,
  dailyProgress,
  outcomesByDate,
  recoveryRate,
  regularity,
  round1,
  variability
} from './metrics';
import { buildOccurrences } from './occurrences';
import { commitment, days, entriesOn, entry, mark, measure, rec } from './test-helpers';

const occs = (c: ReturnType<typeof commitment>[], e: ReturnType<typeof entry>[], from: string, to: string) =>
  buildOccurrences({ commitments: c, entries: e, from, to, today: to });

describe('round1', () => {
  it('arredonda meio para longe do zero e nunca devolve -0', () => {
    expect(round1(83.333)).toBe(83.3);
    expect(round1(0.25)).toBe(0.3);
    expect(round1(-0.25)).toBe(-0.3);
    expect(Object.is(round1(-0.04), 0)).toBe(true);
  });
});

describe('sequências', () => {
  it('não são limitadas a 30 dias (o legado só enxergava a janela de 30)', () => {
    const c = commitment('h', { startDate: '2026-08-01' });
    const es = entriesOn('h', days('2026-09-04', 46)); // 04/09 .. 19/10
    const s = computeStreaks(outcomesByDate(occs([c], es, '2026-08-01', '2026-10-19')));
    expect(s.current).toBe(46);
    expect(s.best).toBe(46);
  });

  it('hoje ainda em aberto não quebra a sequência; hoje cumprido soma', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const until18 = entriesOn('h', days('2026-10-14', 5)); // 14..18
    const open = computeStreaks(outcomesByDate(occs([c], until18, '2026-10-01', '2026-10-19')));
    expect(open.current).toBe(5);
    const done = computeStreaks(outcomesByDate(occs([c], [...until18, entry('h', '2026-10-19')], '2026-10-01', '2026-10-19')));
    expect(done.current).toBe(6);
  });

  it('dias sem nada previsto não quebram a sequência (dias úteis atravessam o fim de semana)', () => {
    // seg 10-05 .. sex 10-16
    const c = commitment('h', { recurrence: rec({ freq: 'weekdays', days: [1, 2, 3, 4, 5] }), startDate: '2026-10-05' });
    const es = [...entriesOn('h', days('2026-10-05', 5)), ...entriesOn('h', days('2026-10-12', 5))];
    const s = computeStreaks(outcomesByDate(occs([c], es, '2026-10-05', '2026-10-16')));
    expect(s.current).toBe(10);
  });

  it('uma falha zera a sequência atual e guarda a anterior', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const es = mark('h', '2026-10-01', '1111111111'); // 01..10 cumpridos, 11 falhou
    const s = computeStreaks(outcomesByDate(occs([c], es, '2026-10-01', '2026-10-12')));
    expect(s.current).toBe(0);
    expect(s.best).toBe(10);
    expect(s.lastBrokenRun).toEqual({ length: 10, failedOn: '2026-10-11' });
  });

  it('com vários hábitos o dia só conta se TODOS foram cumpridos', () => {
    const a = commitment('a', { startDate: '2026-10-01' });
    const b = commitment('b', { startDate: '2026-10-01' });
    const es = [...mark('a', '2026-10-01', '111'), ...mark('b', '2026-10-01', '101')];
    const s = computeStreaks(outcomesByDate(occs([a, b], es, '2026-10-01', '2026-10-03')));
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });

  it('sem nenhum dado: zeros e sem falha registrada', () => {
    expect(computeStreaks([])).toEqual({ current: 0, best: 0, lastBrokenRun: null });
  });
});

describe('taxa de conclusão', () => {
  it('hoje em aberto não entra no denominador (o legado contava como falha)', () => {
    const c = commitment('h', { startDate: '2026-10-17' });
    const o = occs([c], [entry('h', '2026-10-17'), entry('h', '2026-10-18')], '2026-10-17', '2026-10-19');
    expect(completionRate(o)).toBe(100); // 2 de 2 resolvidos; hoje (19) é pendente
  });

  it('sem ocorrências resolvidas devolve 0 sem dividir por zero', () => {
    expect(completionRate([])).toBe(0);
  });
});

describe('progresso do dia', () => {
  it('sem nada devido hoje devolve null (e não 0%)', () => {
    const c = commitment('h', { recurrence: rec({ freq: 'weekdays', days: [1] }), startDate: '2026-10-01' }); // só segunda
    const o = occs([c], [], '2026-10-19', '2026-10-21'); // 21 é quarta
    expect(dailyProgress(o, '2026-10-21')).toEqual({ value: null, due: 0, done: 0 });
  });

  it('weekly_count não entra no progresso diário', () => {
    const w = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), startDate: '2026-10-01' });
    const d = commitment('d', { startDate: '2026-10-01' });
    const o = occs([w, d], [entry('d', '2026-10-21')], '2026-10-19', '2026-10-21');
    expect(dailyProgress(o, '2026-10-21')).toEqual({ value: 100, due: 1, done: 1 });
  });
});

describe('regularidade', () => {
  it('seguir o plano à risca dá a mesma regularidade em dias úteis e em dias corridos', () => {
    const run = (c: ReturnType<typeof commitment>, from: string, to: string, dates: string[]) => {
      const o = occs([c], dates.map((d) => entry(c.id, d)), from, to);
      const out = outcomesByDate(o);
      const rate = completionRate(o);
      return regularity({ completionRate: rate, currentStreak: computeStreaks(out).current, outcomes: out });
    };
    const daily = commitment('d', { startDate: '2026-09-01' });
    const week = commitment('w', { recurrence: rec({ freq: 'weekdays', days: [1, 2, 3, 4, 5] }), startDate: '2026-09-01' });
    const everyDay = days('2026-09-01', 30);
    const businessDays = everyDay.filter((d) => ![0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()));
    expect(run(daily, '2026-09-01', '2026-09-30', everyDay)).toBe(1);
    // No legado o espaçamento em dias de calendário (seg->seg = 3 dias) derrubava esta nota.
    expect(run(week, '2026-09-01', '2026-09-30', businessDays)).toBe(1);
  });

  it('sem nenhum dia cumprido: só a parte de espaçamento zera', () => {
    expect(regularity({ completionRate: 0, currentStreak: 0, outcomes: [] })).toBe(0);
  });

  it('um único dia cumprido dá espaçamento neutro (0.5)', () => {
    const out = [{ date: '2026-10-01', total: 1, done: 1, completed: true, meanRatio: 1 }];
    expect(regularity({ completionRate: 100, currentStreak: 1, outcomes: out })).toBe(0.621); // 0.5*1 + 0.3*(1/14) + 0.2*0.5
  });
});

describe('tendência', () => {
  it('compromisso novo, sem a semana anterior: sem base, delta 0 e estável', () => {
    const c = commitment('h', { startDate: '2026-10-15' });
    const o = occs([c], entriesOn('h', days('2026-10-15', 4)), '2026-10-15', '2026-10-19');
    const t = computeTrend(o, '2026-10-19');
    expect(t).toMatchObject({ hasBaseline: false, delta: 0, status: 'stable' });
  });

  it('queda grande é declining', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const es = [...entriesOn('h', days('2026-10-06', 7)), ...entriesOn('h', days('2026-10-13', 2))]; // semana anterior cheia, atual quase vazia
    const t = computeTrend(occs([c], es, '2026-10-01', '2026-10-19'), '2026-10-19');
    expect(t.hasBaseline).toBe(true);
    expect(t.status).toBe('declining');
    expect(t.delta).toBeLessThan(-10);
  });

  it('variação pequena é stable (limite de 10 pontos)', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    // semana anterior 6/7, atual 6/7 (hoje em aberto não entra: janela atual 13..18 = 6 dias, todos feitos)
    const es = [...entriesOn('h', days('2026-10-06', 6)), ...entriesOn('h', days('2026-10-13', 6))];
    expect(computeTrend(occs([c], es, '2026-10-01', '2026-10-19'), '2026-10-19').status).not.toBe('declining');
  });
});

describe('recuperação', () => {
  it('sem falhas: 100', () => {
    const out = outcomesByDate(occs([commitment('h', { startDate: '2026-10-01' })], entriesOn('h', days('2026-10-01', 5)), '2026-10-01', '2026-10-05'));
    expect(recoveryRate(out)).toBe(100);
  });

  it('falha no último dia resolvido conta como não recuperada', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    // hoje = dia 6 (em aberto, fora da conta): resolvidos 1..5 = feito, feito, falha, feito, falha
    const out = outcomesByDate(occs([c], mark('h', '2026-10-01', '1101'), '2026-10-01', '2026-10-06'));
    // falhas: dia 3 (recuperada no 4) e dia 5 (último resolvido, não recuperada). 1 de 2 = 50
    expect(recoveryRate(out)).toBe(50);
  });

  it('falha seguida de falha não recupera a primeira', () => {
    const c = commitment('h', { startDate: '2026-10-01' });
    const out = outcomesByDate(occs([c], mark('h', '2026-10-01', '1001'), '2026-10-01', '2026-10-04'));
    expect(recoveryRate(out)).toBe(50); // dia 2 falha->falha (não), dia 3 falha->sucesso (sim)
  });
});

describe('cobertura de registro', () => {
  it('mede ocorrências resolvidas com algum progresso', () => {
    const c = commitment('h', { measure: measure('count', 4), startDate: '2026-10-01' });
    const es = [entry('h', '2026-10-01', 1), entry('h', '2026-10-02', 4)]; // dia 3 sem registro
    expect(coverage(occs([c], es, '2026-10-01', '2026-10-04'))).toBe(66.7); // dias 1..3 resolvidos; dia 4 pendente
  });

  it('sem ocorrências resolvidas devolve 100 (padrão do legado, sem efeito: a nota fica null)', () => {
    expect(coverage([])).toBe(100);
  });
});

describe('categorias e variabilidade', () => {
  it('agrupa por categoria; sem categoria vira null', () => {
    const a = commitment('a', { categoryId: 'c1', startDate: '2026-10-01' });
    const b = commitment('b', { startDate: '2026-10-01' });
    const es = [...mark('a', '2026-10-01', '111'), ...mark('b', '2026-10-01', '100')];
    const cats = categoryAdherence(occs([a, b], es, '2026-10-01', '2026-10-04'));
    expect(cats.find((c) => c.categoryId === 'c1')).toMatchObject({ adherence: 100, totalExpected: 3, totalCompleted: 3, commitmentsCount: 1 });
    expect(cats.find((c) => c.categoryId === null)).toMatchObject({ adherence: 33.3, totalCompleted: 1 });
  });

  it('variabilidade usa desvio amostral e dá 0 com menos de 2 dias', () => {
    expect(variability([])).toBe(0);
    const c = commitment('h', { startDate: '2026-10-01' });
    const out = outcomesByDate(occs([c], mark('h', '2026-10-01', '10'), '2026-10-01', '2026-10-03')); // 100 e 0
    expect(variability(out)).toBe(70.7); // desvio amostral de [100, 0]
    expect(variability(out.slice(0, 1))).toBe(0);
  });
});

describe('score composto', () => {
  it('rótulos nos limites exatos', () => {
    expect(consistencyLabel(85)).toBe('very_consistent');
    expect(consistencyLabel(84.9)).toBe('consistent');
    expect(consistencyLabel(70)).toBe('consistent');
    expect(consistencyLabel(55)).toBe('oscillating');
    expect(consistencyLabel(40)).toBe('needs_adjustment');
    expect(consistencyLabel(39.9)).toBe('fragile');
  });

  it('extremos ficam entre 0 e 100', () => {
    const top = consistencyScore({ completionRate: 100, regularity: 1, recoveryRate: 100, coverage: 100, trendStatus: 'improving', categoryAdherences: [100] });
    expect(top.score).toBe(100);
    const low = consistencyScore({ completionRate: 0, regularity: 0, recoveryRate: 0, coverage: 0, trendStatus: 'declining', categoryAdherences: [0, 100] });
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.label).toBe('fragile');
  });

  it('equilíbrio entre categorias só pesa com 2 ou mais categorias', () => {
    const base = { completionRate: 80, regularity: 0.8, recoveryRate: 70, coverage: 90, trendStatus: 'stable' as const };
    expect(consistencyScore({ ...base, categoryAdherences: [] }).score).toBe(consistencyScore({ ...base, categoryAdherences: [75] }).score);
    expect(consistencyScore({ ...base, categoryAdherences: [100, 0] }).score).toBeLessThan(consistencyScore({ ...base, categoryAdherences: [60, 60] }).score);
  });
});
