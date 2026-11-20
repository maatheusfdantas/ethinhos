import { apiFetch } from '../../utils/api';

/** Chamada à API do treino. Lança Error com status e code quando a resposta não é ok. */
async function req(url, { method = 'GET', body } = {}) {
  const res = await apiFetch(url, body === undefined ? { method } : { method, body: JSON.stringify(body) });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    const err = new Error(json?.error || 'Não foi possível falar com o servidor.');
    err.status = res.status;
    err.code = json?.code;
    throw err;
  }
  return json;
}

export const treinoApi = {
  aberta: () => req('/api/treino/sessao-aberta'),
  iniciar: (body) => req('/api/treino/sessoes', { method: 'POST', body }),
  serie: (id, body) => req(`/api/treino/sessoes/${encodeURIComponent(id)}/series`, { method: 'PUT', body }),
  desfazer: (id, body) => req(`/api/treino/sessoes/${encodeURIComponent(id)}/series`, { method: 'DELETE', body }),
  pausa: (id, pausado) => req(`/api/treino/sessoes/${encodeURIComponent(id)}/pausa`, { method: 'POST', body: { pausado } }),
  finalizar: (id) => req(`/api/treino/sessoes/${encodeURIComponent(id)}/finalizar`, { method: 'POST', body: {} }),
  descartar: (id) => req(`/api/treino/sessoes/${encodeURIComponent(id)}`, { method: 'DELETE', body: {} }),
  historico: (limit = 60) => req(`/api/treino/historico?limit=${limit}`),
  ultimas: (keys) => req(`/api/treino/ultimas?keys=${encodeURIComponent(keys.join(','))}`),
  progresso: (key) => req(`/api/treino/progresso?key=${encodeURIComponent(key)}`),
  // Fichas atribuídas por um profissional (lote D2)
  atribuidos: () => req('/api/treino/atribuidos'),
  editarAtribuido: (id, content) => req(`/api/treino/atribuidos/${encodeURIComponent(id)}`, { method: 'PUT', body: { content } })
};

export const newSessionId = () => `sess_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`}`;

/** Medida do exercício: tempo (prancha/isometria), carga, ou só repetições. */
export function metricOf(ex) {
  if (/prancha|isom[eé]tric|segundos/i.test(ex?.name || '')) return 'tempo';
  if (ex?.showWeight === false || !(Number(ex?.weightKg) > 0)) return 'reps';
  return 'kg';
}

export const fmtKg = (n) => String(Math.round(Number(n) * 10) / 10).replace('.', ',');

export function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
