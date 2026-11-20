/**
 * Prepara a imagem no navegador antes de enviar (proposta 07, decisão 5):
 * recorte no centro (capa 4:1, foto quadrada), redução de tamanho e regravação em JPEG.
 * Regravar descarta metadados do arquivo original (como localização GPS).
 */
const SPEC = { capa: { w: 1600, h: 400, max: 2 * 1024 * 1024 }, foto: { w: 512, h: 512, max: 1024 * 1024 } };
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}

export async function prepararImagem(file, kind) {
  const spec = SPEC[kind];
  if (!file || !spec) throw new Error('Escolha uma imagem.');
  if (!ACCEPT.includes(file.type)) throw new Error('Use uma imagem JPG, PNG ou WebP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('A imagem original passa de 15 MB.');
  const img = await loadImage(file);
  const ratio = spec.w / spec.h;
  let sw = img.naturalWidth;
  let sh = sw / ratio;
  if (sh > img.naturalHeight) { sh = img.naturalHeight; sw = sh * ratio; }
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(spec.w, Math.round(sw));
  canvas.height = Math.round(canvas.width / ratio);
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  for (const q of [0.86, 0.75, 0.62, 0.5]) {
    const data = canvas.toDataURL('image/jpeg', q);
    if ((data.length - 23) * 0.75 <= spec.max) return data;
  }
  throw new Error('A imagem continua grande demais. Tente outra.');
}
