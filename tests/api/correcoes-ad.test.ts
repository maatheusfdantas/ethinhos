// @vitest-environment node
/**
 * Correções A–D (20/11/2026), no servidor:
 * A: água por dia (water_date). C: validação dos campos. D: admin fora de amizades.
 * (B é de tela: ver src/__tests__/correcoes.test.jsx.)
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const T: Record<string, string> = {};
const one = async (sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first()) as any;

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['ana', 'beto']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_chefe', username: 'chefe', email: 'chefe@exemplo.com', password: 'Chefe#Senha-forte1', role: 'admin' });
});

describe('A: água por dia', () => {
  it('a água gravada leva o dia, e a leitura devolve o dia', async () => {
    await call(env, '/api/user/usr_ana/health', { method: 'POST', token: T.ana, body: { waterGlasses: 4, waterDate: '2026-11-17' } });
    const d = await call(env, '/api/user/usr_ana/data', { token: T.ana });
    expect(d.json.health).toMatchObject({ waterGlasses: 4, waterDate: '2026-11-17' });
  });
  it('sincronizar 0 copo num dia novo não muda o dia salvo (o app trata como "não é de hoje")', async () => {
    await call(env, '/api/user/usr_ana/sync', { method: 'PUT', token: T.ana, body: { health: { waterGlasses: 0, waterDate: '2026-11-20' } } });
    expect(await one("SELECT water_glasses, water_date FROM health WHERE user_id = 'usr_ana'")).toMatchObject({ water_glasses: 4, water_date: '2026-11-17' });
  });
  it('o primeiro copo do dia novo grava o valor e o dia novo', async () => {
    await call(env, '/api/user/usr_ana/sync', { method: 'PUT', token: T.ana, body: { health: { waterGlasses: 1, waterDate: '2026-11-20' } } });
    expect(await one("SELECT water_glasses, water_date FROM health WHERE user_id = 'usr_ana'")).toMatchObject({ water_glasses: 1, water_date: '2026-11-20' });
  });
  it('data inválida não é gravada', async () => {
    await call(env, '/api/user/usr_ana/health', { method: 'POST', token: T.ana, body: { waterGlasses: 2, waterDate: "2026-11-20'; DROP" } });
    expect((await one("SELECT water_date FROM health WHERE user_id = 'usr_ana'")).water_date).toBe('2026-11-20');
  });
});

describe('C: validação no servidor', () => {
  it('cadastro: nome com números ou símbolos e e-mail com espaço são recusados', async () => {
    const base = { username: 'novaconta', password: 'Nova#Senha-forte1' };
    const r1 = await call(env, '/api/auth/register', { method: 'POST', body: { ...base, name: 'Ana123', email: 'nova@exemplo.com' } });
    expect(r1.status).toBe(400); expect(r1.json.field).toBe('name');
    const r2 = await call(env, '/api/auth/register', { method: 'POST', body: { ...base, name: 'Ana Clara', email: 'nova @exemplo.com' } });
    expect(r2.status).toBe(400); expect(r2.json.field).toBe('email');
  });
  it('perfil: nome com número recusado; bio sem HTML', async () => {
    expect((await call(env, '/api/user/usr_ana/profile', { method: 'PUT', token: T.ana, body: { name: 'An4' } })).status).toBe(400);
    await call(env, '/api/user/usr_ana/profile', { method: 'PUT', token: T.ana, body: { bio: '<b>Oi</b>   tudo   bem<script>x</script>' } });
    // <script> sai com o conteúdo; as outras tags saem e o texto fica.
    expect((await one("SELECT bio FROM users WHERE id = 'usr_ana'")).bio).toBe('Oi tudo bem');
    expect((await call(env, "/api/user/usr_ana/profile", { method: 'PUT', token: T.ana, body: { name: "Ana D'Ávila" } })).status).toBe(200);
  });
  it('hábito e evento: título obrigatório, data e horário reais', async () => {
    expect((await call(env, '/api/user/usr_ana/habit', { method: 'POST', token: T.ana, body: { title: '   ' } })).status).toBe(400);
    expect((await call(env, '/api/user/usr_ana/habit', { method: 'POST', token: T.ana, body: { title: 'Ler', target: -3 } })).status).toBe(400);
    const ok = await call(env, '/api/user/usr_ana/habit', { method: 'POST', token: T.ana, body: { title: '<img src=x onerror=1>Ler  10   páginas' } });
    expect((await one('SELECT title FROM habits WHERE id = ?', ok.json.id)).title).toBe('Ler 10 páginas');
    expect((await call(env, '/api/user/usr_ana/event', { method: 'POST', token: T.ana, body: { title: 'Prova', date: '2026-02-30' } })).status).toBe(400);
    expect((await call(env, '/api/user/usr_ana/event', { method: 'POST', token: T.ana, body: { title: 'Prova', date: '2026-11-25', startTime: '25:00' } })).status).toBe(400);
  });
  it('sincronização: item inválido não é gravado e volta em "invalid"', async () => {
    const r = await call(env, '/api/user/usr_ana/sync', { method: 'PUT', token: T.ana, body: { events: [{ id: 'ev_bad', title: 'X', date: '2026-13-01' }, { id: 'ev_ok', title: 'Y', date: '2026-11-21' }] } });
    expect(r.json.invalid.events).toEqual(['ev_bad']);
    expect(await one("SELECT COUNT(*) AS n FROM events WHERE id IN ('ev_bad','ev_ok')")).toMatchObject({ n: 1 });
  });
  it('saúde: limites de água e horário', async () => {
    expect((await call(env, '/api/user/usr_ana/health', { method: 'POST', token: T.ana, body: { waterGlasses: 999 } })).status).toBe(400);
    expect((await call(env, '/api/user/usr_ana/health', { method: 'POST', token: T.ana, body: { sleep: { bedTime: '99:99' } } })).status).toBe(400);
  });
  it('lista de espera: telefone só com números, guardado só com dígitos', async () => {
    expect((await call(env, '/api/waitlist', { method: 'POST', body: { name: 'Lia Moreira', email: 'lia@exemplo.com', phone: 'abc' } })).status).toBe(400);
    const r = await call(env, '/api/waitlist', { method: 'POST', body: { name: 'Lia Moreira', email: 'lia@exemplo.com', phone: '(11) 98765-4321' } });
    expect(r.status).toBe(201);
    expect((await one("SELECT phone FROM waitlist WHERE email = 'lia@exemplo.com'")).phone).toBe('11987654321');
  });
});

describe('D: admin fora de amizades (regra no servidor)', () => {
  it('a busca e as sugestões não trazem o admin', async () => {
    const busca = await call(env, '/api/community/users?q=chefe', { token: T.ana });
    expect(busca.json.users.map((u: any) => u.username)).not.toContain('chefe');
    const sug = await call(env, '/api/community/users', { token: T.ana });
    expect(sug.json.users.map((u: any) => u.username)).toContain('beto');
    expect(sug.json.users.map((u: any) => u.username)).not.toContain('chefe');
  });
  it('pedido direto ao admin, por @ ou id, responde como inexistente', async () => {
    expect((await call(env, '/api/user/usr_ana/connect', { method: 'POST', token: T.ana, body: { targetUsername: 'chefe' } })).status).toBe(404);
    expect((await call(env, '/api/user/usr_ana/connect', { method: 'POST', token: T.ana, body: { targetUserId: 'usr_chefe' } })).status).toBe(404);
    expect(await one("SELECT COUNT(*) AS n FROM friends WHERE friend_id = 'usr_chefe'")).toMatchObject({ n: 0 });
  });
  it('conexão antiga com o admin some da lista, sem apagar a linha', async () => {
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO friends (id, user_id, friend_id, friend_name, friend_username, status, created_at, updated_at) VALUES ('fr_old', 'usr_ana', 'usr_chefe', 'Chefe', 'chefe', 'approved', ?, ?)").bind(now, now).run();
    const r = await call(env, '/api/user/usr_ana/connections', { token: T.ana });
    expect(JSON.stringify(r.json)).not.toMatch(/usr_chefe/);
    expect(await one("SELECT COUNT(*) AS n FROM friends WHERE id = 'fr_old'")).toMatchObject({ n: 1 });
  });
});
