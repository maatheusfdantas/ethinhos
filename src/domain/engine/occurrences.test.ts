// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildOccurrences } from './occurrences';
import { commitment, entry, measure, rec } from './test-helpers';

const build = (
  c: ReturnType<typeof commitment>[],
  e: ReturnType<typeof entry>[],
  from: string,
  to: string,
  extra: { includeArchived?: boolean } = {}
) => buildOccurrences({ commitments: c, entries: e, from, to, today: to, ...extra });

describe('progresso do dia = soma dos registros', () => {
  it('vários registros no mesmo dia somam (o legado deixava o último vencer)', () => {
    const c = commitment('h', { measure: measure('duration', 30, 'min') });
    const es = [entry('h', '2026-10-19', 10), entry('h', '2026-10-19', 10), entry('h', '2026-10-19', 10)];
    const [o] = build([c], es, '2026-10-19', '2026-10-19');
    expect(o).toMatchObject({ progress: 30, ratio: 1, status: 'done', completed: true });
  });

  it('desfazer (registro excluído) reduz o progresso', () => {
    const c = commitment('h', { measure: measure('count', 8, 'copos') });
    const es = [entry('h', '2026-10-19', 1), entry('h', '2026-10-19', 1, { deletedAt: '2026-10-19T13:00:00.000Z' })];
    const [o] = build([c], es, '2026-10-19', '2026-10-19');
    expect(o?.progress).toBe(1);
  });

  it('ignora valor zero, negativo e inválido', () => {
    const c = commitment('h', { measure: measure('count', 5) });
    const es = [entry('h', '2026-10-19', 0), entry('h', '2026-10-19', -2), entry('h', '2026-10-19', Number.NaN)];
    const [o] = build([c], es, '2026-10-19', '2026-10-19');
    expect(o?.progress).toBe(0);
  });

  it('decimais somam sem erro de ponto flutuante (0.1 + 0.2 cumpre meta 0.3)', () => {
    const c = commitment('h', { measure: measure('quantity', 0.3, 'L') });
    const es = [entry('h', '2026-10-19', 0.1), entry('h', '2026-10-19', 0.2)];
    expect(build([c], es, '2026-10-19', '2026-10-19')[0]?.completed).toBe(true);
  });

  it('registro excedente não passa de 100% de razão', () => {
    const c = commitment('h', { measure: measure('count', 2) });
    const [o] = build([c], [entry('h', '2026-10-19', 9)], '2026-10-19', '2026-10-19');
    expect(o?.ratio).toBe(1);
  });

  it('meta inválida (0) é tratada como 1 e não gera divisão por zero', () => {
    const c = commitment('h', { measure: measure('count', 0) });
    const [o] = build([c], [], '2026-10-18', '2026-10-19');
    expect(Number.isFinite(o?.ratio)).toBe(true);
    expect(o?.target).toBe(1);
  });

  it('registro de compromisso desconhecido ou em data futura é ignorado', () => {
    const c = commitment('h');
    const es = [entry('outro', '2026-10-19'), entry('h', '2026-10-25')];
    const occs = build([c], es, '2026-10-18', '2026-10-19');
    expect(occs.every((o) => o.progress === 0)).toBe(true);
  });
});

describe('estados: pendente não é falha', () => {
  const c = commitment('h', { startDate: '2026-10-10' });

  it('hoje sem registro fica pendente e não resolvido; ontem sem registro é missed', () => {
    const occs = build([c], [], '2026-10-17', '2026-10-19');
    const byDate = Object.fromEntries(occs.map((o) => [o.date, o]));
    expect(byDate['2026-10-18']).toMatchObject({ status: 'missed', resolved: true });
    expect(byDate['2026-10-19']).toMatchObject({ status: 'pending', resolved: false });
  });

  it('hoje cumprido já é resolvido', () => {
    const [o] = build([c], [entry('h', '2026-10-19')], '2026-10-19', '2026-10-19');
    expect(o).toMatchObject({ status: 'done', resolved: true });
  });

  it('hoje com progresso parcial continua pendente (e a razão aparece)', () => {
    const cc = commitment('h', { measure: measure('count', 4) });
    const [o] = build([cc], [entry('h', '2026-10-19', 1)], '2026-10-19', '2026-10-19');
    expect(o).toMatchObject({ status: 'pending', ratio: 0.25 });
  });

  it('dia passado com progresso abaixo da meta é partial', () => {
    const cc = commitment('h', { measure: measure('count', 4) });
    const occs = build([cc], [entry('h', '2026-10-18', 1)], '2026-10-18', '2026-10-19');
    expect(occs[0]?.status).toBe('partial');
  });
});

describe('frequências e datas', () => {
  it('não há ocorrência antes de startDate, nem registro anterior conta', () => {
    const c = commitment('h', { startDate: '2026-10-15' });
    const occs = build([c], [entry('h', '2026-10-12')], '2026-10-10', '2026-10-16');
    expect(occs.map((o) => o.date)).toEqual(['2026-10-15', '2026-10-16']);
  });

  it('weekdays usa 0 = domingo (o dia 1 é só segunda, não segunda e terça)', () => {
    // 2026-10-19 segunda, 10-20 terça
    const c = commitment('h', { recurrence: rec({ freq: 'weekdays', days: [1] }), startDate: '2026-10-01' });
    const occs = build([c], [], '2026-10-19', '2026-10-25');
    expect(occs.map((o) => o.date)).toEqual(['2026-10-19']);
  });

  it('weekdays [0, 6] gera sábado e domingo', () => {
    const c = commitment('h', { recurrence: rec({ freq: 'weekdays', days: [0, 6] }), startDate: '2026-10-01' });
    const occs = build([c], [], '2026-10-19', '2026-10-25'); // seg..dom
    expect(occs.map((o) => o.date)).toEqual(['2026-10-24', '2026-10-25']);
  });

  it('tarefa pontual (once) gera uma única ocorrência', () => {
    const c = commitment('t', { kind: 'task', recurrence: rec({ freq: 'once', date: '2026-10-20' }), startDate: '2026-10-19' });
    const occs = build([c], [], '2026-10-18', '2026-10-25');
    expect(occs).toHaveLength(1);
    expect(occs[0]).toMatchObject({ date: '2026-10-20', status: 'missed', kind: 'task' });
  });

  it('atravessa virada de ano e 29 de fevereiro', () => {
    const c = commitment('h', { startDate: '2027-12-30' });
    expect(build([c], [], '2027-12-30', '2028-01-02').map((o) => o.date)).toEqual(['2027-12-30', '2027-12-31', '2028-01-01', '2028-01-02']);
    const d = commitment('d', { startDate: '2028-02-27' });
    expect(build([d], [], '2028-02-27', '2028-03-01').map((o) => o.date)).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01']);
  });

  it('compromisso arquivado fica de fora, salvo includeArchived', () => {
    const c = commitment('h', { status: 'archived' });
    expect(build([c], [], '2026-10-18', '2026-10-19')).toHaveLength(0);
    expect(build([c], [], '2026-10-18', '2026-10-19', { includeArchived: true })).toHaveLength(2);
  });

  it('sem compromissos ou sem dias no intervalo: lista vazia', () => {
    expect(build([], [], '2026-10-01', '2026-10-19')).toEqual([]);
    expect(build([commitment('h')], [], '2026-10-20', '2026-10-19')).toEqual([]);
  });
});

describe('weekly_count: uma ocorrência por semana (segunda a domingo)', () => {
  // 2026-10-21 é quarta. Semana atual: seg 10-19 .. dom 10-25.
  const c = (over = {}) =>
    commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), startDate: '2026-10-01', ...over });

  it('semana em curso sem meta cumprida fica pendente (não é falha)', () => {
    const occs = build([c()], [entry('w', '2026-10-19'), entry('w', '2026-10-20')], '2026-10-12', '2026-10-21');
    const current = occs.find((o) => o.scope === 'week' && o.date === '2026-10-21');
    expect(current).toMatchObject({ progress: 2, target: 3, status: 'pending', resolved: false, completed: false });
  });

  it('cumprir a meta no meio da semana resolve a semana na hora', () => {
    const es = [entry('w', '2026-10-19'), entry('w', '2026-10-20'), entry('w', '2026-10-21')];
    const current = build([c()], es, '2026-10-12', '2026-10-21').find((o) => o.date === '2026-10-21');
    expect(current).toMatchObject({ status: 'done', resolved: true, completed: true });
  });

  it('semana encerrada abaixo da meta vira partial; sem nada, missed', () => {
    const es = [entry('w', '2026-10-12'), entry('w', '2026-10-13')]; // 2 de 3
    const occs = build([c()], es, '2026-10-12', '2026-10-21');
    expect(occs.find((o) => o.date === '2026-10-18')).toMatchObject({ status: 'partial', progress: 2, ratio: 2 / 3, resolved: true });
    const none = build([c()], [], '2026-10-12', '2026-10-21');
    expect(none.find((o) => o.date === '2026-10-18')?.status).toBe('missed');
  });

  it('vários registros no mesmo dia contam como um só dia da semana', () => {
    const es = [entry('w', '2026-10-12'), entry('w', '2026-10-12'), entry('w', '2026-10-12')];
    expect(build([c()], es, '2026-10-12', '2026-10-21').find((o) => o.date === '2026-10-18')?.progress).toBe(1);
  });

  it('só conta o dia em que a meta DIÁRIA foi cumprida', () => {
    const w = c({ measure: measure('duration', 30, 'min') });
    const es = [entry('w', '2026-10-12', 10), entry('w', '2026-10-13', 30), entry('w', '2026-10-14', 45)];
    expect(build([w], es, '2026-10-12', '2026-10-21').find((o) => o.date === '2026-10-18')?.progress).toBe(2);
  });

  it('semana em que o compromisso começou no meio só conta se for cumprida', () => {
    // começa na quarta 10-21; hoje terça 10-27. A semana de 10-19 não deve virar falha.
    const w = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 3 }), startDate: '2026-10-21' });
    const none = build([w], [], '2026-10-19', '2026-10-27');
    expect(none.filter((o) => o.scope === 'week').map((o) => o.date)).toEqual(['2026-10-27']); // só a semana atual
    const es = ['2026-10-21', '2026-10-22', '2026-10-23'].map((d) => entry('w', d));
    const done = build([w], es, '2026-10-19', '2026-10-27');
    expect(done.find((o) => o.date === '2026-10-25')).toMatchObject({ status: 'done' });
  });

  it('count = 7 exige todos os dias', () => {
    const w = c({ recurrence: rec({ freq: 'weekly_count', count: 7 }) });
    const es = Array.from({ length: 7 }, (_, i) => entry('w', `2026-10-${String(12 + i).padStart(2, '0')}`));
    expect(build([w], es, '2026-10-12', '2026-10-21').find((o) => o.date === '2026-10-18')?.status).toBe('done');
  });

  it('semana que atravessa a virada do ano', () => {
    // 2026-01-01 é quinta; semana: seg 2025-12-29 .. dom 2026-01-04.
    const w = commitment('w', { recurrence: rec({ freq: 'weekly_count', count: 2 }), startDate: '2025-12-01' });
    const es = [entry('w', '2025-12-30'), entry('w', '2026-01-02')];
    const occ = build([w], es, '2025-12-29', '2026-01-05').find((o) => o.date === '2026-01-04');
    expect(occ).toMatchObject({ status: 'done', progress: 2 });
  });
});
