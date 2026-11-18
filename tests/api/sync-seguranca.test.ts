// @vitest-environment node
/**
 * Lotes 1 e 2 (auditoria 15/11/2026): sincronização e gravação de hábitos, eventos e categorias.
 * A1: a sincronização apagava tudo o que "não veio" na lista (aba velha apagava dados novos).
 * A2: o NOT IN usava 1 parâmetro por item (o D1 tem limite).
 * S4: ids escolhidos pelo navegador sobrescreviam itens de outra conta.
 * S5: tags: [] apagava todas as categorias.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
let A = '';
let B = '';
const habit = (id: string, title: string, extra: Record<string, unknown> = {}) => ({ id, title, category: 'Saúde', repeatDays: [1, 2, 3], ...extra });
const sync = (token: string, uid: string, body: unknown) => call(env, `/api/user/${uid}/sync`, { method: 'PUT', token, body });
const one = async (sql: string, ...args: unknown[]) => (await env.DB.prepare(sql).bind(...args).first()) as any;
const count = async (sql: string, ...args: unknown[]) => Number((await one(sql, ...args))?.n ?? 0);

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_a', username: 'contaa', email: 'a@exemplo.com', password: 'ContaA#Senha-forte1' });
  await insertUser(env, { id: 'usr_b', username: 'contab', email: 'b@exemplo.com', password: 'ContaB#Senha-forte1' });
  A = await login(env, 'contaa', 'ContaA#Senha-forte1');
  B = await login(env, 'contab', 'ContaB#Senha-forte1');
});

describe('Caracterização: o que a sincronização grava', () => {
  it('cria e atualiza hábitos, eventos e categorias da própria conta', async () => {
    const r = await sync(A, 'usr_a', {
      habits: [habit('hab_a1', 'Beber água'), habit('hab_a2', 'Ler'), habit('hab_a3', 'Correr')],
      events: [{ id: 'ev_a1', title: 'Dentista', date: '2026-11-20', startTime: '15:00' }],
      tags: [{ id: 'tag_a1', name: 'Saúde', color: '#A78BFA', subclasses: [{ id: 'sub_a1', name: 'Cardio' }] }]
    });
    expect(r.status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE user_id = 'usr_a'")).toBe(3);
    expect(await count("SELECT COUNT(*) AS n FROM events WHERE user_id = 'usr_a'")).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM subclasses WHERE category_id = 'tag_a1'")).toBe(1);
    await sync(A, 'usr_a', { habits: [habit('hab_a2', 'Ler 10 páginas', { completed: true })] });
    const h = await one("SELECT title, completed FROM habits WHERE id = 'hab_a2'");
    expect(h.title).toBe('Ler 10 páginas');
    expect(h.completed).toBe(1);
  });

  it('A1: lista parcial (aba velha) não apaga os outros itens', async () => {
    await sync(A, 'usr_a', { habits: [habit('hab_a1', 'Beber água')], events: [{ id: 'ev_a2', title: 'Novo', date: '2026-11-21' }] });
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE user_id = 'usr_a'")).toBe(3);
    expect(await count("SELECT COUNT(*) AS n FROM events WHERE user_id = 'usr_a'")).toBe(2);
  });

  it('S5: tags: [] não apaga as categorias', async () => {
    await sync(A, 'usr_a', { tags: [] });
    expect(await count("SELECT COUNT(*) AS n FROM categories WHERE user_id = 'usr_a'")).toBe(1);
    expect(await count("SELECT COUNT(*) AS n FROM subclasses WHERE category_id = 'tag_a1'")).toBe(1);
  });

  it('A2: 150 hábitos numa só sincronização', async () => {
    const many = Array.from({ length: 150 }, (_, i) => habit(`hab_lote_${i}`, `Hábito ${i}`));
    expect((await sync(A, 'usr_a', { habits: many })).status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE user_id = 'usr_a' AND id LIKE 'hab_lote_%'")).toBe(150);
  });

  it('excluir continua sendo pela ação explícita (DELETE)', async () => {
    expect((await call(env, '/api/user/usr_a/habit/hab_a3', { method: 'DELETE', token: A })).status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE id = 'hab_a3'")).toBe(0);
  });

  it('clearAllHabits continua apagando só quando pedido explicitamente', async () => {
    await insertUser(env, { id: 'usr_c', username: 'contac', email: 'c@exemplo.com', password: 'ContaC#Senha-forte1' });
    const C = await login(env, 'contac', 'ContaC#Senha-forte1');
    await sync(C, 'usr_c', { habits: [habit('hab_c1', 'X'), habit('hab_c2', 'Y')] });
    await sync(C, 'usr_c', { habits: [] });
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE user_id = 'usr_c'")).toBe(2);
    await sync(C, 'usr_c', { habits: [], clearAllHabits: true });
    expect(await count("SELECT COUNT(*) AS n FROM habits WHERE user_id = 'usr_c'")).toBe(0);
  });
});

describe('S4: um id de outra conta nunca é sobrescrito', () => {
  it('sincronização com o id do hábito de A não altera o hábito de A', async () => {
    const r = await sync(B, 'usr_b', { habits: [habit('hab_a1', 'Sequestrado')], events: [{ id: 'ev_a1', title: 'Sequestrado', date: '2026-01-01' }] });
    expect(r.status).toBe(200);
    expect(r.json.skipped.habits).toEqual(['hab_a1']);
    const h = await one("SELECT user_id, title FROM habits WHERE id = 'hab_a1'");
    expect(h).toMatchObject({ user_id: 'usr_a', title: 'Beber água' });
    expect((await one("SELECT user_id, title FROM events WHERE id = 'ev_a1'"))).toMatchObject({ user_id: 'usr_a', title: 'Dentista' });
  });

  it('criar hábito/evento com id de A gera um id novo para B', async () => {
    const r = await call(env, '/api/user/usr_b/habit', { method: 'POST', token: B, body: habit('hab_a2', 'Meu') });
    expect(r.json.id).not.toBe('hab_a2');
    expect((await one("SELECT user_id FROM habits WHERE id = 'hab_a2'")).user_id).toBe('usr_a');
    const e = await call(env, '/api/user/usr_b/event', { method: 'POST', token: B, body: { id: 'ev_a1', title: 'Meu', date: '2026-01-01' } });
    expect(e.json.id).not.toBe('ev_a1');
    expect((await one("SELECT title FROM events WHERE id = 'ev_a1'")).title).toBe('Dentista');
  });

  it('categoria de A: B não sincroniza, não cria por cima, não configura e não apaga', async () => {
    const s = await sync(B, 'usr_b', { tags: [{ id: 'tag_a1', name: 'Roubada', subclasses: [] }] });
    expect(s.json.skipped.tags).toEqual(['tag_a1']);
    const c = await call(env, '/api/user/usr_b/tag', { method: 'POST', token: B, body: { id: 'tag_a1', name: 'Roubada' } });
    expect(c.json.tag.id).not.toBe('tag_a1');
    const cfg = await call(env, '/api/user/usr_b/category/tag_a1/config', { method: 'PUT', token: B, body: { name: 'Roubada', has_subclasses: true, subclasses: [{ name: 'x' }] } });
    expect(cfg.status).toBe(403);
    await call(env, '/api/user/usr_b/tag/tag_a1', { method: 'DELETE', token: B });
    expect(await one("SELECT user_id, name FROM categories WHERE id = 'tag_a1'")).toMatchObject({ user_id: 'usr_a', name: 'Saúde' });
    expect(await count("SELECT COUNT(*) AS n FROM subclasses WHERE category_id = 'tag_a1'")).toBe(1);
  });

  it('categoria global: sincronizar não a transforma em categoria da conta, e excluir não a apaga para todos', async () => {
    await env.DB.prepare("INSERT INTO categories (id, user_id, name, color, bg, icon, is_shared, has_subclasses, created_at) VALUES ('cat_global_1', 'global', 'Geral', '#999', '#eee', 'Bookmark', 0, 0, '2026-01-01')").run();
    await sync(A, 'usr_a', { tags: [{ id: 'cat_global_1', name: 'Geral (minha)' }] });
    expect(await one("SELECT user_id, name FROM categories WHERE id = 'cat_global_1'")).toMatchObject({ user_id: 'global', name: 'Geral' });
    await call(env, '/api/user/usr_a/tag/cat_global_1', { method: 'DELETE', token: A });
    expect(await count("SELECT COUNT(*) AS n FROM categories WHERE id = 'cat_global_1'")).toBe(1);
  });
});
