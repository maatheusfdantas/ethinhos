// @vitest-environment node
/**
 * Lote F (Organização Clínica): pendências administrativas internas, só da Clínica, conferidas no servidor.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';
import { eraseUserData } from '../../functions/api/_lib/erase.js';

const env = makeEnv();
const T: Record<string, string> = {};
let ipN = 1;
const as = (who: string, path: string, opts: { method?: string; body?: unknown } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': `198.21.0.${ipN++ % 250}` } });
const one = async (sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first()) as any;
const ids: Record<string, string> = {};

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['marta', 'iris', 'rafa', 'clara', 'ana']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
  for (const [u, model, space] of [['marta', 'clinica', 'Espaço Integra'], ['iris', 'clinica', 'Clínica Íris'], ['rafa', 'personal', 'Studio Pulso'], ['clara', 'nutri', 'Clara Nutrição']]) {
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: `usr_${u}`, model, spaceName: space } })).status).toBe(201);
  }
  const code = (await as('marta', '/api/espacos/convite-individual', { method: 'POST' })).json.code;
  expect((await as('ana', '/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult: true } })).status).toBe(201);
});

describe('Permissão por modelo', () => {
  it('Personal, Nutri e quem não é profissional não acessam as pendências administrativas', async () => {
    expect((await as('rafa', '/api/espacos/tarefas')).status).toBe(403);
    expect((await as('rafa', '/api/espacos/tarefas')).json.error).toMatch(/não acessa pendências administrativas/);
    expect((await as('clara', '/api/espacos/tarefas', { method: 'POST', body: { title: 'X' } })).status).toBe(403);
    expect((await as('ana', '/api/espacos/tarefas')).status).toBe(403);
  });
  it('a Clínica continua sem acesso a treinos e alimentação', async () => {
    expect((await as('marta', '/api/espacos/fichas')).status).toBe(403);
    expect((await as('marta', '/api/espacos/planos-modelo')).status).toBe(403);
  });
});

describe('Tarefas da Clínica', () => {
  it('valida no servidor: título obrigatório, prazo válido, sem HTML', async () => {
    expect((await as('marta', '/api/espacos/tarefas', { method: 'POST', body: { title: '   ' } })).status).toBe(400);
    expect((await as('marta', '/api/espacos/tarefas', { method: 'POST', body: { title: 'Sala', dueOn: '2026-02-31' } })).status).toBe(400);
    const r = await as('marta', '/api/espacos/tarefas', { method: 'POST', body: { title: '<b>Confirmar</b> a sala de sábado', dueOn: '2026-11-21', note: 'Sala 2' } });
    expect(r.status).toBe(201);
    expect(r.json.tarefa).toMatchObject({ title: 'Confirmar a sala de sábado', dueOn: '2026-11-21', status: 'aberta' });
    ids.sala = r.json.tarefa.id;
    ids.sem = (await as('marta', '/api/espacos/tarefas', { method: 'POST', body: { title: 'Atualizar o aviso de dezembro' } })).json.tarefa.id;
    ids.cedo = (await as('marta', '/api/espacos/tarefas', { method: 'POST', body: { title: 'Ver quem não respondeu', dueOn: '2026-11-20' } })).json.tarefa.id;
  });
  it('lista abertas por prazo (sem prazo por último); outra clínica não vê nem altera', async () => {
    const l = (await as('marta', '/api/espacos/tarefas')).json.tarefas.map((t: any) => t.id);
    expect(l).toEqual([ids.cedo, ids.sala, ids.sem]);
    expect((await as('iris', '/api/espacos/tarefas')).json.tarefas).toHaveLength(0);
    expect((await as('iris', `/api/espacos/tarefas/${ids.sala}`, { method: 'PUT', body: { status: 'concluida' } })).status).toBe(404);
  });
  it('concluir e reabrir; editar só o que veio; arquivar tira da lista sem apagar', async () => {
    const c = await as('marta', `/api/espacos/tarefas/${ids.sala}`, { method: 'PUT', body: { status: 'concluida' } });
    expect(c.json.tarefa).toMatchObject({ status: 'concluida', title: 'Confirmar a sala de sábado', note: 'Sala 2' });
    expect(c.json.tarefa.doneAt).toBeTruthy();
    expect((await as('marta', '/api/espacos/tarefas?status=concluidas')).json.tarefas.map((t: any) => t.id)).toEqual([ids.sala]);
    expect((await as('marta', `/api/espacos/tarefas/${ids.sala}`, { method: 'PUT', body: { status: 'aberta' } })).json.tarefa).toMatchObject({ status: 'aberta', doneAt: null });
    expect((await as('marta', `/api/espacos/tarefas/${ids.sala}`, { method: 'PUT', body: { status: 'apagada' } })).status).toBe(400);
    expect((await as('marta', `/api/espacos/tarefas/${ids.sem}`, { method: 'PUT', body: { dueOn: '2026-12-01' } })).json.tarefa).toMatchObject({ title: 'Atualizar o aviso de dezembro', dueOn: '2026-12-01' });
    expect((await as('marta', `/api/espacos/tarefas/${ids.cedo}`, { method: 'DELETE' })).status).toBe(200);
    expect((await as('marta', '/api/espacos/tarefas')).json.tarefas.map((t: any) => t.id)).not.toContain(ids.cedo);
    expect((await one('SELECT status FROM space_tasks WHERE id = ?', ids.cedo)).status).toBe('arquivada');
    expect((await as('marta', `/api/espacos/tarefas/${ids.cedo}`, { method: 'PUT', body: { status: 'aberta' } })).status).toBe(404);
  });
  it('visão geral da Clínica: pendências administrativas abertas e pessoas novas', async () => {
    const blocos = (await as('marta', '/api/espacos/visao')).json.blocos;
    expect(blocos.find((b: any) => b.key === 'tarefas').items.map((i: any) => i.taskId)).toEqual([ids.sala, ids.sem]);
    expect(blocos.find((b: any) => b.key === 'pessoas_novas').items[0]).toMatchObject({ name: 'ana' });
    expect(blocos.find((b: any) => b.key === 'sem_atribuicao')).toBeUndefined();
    expect((await as('rafa', '/api/espacos/visao')).json.blocos.find((b: any) => b.key === 'tarefas')).toBeUndefined();
  });
  it('Clínica suspensa perde o acesso no próximo pedido', async () => {
    await as('adm', '/api/admin/profissionais/usr_marta', { method: 'PUT', body: { status: 'suspenso' } });
    expect((await as('marta', '/api/espacos/tarefas')).status).toBe(403);
    await as('adm', '/api/admin/profissionais/usr_marta', { method: 'PUT', body: { status: 'ativo' } });
    expect((await as('marta', '/api/espacos/tarefas')).status).toBe(200);
  });
  it('excluir a conta da Clínica apaga as tarefas do espaço dela', async () => {
    const space = (await one('SELECT space_id FROM pro_profiles WHERE user_id = ?', 'usr_marta')).space_id;
    await eraseUserData(env.DB as any, 'usr_marta');
    expect((await one('SELECT COUNT(*) AS n FROM space_tasks WHERE space_id = ?', space)).n).toBe(0);
  });
});
