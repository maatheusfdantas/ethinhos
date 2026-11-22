// Tema da interface (proposta 12): claro (lavanda, padrão) ou escuro. Fica no navegador.
const CHAVE = 'ethos_tema';
export const TEMAS = ['claro', 'escuro'];

export function lerTema(storage = globalThis.localStorage) {
  try {
    const t = storage?.getItem(CHAVE);
    return TEMAS.includes(t) ? t : 'claro';
  } catch {
    return 'claro';
  }
}

/** Aplica no <html> (data-theme="dark" liga os tokens escuros de roxo.css). */
export function aplicarTema(tema, doc = globalThis.document) {
  if (!doc?.documentElement) return;
  if (tema === 'escuro') doc.documentElement.dataset.theme = 'dark';
  else delete doc.documentElement.dataset.theme;
}

export function salvarTema(tema, storage = globalThis.localStorage) {
  try { storage?.setItem(CHAVE, tema); } catch { /* sem armazenamento: vale só nesta visita */ }
  aplicarTema(tema);
}

// Menu lateral recolhido (só ícones) no computador
const CHAVE_MENU = 'ethos_menu_recolhido';
export function lerMenuRecolhido(storage = globalThis.localStorage) {
  try { return storage?.getItem(CHAVE_MENU) === '1'; } catch { return false; }
}
export function salvarMenuRecolhido(v, storage = globalThis.localStorage) {
  try { storage?.setItem(CHAVE_MENU, v ? '1' : '0'); } catch { /* sem armazenamento */ }
}
