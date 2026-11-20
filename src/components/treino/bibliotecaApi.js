import { req } from '../espacos/espacosApi';

/**
 * Biblioteca de exercícios (proposta 07). A base (250) vem do servidor uma vez e fica em memória;
 * a busca é local (rápida, sem API externa). Personalizados e correções de nome vêm junto.
 */
let cache = null;
let pending = null;

export async function loadBiblioteca({ force = false } = {}) {
  if (cache && !force) return cache;
  if (pending && !force) return pending;
  pending = req('/api/exercicios').then((r) => {
    cache = { exercicios: r.exercicios || [], personalizados: r.personalizados || [], podeEditarEspaco: Boolean(r.podeEditarEspaco) };
    return cache;
  }).finally(() => { pending = null; });
  return pending;
}
export function cachedBiblioteca() { return cache; }
export function resetBibliotecaCache() { cache = null; }

export const bibliotecaApi = {
  criarPersonalizado: (body) => req('/api/exercicios/personalizados', { method: 'POST', body }),
  editarPersonalizado: (id, body) => req(`/api/exercicios/personalizados/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  arquivarPersonalizado: (id) => req(`/api/exercicios/personalizados/${encodeURIComponent(id)}/arquivar`, { method: 'POST', body: {} }),
  corrigirNome: (id, name) => req(`/api/exercicios/${encodeURIComponent(id)}/nome`, { method: 'PUT', body: { name } })
};

/** Exercício (da base ou personalizado) pelo id guardado na ficha. */
export function findExercise(lib, id) {
  if (!lib || !id) return null;
  return lib.exercicios.find((e) => e.id === id) || lib.personalizados.find((e) => e.id === id) || null;
}
