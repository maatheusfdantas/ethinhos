// @vitest-environment node
/** Integração Spotify: conexão opcional, escopos mínimos, tokens cifrados, renovação e remoção. Spotify simulado. */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { call, insertUser, login, makeEnv } from '../helpers/api';

const KEY = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const env = makeEnv({ SPOTIFY_CLIENT_ID: 'sp-id-teste', SPOTIFY_CLIENT_SECRET: 'sp-secret-teste', TOKEN_ENCRYPTION_KEY: KEY });
let spotify: { me: any; meStatus: number; current: any; currentStatus: number; recent: any; refreshStatus: number; tokenCalls: string[] };
const reset = () => { spotify = { me: { id: 'sp-ana', display_name: 'Ana Ouvinte' }, meStatus: 200, current: null, currentStatus: 204, recent: { items: [] }, refreshStatus: 200, tokenCalls: [] }; };
const track = { type: 'track', name: 'Canção', artists: [{ name: 'Banda' }], album: { name: 'Disco', images: [{ url: 'https://i.scdn.co/image/abc' }] }, external_urls: { spotify: 'https://open.spotify.com/track/1' } };

vi.stubGlobal('fetch', vi.fn(async (input: unknown, init?: RequestInit) => {
  const u = String(input);
  if (u.includes('accounts.spotify.com/api/token')) {
    const body = String(init?.body || ''); spotify.tokenCalls.push(body.includes('refresh_token') ? 'refresh' : 'code');
    if (body.includes('grant_type=refresh_token') && spotify.refreshStatus !== 200) return Response.json({ error: 'invalid_grant' }, { status: spotify.refreshStatus });
    return Response.json({ access_token: 'acesso-' + spotify.tokenCalls.length, refresh_token: 'renovacao-secreta', expires_in: 3600, scope: 'user-read-currently-playing user-read-recently-played' });
  }
  if (u.endsWith('/v1/me')) return spotify.meStatus === 200 ? Response.json(spotify.me) : new Response('{}', { status: spotify.meStatus });
  if (u.includes('currently-playing')) return spotify.currentStatus === 200 ? Response.json(spotify.current) : new Response(null, { status: spotify.currentStatus });
  if (u.includes('recently-played')) return Response.json(spotify.recent);
  return new Response('{}', { status: 503 });
}));

let tokenAna = '';
const start = async (token = tokenAna) => {
  const r = await call(env, '/api/integrations/spotify/start', { method: 'POST', token });
  const cookie = (r.headers.get('Set-Cookie') || '').split(';')[0] ?? '';
  return { r, cookie, state: r.json?.url ? new URL(r.json.url).searchParams.get('state')! : '' };
};
const connect = async (token = tokenAna) => {
  const { cookie, state } = await start(token);
  const cb = await call(env, `/api/integrations/spotify/callback?code=abc&state=${state}`, { headers: { Cookie: cookie } });
  return new URL(cb.headers.get('Location')!);
};

beforeAll(async () => {
  await call(env, '/api/health');
  await insertUser(env, { id: 'usr_ana', username: 'ana', email: 'ana@exemplo.com', password: 'Ana#Senha-forte1' });
  await insertUser(env, { id: 'usr_bob', username: 'bob', email: 'bob@exemplo.com', password: 'Bob#Senha-forte1' });
  tokenAna = await login(env, 'ana', 'Ana#Senha-forte1');
});
beforeEach(reset);

describe('Spotify', () => {
  it('exige login em todas as rotas, menos a volta do provedor', async () => {
    for (const [m, p] of [['POST', 'start'], ['GET', 'status'], ['GET', 'now-playing']] as const) {
      expect((await call(env, `/api/integrations/spotify/${p}`, { method: m })).status).toBe(401);
    }
    expect((await call(env, '/api/integrations/spotify', { method: 'DELETE' })).status).toBe(401);
  });

  it('início pede SÓ as duas permissões de leitura, com PKCE, e não devolve segredo', async () => {
    const { r } = await start();
    const u = new URL(r.json.url);
    expect(u.origin).toBe('https://accounts.spotify.com');
    expect(u.searchParams.get('scope')).toBe('user-read-currently-playing user-read-recently-played');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('redirect_uri')).toBe('https://ethos.test/api/integrations/spotify/callback');
    expect(JSON.stringify(r.json)).not.toMatch(/sp-secret-teste/);
    expect(r.headers.get('Set-Cookie')).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });

  it('volta com state errado ou sem cookie é recusada', async () => {
    const { cookie } = await start();
    const bad = await call(env, '/api/integrations/spotify/callback?code=x&state=outro', { headers: { Cookie: cookie } });
    expect(bad.headers.get('Location')).toMatch(/auth_error=sessao_expirada/);
    expect((await call(env, '/api/integrations/spotify/callback?code=x&state=y')).headers.get('Location')).toMatch(/auth_error=sessao_expirada/);
  });

  it('conecta, guarda os tokens CIFRADOS e o status nunca os mostra', async () => {
    expect((await connect()).searchParams.get('connected')).toBe('spotify');
    const row: any = await env.DB.prepare('SELECT * FROM spotify_connections WHERE user_id = ?').bind('usr_ana').first();
    expect(row.display_name).toBe('Ana Ouvinte');
    expect(row.access_token_enc).toMatch(/^v1\./); expect(row.refresh_token_enc).toMatch(/^v1\./);
    expect(JSON.stringify(row)).not.toMatch(/acesso-|renovacao-secreta/);
    const st = await call(env, '/api/integrations/spotify/status', { token: tokenAna });
    expect(st.json).toMatchObject({ available: true, connected: true, displayName: 'Ana Ouvinte' });
    expect(JSON.stringify(st.json)).not.toMatch(/token|acesso-|renovacao/i);
  });

  it('tocando agora, última música e nada ouvido', async () => {
    spotify.currentStatus = 200; spotify.current = { is_playing: true, item: track };
    let r = await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna });
    expect(r.json).toMatchObject({ connected: true, state: 'playing', track: { name: 'Canção', artists: ['Banda'], image: 'https://i.scdn.co/image/abc' } });
    spotify.currentStatus = 204; spotify.recent = { items: [{ track, played_at: '2026-11-14T20:00:00Z' }] };
    r = await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna });
    expect(r.json).toMatchObject({ state: 'last', track: { name: 'Canção', playedAt: '2026-11-14T20:00:00Z' } });
    spotify.recent = { items: [] };
    expect((await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna })).json.state).toBe('none');
  });

  it('descarta imagem e link fora do domínio do Spotify', async () => {
    spotify.currentStatus = 200; spotify.current = { is_playing: true, item: { ...track, album: { name: 'x', images: [{ url: 'https://evil.test/a.png' }] }, external_urls: { spotify: 'javascript:alert(1)' } } };
    const t = (await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna })).json.track;
    expect(t.image).toBe(''); expect(t.url).toBe('');
  });

  it('renova o acesso vencido sem o navegador ver token; revogação remove a conexão', async () => {
    await env.DB.prepare("UPDATE spotify_connections SET expires_at = '2000-01-01T00:00:00Z' WHERE user_id = 'usr_ana'").run();
    spotify.currentStatus = 204;
    expect((await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna })).json.connected).toBe(true);
    expect(spotify.tokenCalls).toContain('refresh');
    await env.DB.prepare("UPDATE spotify_connections SET expires_at = '2000-01-01T00:00:00Z' WHERE user_id = 'usr_ana'").run();
    spotify.refreshStatus = 400;
    const r = await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna });
    expect(r.json).toEqual({ connected: false, reason: 'expirada' });
    expect(await env.DB.prepare('SELECT 1 FROM spotify_connections WHERE user_id = ?').bind('usr_ana').first()).toBeNull();
  });

  it('uma conta só vê a própria conexão; a mesma conta Spotify não liga a dois usuários', async () => {
    await connect();
    const tokenBob = await login(env, 'bob', 'Bob#Senha-forte1');
    expect((await call(env, '/api/integrations/spotify/status', { token: tokenBob })).json.connected).toBe(false);
    expect((await connect(tokenBob)).searchParams.get('auth_error')).toBe('ja_vinculada');
  });

  it('conta não liberada no modo de desenvolvimento volta com mensagem própria', async () => {
    spotify.meStatus = 403;
    const tokenBob = await login(env, 'bob', 'Bob#Senha-forte1');
    expect((await connect(tokenBob)).searchParams.get('auth_error')).toBe('spotify_nao_liberado');
  });

  it('o texto cifrado de um usuário não abre em outro', async () => {
    const { encryptSecret, decryptSecret } = await import('../../functions/api/_lib/crypto.js');
    const packed = await encryptSecret(env, 'segredo', 'usr_ana');
    expect(await decryptSecret(env, packed, 'usr_ana')).toBe('segredo');
    expect(await decryptSecret(env, packed, 'usr_bob')).toBeNull();
  });

  it('chave ausente ou fora do formato é recusada com erro genérico', async () => {
    const { encryptSecret } = await import('../../functions/api/_lib/crypto.js');
    for (const bad of [undefined, 'curta', btoa('x'.repeat(16))]) {
      await expect(encryptSecret({ TOKEN_ENCRYPTION_KEY: bad }, 'x', 'u')).rejects.toThrow(/configuração do servidor/);
    }
  });

  it('sem credenciais do Spotify, conectar responde 503 amigável', async () => {
    const bare = { ...env, SPOTIFY_CLIENT_ID: undefined, SPOTIFY_CLIENT_SECRET: undefined };
    const t = tokenAna;
    const r = await call(bare, '/api/integrations/spotify/start', { method: 'POST', token: t });
    expect(r.status).toBe(503); expect(r.json.code).toBe('provedor_indisponivel');
  });

  it('desconectar apaga a linha e a música deixa de aparecer', async () => {
    await connect();
    expect((await call(env, '/api/integrations/spotify', { method: 'DELETE', token: tokenAna })).json.success).toBe(true);
    expect(await env.DB.prepare('SELECT 1 FROM spotify_connections WHERE user_id = ?').bind('usr_ana').first()).toBeNull();
    expect((await call(env, '/api/integrations/spotify/now-playing', { token: tokenAna })).json.connected).toBe(false);
  });
});
