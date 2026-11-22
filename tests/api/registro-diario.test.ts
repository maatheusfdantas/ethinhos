// @vitest-environment node
/**
 * Proposta 15 (22/11/2026): registro de cada dia e dia do progresso dos hábitos (habits.done_date).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let A = '';
let B = '';
const hoje = new Date().toISOString().slice(0, 10);
const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const dia = (token: string, date: string, body: Record<string, unknown>) => call(env, `/api/dias/${date}`, { method: 'PUT', token, body });

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_da', username: 'diaa', email: 'da@exemplo.com', password: 'DiaA#Senha-forte1' });
  await insertUser(env, { id: 'usr_db', username: 'diab', email: 'db@exemplo.com', password: 'DiaB#Senha-forte1' });
  A = await login(env, 'diaa', 'DiaA#Senha-forte1');
  B = await login(env, 'diab', 'DiaB#Senha-forte1');
});

describe('Registro diário', () => {
  it('exige login', async () => {
    expect((await call(env, '/api/dias')).status).toBe(401);
    expect((await dia('', hoje, {})).status).toBe(401);
  });

  it('grava e regrava o dia de hoje; a lista volta limpa e com totais calculados no servidor', async () => {
    let r = await dia(A, hoje, { habits: [{ id: 'h1', t: 'Ler', c: 'Estudo', f: true }, { id: 'h2', t: 'Meditar', c: 'Mente', f: false }], waterGlasses: 4, waterTarget: 8, glassMl: 250, sleepLogged: true, sleepBed: '23:10', sleepWake: '07:05', focusMin: 25, habitsDone: 99 });
    expect(r.status).toBe(200);
    r = await dia(A, hoje, { habits: [{ id: 'h1', t: 'Ler', c: 'Estudo', f: true }, { id: 'h2', t: 'Meditar', c: 'Mente', f: true }], waterGlasses: 6, waterTarget: 8, focusMin: 10, sleepBed: '<script>' });
    const got = await call(env, '/api/dias', { token: A });
    expect(got.status).toBe(200);
    expect(got.json.days).toHaveLength(1);
    const d = got.json.days[0];
    expect(d).toMatchObject({ date: hoje, habitsTotal: 2, habitsDone: 2, waterGlasses: 6, waterTarget: 8, sleepBed: null });
    expect(d.focusMin).toBe(25); // foco nunca diminui no mesmo dia (outro aparelho pode ter menos)
    expect(got.json.since).toBe(hoje);
  });

  it('não reescreve dias antigos nem aceita datas inválidas', async () => {
    expect((await dia(A, diasAtras(10), { waterGlasses: 3 })).status).toBe(400);
    expect((await dia(A, '2026-02-31', {})).status).toBe(400);
    expect((await dia(A, 'ontem', {})).status).toBe(400);
    expect((await dia(A, diasAtras(1), { waterGlasses: 3 })).status).toBe(200);
  });

  it('cada conta só vê os próprios dias', async () => {
    const got = await call(env, '/api/dias', { token: B });
    expect(got.json.days).toHaveLength(0);
    expect(got.json.since).toBeNull();
  });

  it('o hábito guarda o dia do progresso (doneDate) pela sincronização', async () => {
    const r = await call(env, '/api/user/usr_da/sync', { method: 'PUT', token: A, body: { habits: [{ id: 'hab_dia_1', title: 'Ler', category: 'Estudo', completed: true, current: 1, target: 1, doneDate: hoje }, { id: 'hab_dia_2', title: 'Correr', category: 'Corpo', completed: false, doneDate: 'qualquer' }] } });
    expect(r.status).toBe(200);
    const data = await call(env, '/api/user/usr_da/data', { token: A });
    const byId = Object.fromEntries(data.json.habits.map((h: { id: string }) => [h.id, h]));
    expect(byId.hab_dia_1.doneDate).toBe(hoje);
    expect(byId.hab_dia_2.doneDate).toBeNull();
  });
});

describe('Registro diário sem a migração', () => {
  it('responde 503 com mensagem clara (tabela ausente)', async () => {
    env.DB.raw.exec('DROP TABLE daily_log');
    const r = await call(env, '/api/dias', { token: A });
    expect(r.status).toBe(503);
    expect(r.json.error).toMatch(/ainda não está disponível/);
  });
});
