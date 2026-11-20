// @vitest-environment node
/**
 * Lote C: eventos com convite, avisos com comentários privados e pendências.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { applyMigrations } from '../helpers/d1';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const env = makeEnv();
const T: Record<string, string> = {};
let ipN = 1;
const as = (who: string, path: string, opts: { method?: string; body?: unknown } = {}) =>
  call(env, path, { method: opts.method, body: opts.body, token: T[who], headers: { 'CF-Connecting-IP': `198.20.0.${ipN++ % 250}` } });
const count = async (sql: string, ...a: unknown[]) => Number(((await env.DB.prepare(sql).bind(...a).first()) as any)?.n ?? 0);
const inHours = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();
let turma = '';
let evento = '';
let aviso = '';

beforeAll(async () => {
  applyMigrations(env.DB);
  await call(env, '/api/health');
  for (const u of ['marta', 'rafa', 'ana', 'caio', 'lia']) {
    await insertUser(env, { id: `usr_${u}`, username: u, email: `${u}@exemplo.com`, password: `${u}#Senha-forte1` });
    T[u] = await login(env, u, `${u}#Senha-forte1`);
  }
  await insertUser(env, { id: 'usr_adm', username: 'adm', email: 'adm@exemplo.com', password: 'Adm#Senha-forte1', role: 'admin' });
  T.adm = await login(env, 'adm', 'Adm#Senha-forte1');
  await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_marta', model: 'clinica', spaceName: 'Espaço Integra' } });
  await as('adm', '/api/admin/profissionais', { method: 'POST', body: { userId: 'usr_rafa', model: 'personal', spaceName: 'Studio Pulso' } });
  turma = (await as('marta', '/api/espacos/turmas', { method: 'POST', body: { name: 'Respirar melhor' } })).json.turma.id;
  const code = (await as('marta', `/api/espacos/turmas/${turma}/convite`, { method: 'POST' })).json.code;
  for (const u of ['ana', 'caio']) await as(u, '/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult: true } });
  const ind = (await as('rafa', '/api/espacos/convite-individual', { method: 'POST' })).json.code;
  await as('lia', '/api/espacos/convites/aceitar', { method: 'POST', body: { code: ind, adult: true } });
});

describe('Eventos', () => {
  it('validação: título, horário no futuro, fim depois do início, turma do próprio espaço', async () => {
    const base = { title: 'Grupo de respiração', startsAt: inHours(48), endsAt: inHours(49), audience: 'turma', groupId: turma, tz: 'America/Sao_Paulo' };
    expect((await as('ana', '/api/espacos/eventos', { method: 'POST', body: base })).status).toBe(403);
    expect((await as('marta', '/api/espacos/eventos', { method: 'POST', body: { ...base, title: ' ' } })).status).toBe(400);
    expect((await as('marta', '/api/espacos/eventos', { method: 'POST', body: { ...base, startsAt: inHours(-2), endsAt: inHours(-1) } })).status).toBe(400);
    expect((await as('marta', '/api/espacos/eventos', { method: 'POST', body: { ...base, endsAt: inHours(47) } })).status).toBe(400);
    expect((await as('rafa', '/api/espacos/eventos', { method: 'POST', body: base })).status).toBe(400);
    const r = await as('marta', '/api/espacos/eventos', { method: 'POST', body: base });
    expect(r.status).toBe(201);
    expect(r.json.convidados).toBe(2);
    evento = r.json.evento.id;
  });

  it('o convite aparece nas pendências uma vez só, sem repetir a cada consulta', async () => {
    const a = await as('ana', '/api/pendencias');
    expect(a.json.convites).toHaveLength(1);
    expect(a.json.convites[0]).toMatchObject({ title: 'Grupo de respiração', spaceName: 'Espaço Integra', changed: false });
    expect((await as('ana', '/api/pendencias')).json.total).toBe(a.json.total);
    expect((await as('lia', '/api/pendencias')).json.convites).toHaveLength(0);
  });

  it('aceitar coloca o evento na agenda da pessoa (referência, sem cópia em events)', async () => {
    const inv = (await as('ana', '/api/pendencias')).json.convites[0].inviteId;
    expect((await as('ana', `/api/eventos/convites/${inv}/responder`, { method: 'POST', body: { resposta: 'aceito' } })).status).toBe(200);
    expect((await as('ana', '/api/agenda/espacos')).json.eventos.map((e: any) => e.id)).toEqual([evento]);
    expect((await as('caio', '/api/agenda/espacos')).json.eventos).toEqual([]);
    expect(await count("SELECT COUNT(*) AS n FROM events WHERE user_id = 'usr_ana'")).toBe(0);
    expect((await as('ana', '/api/pendencias')).json.convites).toHaveLength(0);
  });

  it('mudar só o local mantém o aceite e avisa', async () => {
    const r = await as('marta', `/api/espacos/eventos/${evento}`, { method: 'PUT', body: { location: 'Sala 2' } });
    expect(r.json).toMatchObject({ reconfirmar: false, version: 1 });
    expect((await as('ana', '/api/agenda/espacos')).json.eventos[0].location).toBe('Sala 2');
    expect((await as('ana', '/api/pendencias')).json.outras.map((o: any) => o.type)).toContain('evento_texto');
  });

  it('mudar o horário volta quem aceitou para pendente e tira da agenda até confirmar', async () => {
    const r = await as('marta', `/api/espacos/eventos/${evento}`, { method: 'PUT', body: { startsAt: inHours(50), endsAt: inHours(51) } });
    expect(r.json).toMatchObject({ reconfirmar: true, version: 2 });
    const p = (await as('ana', '/api/pendencias')).json.convites;
    expect(p[0]).toMatchObject({ changed: true });
    expect((await as('ana', '/api/agenda/espacos')).json.eventos).toEqual([]);
    await as('ana', `/api/eventos/convites/${p[0].inviteId}/responder`, { method: 'POST', body: { resposta: 'aceito' } });
  });

  it('lembrar um pendente: a pessoa vê "lembrete", sem duplicar no mesmo dia', async () => {
    const det = (await as('marta', `/api/espacos/eventos/${evento}`)).json;
    const caio = det.convites.find((c: any) => c.username === 'caio');
    await as('marta', `/api/espacos/eventos/${evento}/lembrar`, { method: 'POST', body: { inviteId: caio.inviteId } });
    await as('marta', `/api/espacos/eventos/${evento}/lembrar`, { method: 'POST', body: { inviteId: caio.inviteId } });
    expect((await as('caio', '/api/pendencias')).json.convites[0].lembrete).toBe(true);
    expect(await count("SELECT COUNT(*) AS n FROM notifications WHERE dedupe_key LIKE 'lembrete:%'")).toBe(1);
  });

  it('cancelar: aparece riscado para quem aceitou e some das pendências de quem não respondeu', async () => {
    expect((await as('marta', `/api/espacos/eventos/${evento}/cancelar`, { method: 'POST' })).status).toBe(200);
    expect((await as('ana', '/api/agenda/espacos')).json.eventos[0].status).toBe('cancelado');
    expect((await as('ana', '/api/pendencias')).json.outras.map((o: any) => o.type)).toContain('evento_cancelado');
    expect((await as('caio', '/api/pendencias')).json.convites).toHaveLength(0);
  });

  it('pendente de evento que já começou vira "sem resposta" e não aceita mais resposta; presença só depois', async () => {
    const e2 = (await as('marta', '/api/espacos/eventos', { method: 'POST', body: { title: 'Roda de conversa', startsAt: inHours(3), endsAt: inHours(4), audience: 'espaco' } })).json.evento.id;
    const det0 = (await as('marta', `/api/espacos/eventos/${e2}`)).json;
    expect((await as('marta', `/api/espacos/eventos/${e2}/presenca`, { method: 'PUT', body: { inviteId: det0.convites[0].inviteId, attendance: 'presente' } })).status).toBe(409);
    await env.DB.prepare('UPDATE space_events SET starts_at = ?, ends_at = ? WHERE id = ?').bind(inHours(-1), inHours(1), e2).run();
    const det = (await as('marta', `/api/espacos/eventos/${e2}`)).json;
    expect(det.convites.every((c: any) => c.status === 'sem_resposta')).toBe(true);
    expect((await as('caio', '/api/pendencias')).json.convites).toHaveLength(0);
    expect((await as('caio', `/api/eventos/convites/${det.convites.find((c: any) => c.username === 'caio').inviteId}/responder`, { method: 'POST', body: { resposta: 'aceito' } })).status).toBe(409);
    expect((await as('marta', `/api/espacos/eventos/${e2}/presenca`, { method: 'PUT', body: { inviteId: det.convites[0].inviteId, attendance: 'presente' } })).status).toBe(200);
  });

  it('outro profissional não vê nem mexe nos eventos; quem não foi convidado não responde', async () => {
    expect((await as('rafa', `/api/espacos/eventos/${evento}`)).status).toBe(404);
    const inv = (await env.DB.prepare('SELECT id FROM space_event_invites WHERE user_id = ? LIMIT 1').bind('usr_ana').first()) as any;
    expect((await as('lia', `/api/eventos/convites/${inv.id}/responder`, { method: 'POST', body: { resposta: 'aceito' } })).status).toBe(404);
  });
});

describe('Avisos e comentários privados', () => {
  it('publicar para a turma: destinatários fixados; aparece nas pendências', async () => {
    const r = await as('marta', '/api/espacos/avisos', { method: 'POST', body: { title: 'Horários de dezembro', body: 'Mudamos para 19:30.', audience: 'turma', groupId: turma } });
    expect(r.json.destinatarios).toBe(2);
    aviso = r.json.aviso.id;
    expect((await as('ana', '/api/pendencias')).json.avisos.map((a: any) => a.postId)).toContain(aviso);
  });

  it('abrir marca como lido; o comentário é privado (o colega não vê)', async () => {
    const a = await as('ana', `/api/avisos/${aviso}`);
    expect(a.json.aviso.title).toBe('Horários de dezembro');
    expect((await as('ana', '/api/pendencias')).json.avisos).toHaveLength(0);
    expect((await as('ana', `/api/avisos/${aviso}/comentarios`, { method: 'POST', body: { body: 'Combinado, obrigada!' } })).status).toBe(201);
    expect((await as('caio', `/api/avisos/${aviso}`)).json.conversa).toEqual([]);
    expect((await as('lia', `/api/avisos/${aviso}`)).status).toBe(404);
  });

  it('o profissional vê as conversas por pessoa e responde só naquela conversa', async () => {
    const det = (await as('marta', `/api/espacos/avisos/${aviso}`)).json;
    const anaT = det.conversas.find((c: any) => c.username === 'ana');
    expect(anaT.comments).toBe(1);
    expect((await as('marta', `/api/espacos/avisos/${aviso}/conversas/${anaT.userId}`, { method: 'POST', body: { body: 'Até lá!' } })).status).toBe(201);
    // A resposta vira pendência para a Ana; abrir o aviso a marca como lida.
    expect((await as('ana', '/api/pendencias')).json.outras.map((o: any) => o.type)).toContain('comentario');
    expect((await as('ana', `/api/avisos/${aviso}`)).json.conversa.map((c: any) => c.body)).toEqual(['Combinado, obrigada!', 'Até lá!']);
    expect((await as('ana', '/api/pendencias')).json.outras.map((o: any) => o.type)).not.toContain('comentario');
    expect((await as('caio', `/api/avisos/${aviso}`)).json.conversa).toEqual([]);
  });

  it('aviso sem comentários e vínculo encerrado deixam o aviso só para leitura', async () => {
    const r = await as('marta', '/api/espacos/avisos', { method: 'POST', body: { title: 'Só leitura', body: 'Sem comentários.', audience: 'espaco', allowComments: false } });
    expect((await as('ana', `/api/avisos/${r.json.aviso.id}/comentarios`, { method: 'POST', body: { body: 'oi' } })).status).toBe(403);
    const caio = (await as('caio', '/api/espacos/meus')).json.espacos[0];
    await as('caio', `/api/espacos/meus/${caio.linkId}`, { method: 'DELETE' });
    expect((await as('caio', `/api/avisos/${aviso}/comentarios`, { method: 'POST', body: { body: 'oi' } })).status).toBe(403);
    expect((await as('caio', '/api/pendencias')).json.total).toBe(0);
  });

  it('excluir a conta apaga convites, leituras, comentários e pendências da pessoa', async () => {
    const r = await call(env, '/api/account', { method: 'DELETE', token: T.ana, body: { username: 'ana', password: 'ana#Senha-forte1' } });
    expect(r.status).toBe(200);
    for (const t of ['space_event_invites', 'space_post_recipients', 'notifications']) expect(await count(`SELECT COUNT(*) AS n FROM ${t} WHERE user_id = 'usr_ana'`)).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM space_post_comments WHERE participant_id = 'usr_ana'")).toBe(0);
  });
});
