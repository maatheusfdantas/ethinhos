// Catálogo expandido de cultivo do Foco (Pomodoro):
// - 20 novas Plantas (+ Lírio-lunar original preservado = 21 Plantas)
// - 20 Mundos
// - 20 Elementos
// Todos seguem exatamente a mesma arquitetura de progressão (0%, 10%, 35%, 65%, 100% + murcha + chão)
// e o sistema de coordenadas (viewBox 0 0 120 100 com base em 60,100; chão 0 0 120 34 com superfície em y=6)
// do Lírio-lunar original.

export const TEMAS_CULTIVO = [
  { id: 'plantas', nome: 'Plantas', icone: '🌱', descricao: 'Espécies botânicas luminosas que germinam, criam folhas e florescem.' },
  { id: 'mundos', nome: 'Mundos', icone: '🪐', descricao: 'Planetas, ilhas flutuantes e estrelas que ganham atmosfera, anéis e luas.' },
  { id: 'elementos', nome: 'Elementos', icone: '✨', descricao: 'Forças primordiais, cristais e chamas que evoluem da centelha à manifestação.' }
];

export const PALETAS_ALTERNADAS = [
  { id: 'lavanda-safira', nome: 'Lavanda & Safira', c1: '#C4B5FD', c2: '#60A5FA', c3: '#7C5CFF', light: '#EDE9FE', groundTop: '#5B4FA0', groundMid: '#4A3F86', groundBase: '#1E1A3A' },
  { id: 'esmeralda-turquesa', nome: 'Esmeralda & Turquesa', c1: '#6EE7B7', c2: '#2DD4BF', c3: '#059669', light: '#ECFDF5', groundTop: '#1F6F5B', groundMid: '#155243', groundBase: '#0B2922' },
  { id: 'ambar-coral', nome: 'Âmbar & Coral', c1: '#FCD34D', c2: '#FB7185', c3: '#EA580C', light: '#FEF3C7', groundTop: '#7C3E2F', groundMid: '#5F2D22', groundBase: '#2C1410' },
  { id: 'rosa-ametista', nome: 'Rosa & Ametista', c1: '#F9A8D4', c2: '#C084FC', c3: '#9333EA', light: '#FCE7F3', groundTop: '#6B346E', groundMid: '#522654', groundBase: '#28112B' },
  { id: 'ciano-ceu', nome: 'Ciano & Céu', c1: '#67E8F9', c2: '#38BDF8', c3: '#0284C7', light: '#E0F2FE', groundTop: '#245C7A', groundMid: '#1B465E', groundBase: '#0D2331' },
  { id: 'rubi-ouro', nome: 'Rubi & Ouro', c1: '#FDA4AF', c2: '#FBBF24', c3: '#E11D48', light: '#FFE4E6', groundTop: '#75293D', groundMid: '#581D2D', groundBase: '#2B0D16' },
  { id: 'jade-menta', nome: 'Jade & Menta', c1: '#A7F3D0', c2: '#34D399', c3: '#0D9488', light: '#F0FDF4', groundTop: '#286656', groundMid: '#1E4E42', groundBase: '#0F2721' },
  { id: 'indigo-fucsia', nome: 'Índigo & Fúcsia', c1: '#A5B4FC', c2: '#E879F9', c3: '#4F46E5', light: '#E0E7FF', groundTop: '#463B84', groundMid: '#352B66', groundBase: '#191436' },
  { id: 'sol-laranja', nome: 'Sol & Laranja', c1: '#FDE047', c2: '#FB923C', c3: '#D97706', light: '#FEF9C3', groundTop: '#785027', groundMid: '#5C3C1C', groundBase: '#2D1C0B' },
  { id: 'violeta-prata', nome: 'Violeta & Prata', c1: '#DDD6FE', c2: '#94A3B8', c3: '#6D28D9', light: '#F8FAFC', groundTop: '#524974', groundMid: '#3F375B', groundBase: '#1E1A2D' },
  { id: 'oceano-perola', nome: 'Oceano & Pérola', c1: '#93C5FD', c2: '#5EEAD4', c3: '#1D4ED8', light: '#EFF6FF', groundTop: '#294B78', groundMid: '#1F395C', groundBase: '#0F1C30' },
  { id: 'carmesim-quartzo', nome: 'Carmesim & Quartzo', c1: '#FECDD3', c2: '#F43F5E', c3: '#9F1239', light: '#FFF1F2', groundTop: '#6E2A3F', groundMid: '#541E30', groundBase: '#290E17' },
  { id: 'floresta-lima', nome: 'Floresta & Lima', c1: '#BEF264', c2: '#4ADE80', c3: '#15803D', light: '#F7FEE7', groundTop: '#3B6633', groundMid: '#2C4E26', groundBase: '#152712' },
  { id: 'ametista-neon', nome: 'Ametista & Neon', c1: '#E9D5FF', c2: '#F472B6', c3: '#7E22CE', light: '#FAF5FF', groundTop: '#5E347A', groundMid: '#47265D', groundBase: '#22112E' },
  { id: 'cobre-aguamarinha', nome: 'Cobre & Água-Marinha', c1: '#FDBA74', c2: '#2DD4BF', c3: '#C2410C', light: '#FFEDD5', groundTop: '#6A4739', groundMid: '#51352B', groundBase: '#271914' },
  { id: 'gelo-celeste', nome: 'Gelo & Celeste', c1: '#BAE6FD', c2: '#818CF8', c3: '#0369A1', light: '#F0F9FF', groundTop: '#355A7C', groundMid: '#27445F', groundBase: '#122130' },
  { id: 'ouro-mel', nome: 'Ouro & Mel', c1: '#FDE68A', c2: '#F59E0B', c3: '#B45309', light: '#FFFBEB', groundTop: '#735828', groundMid: '#57421D', groundBase: '#2B200D' },
  { id: 'nebulosa-lilas', nome: 'Nebulosa & Lilás', c1: '#D8B4FE', c2: '#38BDF8', c3: '#6B21A8', light: '#F3E8FF', groundTop: '#4F3978', groundMid: '#3C2B5C', groundBase: '#1C142D' },
  { id: 'aurora-esmeralda', nome: 'Aurora & Esmeralda', c1: '#86EFAC', c2: '#A78BFA', c3: '#047857', light: '#DCFCE7', groundTop: '#2E6359', groundMid: '#224B43', groundBase: '#102420' },
  { id: 'estelar-cobalto', nome: 'Estelar & Cobalto', c1: '#7DD3FC', c2: '#6366F1', c3: '#1E40AF', light: '#E0F2FE', groundTop: '#2E437A', groundMid: '#22325D', groundBase: '#10182E' }
];

const RAW_PLANTAS = [
  { id: 'lotus-aurora', nome: 'Lótus da Aurora', subtitulo: 'Pétalas duplas sobre águas serenas', variant: 0 },
  { id: 'cerejeira-solar', nome: 'Cerejeira Solar', subtitulo: 'Tronco bonsai com copa radiante', variant: 1 },
  { id: 'orquidea-nebulosa', nome: 'Orquídea Nebulosa', subtitulo: 'Sinos suspensos de luz estelar', variant: 4 },
  { id: 'samambaia-celeste', nome: 'Samambaia Celeste', subtitulo: 'Frondes espirais que se desenrolam', variant: 2 },
  { id: 'rosa-estelar', nome: 'Rosa Estelar', subtitulo: 'Corola multifacetada com brilho dourado', variant: 0 },
  { id: 'bambu-jade', nome: 'Bambu de Jade', subtitulo: 'Colmos elegantes de crescimento firme', variant: 3 },
  { id: 'iris-crepusculo', nome: 'Íris do Crepúsculo', subtitulo: 'Três pétalas altas em harmonia noturna', variant: 4 },
  { id: 'girassol-cosmos', nome: 'Girassol do Cosmos', subtitulo: 'Coroa solar que acompanha o foco', variant: 0 },
  { id: 'lavanda-prateada', nome: 'Lavanda Prateada', subtitulo: 'Espigas aromáticas de calma profunda', variant: 2 },
  { id: 'nenufar-abissal', nome: 'Nenúfar Abissal', subtitulo: 'Flor aquática com núcleo perolado', variant: 0 },
  { id: 'camelia-rubra', nome: 'Camélia Rubra', subtitulo: 'Pétalas simétricas de alta energia', variant: 1 },
  { id: 'musgo-luminescente', nome: 'Bonsai Luminescente', subtitulo: 'Raízes firmes e copa bioluminescente', variant: 1 },
  { id: 'dalia-ametista', nome: 'Dália de Ametista', subtitulo: 'Geometria floral em camadas', variant: 0 },
  { id: 'cacto-coroa', nome: 'Cacto Coroa-de-Fogo', subtitulo: 'Resistência do deserto com flor no topo', variant: 3 },
  { id: 'edelweiss-glacial', nome: 'Edelweiss Glacial', subtitulo: 'Estrela alpina que floresce no frio', variant: 4 },
  { id: 'acacia-dourada', nome: 'Acácia Dourada', subtitulo: 'Ramos abertos com cachos de ouro', variant: 1 },
  { id: 'glicinia-mistica', nome: 'Glicínia Mística', subtitulo: 'Cascatas florais pendentes', variant: 4 },
  { id: 'bromelia-aurora', nome: 'Bromélia Boreal', subtitulo: 'Roseta tropical com brácteas vibrantes', variant: 2 },
  { id: 'tulipa-cobalto', nome: 'Tulipa de Cobalto', subtitulo: 'Cálice sereno de pétalas acetinadas', variant: 3 },
  { id: 'suculenta-zen', nome: 'Rosa-de-Pedra Zen', subtitulo: 'Espiral suculenta com haste floral', variant: 3 }
];

const RAW_MUNDOS = [
  { id: 'mundo-aether', nome: 'Aetheris', subtitulo: 'Gigante com anéis duplos de safira', variant: 0 },
  { id: 'mundo-veridia', nome: 'Verídia', subtitulo: 'Arquipélago vivo e oceanos turquesa', variant: 1 },
  { id: 'mundo-solaris', nome: 'Soláris', subtitulo: 'Sistema binário de estrelas douradas', variant: 3 },
  { id: 'mundo-lyra', nome: 'Ilha de Lyra', subtitulo: 'Santuário flutuante com cachoeiras', variant: 2 },
  { id: 'mundo-cryon', nome: 'Cryon', subtitulo: 'Geodo planetário de gelo cristalino', variant: 4 },
  { id: 'mundo-ignis', nome: 'Ignis Prime', subtitulo: 'Mundo vulcânico com anel de brasas', variant: 0 },
  { id: 'mundo-eden', nome: 'Éden Suspenso', subtitulo: 'Ilha celeste com árvore da vida', variant: 2 },
  { id: 'mundo-nyx', nome: 'Nyx', subtitulo: 'Planeta noturno cercado por três luas', variant: 0 },
  { id: 'mundo-helios', nome: 'Hélios', subtitulo: 'Estrela gêmea com ponte de plasma', variant: 3 },
  { id: 'mundo-selene', nome: 'Selene', subtitulo: 'Lua facetada de prata e quartzo', variant: 4 },
  { id: 'mundo-thalassa', nome: 'Thalassa', subtitulo: 'Mundo oceânico com correntes boreais', variant: 1 },
  { id: 'mundo-rubicon', nome: 'Rubicon', subtitulo: 'Núcleo lapidado em cristal carmesim', variant: 4 },
  { id: 'mundo-gaia', nome: 'Gaia Boreal', subtitulo: 'Continentes verdes e aurora polar', variant: 1 },
  { id: 'mundo-vortex', nome: 'Nébula Vórtex', subtitulo: 'Berçário pulsar de duas estrelas', variant: 3 },
  { id: 'mundo-atlas', nome: 'Atlas', subtitulo: 'Planeta cinturado por anéis de cobre', variant: 0 },
  { id: 'mundo-polaris', nome: 'Poláris', subtitulo: 'Orbe facetado da estrela guia', variant: 4 },
  { id: 'mundo-midas', nome: 'Midas', subtitulo: 'Esfera áurea com satélites em órbita', variant: 0 },
  { id: 'mundo-orion', nome: 'Berçário de Órion', subtitulo: 'Nebulosa viva com sóis nascentes', variant: 3 },
  { id: 'mundo-borealis', nome: 'Borealis', subtitulo: 'Ilha flutuante sob cortinas de aurora', variant: 2 },
  { id: 'mundo-cosmos', nome: 'Citadela Cobalto', subtitulo: 'Monólito celeste em órbita estável', variant: 2 }
];

const RAW_ELEMENTOS = [
  { id: 'elem-eter', nome: 'Éter Astral', subtitulo: 'Espirais de energia pura e runas', variant: 4 },
  { id: 'elem-esmeralda', nome: 'Cristal de Esmeralda', subtitulo: 'Drusa hexagonal que refrata a luz', variant: 1 },
  { id: 'elem-chama', nome: 'Chama Solar', subtitulo: 'Fogo vivo que ascende sem queimar', variant: 0 },
  { id: 'elem-quartzo', nome: 'Quartzo Rosa', subtitulo: 'Obeliscos gêmeos de serenidade', variant: 1 },
  { id: 'elem-mare', nome: 'Maré Celeste', subtitulo: 'Vórtice de água cristalina em ascensão', variant: 2 },
  { id: 'elem-magma', nome: 'Magma Rubi', subtitulo: 'Núcleo incandescente com fagulhas', variant: 0 },
  { id: 'elem-brisa', nome: 'Brisa de Jade', subtitulo: 'Correntes de vento visíveis em espiral', variant: 4 },
  { id: 'elem-relampago', nome: 'Relâmpago Índigo', subtitulo: 'Arcos voltaicos contidos em equilíbrio', variant: 3 },
  { id: 'elem-fogo-rei', nome: 'Fogo Primordial', subtitulo: 'Coroa ardente de foco inabalável', variant: 0 },
  { id: 'elem-mercurio', nome: 'Mercúrio Lunar', subtitulo: 'Metal líquido que flutua em gotas', variant: 2 },
  { id: 'elem-abismo', nome: 'Turbilhão Oceânico', subtitulo: 'Onda espiral coroada por espuma', variant: 2 },
  { id: 'elem-rubi', nome: 'Prisma Carmesim', subtitulo: 'Agulhas de rubi em formação estelar', variant: 1 },
  { id: 'elem-seiva', nome: 'Essência da Floresta', subtitulo: 'Fitas vitais de energia botânica', variant: 4 },
  { id: 'elem-plasma', nome: 'Plasma de Ametista', subtitulo: 'Descarga magnética com orbe central', variant: 3 },
  { id: 'elem-bronze', nome: 'Centelha de Cobre', subtitulo: 'Condutor elétrico com halo turquesa', variant: 3 },
  { id: 'elem-geada', nome: 'Geada Cristalina', subtitulo: 'Pináculos de gelo eterno', variant: 1 },
  { id: 'elem-ouro', nome: 'Alquimia Dourada', subtitulo: 'Transmutação luminosa em cinco atos', variant: 0 },
  { id: 'elem-nevoa', nome: 'Névoa Cósmica', subtitulo: 'Vórtice etéreo de poeira estelar', variant: 4 },
  { id: 'elem-aurora', nome: 'Pulso Boreal', subtitulo: 'Ondas magnéticas que dançam no ar', variant: 2 },
  { id: 'elem-tempestade', nome: 'Trovão Cobalto', subtitulo: 'Núcleo de tempestade em alta voltagem', variant: 3 }
];

function montarEstagios(tema) {
  if (tema === 'mundos') {
    return [
      { stageId: 'semente', minProgress: 0, assetKey: 'semente', nome: 'Núcleo' },
      { stageId: 'broto', minProgress: 0.1, assetKey: 'broto', nome: 'Protoplaneta' },
      { stageId: 'muda', minProgress: 0.35, assetKey: 'muda', nome: 'Crosta' },
      { stageId: 'jovem', minProgress: 0.65, assetKey: 'jovem', nome: 'Atmosfera' },
      { stageId: 'florida', minProgress: 1, assetKey: 'florida', nome: 'Mundo Pleno' }
    ];
  }
  if (tema === 'elementos') {
    return [
      { stageId: 'semente', minProgress: 0, assetKey: 'semente', nome: 'Centelha' },
      { stageId: 'broto', minProgress: 0.1, assetKey: 'broto', nome: 'Pulso' },
      { stageId: 'muda', minProgress: 0.35, assetKey: 'muda', nome: 'Fluxo' },
      { stageId: 'jovem', minProgress: 0.65, assetKey: 'jovem', nome: 'Vórtice' },
      { stageId: 'florida', minProgress: 1, assetKey: 'florida', nome: 'Manifestação' }
    ];
  }
  return [
    { stageId: 'semente', minProgress: 0, assetKey: 'semente', nome: 'Semente' },
    { stageId: 'broto', minProgress: 0.1, assetKey: 'broto', nome: 'Broto' },
    { stageId: 'muda', minProgress: 0.35, assetKey: 'muda', nome: 'Muda' },
    { stageId: 'jovem', minProgress: 0.65, assetKey: 'jovem', nome: 'Jovem' },
    { stageId: 'florida', minProgress: 1, assetKey: 'florida', nome: 'Florida' }
  ];
}

function criarEntradaCatalogo(item, idx, tema) {
  // Alterna as 20 paletas com deslocamento por tema para garantir alternância visual em todas as listas
  const offset = tema === 'plantas' ? 1 : tema === 'mundos' ? 0 : 2;
  const paleta = PALETAS_ALTERNADAS[(idx + offset) % PALETAS_ALTERNADAS.length];
  return {
    id: item.id,
    nome: item.nome,
    subtitulo: item.subtitulo,
    tema,
    variant: item.variant,
    indiceTema: idx + 1,
    paleta,
    estagios: montarEstagios(tema),
    murcha: {
      stageId: 'murcha',
      assetKey: 'murcha',
      nome: tema === 'mundos' ? 'Eclipsado' : tema === 'elementos' ? 'Dissipado' : 'Murcha'
    },
    chao: 'chao',
    entrada: { ms: 320, escala: 0.88 }
  };
}

export const CATALOGO_EXTRA = [
  ...RAW_PLANTAS.map((it, i) => criarEntradaCatalogo(it, i, 'plantas')),
  ...RAW_MUNDOS.map((it, i) => criarEntradaCatalogo(it, i, 'mundos')),
  ...RAW_ELEMENTOS.map((it, i) => criarEntradaCatalogo(it, i, 'elementos'))
];

const MAPA_EXTRA = new Map(CATALOGO_EXTRA.map((e) => [e.id, e]));

/* ============================================================================
 * GERADOR DETERMINÍSTICO DE SVG (MESMA GEOMETRIA BASE DO LÍRIO-LUNAR)
 * - Estágios: viewBox="0 0 120 100", ancorados em (60, 100)
 * - Chão: viewBox="0 0 120 34", superfície em y = 6
 * ============================================================================ */

function svgChao(e) {
  const { paleta, tema } = e;
  if (tema === 'mundos') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 34" role="img" aria-label="Base orbital de ${e.nome}">
<defs><linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paleta.groundMid}"/><stop offset="1" stop-color="${paleta.groundBase}"/></linearGradient></defs>
<ellipse cx="60" cy="10" rx="46" ry="7" fill="none" stroke="${paleta.c2}" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="4 3"/>
<path d="M20 7 Q60 0 100 7 Q94 21 78 27 Q60 33 42 27 Q26 21 20 7Z" fill="url(#gBase)"/>
<ellipse cx="60" cy="6.5" rx="40" ry="4.5" fill="${paleta.groundTop}"/>
<ellipse cx="60" cy="6" rx="26" ry="2.6" fill="${paleta.c1}" opacity=".45"/>
</svg>`;
  }
  if (tema === 'elementos') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 34" role="img" aria-label="Altar elemental de ${e.nome}">
<defs><linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paleta.groundMid}"/><stop offset="1" stop-color="${paleta.groundBase}"/></linearGradient></defs>
<polygon points="16,7 60,1 104,7 88,27 60,32 32,27" fill="url(#gBase)"/>
<ellipse cx="60" cy="6" rx="42" ry="4.6" fill="${paleta.groundTop}"/>
<ellipse cx="60" cy="5.6" rx="30" ry="2.8" fill="${paleta.c2}" opacity=".5"/>
<circle cx="38" cy="16" r="1.6" fill="${paleta.c1}" opacity=".65"/><circle cx="60" cy="19" r="1.8" fill="${paleta.c1}" opacity=".75"/><circle cx="82" cy="16" r="1.6" fill="${paleta.c1}" opacity=".65"/>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 34" role="img" aria-label="Ilha de ${e.nome}">
<defs><linearGradient id="rocha" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paleta.groundMid}"/><stop offset="1" stop-color="${paleta.groundBase}"/></linearGradient></defs>
<path d="M16 6 Q60 -2 104 6 Q100 20 84 27 Q62 36 38 28 Q20 21 16 6Z" fill="url(#rocha)"/>
<ellipse cx="60" cy="6" rx="44" ry="5" fill="${paleta.groundMid}"/>
<ellipse cx="60" cy="5.2" rx="40" ry="3.6" fill="${paleta.groundTop}" opacity=".75"/>
<ellipse cx="42" cy="17" rx="3.4" ry="1.6" fill="${paleta.groundBase}" opacity=".6"/><ellipse cx="76" cy="21" rx="2.4" ry="1.2" fill="${paleta.groundBase}" opacity=".6"/>
</svg>`;
}

function defsPadrao(p) {
  return `<defs>
  <linearGradient id="folha" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c3}"/></linearGradient>
  <linearGradient id="folhaB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.c2}"/><stop offset="1" stop-color="${p.c3}"/></linearGradient>
  <linearGradient id="petala" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset=".55" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient>
  <radialGradient id="brilho"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="${p.c1}" stop-opacity="0"/></radialGradient>
</defs>`;
}

/* ---------- 1. PLANTAS (5 arquétipos progressivos) ---------- */
function svgPlanta(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Semente de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="3.2" fill="${p.groundMid}"/>
<circle cx="60" cy="93.5" r="10" fill="url(#brilho)" opacity=".75"/>
<ellipse cx="60" cy="94.5" rx="${3.4 + (v % 2) * 0.6}" ry="4.5" fill="url(#petala)"/>
<ellipse cx="59" cy="93.2" rx="1.2" ry="1.6" fill="#FFFFFF" opacity=".85"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Broto de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="8" ry="2.6" fill="${p.groundMid}"/>
<path d="M60 100 C60 93 61 88 60 81" fill="none" stroke="${p.c1}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M60 85 C54.5 84.5 50 80.5 50.8 76.5 C54.2 76.2 58.8 79.5 60 85Z" fill="url(#folha)"/>
<path d="M60 82 C65 81.5 69.2 78 68.6 74.4 C65.4 74 61 77.2 60 82Z" fill="url(#folhaB)"/>
<circle cx="60" cy="79" r="2.2" fill="${p.light}" opacity=".8"/>
</svg>`;
  }

  if (stage === 'muda') {
    const galhoExtra = v === 1
      ? `<path d="M60 76 C53 72 49 67 47 62" fill="none" stroke="${p.c3}" stroke-width="2" stroke-linecap="round"/>
         <path d="M60 71 C67 67 71 62 73 57" fill="none" stroke="${p.c3}" stroke-width="2" stroke-linecap="round"/>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Muda de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="8.5" ry="2.6" fill="${p.groundMid}"/>
<path d="M60 100 C58 86 62 72 60 55" fill="none" stroke="${v === 1 ? p.c3 : p.c1}" stroke-width="${v === 3 ? 4.2 : 2.6}" stroke-linecap="round"/>
${galhoExtra}
<path d="M59.5 88 C52 87.5 46 82 46.6 76.5 C51.4 76 58 80 59.5 88Z" fill="url(#folha)"/>
<path d="M60.5 79 C67.5 78.5 73.5 73.5 72.8 68 C68.2 67.5 61.8 71.8 60.5 79Z" fill="url(#folhaB)"/>
<path d="M60.4 67 C54.5 66.5 49.5 62.2 50 57.6 C53.8 57.2 59.2 60.6 60.4 67Z" fill="url(#folha)"/>
<path d="M60 58 C64.8 57.6 68.8 54 68.3 50.4 C65.2 50 61 52.8 60 58Z" fill="url(#folhaB)"/>
</svg>`;
  }

  if (stage === 'jovem') {
    const botaoTopo = v === 1
      ? `<circle cx="46" cy="48" r="5" fill="url(#folha)"/><circle cx="74" cy="45" r="5" fill="url(#folhaB)"/><circle cx="60" cy="29" r="6.5" fill="url(#petala)"/>`
      : v === 4
      ? `<path d="M60 32 Q74 28 76 42" fill="none" stroke="${p.c1}" stroke-width="2"/><ellipse cx="76" cy="45" rx="4.5" ry="6.5" fill="url(#petala)"/>`
      : `<path d="M60 33 C55 27.5 55.5 19.5 60 14.5 C64.5 19.5 65 27.5 60 33Z" fill="${p.c3}" stroke="${p.c1}" stroke-width="1"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} jovem">${defs}
<ellipse cx="60" cy="99" rx="8.5" ry="2.6" fill="${p.groundMid}"/>
<path d="M60 100 C57 82 63 60 60 31" fill="none" stroke="${p.c1}" stroke-width="${v === 3 ? 4.8 : 2.7}" stroke-linecap="round"/>
${v === 1 ? `<path d="M60 68 C51 62 47 55 46 48" fill="none" stroke="${p.c1}" stroke-width="2.2"/><path d="M60 62 C69 56 73 51 74 45" fill="none" stroke="${p.c1}" stroke-width="2.2"/>` : ''}
<path d="M59.2 90 C50.5 89.4 43.2 83.2 43.8 76.6 C49.4 76 57.4 81 59.2 90Z" fill="url(#folha)"/>
<path d="M59.8 81 C68 80.4 75 74.5 74.4 68 C69 67.5 61.5 72.2 59.8 81Z" fill="url(#folhaB)"/>
<path d="M61 69 C53.4 68.5 47 63 47.6 57.2 C52.4 56.6 59.4 61 61 69Z" fill="url(#folha)"/>
<path d="M61.4 57 C68.2 56.5 74 51.6 73.5 46.2 C69 45.8 62.8 49.8 61.4 57Z" fill="url(#folhaB)"/>
<path d="M60.8 45 C55.4 44.6 50.8 40.8 51.2 36.6 C54.6 36.2 59.6 39.2 60.8 45Z" fill="url(#folha)"/>
${botaoTopo}
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} murcha">
<ellipse cx="60" cy="99" rx="8" ry="2.6" fill="#3A3460"/>
<path d="M60 100 C59 84 61 70 68 60 C74 52 80 54 82 62" fill="none" stroke="#6E6893" stroke-width="2.4" stroke-linecap="round"/>
<path d="M59.6 90 C52.6 93.1 46.6 98.9 47.1 93.4 C51.6 92.9 58.1 87.9 59.6 90Z" fill="#5D577F"/>
<path d="M60.2 80 C66.9 82.6 72.5 86.9 72.1 81.7 C67.8 81.2 61.6 77.4 60.2 80Z" fill="#6E6893"/>
<path d="M82 62 C79 66 79.5 72 82 76 C84.5 72 85 66 82 62Z" fill="#4E4870" stroke="#6E6893" stroke-width=".8"/>
</svg>`;
  }

  // Estágio 100%: florida (varia a coroa por arquétipo + índice)
  const petalCount = 5 + (e.indiceTema % 4); // 5, 6, 7 ou 8 pétalas
  const step = 360 / petalCount;
  const petalasPrincipais = Array.from({ length: petalCount }, (_, i) =>
    `<path transform="rotate(${(i * step).toFixed(1)} 60 21)" d="M60 21 C54.8 15.5 55.2 7.2 60 2.8 C64.8 7.2 65.2 15.5 60 21Z" fill="url(#petala)"/>`
  ).join('');
  const petalasInternas = Array.from({ length: petalCount }, (_, i) =>
    `<path transform="rotate(${(i * step + step / 2).toFixed(1)} 60 21)" d="M60 21 C56.8 17.2 57.2 11.5 60 8.2 C62.8 11.5 63.2 17.2 60 21Z" fill="${p.c1}" opacity=".88"/>`
  ).join('');

  const copaExtra = v === 1
    ? `<path d="M60 66 C49 60 44 52 42 42" fill="none" stroke="${p.c1}" stroke-width="2.2"/>
       <path d="M60 60 C71 54 76 47 78 38" fill="none" stroke="${p.c1}" stroke-width="2.2"/>
       <circle cx="42" cy="39" r="7.5" fill="url(#petala)" opacity=".92"/><circle cx="42" cy="39" r="2.2" fill="#FFFFFF"/>
       <circle cx="78" cy="35" r="7.5" fill="url(#petala)" opacity=".92"/><circle cx="78" cy="35" r="2.2" fill="#FFFFFF"/>`
    : v === 4
    ? `<path d="M60 44 Q42 38 40 52" fill="none" stroke="${p.c2}" stroke-width="1.8"/>
       <ellipse cx="40" cy="55" rx="4.5" ry="6.2" fill="url(#petala)"/><circle cx="40" cy="58" r="1.6" fill="#FFFFFF"/>
       <path d="M60 38 Q78 32 80 46" fill="none" stroke="${p.c2}" stroke-width="1.8"/>
       <ellipse cx="80" cy="49" rx="4.5" ry="6.2" fill="url(#petala)"/><circle cx="80" cy="52" r="1.6" fill="#FFFFFF"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} florida">${defs}
<ellipse cx="60" cy="99" rx="8.5" ry="2.6" fill="${p.groundMid}"/>
<path d="M60 100 C57 82 63 62 60 29" fill="none" stroke="${p.c1}" stroke-width="${v === 3 ? 5 : 2.7}" stroke-linecap="round"/>
<path d="M59.2 90 C50.5 89.4 43 83.1 43.6 76.3 C49.2 75.6 57.3 80.6 59.2 90Z" fill="url(#folha)"/>
<path d="M59.8 81 C68.2 80.4 75.4 74.4 74.8 67.8 C69.4 67.2 61.6 72 59.8 81Z" fill="url(#folhaB)"/>
<path d="M61 69 C53.3 68.5 46.7 63 47.3 56.9 C52.2 56.4 59.4 60.8 61 69Z" fill="url(#folha)"/>
<path d="M61.4 57 C68.4 56.5 74.4 51.5 73.9 46 C69.4 45.5 62.9 49.5 61.4 57Z" fill="url(#folhaB)"/>
<path d="M60.8 45 C55.2 44.6 50.4 40.6 50.8 36.2 C54.4 35.8 59.6 39 60.8 45Z" fill="url(#folha)"/>
${copaExtra}
<circle cx="60" cy="21" r="18" fill="url(#brilho)" opacity=".6"/>
${petalasPrincipais}
${petalasInternas}
<circle cx="60" cy="21" r="3.4" fill="#FFFFFF"/>
<circle cx="88" cy="14" r="1.3" fill="#FFFFFF" opacity=".85"/><circle cx="31" cy="25" r="1.1" fill="${p.c1}"/><circle cx="85" cy="35" r="1" fill="${p.c2}"/>
</svg>`;
}

/* ---------- 2. MUNDOS (5 arquétipos planetários/orbitais progressivos) ---------- */
function svgMundo(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = `<defs>
  <radialGradient id="planeta" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="${p.light}"/><stop offset=".45" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c3}"/></radialGradient>
  <linearGradient id="anel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset=".5" stop-color="${p.light}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="${p.c1}" stop-opacity=".65"/><stop offset="1" stop-color="${p.c2}" stop-opacity="0"/></radialGradient>
</defs>`;

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Núcleo de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<path d="M60 100 L60 88" stroke="${p.c2}" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="2 2"/>
<circle cx="60" cy="84" r="11" fill="url(#halo)"/>
<circle cx="60" cy="84" r="4.5" fill="url(#planeta)"/>
<circle cx="58.5" cy="82.5" r="1.3" fill="#FFFFFF" opacity=".9"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Protoplaneta ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<path d="M60 100 L60 76" stroke="${p.c2}" stroke-opacity=".45" stroke-width="1.8" stroke-dasharray="3 2"/>
<circle cx="60" cy="70" r="15" fill="url(#halo)"/>
<circle cx="60" cy="70" r="8" fill="url(#planeta)"/>
<ellipse cx="60" cy="70" rx="13" ry="3.5" fill="none" stroke="${p.c2}" stroke-opacity=".55" stroke-width="1.1"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Crosta de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<path d="M60 100 Q58 82 60 66" fill="none" stroke="${p.c2}" stroke-opacity=".45" stroke-width="2" stroke-dasharray="3 2"/>
<circle cx="60" cy="56" r="21" fill="url(#halo)"/>
<circle cx="60" cy="56" r="12.5" fill="url(#planeta)"/>
<path d="M49 53 Q60 48 71 54" fill="none" stroke="${p.c2}" stroke-opacity=".65" stroke-width="2.2" stroke-linecap="round"/>
<path d="M51 60 Q60 64 69 59" fill="none" stroke="${p.light}" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Atmosfera de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<path d="M60 100 Q58 78 60 58" fill="none" stroke="${p.c1}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="3 2"/>
<circle cx="60" cy="46" r="26" fill="url(#halo)"/>
<circle cx="60" cy="46" r="15.5" fill="url(#planeta)"/>
<ellipse transform="rotate(-16 60 46)" cx="60" cy="46" rx="25" ry="6.5" fill="none" stroke="url(#anel)" stroke-width="2.2"/>
<circle cx="85" cy="34" r="3" fill="${p.light}"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} eclipsado">
<ellipse cx="60" cy="99" rx="8" ry="2.6" fill="#2E294E"/>
<circle cx="64" cy="68" r="14" fill="#3F3A60" stroke="#6E6893" stroke-width="1"/>
<path d="M56 60 L64 68 L60 76 L69 80" fill="none" stroke="#1E1A3A" stroke-width="1.8"/>
<ellipse transform="rotate(14 64 68)" cx="64" cy="68" rx="21" ry="5" fill="none" stroke="#5D577F" stroke-width="1.4" stroke-dasharray="4 3"/>
</svg>`;
  }

  // Estágio 100%: Mundo Pleno (varia por arquétipo 0..4)
  const detalheMundo = v === 0
    ? `<ellipse transform="rotate(-18 60 40)" cx="60" cy="40" rx="34" ry="9" fill="none" stroke="url(#anel)" stroke-width="3.2"/>
       <ellipse transform="rotate(-18 60 40)" cx="60" cy="40" rx="28" ry="6.5" fill="none" stroke="${p.light}" stroke-opacity=".65" stroke-width="1.2"/>
       <circle cx="91" cy="26" r="3.8" fill="${p.light}"/><circle cx="28" cy="52" r="2.6" fill="${p.c2}"/>`
    : v === 1
    ? `<path d="M45 36 Q56 30 66 36 T76 38" fill="none" stroke="${p.c2}" stroke-width="3.2" stroke-linecap="round"/>
       <path d="M44 45 Q58 51 74 44" fill="none" stroke="${p.light}" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round"/>
       <circle cx="60" cy="40" r="22" fill="none" stroke="${p.c1}" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="5 3"/>
       <circle cx="84" cy="23" r="3.4" fill="${p.light}"/>`
    : v === 2
    ? `<path d="M36 42 Q60 35 84 42 L75 60 Q60 68 45 60 Z" fill="url(#planeta)"/>
       <ellipse cx="60" cy="41" rx="24" ry="6" fill="${p.c2}"/>
       <path d="M60 41 L60 22" stroke="${p.light}" stroke-width="2.6" stroke-linecap="round"/>
       <circle cx="60" cy="19" r="9" fill="url(#anel)"/><circle cx="60" cy="19" r="3.5" fill="#FFFFFF"/>`
    : v === 3
    ? `<circle cx="48" cy="42" r="13" fill="url(#planeta)"/>
       <circle cx="75" cy="34" r="9.5" fill="url(#anel)"/>
       <path d="M58 39 Q66 32 70 36" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
       <ellipse transform="rotate(-22 60 38)" cx="60" cy="38" rx="33" ry="11" fill="none" stroke="${p.c1}" stroke-opacity=".55" stroke-width="1.5"/>`
    : `<polygon points="60,18 79,30 75,53 60,62 45,53 41,30" fill="url(#planeta)" stroke="${p.light}" stroke-width="1.2"/>
       <polyline points="41,30 60,40 79,30" fill="none" stroke="${p.light}" stroke-opacity=".6" stroke-width="1"/>
       <line x1="60" y1="18" x2="60" y2="62" stroke="${p.light}" stroke-opacity=".5" stroke-width="1"/>
       <circle cx="88" cy="24" r="3" fill="${p.c1}"/><circle cx="32" cy="48" r="2.5" fill="${p.c2}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Mundo Pleno ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="3" fill="${p.groundMid}"/>
<path d="M60 100 Q58 76 60 58" fill="none" stroke="${p.c1}" stroke-opacity=".55" stroke-width="2.2" stroke-dasharray="3 2"/>
<circle cx="60" cy="40" r="34" fill="url(#halo)"/>
${v <= 1 ? `<circle cx="60" cy="40" r="18" fill="url(#planeta)"/>` : ''}
${detalheMundo}
<circle cx="26" cy="20" r="1.4" fill="#FFFFFF" opacity=".9"/><circle cx="92" cy="48" r="1.2" fill="${p.c1}"/><circle cx="38" cy="14" r="1" fill="${p.c2}"/>
</svg>`;
}

/* ---------- 3. ELEMENTOS (5 arquétipos elementais progressivos) ---------- */
function svgElemento(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Centelha de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="92" r="11" fill="url(#brilho)" opacity=".8"/>
<polygon points="60,84 65,92 60,98 55,92" fill="url(#petala)"/>
<circle cx="60" cy="92" r="2" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Pulso de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="84" r="14" fill="url(#brilho)" opacity=".75"/>
<path d="M60 99 C54 90 55 79 60 71 C65 79 66 90 60 99Z" fill="url(#petala)"/>
<path d="M53 98 C49 92 50 85 54 80 C56 86 56 92 53 98Z" fill="url(#folha)"/>
<path d="M67 98 C71 92 70 85 66 80 C64 86 64 92 67 98Z" fill="url(#folhaB)"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Fluxo de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="9.5" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="72" r="20" fill="url(#brilho)" opacity=".7"/>
${v === 1
  ? `<polygon points="60,48 68,66 65,99 55,99 52,66" fill="url(#petala)"/>
     <polygon points="46,64 53,75 52,99 44,99" fill="url(#folha)"/>
     <polygon points="74,62 76,99 68,99 67,74" fill="url(#folhaB)"/>`
  : `<path d="M60 99 C48 84 50 64 60 47 C70 64 72 84 60 99Z" fill="url(#petala)"/>
     <path d="M54 98 C43 86 44 70 52 58 C54 72 52 85 54 98Z" fill="url(#folha)"/>
     <path d="M66 98 C77 86 76 70 68 58 C66 72 68 85 66 98Z" fill="url(#folhaB)"/>`}
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Vórtice de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="58" r="28" fill="url(#brilho)" opacity=".75"/>
${v === 1
  ? `<polygon points="60,26 70,48 66,99 54,99 50,48" fill="url(#petala)" stroke="${p.light}" stroke-width=".8"/>
     <polygon points="42,48 51,62 50,99 40,99" fill="url(#folha)"/>
     <polygon points="78,46 80,99 70,99 69,60" fill="url(#folhaB)"/>`
  : `<path d="M60 99 C44 78 46 50 60 26 C74 50 76 78 60 99Z" fill="url(#petala)"/>
     <path d="M54 98 C38 82 39 58 50 40 C51 58 49 78 54 98Z" fill="url(#folha)"/>
     <path d="M66 98 C82 82 81 58 70 40 C69 58 71 78 66 98Z" fill="url(#folhaB)"/>`}
<circle cx="60" cy="20" r="3.5" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} dissipado">
<ellipse cx="60" cy="99" rx="9" ry="2.6" fill="#2E294E"/>
<polygon points="52,99 58,76 65,99" fill="#5D577F"/>
<polygon points="62,99 71,82 76,99" fill="#4E4870"/>
<polygon points="43,99 48,85 54,99" fill="#4E4870"/>
</svg>`;
  }

  // Estágio 100%: Manifestação Plena (5 arquétipos elementais)
  const corpoElemental = v === 0
    ? `<!-- Chama / Plasma -->
       <path d="M60 99 C40 76 42 42 60 12 C78 42 80 76 60 99Z" fill="url(#petala)"/>
       <path d="M55 99 C34 80 35 52 49 30 C49 54 47 78 55 99Z" fill="url(#folha)"/>
       <path d="M65 99 C86 80 85 52 71 30 C71 54 73 78 65 99Z" fill="url(#folhaB)"/>
       <path d="M60 96 C52 80 53 56 60 36 C67 56 68 80 60 96Z" fill="#FFFFFF" opacity=".85"/>`
    : v === 1
    ? `<!-- Cristal / Prisma -->
       <polygon points="60,10 72,36 67,99 53,99 48,36" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1"/>
       <polygon points="38,38 50,54 49,99 36,99" fill="url(#folha)" stroke="${p.light}" stroke-width=".7"/>
       <polygon points="82,36 84,99 71,99 70,52" fill="url(#folhaB)" stroke="${p.light}" stroke-width=".7"/>
       <polygon points="28,62 37,72 36,99 27,99" fill="url(#folhaB)" opacity=".85"/>
       <polygon points="92,60 93,99 84,99 83,70" fill="url(#folha)" opacity=".85"/>
       <circle cx="60" cy="24" r="3.5" fill="#FFFFFF"/>`
    : v === 2
    ? `<!-- Onda / Maré -->
       <path d="M60 99 C38 82 36 48 56 22 C66 10 78 16 74 28 C68 22 58 28 58 42 C58 62 74 74 60 99Z" fill="url(#petala)"/>
       <path d="M52 99 C32 84 32 58 46 38 C44 58 46 78 52 99Z" fill="url(#folha)"/>
       <path d="M68 99 C86 82 86 54 72 34 C74 56 72 78 68 99Z" fill="url(#folhaB)"/>
       <circle cx="60" cy="16" r="4" fill="#FFFFFF"/><circle cx="78" cy="22" r="2.5" fill="${p.light}"/><circle cx="42" cy="28" r="2.2" fill="${p.c1}"/>`
    : v === 3
    ? `<!-- Raio / Tempestade -->
       <polygon points="64,10 44,48 58,48 48,99 78,44 62,44" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1"/>
       <ellipse cx="60" cy="48" rx="28" ry="10" fill="none" stroke="${p.c1}" stroke-width="1.8" stroke-dasharray="5 3"/>
       <ellipse transform="rotate(60 60 48)" cx="60" cy="48" rx="28" ry="10" fill="none" stroke="${p.c2}" stroke-width="1.6" stroke-dasharray="4 3"/>`
    : `<!-- Vórtex / Éter -->
       <path d="M60 99 C38 78 82 54 60 14 C38 54 82 78 60 99Z" fill="url(#petala)"/>
       <path d="M54 99 C30 74 44 42 60 20" fill="none" stroke="${p.c1}" stroke-width="3" stroke-linecap="round"/>
       <path d="M66 99 C90 74 76 42 60 20" fill="none" stroke="${p.c2}" stroke-width="3" stroke-linecap="round"/>
       <circle cx="60" cy="22" r="7" fill="#FFFFFF"/><circle cx="60" cy="22" r="12" fill="none" stroke="${p.light}" stroke-width="1.5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Manifestação de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="46" r="36" fill="url(#brilho)" opacity=".75"/>
${corpoElemental}
<circle cx="30" cy="24" r="1.6" fill="#FFFFFF" opacity=".9"/><circle cx="90" cy="22" r="1.5" fill="${p.c1}"/><circle cx="26" cy="54" r="1.3" fill="${p.c2}"/><circle cx="92" cy="52" r="1.4" fill="#FFFFFF"/>
</svg>`;
}

const CACHE_DATA_URI = new Map();

export function gerarSvgCultivo(especieId, assetKey) {
  const cacheKey = `${especieId}/${assetKey}`;
  if (CACHE_DATA_URI.has(cacheKey)) return CACHE_DATA_URI.get(cacheKey);

  const item = MAPA_EXTRA.get(especieId);
  if (!item) return null;

  let rawSvg = '';
  if (assetKey === 'chao') {
    rawSvg = svgChao(item);
  } else if (item.tema === 'mundos') {
    rawSvg = svgMundo(item, assetKey);
  } else if (item.tema === 'elementos') {
    rawSvg = svgElemento(item, assetKey);
  } else {
    rawSvg = svgPlanta(item, assetKey);
  }

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
  CACHE_DATA_URI.set(cacheKey, dataUri);
  return dataUri;
}
