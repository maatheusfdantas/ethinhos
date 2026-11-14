// @vitest-environment node
/**
 * Rotas do núcleo /api/v1: compromissos, registros idempotentes, dia e intervalo,
 * e virada de dia pelo fuso do usuário.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let ana = '';
let beto = '';
let anaRefresh = '';
const uid = () => crypto.randomUUID();

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
  applyMigrations(env.DB); // como em produção: migrations antes do primeiro request
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_ana', username: 'ana', email: 'ana@ethos.test', password: 'Ana#Senha-forte-1', timezone: 'America/Sao_Paulo' });
  await insertUser(env, { id: 'usr_beto', username: 'beto', email: 'beto@ethos.test', password: 'Beto#Senha-forte-1', timezone: 'Asia/Tokyo' });
  ana = await login(env, 'ana', 'Ana#Senha-forte-1');
  beto = await login(env, 'beto', 'Beto#Senha-forte-1');
  const res = await call(env, '/api/auth/login', { method: 'POST', body: { login: 'ana', password: 'Ana#Senha-forte-1' } });
  anaRefresh = res.json.auth.refreshToken;
});

afterEach(() => {
  vi.useRealTimers();
});

const createCommitment = (token: string, body: Record<string, unknown>) =>
  call(env, '/api/v1/commitments', { method: 'POST', token, body });
const createEntry = (token: string, body: Record<string, unknown>) =>
  call(env, '/api/v1/entries', { method: 'POST', token, body });
const count = async (sql: string, ...args: unknown[]) =>
  Number((await env.DB.prepare(sql).bind(...args).first<{ n: number }>())?.n);

describe('autenticação do núcleo', () => {
  it('sem token responde 401', async () => {
    expect((await call(env, '/api/v1/commitments')).status).toBe(401);
    expect((await call(env, '/api/v1/day')).status).toBe(401);
  });

  it('refresh token não vale como token de acesso', async () => {
    expect((await call(env, '/api/v1/commitments', { token: anaRefresh })).status).toBe(401);
  });
});

describe('configurações (fuso)', () => {
  it('lê e altera o fuso; recusa fuso inválido', async () => {
    expect((await call(env, '/api/v1/me/settings', { token: beto })).json).toEqual({ timezone: 'Asia/Tokyo' });
    const bad = await call(env, '/api/v1/me/settings', { method: 'PUT', token: beto, body: { timezone: 'Marte/Base' } });
    expect(bad.status).toBe(422);
    expect(bad.json.field).toBe('timezone');
  });
});

describe('compromissos (CRUD)', () => {
  it('cria hábito com padrões (check diário, começa hoje) e rotina automática', async () => {
    const id = uid();
    const res = await createCommitment(ana, { id, title: 'Beber água > 2L' });
    expect(res.status).toBe(201);
    expect(res.json.created).toBe(true);
    expect(res.json.commitment).toMatchObject({
      id,
      kind: 'habit',
      title: 'Beber água > 2L', // sem a sanitização legada que removia "<" e ">"
      measure: { type: 'check', target: 1, unit: null },
      recurrence: { freq: 'daily' },
      status: 'active'
    });
    expect(await count('SELECT COUNT(*) AS n FROM routines WHERE user_id = ?', 'usr_ana')).toBe(1);
  });

  it('reenviar o mesmo id é idempotente (200, sem duplicar)', async () => {
    const id = uid();
    expect((await createCommitment(ana, { id, title: 'Ler' })).status).toBe(201);
    const again = await createCommitment(ana, { id, title: 'Ler (retentativa)' });
    expect(again.status).toBe(200);
    expect(again.json.created).toBe(false);
    expect(again.json.commitment.title).toBe('Ler');
    expect(await count('SELECT COUNT(*) AS n FROM commitments WHERE id = ?', id)).toBe(1);
  });

  it('id já usado por outro usuário responde 409', async () => {
    const id = uid();
    await createCommitment(ana, { id, title: 'Meditar' });
    expect((await createCommitment(beto, { id, title: 'Roubar id' })).status).toBe(409);
  });

  it('valida campos (422 com o campo)', async () => {
    const noTitle = await createCommitment(ana, { id: uid() });
    expect(noTitle.status).toBe(422);
    expect(noTitle.json.field).toBe('title');
    const badMeasure = await createCommitment(ana, { id: uid(), title: 'X', measure: { type: 'count', target: 0 } });
    expect(badMeasure.json.field).toBe('measure.target');
    const badId = await createCommitment(ana, { id: '1', title: 'X' });
    expect(badId.json.field).toBe('id');
  });

  it('lista só os compromissos do próprio usuário', async () => {
    const mine = await call(env, '/api/v1/commitments', { token: ana });
    const theirs = await call(env, '/api/v1/commitments', { token: beto });
    expect(mine.json.commitments.length).toBeGreaterThan(0);
    expect(mine.json.commitments.every((c: { userId: string }) => c.userId === 'usr_ana')).toBe(true);
    expect(theirs.json.commitments).toEqual([]);
  });

  it('PATCH altera parcialmente e arquiva; outro usuário recebe 404', async () => {
    const id = uid();
    await createCommitment(ana, { id, title: 'Correr', measure: { type: 'quantity', target: 5, unit: 'km' } });
    const upd = await call(env, `/api/v1/commitments/${id}`, { method: 'PATCH', token: ana, body: { title: 'Correr leve', status: 'archived' } });
    expect(upd.status).toBe(200);
    expect(upd.json.commitment).toMatchObject({ title: 'Correr leve', status: 'archived', measure: { type: 'quantity', target: 5, unit: 'km' } });
    const archived = await call(env, '/api/v1/commitments?status=archived', { token: ana });
    expect(archived.json.commitments.map((c: { id: string }) => c.id)).toContain(id);
    expect((await call(env, `/api/v1/commitments/${id}`, { method: 'PATCH', token: beto, body: { title: 'x' } })).status).toBe(404);
  });

  it('DELETE remove o compromisso e seus registros (idempotente)', async () => {
    const id = uid();
    await createCommitment(ana, { id, title: 'Temporário' });
    await createEntry(ana, { id: uid(), commitmentId: id });
    expect((await call(env, `/api/v1/commitments/${id}`, { method: 'DELETE', token: ana })).status).toBe(204);
    expect((await call(env, `/api/v1/commitments/${id}`, { method: 'DELETE', token: ana })).status).toBe(204);
    expect(await count('SELECT COUNT(*) AS n FROM entries WHERE commitment_id = ?', id)).toBe(0);
  });
});

describe('registros (entries)', () => {
  it('registrar duas vezes o mesmo id não duplica (idempotência)', async () => {
    const cId = uid();
    await createCommitment(ana, { id: cId, title: 'Água', measure: { type: 'count', target: 8, unit: 'copos' } });
    const eId = uid();
    const body = { id: eId, commitmentId: cId, value: 1, date: '2026-11-14' };
    const first = await createEntry(ana, body);
    const second = await createEntry(ana, body);
    const third = await createEntry(ana, body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(second.json.created).toBe(false);
    expect(second.json.entry).toEqual(first.json.entry);
    expect(await count('SELECT COUNT(*) AS n FROM entries WHERE id = ?', eId)).toBe(1);
  });

  it('não registra em compromisso de outro usuário (404) nem reaproveita id alheio (409)', async () => {
    const cId = uid();
    await createCommitment(ana, { id: cId, title: 'Privado' });
    expect((await createEntry(beto, { id: uid(), commitmentId: cId })).status).toBe(404);
    const eId = uid();
    await createEntry(ana, { id: eId, commitmentId: cId });
    const bCommitment = uid();
    await createCommitment(beto, { id: bCommitment, title: 'Do Beto' });
    expect((await createEntry(beto, { id: eId, commitmentId: bCommitment })).status).toBe(409);
  });

  it('valida data, valor e instante', async () => {
    const cId = uid();
    await createCommitment(ana, { id: cId, title: 'Validar' });
    expect((await createEntry(ana, { id: uid(), commitmentId: cId, date: '14/11/2026' })).json.field).toBe('date');
    expect((await createEntry(ana, { id: uid(), commitmentId: cId, value: 0 })).json.field).toBe('value');
    expect((await createEntry(ana, { id: uid(), commitmentId: cId, recordedAt: 'ontem' })).json.field).toBe('recordedAt');
  });
});

describe('virada do dia pelo fuso do usuário', () => {
  // 02:30 UTC de 15/11 = 23:30 de 14/11 em São Paulo = 11:30 de 15/11 em Tóquio.
  const INSTANT = '2026-11-15T02:30:00.000Z';

  it('sem `date`, o registro cai na data local do fuso do usuário', async () => {
    const cAna = uid();
    const cBeto = uid();
    await createCommitment(ana, { id: cAna, title: 'Diário SP', startDate: '2026-11-01' });
    await createCommitment(beto, { id: cBeto, title: 'Diário Tóquio', startDate: '2026-11-01' });
    const eAna = await createEntry(ana, { id: uid(), commitmentId: cAna, recordedAt: INSTANT });
    const eBeto = await createEntry(beto, { id: uid(), commitmentId: cBeto, recordedAt: INSTANT });
    expect(eAna.json.entry.date).toBe('2026-11-14');
    expect(eBeto.json.entry.date).toBe('2026-11-15');
    expect(eAna.json.entry.recordedAt).toBe(INSTANT);
  });

  it('GET /api/v1/day sem data usa "hoje" no fuso do usuário', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(INSTANT) });
    // Tokens emitidos com o relógio simulado: o access token vale 1 h (sem piso de 30 dias).
    const anaNow = await login(env, 'ana', 'Ana#Senha-forte-1');
    const betoNow = await login(env, 'beto', 'Beto#Senha-forte-1');
    const dAna = await call(env, '/api/v1/day', { token: anaNow });
    const dBeto = await call(env, '/api/v1/day', { token: betoNow });
    expect(dAna.json).toMatchObject({ date: '2026-11-14', timezone: 'America/Sao_Paulo' });
    expect(dBeto.json).toMatchObject({ date: '2026-11-15', timezone: 'Asia/Tokyo' });
  });

  it('mudar o fuso muda o dia dos registros seguintes', async () => {
    const cId = uid();
    await createCommitment(ana, { id: cId, title: 'Viagem', startDate: '2026-11-01' });
    await call(env, '/api/v1/me/settings', { method: 'PUT', token: ana, body: { timezone: 'Asia/Tokyo' } });
    const e = await createEntry(ana, { id: uid(), commitmentId: cId, recordedAt: INSTANT });
    expect(e.json.entry.date).toBe('2026-11-15');
    await call(env, '/api/v1/me/settings', { method: 'PUT', token: ana, body: { timezone: 'America/Sao_Paulo' } });
  });
});

describe('visão do dia e intervalo', () => {
  const DAY = '2026-11-18'; // quarta-feira
  let water = '';
  let gym = '';

  beforeAll(async () => {
    // Usuária nova para não misturar com os testes acima.
    await insertUser(env, { id: 'usr_cris', username: 'cris', email: 'cris@ethos.test', password: 'Cris#Senha-forte-1' });
  });

  it('lista só o que é devido no dia, com progresso somado e "done"', async () => {
    const cris = await login(env, 'cris', 'Cris#Senha-forte-1');
    water = uid();
    gym = uid();
    const read = uid();
    await createCommitment(cris, { id: water, title: 'Água', measure: { type: 'count', target: 3, unit: 'copos' }, startDate: '2026-11-01' });
    await createCommitment(cris, { id: gym, title: 'Academia', recurrence: { freq: 'weekdays', days: [1, 3, 5] }, startDate: '2026-11-01' });
    await createCommitment(cris, { id: read, title: 'Ler (só terças)', recurrence: { freq: 'weekdays', days: [2] }, startDate: '2026-11-01' });
    await createCommitment(cris, { id: uid(), title: 'Tarefa de outro dia', kind: 'task', recurrence: { freq: 'once', date: '2026-11-20' } });
    for (let i = 0; i < 3; i++) await createEntry(cris, { id: uid(), commitmentId: water, date: DAY });
    const undo = uid();
    await createEntry(cris, { id: undo, commitmentId: gym, date: DAY });

    let day = await call(env, `/api/v1/day?date=${DAY}`, { token: cris });
    expect(day.status).toBe(200);
    const byTitle = Object.fromEntries(day.json.items.map((i: { commitment: { title: string } }) => [i.commitment.title, i]));
    expect(Object.keys(byTitle).sort()).toEqual(['Academia', 'Água']);
    expect(byTitle['Água']).toMatchObject({ progress: 3, target: 3, done: true });
    expect(byTitle['Academia']).toMatchObject({ progress: 1, done: true });

    // Desfazer = exclusão lógica; repetir o DELETE é idempotente.
    expect((await call(env, `/api/v1/entries/${undo}`, { method: 'DELETE', token: cris })).status).toBe(204);
    expect((await call(env, `/api/v1/entries/${undo}`, { method: 'DELETE', token: cris })).status).toBe(204);
    day = await call(env, `/api/v1/day?date=${DAY}`, { token: cris });
    const gymItem = day.json.items.find((i: { commitment: { id: string } }) => i.commitment.id === gym);
    expect(gymItem).toMatchObject({ progress: 0, done: false });
  });

  it('GET /api/v1/entries devolve o intervalo sem os excluídos', async () => {
    const cris = await login(env, 'cris', 'Cris#Senha-forte-1');
    const res = await call(env, `/api/v1/entries?from=2026-11-01&to=2026-11-30`, { token: cris });
    expect(res.status).toBe(200);
    expect(res.json.entries).toHaveLength(3);
    expect(res.json.entries.every((e: { deletedAt: string | null }) => e.deletedAt === null)).toBe(true);
  });

  it('valida o intervalo', async () => {
    const cris = await login(env, 'cris', 'Cris#Senha-forte-1');
    expect((await call(env, '/api/v1/entries?from=2026-11-30&to=2026-11-01', { token: cris })).status).toBe(422);
    expect((await call(env, '/api/v1/entries?from=2025-01-01&to=2026-12-31', { token: cris })).status).toBe(422);
    expect((await call(env, '/api/v1/entries?to=2026-12-31', { token: cris })).json.field).toBe('from');
  });
});
