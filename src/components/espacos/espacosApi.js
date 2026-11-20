import { apiFetch } from '../../utils/api';

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
    err.field = json?.field;
    throw err;
  }
  return json;
}

const enc = encodeURIComponent;

export const espacosApi = {
  meu: () => req('/api/espacos/meu'),
  meus: () => req('/api/espacos/meus'),
  previa: (code) => req('/api/espacos/convites/previa', { method: 'POST', body: { code } }),
  aceitar: (code, adult) => req('/api/espacos/convites/aceitar', { method: 'POST', body: { code, adult } }),
  sairTurma: (memberId) => req(`/api/espacos/meus/turmas/${encodeURIComponent(memberId)}`, { method: 'DELETE', body: {} }),
  encerrarMeu: (linkId) => req(`/api/espacos/meus/${encodeURIComponent(linkId)}`, { method: 'DELETE', body: {} }),
  criarTurma: (body) => req('/api/espacos/turmas', { method: 'POST', body }),
  turma: (id) => req(`/api/espacos/turmas/${encodeURIComponent(id)}`),
  editarTurma: (id, body) => req(`/api/espacos/turmas/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  gerarConvite: (id) => req(`/api/espacos/turmas/${encodeURIComponent(id)}/convite`, { method: 'POST', body: {} }),
  removerMembro: (id, memberId) => req(`/api/espacos/turmas/${encodeURIComponent(id)}/membros/${encodeURIComponent(memberId)}`, { method: 'DELETE', body: {} }),
  conviteIndividual: () => req('/api/espacos/convite-individual', { method: 'POST', body: {} }),
  revogar: (inviteId) => req(`/api/espacos/convites/${encodeURIComponent(inviteId)}`, { method: 'DELETE', body: {} }),
  pessoas: () => req('/api/espacos/pessoas'),
  encerrarPessoa: (linkId) => req(`/api/espacos/pessoas/${encodeURIComponent(linkId)}`, { method: 'DELETE', body: {} }),
  // Lote D2: visão geral com ações, fichas com versões, atribuição e acompanhamento
  visao: () => req('/api/espacos/visao'),
  visto: () => req('/api/espacos/visao/visto', { method: 'POST', body: {} }),
  fichas: () => req('/api/espacos/fichas'),
  ficha: (id) => req(`/api/espacos/fichas/${enc(id)}`),
  criarFicha: (body) => req('/api/espacos/fichas', { method: 'POST', body }),
  editarFicha: (id, body) => req(`/api/espacos/fichas/${enc(id)}`, { method: 'PUT', body }),
  novaVersao: (id, content) => req(`/api/espacos/fichas/${enc(id)}/versoes`, { method: 'POST', body: { content } }),
  levarVersao: (id, assignmentIds) => req(`/api/espacos/fichas/${enc(id)}/atualizar`, { method: 'POST', body: { assignmentIds } }),
  atribuir: (body) => req('/api/espacos/atribuir', { method: 'POST', body }),
  atribuicoesTurma: (id) => req(`/api/espacos/turmas/${enc(id)}/atribuicoes`),
  acompanhamento: (linkId) => req(`/api/espacos/pessoas/${enc(linkId)}/acompanhamento`),
  adaptar: (id, content, note) => req(`/api/espacos/atribuicoes/${enc(id)}`, { method: 'PUT', body: { content, note } }),
  permissao: (id, allowClientEdit) => req(`/api/espacos/atribuicoes/${enc(id)}/permissao`, { method: 'PUT', body: { allowClientEdit } }),
  encerrarAtribuicao: (id) => req(`/api/espacos/atribuicoes/${enc(id)}`, { method: 'DELETE', body: {} }),
  sessao: (id) => req(`/api/espacos/sessoes/${enc(id)}`),
  config: (body) => req('/api/espacos/config', { method: 'PUT', body }),
  atribuidos: () => req('/api/treino/atribuidos'),
  editarAtribuido: (id, content) => req(`/api/treino/atribuidos/${enc(id)}`, { method: 'PUT', body: { content } }),
  adminLista: () => req('/api/admin/profissionais'),
  adminBusca: (q) => req(`/api/admin/profissionais/busca?q=${encodeURIComponent(q)}`),
  adminAtivar: (body) => req('/api/admin/profissionais', { method: 'POST', body }),
  adminAlterar: (userId, body) => req(`/api/admin/profissionais/${encodeURIComponent(userId)}`, { method: 'PUT', body })
};

export const MODEL_OPTIONS = [
  { id: 'personal', label: 'Personal' },
  { id: 'nutri', label: 'Nutricionista' },
  { id: 'clinica', label: 'Organização Clínica' }
];

export const initialsOf = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
export const fmtUntil = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
