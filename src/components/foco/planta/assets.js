// Todos os desenhos de src/assets/plantas/<especie>/<assetKey>.(svg|png|webp), resolvidos pelo Vite.
// Para trocar a arte de um estágio, substitua o arquivo com o mesmo nome (pode mudar a extensão).
const ARQUIVOS = import.meta.glob('../../../assets/plantas/*/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' });

export function urlDoAsset(especieId, assetKey) {
  for (const ext of ['svg', 'png', 'webp']) {
    const url = ARQUIVOS[`../../../assets/plantas/${especieId}/${assetKey}.${ext}`];
    if (url) return url;
  }
  return null;
}
