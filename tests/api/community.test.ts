// @vitest-environment node
/** Comunidade e Conexões (amigos, busca e solicitações de conexão). */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let ana = '';
let bob = '';
let _adm = '';

const asUser = (token: string, path: string, init: { method?: string; body?: unknown } = {}) =>
  call(env, path, { token, ...init });

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, {
    id: 'usr_ana',
    username: 'ana',
    email: 'ana@exemplo.com',
    password: 'Ana#Senha-forte1'
  });
  await env.DB.prepare("UPDATE users SET name = 'Ana Souza', streak_days = 12, points = 340 WHERE id = 'usr_ana'").run();

  await insertUser(env, {
    id: 'usr_bob',
    username: 'bob',
    email: 'bob@exemplo.com',
    password: 'Bob#Senha-forte1'
  });
  await env.DB.prepare("UPDATE users SET name = 'Roberto Bob', streak_days = 5, points = 120 WHERE id = 'usr_bob'").run();

  await insertUser(env, {
    id: 'usr_carlos_privado',
    username: 'carlos',
    email: 'carlos@exemplo.com',
    password: 'Carlos#Senha-forte1'
  });
  await env.DB.prepare("UPDATE users SET is_public = 0 WHERE id = 'usr_carlos_privado'").run();

  await insertUser(env, {
    id: 'usr_adm',
    username: 'chefe',
    email: 'chefe@exemplo.com',
    password: 'Chefe#Senha-forte1',
    role: 'admin'
  });
  await env.DB.prepare("UPDATE users SET name = 'Chefe Geral' WHERE id = 'usr_adm'").run();

  ana = await login(env, 'ana', 'Ana#Senha-forte1');
  bob = await login(env, 'bob', 'Bob#Senha-forte1');
  _adm = await login(env, 'chefe', 'Chefe#Senha-forte1');
});

describe('GET /api/community/users (busca e listagem na rede)', () => {
  it('exige autenticação JWT', async () => {
    const res = await call(env, '/api/community/users');
    expect(res.status).toBe(401);
  });

  it('lista usuários públicos excluindo o próprio usuário requisitante', async () => {
    const res = await asUser(ana, '/api/community/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.users)).toBe(true);

    const usernames = res.json.users.map((u: { username: string }) => u.username);
    expect(usernames).toContain('bob');
    expect(usernames).not.toContain('ana'); // Não lista a si própria
    expect(usernames).not.toContain('carlos'); // Não lista perfil privado (is_public = 0)
  });

  it('busca usuários por nome ou @username (com ou sem arroba)', async () => {
    const byHandleWithAt = await asUser(ana, '/api/community/users?q=@bob');
    expect(byHandleWithAt.status).toBe(200);
    expect(byHandleWithAt.json.users.length).toBe(1);
    expect(byHandleWithAt.json.users[0].username).toBe('bob');
    expect(byHandleWithAt.json.users[0].status).toBe('none');

    const byName = await asUser(ana, '/api/community/users?q=Roberto');
    expect(byName.status).toBe(200);
    expect(byName.json.users.length).toBe(1);
    expect(byName.json.users[0].id).toBe('usr_bob');
  });
});

describe('Fluxo de conexões e amizades', () => {
  it('protege contra IDOR em /api/user/:id/connections e /connect', async () => {
    // Ana tentando ler conexões de Bob
    const idorRead = await asUser(ana, '/api/user/usr_bob/connections');
    expect(idorRead.status).toBe(403);

    // Ana tentando enviar convite fingindo ser Bob
    const idorConnect = await asUser(ana, '/api/user/usr_bob/connect', {
      method: 'POST',
      body: { targetUserId: 'usr_adm' }
    });
    expect(idorConnect.status).toBe(403);
  });

  it('impede auto-conexão e usuário inexistente', async () => {
    const selfConnect = await asUser(ana, '/api/user/usr_ana/connect', {
      method: 'POST',
      body: { targetUserId: 'usr_ana' }
    });
    expect(selfConnect.status).toBe(400);

    const notFound = await asUser(ana, '/api/user/usr_ana/connect', {
      method: 'POST',
      body: { targetUsername: '@nao_existe_xyz_123' }
    });
    expect(notFound.status).toBe(404);
  });

  it('envia solicitação de conexão e reflete em pending_sent e pending_received', async () => {
    const req = await asUser(ana, '/api/user/usr_ana/connect', {
      method: 'POST',
      body: { targetUserId: 'usr_bob' }
    });
    expect(req.status).toBe(200);
    expect(req.json.status).toBe('pending_sent');

    // Ana vê Bob com status pending_sent na comunidade e em conexões
    const anaUsers = await asUser(ana, '/api/community/users?q=bob');
    expect(anaUsers.json.users[0].status).toBe('pending_sent');

    const anaConns = await asUser(ana, '/api/user/usr_ana/connections');
    expect(anaConns.status).toBe(200);
    expect(anaConns.json.connections.length).toBe(1);
    expect(anaConns.json.connections[0].friend_id).toBe('usr_bob');
    expect(anaConns.json.connections[0].status).toBe('pending_sent');

    // Bob vê solicitação recebida (pending_received)
    const bobConns = await asUser(bob, '/api/user/usr_bob/connections');
    expect(bobConns.status).toBe(200);
    expect(bobConns.json.connections.length).toBe(1);
    expect(bobConns.json.connections[0].friend_id).toBe('usr_ana');
    expect(bobConns.json.connections[0].status).toBe('pending_received');
  });

  it('aceita solicitação de conexão (muda para approved em ambas as pontas)', async () => {
    // Bob aceita o pedido de Ana
    const accept = await asUser(bob, '/api/user/usr_bob/connect/usr_ana/accept', {
      method: 'PUT'
    });
    expect(accept.status).toBe(200);
    expect(accept.json.success).toBe(true);

    // Ambas as pontas agora estão approved
    const anaConns = await asUser(ana, '/api/user/usr_ana/connections');
    expect(anaConns.json.connections[0].status).toBe('approved');

    const bobConns = await asUser(bob, '/api/user/usr_bob/connections');
    expect(bobConns.json.connections[0].status).toBe('approved');

    // Comunidade reflete status approved
    const anaSearch = await asUser(ana, '/api/community/users?q=bob');
    expect(anaSearch.json.users[0].status).toBe('approved');
  });

  it('remove / desconecta amizade (DELETE)', async () => {
    const del = await asUser(ana, '/api/user/usr_ana/connect/usr_bob', {
      method: 'DELETE'
    });
    expect(del.status).toBe(200);
    expect(del.json.success).toBe(true);

    const anaConns = await asUser(ana, '/api/user/usr_ana/connections');
    expect(anaConns.json.connections.length).toBe(0);

    const bobConns = await asUser(bob, '/api/user/usr_bob/connections');
    expect(bobConns.json.connections.length).toBe(0);

    const anaSearch = await asUser(ana, '/api/community/users?q=bob');
    expect(anaSearch.json.users[0].status).toBe('none');
  });

  it('conecta usando @username e auto-aprova se ambos enviarem', async () => {
    // Bob envia para @ana
    const req1 = await asUser(bob, '/api/user/usr_bob/connect', {
      method: 'POST',
      body: { targetUsername: '@ana' }
    });
    expect(req1.status).toBe(200);
    expect(req1.json.status).toBe('pending_sent');

    // Ana envia de volta para @bob -> auto-aprova
    const req2 = await asUser(ana, '/api/user/usr_ana/connect', {
      method: 'POST',
      body: { targetUsername: 'bob' }
    });
    expect(req2.status).toBe(200);
    expect(req2.json.status).toBe('approved');

    const anaConns = await asUser(ana, '/api/user/usr_ana/connections');
    expect(anaConns.json.connections[0].status).toBe('approved');
  });

  it('responde 200 em /api/user/:id/feed', async () => {
    const feedRes = await asUser(ana, '/api/user/usr_ana/feed');
    expect(feedRes.status).toBe(200);
    expect(Array.isArray(feedRes.json.feed)).toBe(true);
  });
});
