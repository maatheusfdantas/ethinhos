// @vitest-environment node
/**
 * Análise de progresso só com dados reais (Q4, 15/11/2026): nada de índice, sequência ou tendência inventados,
 * nem números diferentes conforme o id da conta. Categorias calculadas com os hábitos de hoje.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const T: Record<string, string> = {};

beforeAll(async () => {
  await call(env, '/api/health');
  for (const u of ['matheus_pro', 'ana']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  const now = new Date().toISOString();
  const add = (id: string, title: string, category: string, completed: number) =>
    env.DB.prepare('INSERT INTO habits (id, user_id, title, category, icon_name, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, 'usr_matheus_pro', title, category, 'Check', completed, now).run();
  await add('h1', 'Ler', 'Estudo', 1);
  await add('h2', 'Correr', 'Saúde', 0);
  await add('h3', 'Alongar', 'Saúde', 1);
});

describe('Análise de progresso', () => {
  it('devolve só o que é real: progresso de hoje e categorias; sem índice, sequência nem tendência', async () => {
    const r = await call(env, '/api/analytics/usr_matheus_pro', { token: T.matheus_pro });
    expect(r.status).toBe(200);
    expect(r.json.history_available).toBe(false);
    expect(r.json.summary).toMatchObject({ daily_progress: 67, consistency_score: null, main_streak: null, best_streak: null, trend_delta: null });
    expect(r.json.categories).toEqual([
      { category: 'Estudo', total_expected: 1, total_completed: 1, adherence: 100 },
      { category: 'Saúde', total_expected: 2, total_completed: 1, adherence: 50 }
    ]);
    expect(r.json.charts).toEqual({});
    expect(r.json.reports).toEqual({});
    expect(JSON.stringify(r.json)).not.toMatch(/64\.5|91\.4|6\.4|Pull Requests|Algoritmos/);
  });
  it('sem hábitos: zero, sem números inventados', async () => {
    const r = await call(env, '/api/analytics/usr_ana', { token: T.ana });
    expect(r.json.summary).toMatchObject({ daily_progress: 0, consistency_score: null });
    expect(r.json.categories).toEqual([]);
  });
  it('não lê a análise de outra conta', async () => {
    expect((await call(env, '/api/analytics/usr_matheus_pro', { token: T.ana })).status).toBe(403);
  });
});
