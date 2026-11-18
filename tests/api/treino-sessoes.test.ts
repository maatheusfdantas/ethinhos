// @vitest-environment node
/**
 * Lote D1: treino ativo com sessões e séries no servidor.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let A = '';
let B = '';
const ficha = { exercises: [{ id: 'ex_agach', name: 'Agachamento', sets: 2, reps: 8, weightKg: 40 }, { id: 'ex_prancha', name: 'Prancha', sets: 1, reps: 40 }] };
const start = (token: string, id: string, extra: Record<string, unknown> = {}) =>
  call(env, '/api/treino/sessoes', { method: 'POST', token, body: { id, name: 'Treino A', workoutRef: 'wo_1', content: ficha, ...extra } });
const set = (token: string, sid: string, body: Record<string, unknown>) => call(env, `/api/treino/sessoes/${sid}/series`, { method: 'PUT', token, body });

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_ta', username: 'treinoa', email: 'ta@exemplo.com', password: 'TreinoA#Senha-forte1' });
  await insertUser(env, { id: 'usr_tb', username: 'treinob', email: 'tb@exemplo.com', password: 'TreinoB#Senha-forte1' });
  A = await login(env, 'treinoa', 'TreinoA#Senha-forte1');
  B = await login(env, 'treinob', 'TreinoB#Senha-forte1');
});

describe('Treino ativo', () => {
  it('exige login', async () => {
    expect((await call(env, '/api/treino/sessao-aberta')).status).toBe(401);
  });

  it('iniciar é idempotente pelo id e só existe uma sessão aberta por vez', async () => {
    const r1 = await start(A, 'sess_a_000001');
    expect(r1.status).toBe(201);
    expect(r1.json.session.plannedSets).toBe(3);
    const again = await start(A, 'sess_a_000001');
    expect(again.json.resumed).toBe(true);
    const other = await start(A, 'sess_a_000002');
    expect(other.json.session.id).toBe('sess_a_000001');
    expect((await call(env, '/api/treino/sessao-aberta', { token: A })).json.session.id).toBe('sess_a_000001');
  });

  it('outra conta não vê nem altera a sessão', async () => {
    expect((await call(env, '/api/treino/sessoes/sess_a_000001', { token: B })).status).toBe(404);
    expect((await set(B, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 1, weightKg: 99, reps: 1 })).status).toBe(404);
    expect((await start(B, 'sess_a_000001')).status).toBe(409);
  });

  it('séries: registrar, corrigir a mesma série e desfazer', async () => {
    let r = await set(A, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 1, weightKg: 40, reps: 8 });
    expect(r.json.session.sets).toHaveLength(1);
    r = await set(A, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 1, weightKg: 42.5, reps: 8 });
    expect(r.json.session.sets).toHaveLength(1);
    expect(r.json.session.sets[0].weightKg).toBe(42.5);
    r = await set(A, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 2, weightKg: 42.5, reps: 7 });
    r = await call(env, '/api/treino/sessoes/sess_a_000001/series', { method: 'DELETE', token: A, body: { exerciseKey: 'ex_agach', setNo: 2 } });
    expect(r.json.session.sets).toHaveLength(1);
    expect((await set(A, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 99, reps: 1 })).status).toBe(400);
  });

  it('pausa não conta no tempo', async () => {
    await call(env, '/api/treino/sessoes/sess_a_000001/pausa', { method: 'POST', token: A, body: { pausado: true } });
    const a = (await call(env, '/api/treino/sessoes/sess_a_000001', { token: A })).json.session;
    expect(a.pausedAt).toBeTruthy();
    await new Promise((r) => setTimeout(r, 60));
    const b = (await call(env, '/api/treino/sessoes/sess_a_000001', { token: A })).json.session;
    expect(Math.abs(b.elapsedMs - a.elapsedMs)).toBeLessThan(15);
    const c = (await call(env, '/api/treino/sessoes/sess_a_000001/pausa', { method: 'POST', token: A, body: { pausado: false } })).json.session;
    expect(c.pausedAt).toBeNull();
    expect(c.pausedMs).toBeGreaterThanOrEqual(50);
  });

  it('finalizar com séries faltando vira incompleta, sem inventar séries; entra no histórico', async () => {
    const r = await call(env, '/api/treino/sessoes/sess_a_000001/finalizar', { method: 'POST', token: A });
    expect(r.json.session.status).toBe('incompleta');
    expect(r.json.session.sets).toHaveLength(1);
    expect((await set(A, 'sess_a_000001', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 2, weightKg: 40, reps: 8 })).status).toBe(409);
    const h = await call(env, '/api/treino/historico', { token: A });
    expect(h.json.sessions[0]).toMatchObject({ id: 'sess_a_000001', status: 'incompleta', doneSets: 1 });
    expect((await call(env, '/api/treino/historico', { token: B })).json.sessions).toHaveLength(0);
  });

  it('todas as séries feitas: concluída; sugestão vem da última execução', async () => {
    await start(A, 'sess_a_000003');
    await set(A, 'sess_a_000003', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 1, weightKg: 45, reps: 8 });
    await set(A, 'sess_a_000003', { exerciseKey: 'ex_agach', exerciseName: 'Agachamento', setNo: 2, weightKg: 45, reps: 8 });
    await set(A, 'sess_a_000003', { exerciseKey: 'ex_prancha', exerciseName: 'Prancha', setNo: 1, metric: 'tempo', seconds: 40 });
    const r = await call(env, '/api/treino/sessoes/sess_a_000003/finalizar', { method: 'POST', token: A });
    expect(r.json.session.status).toBe('concluida');
    const last = await call(env, '/api/treino/ultimas?keys=ex_agach,ex_prancha', { token: A });
    expect(last.json.last.ex_agach).toMatchObject({ weightKg: 45, reps: 8 });
    expect(last.json.last.ex_prancha).toMatchObject({ seconds: 40, metric: 'tempo' });
  });

  it('progresso: maior carga por semana do exercício, só de sessões encerradas', async () => {
    const p = await call(env, '/api/treino/progresso?key=ex_agach', { token: A });
    expect(p.json.weeks.at(-1).maxKg).toBe(45);
    const h = await call(env, '/api/treino/historico', { token: A });
    expect(h.json.exercises.map((e: any) => e.key)).toContain('ex_agach');
    expect(h.json.exercises.map((e: any) => e.key)).not.toContain('ex_prancha');
  });

  it('reiniciar descarta só a sessão em andamento; encerradas ficam no histórico', async () => {
    await start(A, 'sess_a_000004');
    expect((await call(env, '/api/treino/sessoes/sess_a_000004', { method: 'DELETE', token: A })).status).toBe(200);
    expect((await call(env, '/api/treino/sessao-aberta', { token: A })).json.session).toBeNull();
    expect((await call(env, '/api/treino/sessoes/sess_a_000003', { method: 'DELETE', token: A })).status).toBe(409);
  });

  it('sem a migração aplicada, responde 503 com mensagem clara (não cria tabela sozinho)', async () => {
    // Último teste do arquivo: simula a produção antes da migração 0008.
    await env.DB.prepare('DROP TABLE workout_sets').run();
    await env.DB.prepare('DROP TABLE workout_sessions').run();
    const r = await call(env, '/api/treino/sessao-aberta', { token: A });
    expect(r.status).toBe(503);
    expect(r.json.code).toBe('treino_indisponivel');
  });
});
