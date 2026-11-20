// @vitest-environment node
/**
 * Proposta 07: biblioteca de exercícios (seed v1), personalizados, correção de nome, libraryId nas fichas,
 * foto/capa no R2 (simulado), tela da turma do aluno e denúncia de imagem.
 * Limites: D1 falso (node:sqlite) e R2 em memória; sem Cloudflare real.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';
import { eraseUserData } from '../../functions/api/_lib/erase.js';

const store = new Map<string, { bytes: Uint8Array; ct: string }>();
const MIDIA = {
  async put(k: string, bytes: Uint8Array, o: any) { store.set(k, { bytes, ct: o.httpMetadata.contentType }); },
  async get(k: string) { const o = store.get(k); return o ? { body: o.bytes, httpMetadata: { contentType: o.ct } } : null; },
  async delete(k: string) { store.delete(k); }
};
const env = makeEnv({ MIDIA } as any);
const T: Record<string, string> = {};
let ipN = 1;
const as = (who: string, path: string, opts: { method?: string; body?: unknown } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': `198.22.0.${ipN++ % 250}` } });
const one = async (sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first()) as any;
const seed = readFileSync(join(process.cwd(), 'cloudflare', 'seeds', 'exercicios-v1.sql'), 'utf8');
const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]).toString('base64')}`;
const ids: Record<string, string> = {};

beforeAll(async () => {
  applyMigrations(env.DB);
  (env.DB as any).raw.exec(seed);
  await call(env, '/api/health');
  for (const u of ['rafa', 'tito', 'clara', 'lia', 'bia']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
  for (const [u, model, space] of [['rafa', 'personal', 'Studio Pulso'], ['tito', 'personal', 'Tito Treinos'], ['clara', 'nutri', 'Clara Nutrição']]) {
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: `usr_${u}`, model, spaceName: space } })).status).toBe(201);
  }
  ids.turma = (await as('rafa', '/api/espacos/turmas', { method: 'POST', body: { name: 'Força' } })).json.turma.id;
  const code = (await as('rafa', `/api/espacos/turmas/${ids.turma}/convite`, { method: 'POST' })).json.code;
  for (const u of ['lia', 'bia']) expect((await as(u, '/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult: true } })).status).toBe(201);
});

describe('Base de exercícios (seed v1)', () => {
  it('250 exercícios em português, com nome em inglês, músculos, licença e versão da origem', async () => {
    const r = (await as('lia', '/api/exercicios')).json;
    expect(r.total).toBe(250);
    const supino = r.exercicios.find((e: any) => e.id === 'fe_barbell_bench_press_medium_grip');
    expect(supino).toMatchObject({ name: 'Supino reto com barra', aliases: ['Barbell Bench Press - Medium Grip'], group: 'Peito', primary: ['peitoral'], origin: 'importada', source: 'free-exercise-db', reviewed: false });
    expect(supino.license).toMatch(/Unlicense/);
    expect(r.exercicios.every((e: any) => e.primary.length > 0)).toBe(true);
  });
  it('busca em português sem acento e pelo nome em inglês', async () => {
    expect((await as('lia', '/api/exercicios?q=agachamento%20bulgaro')).json.exercicios.map((e: any) => e.name)).toContain('Agachamento búlgaro com halteres');
    expect((await as('lia', '/api/exercicios?q=hip%20thrust')).json.exercicios[0].name).toBe('Elevação pélvica com barra');
  });
  it('reaplicar o seed não sobrescreve linha já revisada', async () => {
    await env.DB.prepare("UPDATE exercise_library SET name_pt = 'Supino reto (revisado)', review_status = 'revisado' WHERE id = 'fe_barbell_bench_press_medium_grip'").run();
    (env.DB as any).raw.exec(seed);
    expect((await one("SELECT name_pt FROM exercise_library WHERE id = 'fe_barbell_bench_press_medium_grip'")).name_pt).toBe('Supino reto (revisado)');
    expect((await one('SELECT COUNT(*) AS n FROM exercise_library')).n).toBe(250);
  });
});

describe('Personalizados e correção de nome', () => {
  it('exige músculo principal; Personal cria no espaço; Nutri não; pessoa cria o próprio', async () => {
    expect((await as('rafa', '/api/exercicios/personalizados', { method: 'POST', body: { escopo: 'espaco', name: 'Remada no TRX', primary: [] } })).status).toBe(400);
    const r = await as('rafa', '/api/exercicios/personalizados', { method: 'POST', body: { escopo: 'espaco', name: 'Remada no TRX', primary: ['dorsal', 'inventado'], secondary: ['biceps', 'dorsal'] } });
    expect(r.status).toBe(201);
    expect(r.json.exercicio).toMatchObject({ primary: ['dorsal'], secondary: ['biceps'], origin: 'personalizada', scope: 'espaco' });
    ids.trx = r.json.exercicio.id;
    expect((await as('clara', '/api/exercicios/personalizados', { method: 'POST', body: { escopo: 'espaco', name: 'X', primary: ['dorsal'] } })).status).toBe(403);
    ids.liaEx = (await as('lia', '/api/exercicios/personalizados', { method: 'POST', body: { name: 'Corrida na praia', primary: ['quadriceps'] } })).json.exercicio.id;
  });
  it('cada um vê só os seus; outro Personal e o aluno não alteram', async () => {
    expect((await as('rafa', '/api/exercicios')).json.personalizados.map((e: any) => e.id)).toEqual([ids.trx]);
    expect((await as('tito', '/api/exercicios')).json.personalizados).toHaveLength(0);
    expect((await as('lia', '/api/exercicios')).json.personalizados.map((e: any) => e.id)).toEqual([ids.liaEx]);
    expect((await as('tito', `/api/exercicios/personalizados/${ids.trx}`, { method: 'PUT', body: { name: 'Hack' } })).status).toBe(404);
    expect((await as('lia', `/api/exercicios/personalizados/${ids.trx}/arquivar`, { method: 'POST' })).status).toBe(404);
    expect((await as('rafa', `/api/exercicios/personalizados/${ids.trx}`, { method: 'PUT', body: { name: 'Remada no TRX (pegada neutra)' } })).json.exercicio.name).toBe('Remada no TRX (pegada neutra)');
  });
  it('correção de nome vale só no espaço do Personal', async () => {
    expect((await as('rafa', '/api/exercicios/fe_leg_press/nome', { method: 'PUT', body: { name: 'Leg 45' } })).json.name).toBe('Leg 45');
    expect((await as('rafa', '/api/exercicios')).json.exercicios.find((e: any) => e.id === 'fe_leg_press')).toMatchObject({ name: 'Leg 45', originalName: 'Leg press 45°' });
    expect((await as('tito', '/api/exercicios')).json.exercicios.find((e: any) => e.id === 'fe_leg_press').name).toBe('Leg press 45°');
    expect((await as('lia', '/api/exercicios/fe_leg_press/nome', { method: 'PUT', body: { name: 'X' } })).status).toBe(403);
  });
  it('a ficha guarda a referência à biblioteca (e descarta referência inválida)', async () => {
    const f = await as('rafa', '/api/espacos/fichas', { method: 'POST', body: { name: 'Treino A', content: { exercises: [
      { name: 'Leg press 45°', sets: 3, reps: 10, libraryId: 'fe_leg_press' }, { name: 'Remada no TRX', sets: 3, reps: 10, libraryId: ids.trx }, { name: 'Livre', sets: 1, reps: 1, libraryId: 'x;drop table' }
    ] } } });
    expect(f.status).toBe(201);
    const ex = (await as('rafa', `/api/espacos/fichas/${f.json.ficha.id}`)).json.ficha.content.exercises;
    expect(ex.map((e: any) => e.libraryId)).toEqual(['fe_leg_press', ids.trx, undefined]);
  });
});

describe('Foto, capa e tela da turma', () => {
  it('Personal envia foto e capa; tipo conferido pelos bytes; turma de outro espaço não', async () => {
    const foto = await as('rafa', '/api/espacos/midia/foto', { method: 'PUT', body: { dataUrl: PNG } });
    expect(foto.status).toBe(200);
    ids.foto = foto.json.url.split('/').pop() as string;
    expect((await as('rafa', '/api/espacos/midia/foto', { method: 'PUT', body: { dataUrl: `data:image/png;base64,${Buffer.from('<svg>oi</svg>').toString('base64')}` } })).status).toBe(400);
    expect((await as('rafa', '/api/espacos/midia/foto', { method: 'PUT', body: { dataUrl: `data:image/png;base64,${Buffer.alloc(1024 * 1024 + 10, 1).toString('base64')}` } })).status).toBe(400);
    const capa = await as('rafa', `/api/espacos/turmas/${ids.turma}/capa`, { method: 'PUT', body: { dataUrl: PNG } });
    ids.capa = capa.json.url.split('/').pop() as string;
    expect((await as('tito', `/api/espacos/turmas/${ids.turma}/capa`, { method: 'PUT', body: { dataUrl: PNG } })).status).toBe(404);
    const img = await call(env, `/api/midia/${ids.capa}`);
    expect(img.status).toBe(200);
    expect(img.headers.get('Content-Type')).toBe('image/png');
    expect((await call(env, '/api/midia/../../etc')).status).toBe(404);
  });
  it('card e tela da turma para o aluno, sem lista de colegas', async () => {
    await as('rafa', '/api/espacos/atribuir', { method: 'POST', body: { templateId: (await as('rafa', '/api/espacos/fichas')).json.fichas[0].id, groupId: ids.turma } });
    const meus = (await as('lia', '/api/espacos/meus')).json.espacos[0];
    expect(meus.fotoUrl).toBe(`/api/midia/${ids.foto}`);
    expect(meus.turmas[0]).toMatchObject({ name: 'Força', capaUrl: `/api/midia/${ids.capa}`, treino: 'Treino A' });
    const page = await as('lia', `/api/espacos/meus/turmas/${meus.turmas[0].memberId}`);
    expect(page.json.turma).toMatchObject({ name: 'Força', capaUrl: `/api/midia/${ids.capa}` });
    expect(page.json.treinos[0]).toMatchObject({ name: 'Treino A', daTurma: true });
    expect(JSON.stringify(page.json)).not.toMatch(/bia/);
    expect((await as('bia', `/api/espacos/meus/turmas/${meus.turmas[0].memberId}`)).status).toBe(404);
    ids.member = meus.turmas[0].memberId;
  });
  it('denúncia de imagem chega ao admin; remover apaga o arquivo', async () => {
    expect((await as('lia', `/api/espacos/meus/turmas/${ids.member}/denunciar`, { method: 'POST', body: { kind: 'capa', reason: 'Imagem imprópria' } })).status).toBe(200);
    expect((await as('rafa', '/api/admin/midia/denuncias')).status).toBe(403);
    const d = (await as('adm', '/api/admin/midia/denuncias')).json.denuncias;
    expect(d[0]).toMatchObject({ mediaKey: ids.capa, kind: 'capa', total: 1, reasons: ['Imagem imprópria'] });
    expect((await as('adm', `/api/admin/midia/denuncias/${ids.capa}`, { method: 'POST', body: { acao: 'remover' } })).status).toBe(200);
    expect(store.has(ids.capa as string)).toBe(false);
    expect((await call(env, `/api/midia/${ids.capa}`)).status).toBe(404);
    expect((await as('lia', '/api/espacos/meus')).json.espacos[0].turmas[0].capaUrl).toBeNull();
  });
  it('excluir a conta do Personal apaga personalizados, correções e a foto do espaço', async () => {
    await eraseUserData(env.DB as any, 'usr_rafa', { midia: MIDIA } as any);
    expect(store.has(ids.foto as string)).toBe(false);
    expect((await one("SELECT COUNT(*) AS n FROM exercise_custom WHERE owner_kind = 'espaco'")).n).toBe(0);
    expect((await one('SELECT COUNT(*) AS n FROM exercise_name_fix')).n).toBe(0);
    expect((await one("SELECT COUNT(*) AS n FROM exercise_custom WHERE owner_kind = 'pessoa'")).n).toBe(1);
  });
  it('sem o R2 configurado, o envio responde 503 com código', async () => {
    const env2 = { ...env, MIDIA: undefined } as any;
    const r = await call(env2, '/api/espacos/midia/foto', { method: 'PUT', body: { dataUrl: PNG }, token: T.tito });
    expect(r.status).toBe(503);
    expect(r.json.code).toBe('midia_indisponivel');
  });
});
