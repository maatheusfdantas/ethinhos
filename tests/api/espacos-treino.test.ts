// @vitest-environment node
/**
 * Lote D2 (Personal): fichas com versões, atribuição (cópia por pessoa), adaptação, execução e acompanhamento.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const T: Record<string, string> = {};
let ipN = 1;
const as = (who: string, path: string, opts: { method?: string; body?: unknown } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': `198.19.0.${ipN++ % 250}` } });
const one = async (sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first()) as any;
const FICHA = { exercises: [{ id: 'ex_agach', name: 'Agachamento livre', sets: 2, reps: 8, weightKg: 40, restSec: 0 }, { id: 'ex_prancha', name: 'Prancha', sets: 1, reps: 40 }] };
let turmaId = '';
let fichaId = '';
const ids: Record<string, string> = {};

async function join(who: string, code: string) {
  const r = await as(who, '/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult: true } });
  expect(r.status).toBe(201);
}

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['rafa', 'tito', 'clara', 'lia', 'bruno', 'gabi', 'dani']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
  for (const [u, model, space] of [['rafa', 'personal', 'Studio Pulso'], ['tito', 'personal', 'Tito Treinos'], ['clara', 'nutri', 'Clara Nutrição']]) {
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: `usr_${u}`, model, spaceName: space } })).status).toBe(201);
  }
  turmaId = (await as('rafa', '/api/espacos/turmas', { method: 'POST', body: { name: 'Força' } })).json.turma.id;
  const code = (await as('rafa', `/api/espacos/turmas/${turmaId}/convite`, { method: 'POST' })).json.code;
  await join('lia', code);
  await join('bruno', code);
  await join('gabi', (await as('rafa', '/api/espacos/convite-individual', { method: 'POST' })).json.code);
  await join('dani', (await as('rafa', '/api/espacos/convite-individual', { method: 'POST' })).json.code);
  for (const p of (await as('rafa', '/api/espacos/pessoas')).json.pessoas) ids[p.username] = p.linkId;
});

describe('Modelo e permissão', () => {
  it('Nutri e quem não é profissional não acessam fichas', async () => {
    expect((await as('clara', '/api/espacos/fichas')).status).toBe(403);
    expect((await as('clara', '/api/espacos/fichas')).json.error).toMatch(/não acessa treinos/);
    expect((await as('lia', '/api/espacos/fichas')).status).toBe(403);
  });
});

describe('Fichas com versões', () => {
  it('valida o conteúdo no servidor e cria a versão 1', async () => {
    expect((await as('rafa', '/api/espacos/fichas', { method: 'POST', body: { name: 'Treino A', content: { exercises: [] } } })).status).toBe(400);
    expect((await as('rafa', '/api/espacos/fichas', { method: 'POST', body: { name: 'Treino A', content: { exercises: [{ name: 'X', sets: 99 }] } } })).status).toBe(400);
    const r = await as('rafa', '/api/espacos/fichas', { method: 'POST', body: { name: 'Treino A', content: FICHA } });
    expect(r.status).toBe(201);
    fichaId = r.json.ficha.id;
  });
  it('outro Personal não vê a ficha', async () => {
    expect((await as('tito', `/api/espacos/fichas/${fichaId}`)).status).toBe(404);
  });
});

describe('Atribuir (cópia por pessoa, idempotente)', () => {
  it('prévia para a turma mostra quem recebe; confirmar cria uma cópia por pessoa; repetir não duplica', async () => {
    const pv = await as('rafa', '/api/espacos/atribuir', { method: 'POST', body: { templateId: fichaId, groupId: turmaId, preview: true } });
    expect(pv.json.previa).toMatchObject({ total: 2, novos: 2 });
    expect((await as('rafa', '/api/espacos/atribuir', { method: 'POST', body: { templateId: fichaId, groupId: turmaId } })).json).toMatchObject({ created: 2, skipped: 0 });
    expect((await as('rafa', '/api/espacos/atribuir', { method: 'POST', body: { templateId: fichaId, groupId: turmaId } })).json).toMatchObject({ created: 0, skipped: 2 });
    expect((await one("SELECT COUNT(*) AS n FROM assignments WHERE status = 'ativa'")).n).toBe(2);
  });
  it('individual: só para quem tem vínculo com este espaço', async () => {
    expect((await as('rafa', '/api/espacos/atribuir', { method: 'POST', body: { templateId: fichaId, linkIds: [ids.gabi] } })).json.created).toBe(1);
    expect((await as('tito', '/api/espacos/atribuir', { method: 'POST', body: { templateId: fichaId, linkIds: [ids.gabi] } })).status).toBe(404);
  });
  it('cada pessoa vê só as próprias fichas atribuídas', async () => {
    const lia = await as('lia', '/api/treino/atribuidos');
    expect(lia.json.atribuidos).toHaveLength(1);
    expect(lia.json.atribuidos[0]).toMatchObject({ name: 'Treino A', proName: 'rafa', spaceName: 'Studio Pulso', canEdit: false });
    expect((await as('dani', '/api/treino/atribuidos')).json.atribuidos).toHaveLength(0);
  });
});

describe('Adaptar e versões novas', () => {
  it('adaptar a cópia da Lia não muda a do Bruno', async () => {
    const liaA = (await as('lia', '/api/treino/atribuidos')).json.atribuidos[0];
    ids.liaAsg = liaA.id;
    const adapted = { exercises: [{ ...FICHA.exercises[0], weightKg: 42.5 }, FICHA.exercises[1]] };
    expect((await as('rafa', `/api/espacos/atribuicoes/${liaA.id}`, { method: 'PUT', body: { content: adapted, note: 'joelho ok' } })).status).toBe(200);
    expect((await as('lia', '/api/treino/atribuidos')).json.atribuidos[0]).toMatchObject({ adapted: true, version: 2 });
    expect((await as('lia', '/api/treino/atribuidos')).json.atribuidos[0].content.exercises[0].weightKg).toBe(42.5);
    expect((await as('bruno', '/api/treino/atribuidos')).json.atribuidos[0].content.exercises[0].weightKg).toBe(40);
  });
  it('versão nova da ficha vai só para quem for escolhido; a adaptada fica', async () => {
    const v2 = { exercises: [{ ...FICHA.exercises[0], sets: 3 }, FICHA.exercises[1]] };
    expect((await as('rafa', `/api/espacos/fichas/${fichaId}/versoes`, { method: 'POST', body: { content: v2 } })).json.version).toBe(2);
    const det = (await as('rafa', `/api/espacos/fichas/${fichaId}`)).json;
    expect(det.versoes.map((v: any) => v.version)).toEqual([2, 1]);
    const bruno = det.atribuicoes.find((a: any) => a.person === 'bruno');
    expect((await as('rafa', `/api/espacos/fichas/${fichaId}/atualizar`, { method: 'POST', body: { assignmentIds: [bruno.id] } })).json.updated).toBe(1);
    expect((await as('bruno', '/api/treino/atribuidos')).json.atribuidos[0].content.exercises[0].sets).toBe(3);
    expect((await as('lia', '/api/treino/atribuidos')).json.atribuidos[0].content.exercises[0].sets).toBe(2);
  });
  it('a pessoa só edita a cópia quando o profissional libera', async () => {
    expect((await as('lia', `/api/treino/atribuidos/${ids.liaAsg}`, { method: 'PUT', body: { content: FICHA } })).status).toBe(403);
    await as('rafa', `/api/espacos/atribuicoes/${ids.liaAsg}/permissao`, { method: 'PUT', body: { allowClientEdit: true } });
    expect((await as('lia', '/api/treino/atribuidos')).json.atribuidos[0].canEdit).toBe(true);
    expect((await as('lia', `/api/treino/atribuidos/${ids.liaAsg}`, { method: 'PUT', body: { content: FICHA } })).status).toBe(200);
    expect((await one("SELECT author_id FROM assignment_versions WHERE assignment_id = ? ORDER BY version DESC", ids.liaAsg)).author_id).toBe('usr_lia');
  });
});

describe('Executar e acompanhar', () => {
  it('a sessão usa a cópia do servidor (não o que o navegador manda) e guarda a atribuição', async () => {
    const r = await as('lia', '/api/treino/sessoes', { method: 'POST', body: { id: 'sess_lia_000001', assignmentId: ids.liaAsg, name: 'Falso', content: { exercises: [{ id: 'x', name: 'Inventado', sets: 9 }] } } });
    expect(r.status).toBe(201);
    expect(r.json.session).toMatchObject({ name: 'Treino A', assignmentId: ids.liaAsg });
    expect(r.json.session.content.exercises[0].name).toBe('Agachamento livre');
    await as('lia', '/api/treino/sessoes/sess_lia_000001/series', { method: 'PUT', body: { exerciseKey: 'ex_agach', exerciseName: 'Agachamento livre', setNo: 1, weightKg: 40, reps: 8 } });
    expect((await as('lia', '/api/treino/sessoes/sess_lia_000001/finalizar', { method: 'POST' })).json.session.status).toBe('incompleta');
  });
  it('o Personal vê a sessão (planejado x realizado); outro Personal e a Nutri não', async () => {
    const ac = await as('rafa', `/api/espacos/pessoas/${ids.lia}/acompanhamento`);
    expect(ac.json.sessoes[0]).toMatchObject({ id: 'sess_lia_000001', doneSets: 1 });
    const s = await as('rafa', '/api/espacos/sessoes/sess_lia_000001');
    expect(s.json.sessao.sets).toHaveLength(1);
    expect(s.json.sessao.content.exercises).toHaveLength(2);
    expect((await as('tito', '/api/espacos/sessoes/sess_lia_000001')).status).toBe(404);
    expect((await as('clara', '/api/espacos/sessoes/sess_lia_000001')).status).toBe(403);
  });
  it('treinos próprios da pessoa não aparecem para o Personal', async () => {
    await as('lia', '/api/treino/sessoes', { method: 'POST', body: { id: 'sess_lia_propria01', name: 'Corrida', content: { exercises: [{ id: 'c', name: 'Correr', sets: 1 }] } } });
    await as('lia', '/api/treino/sessoes/sess_lia_propria01/finalizar', { method: 'POST' });
    expect((await as('rafa', '/api/espacos/sessoes/sess_lia_propria01')).status).toBe(404);
    const ac = await as('rafa', `/api/espacos/pessoas/${ids.lia}/acompanhamento`);
    expect(ac.json.sessoes.map((x: any) => x.id)).not.toContain('sess_lia_propria01');
  });
  it('visão geral: sem treino atribuído e registros novos; marcar como visto zera os novos', async () => {
    const v = (await as('rafa', '/api/espacos/visao')).json;
    expect(v.blocos.find((b: any) => b.key === 'sem_atribuicao').items.map((i: any) => i.name)).toEqual(['dani']);
    expect(v.blocos.find((b: any) => b.key === 'registros_novos').items[0]).toMatchObject({ name: 'lia', sessionId: 'sess_lia_000001' });
    await as('rafa', '/api/espacos/visao/visto', { method: 'POST' });
    expect((await as('rafa', '/api/espacos/visao')).json.blocos.find((b: any) => b.key === 'registros_novos').items).toEqual([]);
  });
});

describe('Saídas', () => {
  it('sair da turma encerra o que veio da turma (fica só leitura) e não deixa treinar por ele', async () => {
    const m = (await as('lia', '/api/espacos/meus')).json.espacos[0].turmas[0];
    await as('lia', `/api/espacos/meus/turmas/${m.memberId}`, { method: 'DELETE' });
    const a = (await as('lia', '/api/treino/atribuidos')).json.atribuidos[0];
    expect(a).toMatchObject({ status: 'encerrada', canEdit: false });
    expect((await as('lia', '/api/treino/sessoes', { method: 'POST', body: { id: 'sess_lia_000009', assignmentId: a.id } })).status).toBe(404);
  });
  it('encerrar o vínculo: o Personal perde o acesso; a pessoa mantém as fichas encerradas', async () => {
    await as('rafa', `/api/espacos/pessoas/${ids.gabi}`, { method: 'DELETE' });
    expect((await as('rafa', `/api/espacos/pessoas/${ids.gabi}/acompanhamento`)).status).toBe(404);
    expect((await as('gabi', '/api/treino/atribuidos')).json.atribuidos[0].status).toBe('encerrada');
  });
  it('Personal suspenso perde o acesso no próximo pedido', async () => {
    await as('adm', '/api/admin/profissionais/usr_rafa', { method: 'PUT', body: { status: 'suspenso' } });
    expect((await as('rafa', '/api/espacos/fichas')).status).toBe(403);
    expect((await as('rafa', '/api/espacos/visao')).status).toBe(403);
    await as('adm', '/api/admin/profissionais/usr_rafa', { method: 'PUT', body: { status: 'ativo' } });
  });
});
