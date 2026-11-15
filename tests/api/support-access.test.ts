// @vitest-environment node
/** Admin sem acesso aos dados de outras contas + acesso de suporte consentido e temporário. */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let ana = ''; let bob = ''; let adm = '';
let ticketAna = ''; let ticketBob = '';

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_ana', username: 'ana', email: 'ana@exemplo.com', password: 'Ana#Senha-forte1' });
  await insertUser(env, { id: 'usr_bob', username: 'bob', email: 'bob@exemplo.com', password: 'Bob#Senha-forte1' });
  await insertUser(env, { id: 'usr_adm', username: 'chefe', email: 'chefe@exemplo.com', password: 'Chefe#Senha-forte1', role: 'admin' });
  ana = await login(env, 'ana', 'Ana#Senha-forte1'); bob = await login(env, 'bob', 'Bob#Senha-forte1'); adm = await login(env, 'chefe', 'Chefe#Senha-forte1');
  await env.DB.prepare("INSERT INTO habits (id, user_id, title, category, icon_name, created_at) VALUES ('h1','usr_ana','Meditar','Saúde','Sparkles','t')").run();
  await env.DB.prepare(`UPDATE users SET post_its = '[{"id":"n1","title":"Segredo","content":"nota privada"}]' WHERE id = 'usr_ana'`).run();
  ticketAna = (await call(env, '/api/support/tickets', { method: 'POST', token: ana, body: { subject: 'Hábito sumiu', message: 'Meu hábito não aparece' } })).json.ticket.id;
  ticketBob = (await call(env, '/api/support/tickets', { method: 'POST', token: bob, body: { subject: 'Dúvida', message: 'x' } })).json.ticket.id;
});

describe('admin não lê nem altera dados de outra conta', () => {
  it('leitura e escrita em /api/user/:id de outra pessoa: 403, inclusive para admin', async () => {
    expect((await call(env, '/api/user/usr_ana/data', { token: adm })).status).toBe(403);
    expect((await call(env, '/api/user/usr_ana/sync', { method: 'PUT', token: adm, body: { habits: [] } })).status).toBe(403);
    expect((await call(env, '/api/user/usr_ana/data', { token: bob })).status).toBe(403);
    expect((await call(env, '/api/user/usr_ana/data', { token: ana })).status).toBe(200); // o dono continua acessando
    expect((await call(env, '/api/user/usr_adm/data', { token: adm })).status).toBe(200); // o admin vê os próprios dados
  });

  it('as rotas de gestão do Portal admin continuam funcionando', async () => {
    for (const p of ['/api/admin/users', '/api/admin/tickets', '/api/admin/logs', '/api/admin/waitlist']) {
      expect((await call(env, p, { token: adm })).status, p).toBe(200);
    }
    expect((await call(env, '/api/admin/users', { token: ana })).status).toBe(403);
  });
});

describe('acesso de suporte consentido', () => {
  let grantId = '';

  it('cliente libera por chamado próprio, com áreas e duração válidas', async () => {
    expect((await call(env, '/api/support-access', { method: 'POST', body: { ticketId: ticketAna, scopes: ['habitos'], hours: 24 } })).status).toBe(401);
    expect((await call(env, '/api/support-access', { method: 'POST', token: ana, body: { ticketId: ticketBob, scopes: ['habitos'], hours: 24 } })).status).toBe(404);
    expect((await call(env, '/api/support-access', { method: 'POST', token: ana, body: { ticketId: ticketAna, scopes: ['email'], hours: 24 } })).status).toBe(400);
    expect((await call(env, '/api/support-access', { method: 'POST', token: ana, body: { ticketId: ticketAna, scopes: ['habitos'], hours: 999 } })).status).toBe(400);
    const r = await call(env, '/api/support-access', { method: 'POST', token: ana, body: { ticketId: ticketAna, scopes: ['habitos'], hours: 24 } });
    expect(r.status).toBe(201); grantId = r.json.grant.id;
  });

  it('admin vê só a área liberada, sem e-mail nem notas; cada visualização fica registrada para o cliente', async () => {
    expect((await call(env, `/api/admin/support-access/${grantId}/data`, { token: ana })).status).toBe(403); // cliente não usa a rota de admin
    const v = await call(env, `/api/admin/support-access/${grantId}/data`, { token: adm });
    expect(v.status).toBe(200);
    expect(v.json.data.habitos.map((h: any) => h.title)).toEqual(['Meditar']);
    expect(v.json.data.notas).toBeUndefined();
    expect(JSON.stringify(v.json)).not.toMatch(/ana@exemplo\.com|nota privada|pbkdf2/);
    const mine = await call(env, '/api/support-access', { token: ana });
    expect(mine.json.grants[0]).toMatchObject({ id: grantId, active: true, view_count: 1 });
    expect(mine.json.grants[0].last_viewed_at).toBeTruthy();
    expect((await call(env, '/api/support-access', { token: bob })).json.grants).toEqual([]); // outra pessoa não vê
  });

  it('outra pessoa não revoga; o dono revoga e o admin perde o acesso na hora', async () => {
    expect((await call(env, `/api/support-access/${grantId}`, { method: 'DELETE', token: bob })).status).toBe(404);
    expect((await call(env, `/api/support-access/${grantId}`, { method: 'DELETE', token: ana })).status).toBe(200);
    const v = await call(env, `/api/admin/support-access/${grantId}/data`, { token: adm });
    expect(v.status).toBe(403); expect(v.json.error).toMatch(/revogado/);
  });

  it('acesso vencido também é recusado', async () => {
    const r = await call(env, '/api/support-access', { method: 'POST', token: ana, body: { ticketId: ticketAna, scopes: ['notas'], hours: 1 } });
    await env.DB.prepare("UPDATE support_access_grants SET expires_at = '2000-01-01T00:00:00Z' WHERE id = ?").bind(r.json.grant.id).run();
    expect((await call(env, `/api/admin/support-access/${r.json.grant.id}/data`, { token: adm })).status).toBe(403);
  });

  it('excluir a conta apaga os acessos liberados', async () => {
    await call(env, '/api/support-access', { method: 'POST', token: bob, body: { ticketId: ticketBob, scopes: ['agenda'], hours: 24 } });
    expect((await call(env, '/api/account', { method: 'DELETE', token: bob, body: { username: 'bob', password: 'Bob#Senha-forte1' } })).json.success).toBe(true);
    expect(await env.DB.prepare("SELECT 1 FROM support_access_grants WHERE user_id = 'usr_bob'").first()).toBeNull();
  });
});
