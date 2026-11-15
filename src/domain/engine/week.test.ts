// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { eachDay, weekEnd, weekRange, weekStart, weeklyPeriod } from './week';
import { commitment, measure, rec } from './test-helpers';

describe('semana de segunda a domingo', () => {
  it('segunda-feira abre a própria semana', () => {
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekEnd('2026-10-19')).toBe('2026-10-25');
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    expect(weekStart('2026-10-25')).toBe('2026-10-19');
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // a segunda seguinte já é outra semana
  });

  it('atravessa a virada do ano', () => {
    expect(weekRange('2026-01-01')).toEqual({ from: '2025-12-29', to: '2026-01-04' });
    expect(weekRange('2028-02-29')).toEqual({ from: '2028-02-28', to: '2028-03-05' });
  });

  it('eachDay inclui as duas pontas e é vazio se invertido', () => {
    expect(eachDay('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(eachDay('2026-11-02', '2026-10-30')).toEqual([]);
  });
});

describe('weeklyPeriod (contrato DayItem.period)', () => {
  const w = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), measure: measure('duration', 30, 'min'), startDate: '2026-10-01' });

  it('conta dias distintos com a meta diária cumprida', () => {
    const totals = new Map([
      ['2026-10-19', 30],
      ['2026-10-20', 10], // abaixo da meta diária: não conta
      ['2026-10-22', 50]
    ]);
    expect(weeklyPeriod(w, totals, '2026-10-21')).toEqual({
      kind: 'week',
      from: '2026-10-19',
      to: '2026-10-25',
      progress: 2,
      target: 3,
      done: false
    });
  });

  it('done quando progress >= target', () => {
    const totals = new Map([['2026-10-19', 30], ['2026-10-21', 30], ['2026-10-25', 30]]);
    expect(weeklyPeriod(w, totals, '2026-10-23')?.done).toBe(true);
  });

  it('é o mesmo resultado para qualquer dia da semana', () => {
    const totals = new Map([['2026-10-19', 30]]);
    expect(weeklyPeriod(w, totals, '2026-10-19')).toEqual(weeklyPeriod(w, totals, '2026-10-25'));
  });

  it('dias anteriores a startDate não contam', () => {
    const late = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), startDate: '2026-10-21' });
    const totals = new Map([['2026-10-19', 1], ['2026-10-20', 1], ['2026-10-21', 1]]);
    expect(weeklyPeriod(late, totals, '2026-10-22')?.progress).toBe(1);
  });

  it('devolve null para compromissos que não são weekly_count', () => {
    expect(weeklyPeriod(commitment('d'), new Map(), '2026-10-19')).toBeNull();
  });
});
