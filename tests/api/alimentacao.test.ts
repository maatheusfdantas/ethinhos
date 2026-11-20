// @vitest-environment node
/**
 * Lote E (Nutricionista): plano por paciente, rascunho, publicação com início, versões, registros e permissões.
 * Limites: D1 falso (node:sqlite); "hoje" é a data UTC do teste (o servidor aceita o hoje local a até 1 dia do UTC).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';
import { addDays, changeLayout, cleanMealPlanContent, dayNumbers, groupFor, starterContent, versionFor } from '../../src/components/alimentacao/planoModel.js';

const env = makeEnv();
const T: Record<string, string> = {};
let ipN = 1;
const as = (who: string, path: string, opts: { method?: string; body?: unknown } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': `198.20.0.${ipN++ % 250}` } });
const one = async (sql: string, ...a: unknown[]) => (await env.DB.prepare(sql).bind(...a).first()) as any;
const today = new Date().toISOString().slice(0, 10);
const ids: Record<string, string> = {};
let turmaId = '';
let planId = '';

/** Plano completo: café (com substituição) e almoço com duas opções. */
const PLANO = {
  layout: 'todos',
  notes: 'Beber água ao longo do dia.',
  days: [{
    key: 'todos',
    meals: [
      { key: 'cafe', time: '07:30', name: 'Café da manhã', options: [{ key: 'o1', name: 'Opção única', items: [{ qty: '2', unit: 'fatias', food: 'pão integral' }, { qty: '1', unit: 'unidade', food: 'ovo mexido' }], subs: ['Pão integral por 4 colheres de sopa de tapioca'] }] },
      { key: 'almoco', time: '12:30', name: 'Almoço', options: [
        { key: 'o1', name: 'Opção 1', items: [{ qty: '120', unit: 'g', food: 'frango grelhado' }], subs: [] },
        { key: 'o2', name: 'Opção 2 (fora de casa)', items: [{ qty: '1/2', unit: 'prato', food: 'salada' }], subs: [] }
      ] }
    ]
  }]
};

async function join(who: string, code: string) {
  expect((await as(who, '/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult: true } })).status).toBe(201);
}

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['clara', 'nina', 'rafa', 'marta', 'lia', 'bruno', 'gabi', 'zeca']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
  for (const [u, model, space] of [['clara', 'nutri', 'Clara Nutrição'], ['nina', 'nutri', 'Nina Nutri'], ['rafa', 'personal', 'Studio Pulso'], ['marta', 'clinica', 'Espaço Integra']]) {
    expect((await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: `usr_${u}`, model, spaceName: space } })).status).toBe(201);
  }
  turmaId = (await as('clara', '/api/espacos/turmas', { method: 'POST', body: { name: 'Reeducação' } })).json.turma.id;
  const code = (await as('clara', `/api/espacos/turmas/${turmaId}/convite`, { method: 'POST' })).json.code;
  await join('lia', code);
  await join('bruno', code);
  await join('gabi', (await as('clara', '/api/espacos/convite-individual', { method: 'POST' })).json.code);
  await join('zeca', (await as('rafa', '/api/espacos/convite-individual', { method: 'POST' })).json.code);
  for (const p of (await as('clara', '/api/espacos/pessoas')).json.pessoas) ids[p.username] = p.linkId;
  ids.zecaRafa = (await as('rafa', '/api/espacos/pessoas')).json.pessoas[0].linkId;
});

describe('Regras puras (planoModel)', () => {
  it('versão que vale: maior início até a data; empate fica com a mais nova', () => {
    const vs = [{ version: 1, startsOn: '2026-11-01' }, { version: 2, startsOn: '2026-11-24' }, { version: 3, startsOn: '2026-11-24' }];
    expect(versionFor(vs, '2026-10-31')).toBeNull();
    expect(versionFor(vs, '2026-11-23')?.version).toBe(1);
    expect(versionFor(vs, '2026-11-24')?.version).toBe(3);
  });
  it('dias úteis, sábado e domingo: cada data cai no seu grupo', () => {
    const c = changeLayout(starterContent(), 'uteis_sab_dom');
    c.days[1].meals = c.days[1].meals.slice(0, 2);
    expect(groupFor(c, '2026-11-21')).toMatchObject({ key: 'sab', label: 'Sábado' }); // sábado
    expect(groupFor(c, '2026-11-21')?.meals).toHaveLength(2);
    expect(groupFor(c, '2026-11-22')?.key).toBe('dom');
    expect(groupFor(c, '2026-11-20')?.key).toBe('uteis');
  });
  it('registro do dia = previstas com registro ÷ previstas; extra fica fora; contagens por situação', () => {
    const meals = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
    const n = dayNumbers(meals as any, { a: { status: 'conforme' }, b: { status: 'nao_realizada' }, 'extra:1': { status: 'extra' } });
    expect(n).toMatchObject({ previstas: 3, registradas: 2 });
    expect(n.counts).toMatchObject({ conforme: 1, nao_realizada: 1, alternativa: 0 });
  });
  it('validação: rascunho aceita vazio; publicar exige alimentos; HTML some', () => {
    expect(cleanMealPlanContent(starterContent(), { draft: true }).error).toBeUndefined();
    // o rascunho guarda as linhas vazias (o espaço para preencher); publicar descarta
    const rascunho = cleanMealPlanContent(starterContent(), { draft: true }).value as any;
    expect(rascunho.days[0].meals[0].options[0].items).toHaveLength(1);
    expect(cleanMealPlanContent(starterContent(), { draft: false }).error).toMatch(/não tem nenhum alimento/);
    const c = cleanMealPlanContent({ ...PLANO, notes: '<script>x</script>Água' }, { draft: false });
    expect(c.value?.notes).toBe('xÁgua');
    expect(cleanMealPlanContent({ layout: 'todos', days: [{ key: 'todos', meals: [{ name: 'X', time: '25:00', options: [] }] }] }, { draft: true }).error).toMatch(/horário/);
  });
});

describe('Modelo e permissão', () => {
  it('Personal, Clínica e quem não é profissional não acessam planos alimentares', async () => {
    expect((await as('rafa', '/api/espacos/planos-modelo')).status).toBe(403);
    expect((await as('rafa', '/api/espacos/planos-modelo')).json.error).toMatch(/não acessa alimentação/);
    expect((await as('marta', '/api/espacos/planos-modelo')).status).toBe(403);
    expect((await as('lia', '/api/espacos/planos-modelo')).status).toBe(403);
    expect((await as('rafa', `/api/espacos/pessoas/${ids.zecaRafa}/plano`)).status).toBe(403);
  });
  it('outra nutricionista não acessa os pacientes da Clara', async () => {
    expect((await as('nina', `/api/espacos/pessoas/${ids.lia}/plano`)).status).toBe(404);
  });
});

describe('Modelos reaproveitáveis', () => {
  it('cria, edita (versão sobe) e arquiva; outra nutricionista não vê', async () => {
    const r = await as('clara', '/api/espacos/planos-modelo', { method: 'POST', body: { name: 'Base 1800', content: PLANO } });
    expect(r.status).toBe(201);
    ids.modelo = r.json.modelo.id;
    expect((await as('clara', `/api/espacos/planos-modelo/${ids.modelo}`, { method: 'PUT', body: { name: 'Base 1800', content: PLANO } })).json.version).toBe(2);
    expect((await as('nina', `/api/espacos/planos-modelo/${ids.modelo}`)).status).toBe(404);
    expect((await as('clara', '/api/espacos/planos-modelo')).json.modelos).toHaveLength(1);
  });
});

describe('Rascunho e publicação', () => {
  it('rascunho não aparece para a pessoa; um plano em andamento por vínculo', async () => {
    const r = await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`, { method: 'POST', body: { name: 'Reeducação, fase 1' } });
    expect(r.status).toBe(201);
    planId = r.json.planId;
    expect((await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`, { method: 'POST', body: { name: 'Outro' } })).status).toBe(409);
    expect((await as('lia', '/api/alimentacao')).json.planos).toHaveLength(0);
  });
  it('publicar exige o plano completo e data de início que não seja passada', async () => {
    const inc = await as('clara', `/api/espacos/planos/${planId}/publicar`, { method: 'POST', body: { startsOn: today, hoje: today } });
    expect(inc.status).toBe(400);
    expect(inc.json.error).toMatch(/Ainda falta completar/);
    expect((await as('clara', `/api/espacos/planos/${planId}/rascunho`, { method: 'PUT', body: { name: 'Reeducação, fase 1', content: PLANO } })).status).toBe(200);
    expect((await as('clara', `/api/espacos/planos/${planId}/publicar`, { method: 'POST', body: { startsOn: addDays(today, -3), hoje: today } })).status).toBe(400);
    const ok = await as('clara', `/api/espacos/planos/${planId}/publicar`, { method: 'POST', body: { startsOn: today, hoje: today } });
    expect(ok.json).toMatchObject({ success: true, version: 1, startsOn: today });
  });
  it('a pessoa vê o plano publicado e recebe uma pendência (sem repetir); abrir o dia resolve', async () => {
    const list = (await as('lia', `/api/alimentacao?hoje=${today}`)).json.planos;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: planId, status: 'publicado', ativo: true, spaceName: 'Clara Nutrição', vigente: { version: 1 } });
    const pend = (await as('lia', '/api/pendencias')).json;
    expect(pend.outras.filter((o: any) => o.type === 'plano_publicado')).toHaveLength(1);
    expect(pend.outras[0].title).toBe('Reeducação, fase 1');
    const dia = (await as('lia', `/api/alimentacao/dia?planId=${planId}&date=${today}&hoje=${today}`)).json;
    expect(dia).toMatchObject({ podeRegistrar: true, numeros: { previstas: 2, registradas: 0 } });
    expect(dia.refeicoes.map((m: any) => m.key)).toEqual(['cafe', 'almoco']);
    expect((await as('lia', '/api/pendencias')).json.outras.filter((o: any) => o.type === 'plano_publicado')).toHaveLength(0);
    expect((await as('bruno', `/api/alimentacao/dia?planId=${planId}`)).status).toBe(404);
  });
});

describe('Registro das refeições (pessoa)', () => {
  const reg = (body: Record<string, unknown>) => as('lia', '/api/alimentacao/registros', { method: 'PUT', body: { planId, date: today, hoje: today, ...body } });
  it('valida situação, opção e substituição no servidor', async () => {
    expect((await reg({ mealKey: 'cafe', status: 'otima' })).status).toBe(400);
    expect((await reg({ mealKey: 'jantar', status: 'conforme' })).status).toBe(400);
    expect((await reg({ mealKey: 'almoco', status: 'alternativa', substitution: 'qualquer' })).json.error).toMatch(/não tem substituição/);
    expect((await reg({ mealKey: 'cafe', status: 'alternativa', substitution: 'pizza' })).status).toBe(400);
    expect((await reg({ mealKey: 'almoco', status: 'conforme', optionKey: 'o9' })).status).toBe(400);
  });
  it('conta registradas ÷ previstas; corrigir não duplica; extra fica fora do denominador', async () => {
    expect((await reg({ mealKey: 'cafe', status: 'alternativa', substitution: 'Pão integral por 4 colheres de sopa de tapioca', note: 'Gostei' })).json.numeros).toMatchObject({ previstas: 2, registradas: 1 });
    expect((await reg({ mealKey: 'almoco', status: 'parcial', optionKey: 'o2' })).json.numeros).toMatchObject({ registradas: 2, counts: { alternativa: 1, parcial: 1 } });
    expect((await reg({ mealKey: 'almoco', status: 'conforme', optionKey: 'o2' })).json.numeros.counts).toMatchObject({ conforme: 1, parcial: 0 });
    expect((await one('SELECT COUNT(*) AS n FROM meal_logs WHERE plan_id = ?', planId)).n).toBe(2);
    const ex = await as('lia', '/api/alimentacao/extras', { method: 'POST', body: { planId, date: today, hoje: today, note: 'Pipoca no cinema' } });
    expect(ex.json.numeros).toMatchObject({ previstas: 2, registradas: 2 });
    const dia = (await as('lia', `/api/alimentacao/dia?planId=${planId}&date=${today}&hoje=${today}`)).json;
    expect(dia.extras).toHaveLength(1);
    expect(dia.registros.cafe).toMatchObject({ status: 'alternativa', note: 'Gostei' });
  });
  it('não registra no futuro nem antes de a versão valer; apagar volta a contagem', async () => {
    expect((await reg({ date: addDays(today, 1), mealKey: 'cafe', status: 'conforme' })).status).toBe(409);
    expect((await reg({ date: addDays(today, -1), mealKey: 'cafe', status: 'conforme' })).status).toBe(409);
    const del = await as('lia', '/api/alimentacao/registros/apagar', { method: 'POST', body: { planId, date: today, hoje: today, mealKey: 'almoco' } });
    expect(del.json.numeros).toMatchObject({ registradas: 1 });
    await reg({ mealKey: 'almoco', status: 'conforme', optionKey: 'o1' });
  });
  it('semana: dias futuros não contam', async () => {
    const s = (await as('lia', `/api/alimentacao/semana?planId=${planId}&from=${today}&hoje=${today}`)).json;
    expect(s.days).toHaveLength(7);
    expect(s.days[0]).toMatchObject({ date: today, futuro: false, previstas: 2, registradas: 2, extras: 1 });
    expect(s.days[1].futuro).toBe(true);
    expect(s.total).toMatchObject({ previstas: 2, registradas: 2 });
  });
});

describe('Acompanhamento e versões (nutricionista)', () => {
  it('vê a semana do paciente com as observações; o Personal não', async () => {
    const r = (await as('clara', `/api/espacos/pessoas/${ids.lia}/alimentacao?from=${today}&hoje=${today}`)).json;
    expect(r.total).toMatchObject({ previstas: 2, registradas: 2 });
    expect(r.registros.find((x: any) => x.mealKey === 'cafe')).toMatchObject({ meal: 'Café da manhã', status: 'alternativa', note: 'Gostei' });
    expect(r.registros.find((x: any) => x.mealKey.startsWith('extra:'))).toMatchObject({ meal: 'Refeição extra', note: 'Pipoca no cinema' });
    const p = (await as('clara', `/api/espacos/pessoas/${ids.lia}/plano?hoje=${today}`)).json;
    expect(p.resumo7).toMatchObject({ previstas: 2, registradas: 2 });
    expect(p.plano.draft.days[0].meals).toHaveLength(2);
  });
  it('versão nova com início futuro: hoje continua valendo a anterior; não pode começar antes da última', async () => {
    const novo = JSON.parse(JSON.stringify(PLANO));
    novo.days[0].meals.push({ key: 'jantar', time: '20:00', name: 'Jantar', options: [{ key: 'o1', name: 'Opção única', items: [{ qty: '', unit: 'à vontade', food: 'sopa de legumes' }], subs: [] }] });
    await as('clara', `/api/espacos/planos/${planId}/rascunho`, { method: 'PUT', body: { name: 'Reeducação, fase 2', content: novo } });
    expect((await as('clara', `/api/espacos/planos/${planId}/publicar`, { method: 'POST', body: { startsOn: addDays(today, 2), hoje: today } })).json.version).toBe(2);
    expect((await as('clara', `/api/espacos/planos/${planId}/publicar`, { method: 'POST', body: { startsOn: addDays(today, 1), hoje: today } })).status).toBe(400);
    const meta = (await as('lia', `/api/alimentacao?hoje=${today}`)).json.planos[0];
    expect(meta).toMatchObject({ vigente: { version: 1 }, proxima: { version: 2, startsOn: addDays(today, 2) } });
    expect((await as('lia', `/api/alimentacao/dia?planId=${planId}&date=${today}&hoje=${today}`)).json.refeicoes).toHaveLength(2);
    expect((await as('lia', `/api/alimentacao/dia?planId=${planId}&date=${addDays(today, 2)}&hoje=${today}`)).json.refeicoes).toHaveLength(3);
    const v1 = (await as('lia', `/api/alimentacao/planos/${planId}/versoes/1`)).json.versao;
    expect(v1).toMatchObject({ version: 1, name: 'Reeducação, fase 1' });
    expect((await one('SELECT COUNT(*) AS n FROM meal_plan_versions WHERE plan_id = ?', planId)).n).toBe(2);
  });
  it('turma: cada paciente com o seu plano e o registro de 7 dias', async () => {
    const r = (await as('clara', `/api/espacos/turmas/${turmaId}/planos?hoje=${today}`)).json.pessoas;
    expect(r.find((x: any) => x.linkId === ids.lia)).toMatchObject({ plano: { status: 'publicado' }, registro7: { previstas: 2, registradas: 2 } });
    expect(r.find((x: any) => x.linkId === ids.bruno).plano).toBeNull();
  });
  it('visão geral: sem plano publicado (com rascunho indicado) e registros novos', async () => {
    await as('clara', `/api/espacos/pessoas/${ids.bruno}/plano`, { method: 'POST', body: { name: 'Plano do Bruno', modeloId: ids.modelo } });
    const v = (await as('clara', '/api/espacos/visao')).json.blocos;
    const sem = v.find((b: any) => b.key === 'sem_plano');
    expect(sem.items.find((i: any) => i.linkId === ids.bruno).detail).toMatch(/rascunho/);
    expect(sem.items.find((i: any) => i.linkId === ids.gabi).detail).toMatch(/vínculo desde/);
    expect(v.find((b: any) => b.key === 'registros_novos').items[0]).toMatchObject({ linkId: ids.lia });
  });
});

describe('Encerramentos', () => {
  it('encerrar o plano: a pessoa mantém só para leitura; dá para começar outro', async () => {
    expect((await as('clara', `/api/espacos/planos/${planId}/encerrar`, { method: 'POST' })).status).toBe(200);
    const meta = (await as('lia', `/api/alimentacao?hoje=${today}`)).json.planos[0];
    expect(meta).toMatchObject({ status: 'encerrado', ativo: false, vigente: null });
    const dia = (await as('lia', `/api/alimentacao/dia?planId=${planId}&date=${today}&hoje=${today}`)).json;
    expect(dia).toMatchObject({ podeRegistrar: false });
    expect(dia.motivo).toMatch(/só para leitura/);
    expect((await as('lia', '/api/alimentacao/registros', { method: 'PUT', body: { planId, date: today, hoje: today, mealKey: 'cafe', status: 'conforme' } })).status).toBe(409);
    expect((await as('clara', `/api/espacos/planos/${planId}/rascunho`, { method: 'PUT', body: { content: PLANO } })).status).toBe(409);
    expect((await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`, { method: 'POST', body: { name: 'Fase 3' } })).status).toBe(201);
    expect((await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`)).json.anteriores).toHaveLength(1);
  });
  it('fim do vínculo: a nutricionista perde o acesso na hora; o paciente mantém o plano encerrado', async () => {
    const p = (await as('clara', `/api/espacos/pessoas/${ids.gabi}/plano`, { method: 'POST', body: { name: 'Plano da Gabi', modeloId: ids.modelo } })).json.planId;
    expect((await as('clara', `/api/espacos/planos/${p}/publicar`, { method: 'POST', body: { startsOn: today, hoje: today } })).status).toBe(200);
    const gabiLink = (await as('gabi', '/api/espacos/meus')).json.espacos[0].linkId;
    expect((await as('gabi', `/api/espacos/meus/${gabiLink}`, { method: 'DELETE' })).status).toBe(200);
    expect((await as('clara', `/api/espacos/pessoas/${ids.gabi}/plano`)).status).toBe(404);
    expect((await as('clara', `/api/espacos/pessoas/${ids.gabi}/alimentacao`)).status).toBe(404);
    expect((await as('clara', `/api/espacos/planos/${p}/publicar`, { method: 'POST', body: { startsOn: today, hoje: today } })).status).toBe(404);
    const meta = (await as('gabi', `/api/alimentacao?hoje=${today}`)).json.planos[0];
    expect(meta).toMatchObject({ status: 'encerrado', ativo: false });
    expect((await as('gabi', `/api/alimentacao/dia?planId=${p}&date=${today}&hoje=${today}`)).json.refeicoes).toHaveLength(2);
  });
  it('nutricionista suspensa perde o acesso no próximo pedido', async () => {
    await as('adm', '/api/admin/profissionais/usr_clara', { method: 'PUT', body: { status: 'suspenso' } });
    expect((await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`)).status).toBe(403);
    await as('adm', '/api/admin/profissionais/usr_clara', { method: 'PUT', body: { status: 'ativo' } });
    expect((await as('clara', `/api/espacos/pessoas/${ids.lia}/plano`)).status).toBe(200);
  });
});
