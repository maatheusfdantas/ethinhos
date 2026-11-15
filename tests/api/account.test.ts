// @vitest-environment node
/** Conta: saúde privada, exportação e exclusão. */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let ana = ''; let bob = ''; let adm = ''; let oauthTok = '';
const asUser = (token: string, path: string, init: { method?: string; body?: unknown } = {}) => call(env, path, { token, ...init });

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_ana', username: 'ana', email: 'ana@exemplo.com', password: 'Ana#Senha-forte1' });
  await insertUser(env, { id: 'usr_bob', username: 'bob', email: 'bob@exemplo.com', password: 'Bob#Senha-forte1' });
  await insertUser(env, { id: 'usr_adm', username: 'chefe', email: 'chefe@exemplo.com', password: 'Chefe#Senha-forte1', role: 'admin' });
  ana = await login(env, 'ana', 'Ana#Senha-forte1'); bob = await login(env, 'bob', 'Bob#Senha-forte1'); adm = await login(env, 'chefe', 'Chefe#Senha-forte1');
});

describe('saúde privada', () => {
  it('exige login e valida os campos', async () => {
    expect((await call(env, '/api/account/health')).status).toBe(401);
    for (const bad of [{ weight: 5 }, { height: 20 }, { goal: 'x' }, { activityLevel: 'x' }, { birthDate: '2999-01-01' }]) {
      expect((await asUser(ana, '/api/account/health', { method: 'PUT', body: bad })).status).toBe(400);
    }
  });

  it('salva, aceita altura em cm e cada pessoa só vê a própria; nem o admin lê a de outra pessoa', async () => {
    const ok = await asUser(ana, '/api/account/health', { method: 'PUT', body: { weight: 68.5, height: 172, goal: 'condicionamento', activityLevel: 'moderado', birthDate: '1995-04-02' } });
    expect(ok.status).toBe(200);
    expect((await asUser(ana, '/api/account/health')).json).toEqual({ weight: 68.5, height: 1.72, goal: 'condicionamento', activityLevel: 'moderado', birthDate: '1995-04-02' });
    expect((await asUser(bob, '/api/account/health')).json.goal).toBe('');
    expect((await asUser(adm, '/api/account/health')).json.goal).toBe(''); // admin vê a própria, não a da Ana
    // atualização parcial não apaga o resto
    await asUser(ana, '/api/account/health', { method: 'PUT', body: { goal: 'sono' } });
    expect((await asUser(ana, '/api/account/health')).json).toMatchObject({ goal: 'sono', activityLevel: 'moderado', weight: 68.5 });
  });
});

describe('exportar e excluir', () => {
  it('exportação traz só os dados da própria conta, sem senha', async () => {
    const r = await asUser(ana, '/api/account/export');
    expect(r.status).toBe(200);
    expect(r.json.profile.username).toBe('ana');
    expect(r.json.healthProfile.goal).toBe('sono');
    expect(JSON.stringify(r.json)).not.toMatch(/pbkdf2|password/i);
  });

  it('excluir exige o @ e a senha; admin não pode; conta de outra pessoa nunca é tocada', async () => {
    expect((await call(env, '/api/account', { method: 'DELETE' })).status).toBe(401);
    expect((await asUser(adm, '/api/account', { method: 'DELETE', body: { username: 'chefe', password: 'Chefe#Senha-forte1' } })).status).toBe(403);
    expect((await asUser(bob, '/api/account', { method: 'DELETE', body: { username: 'outro', password: 'Bob#Senha-forte1' } })).json.field).toBe('username');
    expect((await asUser(bob, '/api/account', { method: 'DELETE', body: { username: '@Bob', password: 'errada' } })).json.field).toBe('password');
    expect(await env.DB.prepare("SELECT 1 FROM users WHERE id='usr_bob'").first()).not.toBeNull();
  });

  it('excluir apaga a conta e os dados dela, e mais nada', async () => {
    await env.DB.prepare("INSERT INTO habits (id, user_id, title, category, icon_name, created_at) VALUES ('h1','usr_bob','x','Geral','Sparkles','t'), ('h2','usr_ana','y','Geral','Sparkles','t')").run();
    const del = await asUser(bob, '/api/account', { method: 'DELETE', body: { username: '@bob', password: 'Bob#Senha-forte1' } });
    expect(del.json.success).toBe(true);
    expect(await env.DB.prepare("SELECT 1 FROM users WHERE id='usr_bob'").first()).toBeNull();
    expect(await env.DB.prepare("SELECT 1 FROM habits WHERE user_id='usr_bob'").first()).toBeNull();
    expect(await env.DB.prepare("SELECT 1 FROM habits WHERE user_id='usr_ana'").first()).not.toBeNull();
    expect(await env.DB.prepare("SELECT 1 FROM users WHERE id='usr_ana'").first()).not.toBeNull();
  });

  it('conta de login social confirma só com o @ (não tem senha)', async () => {
    await env.DB.prepare("INSERT INTO users (id, username, email, password, name, avatar, role, is_active, subscription_tier, is_public, permissions, streak_days, points, email_verified, created_at) VALUES ('usr_g','gabi','g@gmail.com','OAUTH_FEDERATED_ACCOUNT','Gabi','GA','user',1,'Gratuito',1,'{}',0,0,1,'t')").run();
    const { signTestJwt, TEST_JWT_SECRET } = await import('../helpers/api');
    oauthTok = await signTestJwt({ sub: 'usr_g', username: 'gabi', role: 'user', exp: Math.floor(Date.now() / 1000) + 600 }, TEST_JWT_SECRET);
    expect((await asUser(oauthTok, '/api/account', { method: 'DELETE', body: { username: 'gabi' } })).json.success).toBe(true);
  });
});
