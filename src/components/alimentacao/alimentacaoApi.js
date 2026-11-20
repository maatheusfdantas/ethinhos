import { req } from '../espacos/espacosApi';
import { localISO } from './planoModel';

const enc = encodeURIComponent;
const hoje = () => localISO();

/** Chamadas da Alimentação (lote E). O "hoje" vai do navegador; o servidor só aceita se estiver a até 1 dia do UTC. */
export const alimentacaoApi = {
  // Pessoa
  planos: () => req(`/api/alimentacao?hoje=${hoje()}`),
  dia: (planId, date) => req(`/api/alimentacao/dia?planId=${enc(planId)}&date=${enc(date)}&hoje=${hoje()}`),
  semana: (planId, from) => req(`/api/alimentacao/semana?planId=${enc(planId)}&from=${enc(from)}&hoje=${hoje()}`),
  versao: (planId, version) => req(`/api/alimentacao/planos/${enc(planId)}/versoes/${enc(version)}`),
  registrar: (body) => req('/api/alimentacao/registros', { method: 'PUT', body: { ...body, hoje: hoje() } }),
  apagar: (body) => req('/api/alimentacao/registros/apagar', { method: 'POST', body: { ...body, hoje: hoje() } }),
  extra: (body) => req('/api/alimentacao/extras', { method: 'POST', body: { ...body, hoje: hoje() } }),

  // Nutricionista
  modelos: () => req('/api/espacos/planos-modelo'),
  modelo: (id) => req(`/api/espacos/planos-modelo/${enc(id)}`),
  criarModelo: (name, content) => req('/api/espacos/planos-modelo', { method: 'POST', body: { name, content } }),
  salvarModelo: (id, name, content) => req(`/api/espacos/planos-modelo/${enc(id)}`, { method: 'PUT', body: { name, content } }),
  arquivarModelo: (id) => req(`/api/espacos/planos-modelo/${enc(id)}/arquivar`, { method: 'POST', body: {} }),
  planoPessoa: (linkId) => req(`/api/espacos/pessoas/${enc(linkId)}/plano?hoje=${hoje()}`),
  criarPlano: (linkId, name, modeloId = null) => req(`/api/espacos/pessoas/${enc(linkId)}/plano`, { method: 'POST', body: { name, modeloId } }),
  salvarRascunho: (planId, name, content) => req(`/api/espacos/planos/${enc(planId)}/rascunho`, { method: 'PUT', body: { name, content } }),
  publicar: (planId, startsOn, endsOn) => req(`/api/espacos/planos/${enc(planId)}/publicar`, { method: 'POST', body: { startsOn, endsOn: endsOn || null, hoje: hoje() } }),
  encerrar: (planId) => req(`/api/espacos/planos/${enc(planId)}/encerrar`, { method: 'POST', body: {} }),
  registrosPessoa: (linkId, from) => req(`/api/espacos/pessoas/${enc(linkId)}/alimentacao?from=${enc(from)}&hoje=${hoje()}`),
  planosTurma: (groupId) => req(`/api/espacos/turmas/${enc(groupId)}/planos?hoje=${hoje()}`)
};

/** "sex., 20/11" a partir de AAAA-MM-DD (sem fuso). */
export function fmtDia(dateStr, { weekday = true } = {}) {
  const [y, m, d] = String(dateStr || '').split('-').map(Number);
  if (!y) return '';
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR', weekday ? { weekday: 'short', day: '2-digit', month: '2-digit' } : { day: '2-digit', month: '2-digit' });
}
