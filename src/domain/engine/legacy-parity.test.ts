// @vitest-environment node
/**
 * Porte dos testes de engine/test_engine.py. Cada caso usa os mesmos dados e confere os mesmos números.
 * Onde o domínio atual não consegue expressar o dado legado, o comentário diz como foi traduzido.
 */
import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { consistencyScore, completionRate, computeStreaks, computeTrend, dailyProgress, outcomesByDate, recoveryRate } from './metrics';
import { buildOccurrences } from './occurrences';
import { commitment, days, entriesOn, entry, measure } from './test-helpers';

const build = (c: ReturnType<typeof commitment>[], e: ReturnType<typeof entry>[], from: string, to: string) =>
  buildOccurrences({ commitments: c, entries: e, from, to, today: to });

describe('legado: test_daily_progress_calculation', () => {
  it('progresso do dia = média das razões de progresso = 83.3%', () => {
    const cs = [
      commitment('h1', { measure: measure('duration', 30, 'min'), startDate: '2026-10-01' }),
      commitment('h2', { startDate: '2026-10-01' }), // binary -> check
      commitment('h3', { measure: measure('count', 10, 'copos'), startDate: '2026-10-01' }) // quantity -> count
    ];
    const es = [entry('h1', '2026-10-19', 15), entry('h2', '2026-10-19', 1), entry('h3', '2026-10-19', 10)];
    const occs = build(cs, es, '2026-10-01', '2026-10-19');
    expect(dailyProgress(occs, '2026-10-19').value).toBeCloseTo(83.3, 1);
  });
});

describe('legado: test_completion_rate_and_status_classification', () => {
  it('done / partial / missed / done e taxa 50%', () => {
    const c = commitment('h1', { measure: measure('duration', 20, 'min'), startDate: '2026-10-15' });
    // Legado: 17/10 tinha check-in de valor 0. No domínio atual todo registro tem valor > 0,
    // então "registrou 0" e "não registrou" são a mesma coisa: sem registro.
    const es = [entry('h1', '2026-10-15', 20), entry('h1', '2026-10-16', 10), entry('h1', '2026-10-18', 20)];
    const occs = build([c], es, '2026-10-15', '2026-10-18');
    const status = Object.fromEntries(occs.map((o) => [o.date, o.status]));
    expect(status).toEqual({ '2026-10-15': 'done', '2026-10-16': 'partial', '2026-10-17': 'missed', '2026-10-18': 'done' });
    expect(completionRate(occs)).toBe(50);
  });
});

describe('legado: test_streak_calculation', () => {
  it('sequência atual 5 e melhor 5', () => {
    const c = commitment('h1', { startDate: '2026-10-01' });
    const es = [...entriesOn('h1', days('2026-10-14', 5)), ...entriesOn('h1', days('2026-10-10', 3))];
    const occs = build([c], es, '2026-10-10', '2026-10-18');
    const s = computeStreaks(outcomesByDate(occs));
    expect(s.current).toBe(5);
    expect(s.best).toBe(5);
  });
});

describe('legado: test_trend_delta_and_status', () => {
  it('7 dias recentes a 100% contra 0% nos 7 anteriores = melhorando', () => {
    const c = commitment('h1', { startDate: '2026-10-01' });
    const es = entriesOn('h1', days('2026-10-13', 7)); // 13..19
    const occs = build([c], es, '2026-10-01', '2026-10-19');
    const t = computeTrend(occs, '2026-10-19');
    expect(t.status).toBe('improving');
    expect(t.delta).toBeGreaterThan(10);
    expect(t.delta).toBe(100);
  });
});

describe('legado: test_recovery_rate', () => {
  it('3 falhas, 2 recuperadas = 66.7%', () => {
    const c = commitment('h1', { startDate: '2026-10-10' });
    const es = [entry('h1', '2026-10-11'), entry('h1', '2026-10-14'), entry('h1', '2026-10-15')];
    const occs = build([c], es, '2026-10-10', '2026-10-15');
    expect(recoveryRate(outcomesByDate(occs))).toBeCloseTo(66.7, 1);
  });
});

describe('legado: test_composite_consistency_score', () => {
  it('fórmula ponderada exata', () => {
    // 0.30*80 + 0.20*80 + 0.15*70 + 0.15*90 + 0.10*70 + 0.10*(100 - std([90,70])=10)
    // = 24 + 16 + 10.5 + 13.5 + 7 + 9 = 80.0. O comentário do teste legado dizia 79.0 (usava equilíbrio 80),
    // mas só afirmava um intervalo; o valor correto da fórmula é 80.0.
    const r = consistencyScore({
      completionRate: 80,
      regularity: 0.8,
      recoveryRate: 70,
      coverage: 90,
      trendStatus: 'stable',
      categoryAdherences: [90, 70]
    });
    expect(r.score).toBe(80);
    expect(r.label).toBe('consistent');
  });
});

describe('legado: test_edge_case_clean_user', () => {
  it('usuário sem registros não quebra e devolve valores seguros', () => {
    const c = commitment('h1', { startDate: '2026-10-01' });
    const a = analyze({ commitments: [c], entries: [], today: '2026-10-19', timezone: 'America/Sao_Paulo' });
    expect(a.summary).toBeDefined();
    expect(a.insights).toBeDefined();
    expect(a.hasEnoughData).toBe(true); // 18 dias resolvidos, todos perdidos
    expect(a.summary.completionRate).toBe(0);
    expect(a.summary.currentStreak).toBe(0);
  });

  it('sem nenhum compromisso: sem nota, sem insights, sem erro', () => {
    const a = analyze({ commitments: [], entries: [], today: '2026-10-19', timezone: 'America/Sao_Paulo' });
    expect(a.summary.consistencyScore).toBeNull();
    expect(a.summary.label).toBeNull();
    expect(a.insights).toEqual([]);
    expect(a.commitments).toEqual([]);
  });
});
