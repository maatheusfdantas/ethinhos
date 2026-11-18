// @vitest-environment node
/**
 * Espaços profissionais, lotes A e B: perfil profissional, turmas, convites e vínculos.
 * Cada teste confere uma regra da matriz de permissões (docs/10, seção 5).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const T: Record<string, string> = {};
let ip = 1;
const nextIp = () => `198.18.0.${ip++}`;
const as = (who: string, path: string, opts: { method?: string; body?: unknown; ip?: string } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': opts.ip || '198.18.1.1' } });
const count = async (sql: string, ...a: unknown[]) => Number(((await env.DB.prepare(sql).bind(...a).first()) as any)?.n ?? 0);
let turmaId = '';
let turmaCode = '';

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['rafa', 'clara', 'lia', 'bruno', 'caio', 'dani']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
});

describe('Admin: modo profissional', () => {
  it('só o admin ativa; usuário comum recebe 403', async () => {
    expect((await as('lia', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_lia', model: 'personal', spaceName: 'X' } })).status).toBe(403);
  });
  it('busca a conta por @ e ativa como Personal; não ativa duas vezes', async () => {
    const b = await as('adm', '/api/admin/profissionais/busca?q=@rafa');
    expect(b.json.conta).toMatchObject({ id: 'usr_rafa', pro: null });
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_rafa', model: 'personal', spaceName: 'Studio Pulso' } })).status).toBe(201);
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_rafa', model: 'nutri', spaceName: 'Outro' } })).status).toBe(409);
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_clara', model: 'medico', spaceName: 'X' } })).status).toBe(400);
    await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_clara', model: 'nutri', spaceName: 'Clara Nutrição' } });
    const list = await as('adm', '/api/admin/profissionais');
    expect(list.json.profissionais.map((p: any) => p.spaceName).sort()).toEqual(['Clara Nutrição', 'Studio Pulso']);
    expect(list.json.historico.some((h: any) => h.type === 'PRO_ACTIVATED')).toBe(true);
  });
  it('um campo de papel enviado pelo navegador não dá acesso a nada', async () => {
    const r = await as('lia', '/api/espacos/turmas', { method: 'POST', body: { name: 'Hack', role: 'professional', model: 'personal' } });
    expect(r.status).toBe(403);
    expect((await as('lia', '/api/espacos/meu')).json.pro).toBeNull();
  });
});

describe('Profissional: turmas e convites', () => {
  it('cria turma e gera código de 24 h (o banco guarda só o hash)', async () => {
    const t = await as('rafa', '/api/espacos/turmas', { method: 'POST', body: { name: 'Força iniciantes', description: 'Ter e Qui' } });
    turmaId = t.json.turma.id;
    const c = await as('rafa', `/api/espacos/turmas/${turmaId}/convite`, { method: 'POST' });
    turmaCode = c.json.code;
    expect(turmaCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(Date.parse(c.json.expiresAt) - Date.now()).toBeGreaterThan(23.9 * 3600e3);
    const raw = JSON.stringify(await env.DB.prepare('SELECT * FROM space_invites').all());
    expect(raw).not.toContain(turmaCode.replace('-', ''));
    expect(raw).not.toContain(turmaCode);
  });
  it('outro profissional não mexe na turma do Rafa', async () => {
    expect((await as('clara', `/api/espacos/turmas/${turmaId}`)).status).toBe(404);
    expect((await as('clara', `/api/espacos/turmas/${turmaId}/convite`, { method: 'POST' })).status).toBe(404);
  });
});

describe('Pessoa: entrar com código', () => {
  it('prévia mostra espaço, profissional e turma, nunca participantes', async () => {
    const p = await as('lia', '/api/espacos/convites/previa', { method: 'POST', body: { code: turmaCode.toLowerCase() } });
    expect(p.status).toBe(200);
    expect(p.json.convite).toMatchObject({ spaceName: 'Studio Pulso', modelLabel: 'Personal', groupName: 'Força iniciantes', kind: 'turma', already: false });
    expect(JSON.stringify(p.json)).not.toMatch(/bruno|caio|usr_/);
    expect(await count('SELECT COUNT(*) AS n FROM space_links')).toBe(0);
  });
  it('aceitar exige maioridade e cria vínculo + participação', async () => {
    expect((await as('lia', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode } })).status).toBe(400);
    expect((await as('lia', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode, adult: true } })).status).toBe(201);
    const again = await as('lia', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode, adult: true } });
    expect(again.json.already).toBe(true);
    expect(await count("SELECT COUNT(*) AS n FROM space_links WHERE client_id = 'usr_lia' AND status = 'ativo'")).toBe(1);
    const mine = await as('lia', '/api/espacos/meus');
    expect(mine.json.espacos[0]).toMatchObject({ spaceName: 'Studio Pulso', proName: 'rafa' });
    expect(mine.json.espacos[0].turmas[0].name).toBe('Força iniciantes');
  });
  it('o código de turma serve para várias pessoas; o profissional não entra no próprio espaço', async () => {
    expect((await as('bruno', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode, adult: true } })).status).toBe(201);
    expect((await as('rafa', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode, adult: true } })).status).toBe(409);
  });
  it('o profissional vê só quem tem vínculo com ele; a pessoa não vê colegas', async () => {
    const t = await as('rafa', `/api/espacos/turmas/${turmaId}`);
    expect(t.json.membros.map((m: any) => m.username).sort()).toEqual(['bruno', 'lia']);
    expect((await as('lia', `/api/espacos/turmas/${turmaId}`)).status).toBe(403);
    expect((await as('lia', '/api/espacos/pessoas')).status).toBe(403);
    expect((await as('clara', '/api/espacos/pessoas')).json.pessoas).toEqual([]);
  });
  it('código errado: mensagem única; muitas tentativas por IP bloqueiam', async () => {
    const r = await as('caio', '/api/espacos/convites/previa', { method: 'POST', body: { code: 'ZZZZ-ZZZZ' }, ip: '198.18.9.9' });
    expect(r.status).toBe(404);
    expect(r.json.error).toMatch(/não vale mais ou não existe/);
    for (let i = 0; i < 10; i++) await as('caio', '/api/espacos/convites/previa', { method: 'POST', body: { code: `ZZZZ-ZZ${i}Z` }, ip: '198.18.9.9' });
    expect((await as('caio', '/api/espacos/convites/previa', { method: 'POST', body: { code: turmaCode }, ip: '198.18.9.9' })).status).toBe(429);
  });
  it('convite individual vale uma vez só', async () => {
    const c = await as('clara', '/api/espacos/convite-individual', { method: 'POST' });
    expect((await as('caio', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: c.json.code, adult: true }, ip: nextIp() })).status).toBe(201);
    expect((await as('dani', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: c.json.code, adult: true }, ip: nextIp() })).status).toBe(404);
  });
  it('revogar e vencer o código impedem novas entradas; quem entrou continua', async () => {
    const meu = await as('rafa', '/api/espacos/meu');
    const g = meu.json.turmas.find((x: any) => x.id === turmaId);
    expect(g.members).toBe(2);
    expect((await as('rafa', `/api/espacos/convites/${g.inviteId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await as('dani', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: turmaCode, adult: true }, ip: nextIp() })).status).toBe(404);
    const c2 = await as('rafa', `/api/espacos/turmas/${turmaId}/convite`, { method: 'POST' });
    await env.DB.prepare("UPDATE space_invites SET expires_at = '2000-01-01T00:00:00.000Z' WHERE revoked_at IS NULL").run();
    expect((await as('dani', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: c2.json.code, adult: true }, ip: nextIp() })).status).toBe(404);
    expect(await count("SELECT COUNT(*) AS n FROM group_members WHERE group_id = ? AND status = 'ativa'", turmaId)).toBe(2);
  });
});

describe('Saídas e suspensão', () => {
  it('sair da turma mantém o vínculo; encerrar o vínculo encerra as turmas', async () => {
    const mine = (await as('bruno', '/api/espacos/meus')).json.espacos[0];
    expect((await as('bruno', `/api/espacos/meus/turmas/${mine.turmas[0].memberId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await as('bruno', '/api/espacos/meus')).json.espacos[0].turmas).toEqual([]);
    const lia = (await as('lia', '/api/espacos/meus')).json.espacos[0];
    expect((await as('lia', `/api/espacos/meus/${lia.linkId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await as('lia', '/api/espacos/meus')).json.espacos).toEqual([]);
    expect(await count("SELECT COUNT(*) AS n FROM group_members WHERE client_id = 'usr_lia' AND status = 'ativa'")).toBe(0);
  });
  it('a pessoa não encerra vínculo de outra', async () => {
    const caio = (await as('caio', '/api/espacos/meus')).json.espacos[0];
    expect((await as('dani', `/api/espacos/meus/${caio.linkId}`, { method: 'DELETE' })).status).toBe(404);
  });
  it('profissional suspenso perde o acesso no próximo pedido', async () => {
    await as('adm', '/api/admin/profissionais/usr_clara', { method: 'PUT', body: { status: 'suspenso' } });
    expect((await as('clara', '/api/espacos/pessoas')).status).toBe(403);
    expect((await as('clara', '/api/espacos/meu')).json.pro.status).toBe('suspenso');
    await as('adm', '/api/admin/profissionais/usr_clara', { method: 'PUT', body: { status: 'ativo' } });
    expect((await as('clara', '/api/espacos/pessoas')).status).toBe(200);
  });
  it('trocar o modelo não apaga nada', async () => {
    const before = await count('SELECT COUNT(*) AS n FROM space_groups');
    await as('adm', '/api/admin/profissionais/usr_rafa', { method: 'PUT', body: { model: 'clinica' } });
    expect((await as('rafa', '/api/espacos/meu')).json.pro.modelLabel).toBe('Organização Clínica');
    expect(await count('SELECT COUNT(*) AS n FROM space_groups')).toBe(before);
  });
  it('excluir a conta do profissional apaga o espaço; a da pessoa, os vínculos', async () => {
    const r = await call(env, '/api/account', { method: 'DELETE', token: T.caio, body: { username: 'caio', password: 'caio#Senha-forte1' } });
    expect(r.status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM space_links WHERE client_id = 'usr_caio'")).toBe(0);
    await call(env, '/api/account', { method: 'DELETE', token: T.clara, body: { username: 'clara', password: 'clara#Senha-forte1' } });
    expect(await count("SELECT COUNT(*) AS n FROM spaces WHERE owner_user_id = 'usr_clara'")).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM pro_profiles WHERE user_id = 'usr_clara'")).toBe(0);
  });
});
