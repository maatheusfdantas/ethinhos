// Catálogo completo de cultivo do Foco (Pomodoro):
// 9 Temas com no mínimo 20 variações cada e paletas de cores alternadas (181 opções no total):
// 1. Plantas (Lírio-lunar original preservado + 20 novas = 21)
// 2. Mundos (20)
// 3. Elementos (20)
// 4. Mascotes Espaciais (20)
// 5. Espaçonaves (20)
// 6. ETs (20)
// 7. Foguetes (20)
// 8. Livros Mágicos (20)
// 9. Poções (20)
// Todos seguem exatamente a mesma arquitetura de progressão (0%, 10%, 35%, 65%, 100% + murcha + chão)
// e o sistema de coordenadas (viewBox 0 0 120 100 com base em 60,100; chão 0 0 120 34 com superfície em y=6)
// do Lírio-lunar original.

export const TEMAS_CULTIVO = [
  { id: 'plantas', nome: 'Plantas', icone: '🌱', descricao: 'Espécies botânicas luminosas que germinam, criam folhas e florescem.' },
  { id: 'mundos', nome: 'Mundos', icone: '🪐', descricao: 'Planetas, ilhas flutuantes e estrelas que ganham atmosfera, anéis e luas.' },
  { id: 'elementos', nome: 'Elementos', icone: '✨', descricao: 'Forças primordiais, cristais e chamas que evoluem da centelha à manifestação.' },
  { id: 'mascotes', nome: 'Mascotes espaciais', icone: '👾', descricao: 'Companheiros astrais que nascem do ovo cósmico e despertam suas asas e halos.' },
  { id: 'naves', nome: 'Espaçonaves', icone: '🛸', descricao: 'Discos, veleiros solares e cruzadores que montam o casco e ativam a dobra.' },
  { id: 'ets', nome: 'ETs', icone: '👽', descricao: 'Visitantes e sábios galácticos que evoluem do sinal cósmico à telepatia plena.' },
  { id: 'foguetes', nome: 'Foguetes', icone: '🚀', descricao: 'Foguetes multiestágio que são montados na base, acionam motores e decolam.' },
  { id: 'livros', nome: 'Livros mágicos', icone: '📖', descricao: 'Grimórios e tomos arcanos que se abrem e projetam runas e constelações.' },
  { id: 'pocoes', nome: 'Poções', icone: '🧪', descricao: 'Frascos e elixires alquímicos que borbulham, destilam e irradiam estrelas.' }
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

const RAW_MASCOTES = [
  { id: 'masc-kitsune', nome: 'Kitsune Astral', subtitulo: 'Raposa cósmica de caudas luminosas', variant: 0 },
  { id: 'masc-coruja', nome: 'Coruja Nebulosa', subtitulo: 'Guardiã alada da sabedoria noturna', variant: 1 },
  { id: 'masc-neko', nome: 'Astro-Neko', subtitulo: 'Gatinho orbital com antenas estelares', variant: 2 },
  { id: 'masc-draco', nome: 'Draco de Cristal', subtitulo: 'Pequeno dragão de asas prismáticas', variant: 3 },
  { id: 'masc-lumini', nome: 'Lumini', subtitulo: 'Espírito estelar com placas flutuantes', variant: 4 },
  { id: 'masc-fenix', nome: 'Filhote de Fênix', subtitulo: 'Ave solar que desperta em chamas suaves', variant: 1 },
  { id: 'masc-axolote', nome: 'Axolote Cósmico', subtitulo: 'Sorriso sereno com brânquias de luz', variant: 2 },
  { id: 'masc-lobo', nome: 'Lobo da Aurora', subtitulo: 'Companheiro fiel de pelagem cintilante', variant: 0 },
  { id: 'masc-tanuki', nome: 'Tanuki Lunar', subtitulo: 'Guardião das crateras douradas', variant: 2 },
  { id: 'masc-serpente', nome: 'Wyvern de Prata', subtitulo: 'Serpente alada de anéis luminosos', variant: 3 },
  { id: 'masc-coelho', nome: 'Coelho de Jade', subtitulo: 'Habitante saltarim do mar lunar', variant: 0 },
  { id: 'masc-grifo', nome: 'Grifo Rubi', subtitulo: 'Filhote real de penas incandescentes', variant: 1 },
  { id: 'masc-cervo', nome: 'Cervo Boreal', subtitulo: 'Galhadas que brilham como constelações', variant: 3 },
  { id: 'masc-moth', nome: 'Mariposa de Ametista', subtitulo: 'Asas de poeira estelar e antenas de neon', variant: 1 },
  { id: 'masc-pangolim', nome: 'Pangolim de Cobre', subtitulo: 'Armadura articulada com núcleo turquesa', variant: 4 },
  { id: 'masc-pinguim', nome: 'Pinguim Polar', subtitulo: 'Explorador das geleiras de Cryon', variant: 1 },
  { id: 'masc-leao', nome: 'Leãozinho Solar', subtitulo: 'Juba radiante em forma de coroa', variant: 4 },
  { id: 'masc-lontra', nome: 'Lontra das Estrelas', subtitulo: 'Guardiã de pérolas gravitacionais', variant: 2 },
  { id: 'masc-falcao', nome: 'Falcão Boreal', subtitulo: 'Voo silencioso sob cortinas de aurora', variant: 1 },
  { id: 'masc-orbita', nome: 'Sentinela Cobalto', subtitulo: 'Mascote astral com halo duplo', variant: 4 }
];

const RAW_NAVES = [
  { id: 'nave-valkyria', nome: 'Cruzador Valkyria', subtitulo: 'Asas delta com propulsão de dobra', variant: 1 },
  { id: 'nave-aurora', nome: 'Veleiro Aurora', subtitulo: 'Velas solares de fótons esmeralda', variant: 2 },
  { id: 'nave-hyperion', nome: 'Disco Hyperion', subtitulo: 'Cúpula panorâmica e anel antigravidade', variant: 0 },
  { id: 'nave-orion', nome: 'Exploradora Órion', subtitulo: 'Esfera científica com giroscópio duplo', variant: 3 },
  { id: 'nave-pegasus', nome: 'Fragata Pegasus', subtitulo: 'Três turbinas de plasma celeste', variant: 4 },
  { id: 'nave-nova', nome: 'Interceptor Nova', subtitulo: 'Caça veloz de casco rubi e ouro', variant: 1 },
  { id: 'nave-zenith', nome: 'Sonda Zenith', subtitulo: 'Veleiro orbital de longo alcance', variant: 2 },
  { id: 'nave-eclipse', nome: 'Furtiva Eclipse', subtitulo: 'Geometria angular com reator fúcsia', variant: 1 },
  { id: 'nave-ikar', nome: 'Caça Ícaro', subtitulo: 'Coletores solares de alta intensidade', variant: 2 },
  { id: 'nave-argos', nome: 'Cargueiro Argos', subtitulo: 'Disco de transporte prateado', variant: 0 },
  { id: 'nave-nautilus', nome: 'Cruzador Nautilus', subtitulo: 'Casco do espaço profundo', variant: 4 },
  { id: 'nave-crimson', nome: 'Vanguarda Carmesim', subtitulo: 'Escudos defletores de quartzo', variant: 3 },
  { id: 'nave-bioship', nome: 'Bio-Nave Gaia', subtitulo: 'Estrutura orgânica viva e cristalina', variant: 0 },
  { id: 'nave-nebula', nome: 'Corveta Nébula', subtitulo: 'Motor de salto quântico ametista', variant: 4 },
  { id: 'nave-chronos', nome: 'Nave Chronos', subtitulo: 'Anéis temporais em liga de cobre', variant: 3 },
  { id: 'nave-artemis', nome: 'Cruzador Ártemis', subtitulo: 'Blindagem glacial de longo curso', variant: 1 },
  { id: 'nave-soberana', nome: 'Nau Soberana', subtitulo: 'Veleiro imperial banhado a ouro', variant: 2 },
  { id: 'nave-andromeda', nome: 'Disco Andrômeda', subtitulo: 'Nave intergaláctica de dobra', variant: 0 },
  { id: 'nave-boreal', nome: 'Planador Boreal', subtitulo: 'Asas translúcidas de luz polar', variant: 1 },
  { id: 'nave-aegis', nome: 'Fragata Aegis', subtitulo: 'Cidadela orbital com domo de cobalto', variant: 4 }
];

const RAW_ETS = [
  { id: 'et-zylar', nome: 'Zylar, o Observador', subtitulo: 'Telepata sereno das Plêiades', variant: 0 },
  { id: 'et-xeno', nome: 'Xeno Botânico', subtitulo: 'Colecionador de flora interplanetária', variant: 1 },
  { id: 'et-solari', nome: 'Emissário Solari', subtitulo: 'Ser luminoso de três olhos dourados', variant: 3 },
  { id: 'et-lyriano', nome: 'Místico de Lyra', subtitulo: 'Manto flutuante e halo de ametista', variant: 2 },
  { id: 'et-arcturus', nome: 'Sábio de Arcturus', subtitulo: 'Coroa cristalina e orbes em órbita', variant: 2 },
  { id: 'et-krypton', nome: 'Guardião Rubi', subtitulo: 'Traje cerimonial com núcleo solar', variant: 4 },
  { id: 'et-veridiano', nome: 'Antenista de Verídia', subtitulo: 'Antenas bioluminescentes simpáticas', variant: 1 },
  { id: 'et-nebulon', nome: 'Nebulon', subtitulo: 'Viajante dimensional de aura índigo', variant: 0 },
  { id: 'et-helios', nome: 'Oráculo de Hélios', subtitulo: 'Entidade radiante de pura energia', variant: 4 },
  { id: 'et-zeta', nome: 'Cartógrafo Zeta', subtitulo: 'Olhos prateados que mapeiam estrelas', variant: 0 },
  { id: 'et-aquari', nome: 'Nômade Aquari', subtitulo: 'Habitante das luas oceânicas', variant: 3 },
  { id: 'et-carmesim', nome: 'Alquimista de Marte', subtitulo: 'Visor de quartzo e insígnia real', variant: 1 },
  { id: 'et-silvano', nome: 'Druida Estelar', subtitulo: 'Simbiose entre vida alienígena e floresta', variant: 3 },
  { id: 'et-psion', nome: 'Mestre Psion', subtitulo: 'Ondas mentais visíveis em neon', variant: 2 },
  { id: 'et-mecano', nome: 'Sintético de Cobre', subtitulo: 'Híbrido amigável de bronze e plasma', variant: 4 },
  { id: 'et-cryo', nome: 'Viajante de Europa', subtitulo: 'Corpo translúcido de gelo celeste', variant: 0 },
  { id: 'et-aurum', nome: 'Monge Áureo', subtitulo: 'Levitação contínua em lótus espacial', variant: 4 },
  { id: 'et-orion', nome: 'Embaixador de Órion', subtitulo: 'Colar de mini-planetas em órbita', variant: 2 },
  { id: 'et-boreal', nome: 'Tecelão da Aurora', subtitulo: 'Fios magnéticos dançando entre as mãos', variant: 1 },
  { id: 'et-cosmos', nome: 'Arquivista Cobalto', subtitulo: 'Guardião das memórias da galáxia', variant: 0 }
];

const RAW_FOGUETES = [
  { id: 'fog-apollo', nome: 'Apollo Astral', subtitulo: 'Clássico lunar com vigia iluminada', variant: 0 },
  { id: 'fog-veridia', nome: 'Propulsor Esmeralda', subtitulo: 'Combustível limpo de plasma verde', variant: 4 },
  { id: 'fog-titan', nome: 'Titã Heavy', subtitulo: 'Dois boosters laterais de alta potência', variant: 1 },
  { id: 'fog-stardust', nome: 'Ônibus Stardust', subtitulo: 'Asas delta para pouso orbital', variant: 2 },
  { id: 'fog-horizon', nome: 'Horizonte Celeste', subtitulo: 'Cápsula panorâmica de vidro azul', variant: 3 },
  { id: 'fog-vulcano', nome: 'Foguete Vulcano', subtitulo: 'Chama rubi e carenagem dourada', variant: 0 },
  { id: 'fog-jade', nome: 'Lançador de Jade', subtitulo: 'Fuselagem aerodinâmica de três estágios', variant: 4 },
  { id: 'fog-pulsar', nome: 'Pulsar Heavy', subtitulo: 'Boosters gêmeos com trilha fúcsia', variant: 1 },
  { id: 'fog-solaris', nome: 'Flecha Solar', subtitulo: 'Ponta dourada que rompe a atmosfera', variant: 0 },
  { id: 'fog-mercury', nome: 'Mercúrio Prateado', subtitulo: 'Fuselagem metálica espelhada', variant: 3 },
  { id: 'fog-poseidon', nome: 'Tridente Orbital', subtitulo: 'Três motores oceânicos sincronizados', variant: 1 },
  { id: 'fog-ares', nome: 'Ares V (Marte)', subtitulo: 'Foguete pesado de missão marciana', variant: 1 },
  { id: 'fog-gaia', nome: 'Semeador Gaia', subtitulo: 'Cápsula botânica para novos mundos', variant: 3 },
  { id: 'fog-hyper', nome: 'Hiper-Foguete Neon', subtitulo: 'Aletas magnéticas e rastro violeta', variant: 2 },
  { id: 'fog-atlas', nome: 'Atlas de Cobre', subtitulo: 'Turbina clássica com chama turquesa', variant: 0 },
  { id: 'fog-polaris', nome: 'Sonda Poláris', subtitulo: 'Foguete criogênico de gelo celeste', variant: 4 },
  { id: 'fog-midas', nome: 'Pioneiro Áureo', subtitulo: 'Revestimento térmico de folha de ouro', variant: 0 },
  { id: 'fog-nebula', nome: 'Shuttle Nébula', subtitulo: 'Ônibus de pesquisa intergaláctica', variant: 2 },
  { id: 'fog-aurora', nome: 'Vetor Boreal', subtitulo: 'Rastro luminoso em cores de aurora', variant: 4 },
  { id: 'fog-cobalto', nome: 'Estrela de Cobalto', subtitulo: 'Foguete insígnia da frota Ethos', variant: 3 }
];

const RAW_LIVROS = [
  { id: 'liv-astronomia', nome: 'Atlas das Constelações', subtitulo: 'Projeta mapas estelares vivos', variant: 0 },
  { id: 'liv-herbario', nome: 'Herbário Esmeralda', subtitulo: 'Páginas que brotam folhas luminosas', variant: 2 },
  { id: 'liv-alquimia', nome: 'Tratado do Sol', subtitulo: 'Símbolos alquímicos em ouro e coral', variant: 3 },
  { id: 'liv-sonhos', nome: 'Diário Onírico', subtitulo: 'Fitas de seda rosa e runas flutuantes', variant: 1 },
  { id: 'liv-mares', nome: 'Crônicas de Atlântida', subtitulo: 'Letras que brilham como espuma celeste', variant: 0 },
  { id: 'liv-fogo', nome: 'Grimório Carmesim', subtitulo: 'Feitiços de foco com gema dourada', variant: 1 },
  { id: 'liv-jade', nome: 'Sutra de Jade', subtitulo: 'Pergaminhos serenos que levitam em paz', variant: 4 },
  { id: 'liv-arcano', nome: 'Códice do Vórtice', subtitulo: 'Astrolábio mágico girando sobre as páginas', variant: 3 },
  { id: 'liv-luz', nome: 'Tomo da Luz Solar', subtitulo: 'Páginas douradas que iluminam o estudo', variant: 0 },
  { id: 'liv-prata', nome: 'Tomo da Lua Cheia', subtitulo: 'Capa de prata com selo violeta', variant: 1 },
  { id: 'liv-abissal', nome: 'Enciclopédia Oceânica', subtitulo: 'Pérolas de sabedoria suspensas no ar', variant: 2 },
  { id: 'liv-rubi', nome: 'Livro dos Segredos', subtitulo: 'Selo de quartzo que se abre com o foco', variant: 1 },
  { id: 'liv-floresta', nome: 'Bestiário de Gaia', subtitulo: 'Árvore holográfica acima das páginas', variant: 2 },
  { id: 'liv-runas', nome: 'Compêndio Rúnico', subtitulo: 'Alfabeto estelar em neon ametista', variant: 4 },
  { id: 'liv-relogio', nome: 'Manual do Tempo', subtitulo: 'Anéis cronológicos de cobre e turquesa', variant: 3 },
  { id: 'liv-inverno', nome: 'Contos de Inverno', subtitulo: 'Cristais de gelo que dançam das letras', variant: 0 },
  { id: 'liv-rei', nome: 'Manuscrito Real', subtitulo: 'Caligrafia iluminada em ouro puro', variant: 4 },
  { id: 'liv-cosmos', nome: 'História do Cosmos', subtitulo: 'Uma mini-galáxia espiral sai do livro', variant: 3 },
  { id: 'liv-aurora', nome: 'Cânticos Boreais', subtitulo: 'Ondas de luz polar entre os capítulos', variant: 0 },
  { id: 'liv-sabedoria', nome: 'Grimório de Cobalto', subtitulo: 'O tomo mestre do conhecimento profundo', variant: 1 }
];

const RAW_POCOES = [
  { id: 'poc-foco', nome: 'Elixir do Foco Puro', subtitulo: 'Destilado lavanda de clareza mental', variant: 0 },
  { id: 'poc-vital', nome: 'Néctar de Esmeralda', subtitulo: 'Gotas regeneradoras da floresta', variant: 1 },
  { id: 'poc-solar', nome: 'Essência de Sol', subtitulo: 'Líquido dourado que aquece a mente', variant: 2 },
  { id: 'poc-sonho', nome: 'Filtro de Ametista', subtitulo: 'Frasco lunar de inspiração criativa', variant: 3 },
  { id: 'poc-mana', nome: 'Poção de Mana Celeste', subtitulo: 'Energia azul borbulhante para estudos', variant: 0 },
  { id: 'poc-fenix', nome: 'Lágrima de Fênix', subtitulo: 'Ampola lapidada com faíscas douradas', variant: 1 },
  { id: 'poc-menta', nome: 'Tônico de Jade', subtitulo: 'Frescor sereno em destilador triplo', variant: 4 },
  { id: 'poc-cosmos', nome: 'Extrato de Nebulosa', subtitulo: 'Galáxia líquida dentro do cristal', variant: 3 },
  { id: 'poc-ambar', nome: 'Ambrósia Dourada', subtitulo: 'Caldeirão alquímico dos antigos sábios', variant: 2 },
  { id: 'poc-lunar', nome: 'Orvalho da Lua', subtitulo: 'Coletado sob a luz prateada da meia-noite', variant: 3 },
  { id: 'poc-mare', nome: 'Soro de Thalassa', subtitulo: 'Ondas bioluminescentes em miniatura', variant: 0 },
  { id: 'poc-rubi', nome: 'Elixir Carmesim', subtitulo: 'Força vital concentrada em diamante', variant: 1 },
  { id: 'poc-botanica', nome: 'Seiva Encantada', subtitulo: 'Caldeirão com folhas e esporos brilhantes', variant: 2 },
  { id: 'poc-neon', nome: 'Catalisador Astral', subtitulo: 'Tubos de reação luminosa em neon', variant: 4 },
  { id: 'poc-alquimia', nome: 'Destilado de Cobre', subtitulo: 'Alambique antigo com vapor turquesa', variant: 4 },
  { id: 'poc-glacial', nome: 'Essência Boreal', subtitulo: 'Flocos de cristal suspensos no líquido', variant: 1 },
  { id: 'poc-ouro', nome: 'Ouro Potável (Aurum)', subtitulo: 'A obra-prima da alquimia clássica', variant: 0 },
  { id: 'poc-eter', nome: 'Frasco de Éter', subtitulo: 'Nuvem violeta condensada em vidro', variant: 3 },
  { id: 'poc-aurora', nome: 'Líquido da Aurora', subtitulo: 'Caldeirão que irradia luzes do norte', variant: 2 },
  { id: 'poc-cobalto', nome: 'Tônico de Cobalto', subtitulo: 'Fórmula suprema de concentração', variant: 1 }
];

const STAGE_NAMES_BY_TEMA = {
  plantas: ['Semente', 'Broto', 'Muda', 'Jovem', 'Florida', 'Murcha'],
  mundos: ['Núcleo', 'Protoplaneta', 'Crosta', 'Atmosfera', 'Mundo Pleno', 'Eclipsado'],
  elementos: ['Centelha', 'Pulso', 'Fluxo', 'Vórtice', 'Manifestação', 'Dissipado'],
  mascotes: ['Ovo Cósmico', 'Despertar', 'Filhote', 'Guardião', 'Mascote Pleno', 'Adormecido'],
  naves: ['Cápsula', 'Propulsores', 'Casco & Asas', 'Reator', 'Nave Plena', 'Desenergizada'],
  ets: ['Sinal', 'Cápsula Bio', 'Visitante', 'Telepata', 'Sábio Galáctico', 'Teletransportado'],
  foguetes: ['Base', '1º Estágio', 'Fuselagem', 'Ignição', 'Decolagem', 'Abortado'],
  livros: ['Pergaminho', 'Tomo Selado', 'Páginas Abertas', 'Runas Vivas', 'Grimório Arcano', 'Selado'],
  pocoes: ['Frasco Vazio', 'Primeiras Gotas', 'Ebulição', 'Destilação', 'Elixir Radiante', 'Evaporada']
};

function montarEstagios(tema) {
  const nomes = STAGE_NAMES_BY_TEMA[tema] || STAGE_NAMES_BY_TEMA.plantas;
  return [
    { stageId: 'semente', minProgress: 0, assetKey: 'semente', nome: nomes[0] },
    { stageId: 'broto', minProgress: 0.1, assetKey: 'broto', nome: nomes[1] },
    { stageId: 'muda', minProgress: 0.35, assetKey: 'muda', nome: nomes[2] },
    { stageId: 'jovem', minProgress: 0.65, assetKey: 'jovem', nome: nomes[3] },
    { stageId: 'florida', minProgress: 1, assetKey: 'florida', nome: nomes[4] }
  ];
}

const TEMA_OFFSET = { plantas: 1, mundos: 0, elementos: 2, mascotes: 3, naves: 4, ets: 5, foguetes: 6, livros: 7, pocoes: 8 };

function criarEntradaCatalogo(item, idx, tema) {
  const offset = TEMA_OFFSET[tema] ?? 0;
  const paleta = PALETAS_ALTERNADAS[(idx + offset) % PALETAS_ALTERNADAS.length];
  const nomes = STAGE_NAMES_BY_TEMA[tema] || STAGE_NAMES_BY_TEMA.plantas;
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
      nome: nomes[5]
    },
    chao: 'chao',
    entrada: { ms: 320, escala: 0.88 }
  };
}

export const CATALOGO_EXTRA = [
  ...RAW_PLANTAS.map((it, i) => criarEntradaCatalogo(it, i, 'plantas')),
  ...RAW_MUNDOS.map((it, i) => criarEntradaCatalogo(it, i, 'mundos')),
  ...RAW_ELEMENTOS.map((it, i) => criarEntradaCatalogo(it, i, 'elementos')),
  ...RAW_MASCOTES.map((it, i) => criarEntradaCatalogo(it, i, 'mascotes')),
  ...RAW_NAVES.map((it, i) => criarEntradaCatalogo(it, i, 'naves')),
  ...RAW_ETS.map((it, i) => criarEntradaCatalogo(it, i, 'ets')),
  ...RAW_FOGUETES.map((it, i) => criarEntradaCatalogo(it, i, 'foguetes')),
  ...RAW_LIVROS.map((it, i) => criarEntradaCatalogo(it, i, 'livros')),
  ...RAW_POCOES.map((it, i) => criarEntradaCatalogo(it, i, 'pocoes'))
];

const MAPA_EXTRA = new Map(CATALOGO_EXTRA.map((e) => [e.id, e]));

/* ============================================================================
 * GERADOR DETERMINÍSTICO DE SVG (MESMA GEOMETRIA BASE DO LÍRIO-LUNAR)
 * - Estágios: viewBox="0 0 120 100", ancorados em (60, 100)
 * - Chão: viewBox="0 0 120 34", superfície em y = 6
 * ============================================================================ */

function svgChao(e) {
  const { paleta, tema } = e;
  if (tema === 'mundos' || tema === 'naves' || tema === 'ets') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 34" role="img" aria-label="Base orbital de ${e.nome}">
<defs><linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${paleta.groundMid}"/><stop offset="1" stop-color="${paleta.groundBase}"/></linearGradient></defs>
<ellipse cx="60" cy="10" rx="46" ry="7" fill="none" stroke="${paleta.c2}" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="4 3"/>
<path d="M20 7 Q60 0 100 7 Q94 21 78 27 Q60 33 42 27 Q26 21 20 7Z" fill="url(#gBase)"/>
<ellipse cx="60" cy="6.5" rx="40" ry="4.5" fill="${paleta.groundTop}"/>
<ellipse cx="60" cy="6" rx="26" ry="2.6" fill="${paleta.c1}" opacity=".45"/>
</svg>`;
  }
  if (tema === 'elementos' || tema === 'foguetes' || tema === 'livros' || tema === 'pocoes') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 34" role="img" aria-label="Altar de ${e.nome}">
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

/* ---------- 1. PLANTAS ---------- */
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

  const petalCount = 5 + (e.indiceTema % 4);
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

/* ---------- 2. MUNDOS ---------- */
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

/* ---------- 3. ELEMENTOS ---------- */
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

  const corpoElemental = v === 0
    ? `<path d="M60 99 C40 76 42 42 60 12 C78 42 80 76 60 99Z" fill="url(#petala)"/>
       <path d="M55 99 C34 80 35 52 49 30 C49 54 47 78 55 99Z" fill="url(#folha)"/>
       <path d="M65 99 C86 80 85 52 71 30 C71 54 73 78 65 99Z" fill="url(#folhaB)"/>
       <path d="M60 96 C52 80 53 56 60 36 C67 56 68 80 60 96Z" fill="#FFFFFF" opacity=".85"/>`
    : v === 1
    ? `<polygon points="60,10 72,36 67,99 53,99 48,36" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1"/>
       <polygon points="38,38 50,54 49,99 36,99" fill="url(#folha)" stroke="${p.light}" stroke-width=".7"/>
       <polygon points="82,36 84,99 71,99 70,52" fill="url(#folhaB)" stroke="${p.light}" stroke-width=".7"/>
       <polygon points="28,62 37,72 36,99 27,99" fill="url(#folhaB)" opacity=".85"/>
       <polygon points="92,60 93,99 84,99 83,70" fill="url(#folha)" opacity=".85"/>
       <circle cx="60" cy="24" r="3.5" fill="#FFFFFF"/>`
    : v === 2
    ? `<path d="M60 99 C38 82 36 48 56 22 C66 10 78 16 74 28 C68 22 58 28 58 42 C58 62 74 74 60 99Z" fill="url(#petala)"/>
       <path d="M52 99 C32 84 32 58 46 38 C44 58 46 78 52 99Z" fill="url(#folha)"/>
       <path d="M68 99 C86 82 86 54 72 34 C74 56 72 78 68 99Z" fill="url(#folhaB)"/>
       <circle cx="60" cy="16" r="4" fill="#FFFFFF"/><circle cx="78" cy="22" r="2.5" fill="${p.light}"/><circle cx="42" cy="28" r="2.2" fill="${p.c1}"/>`
    : v === 3
    ? `<polygon points="64,10 44,48 58,48 48,99 78,44 62,44" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1"/>
       <ellipse cx="60" cy="48" rx="28" ry="10" fill="none" stroke="${p.c1}" stroke-width="1.8" stroke-dasharray="5 3"/>
       <ellipse transform="rotate(60 60 48)" cx="60" cy="48" rx="28" ry="10" fill="none" stroke="${p.c2}" stroke-width="1.6" stroke-dasharray="4 3"/>`
    : `<path d="M60 99 C38 78 82 54 60 14 C38 54 82 78 60 99Z" fill="url(#petala)"/>
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

/* ---------- 4. MASCOTES ESPACIAIS ---------- */
function svgMascote(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Ovo cósmico de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="89" r="12" fill="url(#brilho)" opacity=".7"/>
<ellipse cx="60" cy="90" rx="7" ry="9" fill="url(#petala)" stroke="${p.light}" stroke-width=".8"/>
<circle cx="58" cy="88" r="1.8" fill="#FFFFFF" opacity=".85"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Despertar de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="84" r="15" fill="url(#brilho)" opacity=".75"/>
<ellipse cx="60" cy="86" rx="10" ry="11" fill="url(#folha)"/>
<circle cx="56" cy="84" r="2" fill="#FFFFFF"/><circle cx="64" cy="84" r="2" fill="#FFFFFF"/>
<path d="M51 79 L54 73 L57 78" fill="${p.c1}"/><path d="M69 79 L66 73 L63 78" fill="${p.c2}"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Filhote ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="72" r="20" fill="url(#brilho)" opacity=".7"/>
<ellipse cx="60" cy="85" rx="12" ry="13" fill="url(#folha)"/>
<circle cx="60" cy="64" r="11" fill="url(#petala)"/>
<polygon points="50,58 46,46 56,54" fill="url(#folhaB)"/><polygon points="70,58 74,46 64,54" fill="url(#folhaB)"/>
<circle cx="56" cy="64" r="2.2" fill="#0C1020"/><circle cx="64" cy="64" r="2.2" fill="#0C1020"/>
<circle cx="55.3" cy="63.3" r=".9" fill="#FFFFFF"/><circle cx="63.3" cy="63.3" r=".9" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Guardião ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="62" r="26" fill="url(#brilho)" opacity=".75"/>
<path d="M46 74 C32 66 30 52 40 48 C44 56 46 64 48 72Z" fill="url(#folhaB)"/>
<path d="M74 74 C88 66 90 52 80 48 C76 56 74 64 72 72Z" fill="url(#folhaB)"/>
<ellipse cx="60" cy="80" rx="14" ry="17" fill="url(#folha)"/>
<circle cx="60" cy="54" r="13" fill="url(#petala)"/>
<polygon points="49,47 43,32 56,43" fill="url(#folha)"/><polygon points="71,47 77,32 64,43" fill="url(#folha)"/>
<circle cx="55" cy="54" r="2.5" fill="#0C1020"/><circle cx="65" cy="54" r="2.5" fill="#0C1020"/>
<circle cx="54.2" cy="53.2" r="1" fill="#FFFFFF"/><circle cx="64.2" cy="53.2" r="1" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} adormecido">
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="#2E294E"/>
<ellipse cx="60" cy="88" rx="15" ry="10" fill="#4E4870"/>
<path d="M53 87 Q56 89 59 87" fill="none" stroke="#1E1A3A" stroke-width="1.6"/>
<path d="M62 87 Q65 89 68 87" fill="none" stroke="#1E1A3A" stroke-width="1.6"/>
</svg>`;
  }

  const extrasMascote = v === 0
    ? `<!-- Caudas astrais de Kitsune -->
       <path d="M48 86 C26 78 22 52 36 38 C38 54 40 70 48 86Z" fill="url(#petala)"/>
       <path d="M72 86 C94 78 98 52 84 38 C82 54 80 70 72 86Z" fill="url(#petala)"/>`
    : v === 1
    ? `<!-- Asas abertas de Coruja/Fênix -->
       <path d="M46 72 C22 60 20 36 38 28 C40 44 42 58 46 72Z" fill="url(#petala)"/>
       <path d="M74 72 C98 60 100 36 82 28 C80 44 78 58 74 72Z" fill="url(#petala)"/>`
    : v === 2
    ? `<!-- Antenas lunares & anel -->
       <path d="M54 36 Q46 20 38 24" fill="none" stroke="${p.light}" stroke-width="2"/><circle cx="38" cy="24" r="3.2" fill="${p.c2}"/>
       <path d="M66 36 Q74 20 82 24" fill="none" stroke="${p.light}" stroke-width="2"/><circle cx="82" cy="24" r="3.2" fill="${p.c1}"/>`
    : v === 3
    ? `<!-- Asas e chifres de Dragão -->
       <polygon points="46,68 20,42 32,74" fill="url(#folhaB)"/><polygon points="74,68 100,42 88,74" fill="url(#folhaB)"/>
       <polygon points="52,38 44,18 57,34" fill="${p.light}"/><polygon points="68,38 76,18 63,34" fill="${p.light}"/>`
    : `<!-- Placas orbitais estilo Lumo -->
       <ellipse cx="60" cy="22" rx="16" ry="4" fill="none" stroke="${p.light}" stroke-width="2"/>
       <circle cx="30" cy="48" r="4" fill="url(#petala)"/><circle cx="90" cy="48" r="4" fill="url(#petala)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Mascote Pleno ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="13" ry="3.2" fill="${p.groundMid}"/>
<circle cx="60" cy="54" r="36" fill="url(#brilho)" opacity=".75"/>
${extrasMascote}
<ellipse cx="60" cy="76" rx="16" ry="20" fill="url(#folha)"/>
<ellipse cx="60" cy="78" rx="10" ry="13" fill="${p.light}" opacity=".35"/>
<circle cx="60" cy="48" r="15" fill="url(#petala)"/>
<polygon points="48,40 41,22 56,36" fill="url(#folha)"/><polygon points="72,40 79,22 64,36" fill="url(#folha)"/>
<circle cx="54" cy="48" r="3" fill="#0C1020"/><circle cx="66" cy="48" r="3" fill="#0C1020"/>
<circle cx="53" cy="47" r="1.2" fill="#FFFFFF"/><circle cx="65" cy="47" r="1.2" fill="#FFFFFF"/>
<ellipse cx="60" cy="52" rx="2.2" ry="1.4" fill="${p.c3}"/>
<circle cx="60" cy="16" r="3" fill="#FFFFFF"/>
</svg>`;
}

/* ---------- 5. ESPAÇONAVES ---------- */
function svgNave(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Cápsula de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="88" r="11" fill="url(#brilho)" opacity=".7"/>
<ellipse cx="60" cy="90" rx="10" ry="4.5" fill="url(#folha)"/>
<path d="M54 89 Q60 82 66 89 Z" fill="${p.light}"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Propulsores de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="${p.groundMid}"/>
<path d="M56 84 L60 98 L64 84 Z" fill="${p.c2}" opacity=".75"/>
<ellipse cx="60" cy="80" rx="16" ry="6" fill="url(#folha)"/>
<path d="M52 79 Q60 69 68 79 Z" fill="url(#petala)"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Casco de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<path d="M52 70 L60 98 L68 70 Z" fill="url(#brilho)" opacity=".75"/>
<polygon points="32,70 60,58 88,70 76,74 44,74" fill="url(#folhaB)"/>
<ellipse cx="60" cy="66" rx="20" ry="7" fill="url(#folha)"/>
<path d="M50 65 Q60 52 70 65 Z" fill="url(#petala)"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Reator de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<polygon points="48,56 60,99 72,56" fill="url(#brilho)" opacity=".8"/>
<polygon points="24,58 60,42 96,58 82,64 38,64" fill="url(#folhaB)"/>
<ellipse cx="60" cy="54" rx="25" ry="8" fill="url(#folha)"/>
<path d="M47 52 Q60 36 73 52 Z" fill="url(#petala)"/>
<circle cx="45" cy="55" r="2" fill="#FFFFFF"/><circle cx="60" cy="56" r="2.2" fill="#FFFFFF"/><circle cx="75" cy="55" r="2" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} desenergizada">
<ellipse cx="60" cy="99" rx="12" ry="2.8" fill="#2E294E"/>
<ellipse transform="rotate(8 62 86)" cx="62" cy="86" rx="22" ry="6.5" fill="#4E4870"/>
<path d="M52 84 Q62 74 72 85 Z" fill="#3F3A60"/>
</svg>`;
  }

  const cascoPleno = v === 0
    ? `<!-- Disco Voador com feixe trator -->
       <polygon points="44,46 60,99 76,46" fill="url(#brilho)" opacity=".75"/>
       <ellipse cx="60" cy="44" rx="34" ry="10" fill="url(#folha)" stroke="${p.light}" stroke-width="1"/>
       <path d="M44 42 Q60 22 76 42 Z" fill="url(#petala)"/>
       <circle cx="38" cy="44" r="2.2" fill="#FFFFFF"/><circle cx="52" cy="47" r="2.2" fill="#FFFFFF"/><circle cx="68" cy="47" r="2.2" fill="#FFFFFF"/><circle cx="82" cy="44" r="2.2" fill="#FFFFFF"/>`
    : v === 1
    ? `<!-- Cruzador Asas Delta -->
       <polygon points="50,48 60,99 70,48" fill="url(#brilho)" opacity=".8"/>
       <polygon points="18,52 60,16 102,52 82,58 60,46 38,58" fill="url(#folhaB)" stroke="${p.light}" stroke-width=".9"/>
       <polygon points="60,14 68,48 60,56 52,48" fill="url(#petala)"/>
       <circle cx="60" cy="36" r="4" fill="#FFFFFF"/>`
    : v === 2
    ? `<!-- Veleiro Solar -->
       <polygon points="54,50 60,99 66,50" fill="url(#brilho)" opacity=".75"/>
       <path d="M60 12 C30 22 22 46 46 58 L60 48 L74 58 C98 46 90 22 60 12Z" fill="url(#petala)" stroke="#FFFFFF" stroke-width=".9"/>
       <ellipse cx="60" cy="44" rx="10" ry="16" fill="url(#folha)"/>`
    : v === 3
    ? `<!-- Exploradora Giroscópica -->
       <polygon points="52,50 60,99 68,50" fill="url(#brilho)" opacity=".75"/>
       <ellipse transform="rotate(-24 60 40)" cx="60" cy="40" rx="34" ry="10" fill="none" stroke="url(#petala)" stroke-width="3"/>
       <ellipse transform="rotate(24 60 40)" cx="60" cy="40" rx="34" ry="10" fill="none" stroke="${p.c2}" stroke-width="2"/>
       <circle cx="60" cy="40" r="14" fill="url(#folha)"/><circle cx="60" cy="40" r="6" fill="#FFFFFF"/>`
    : `<!-- Fragata Interestelar -->
       <polygon points="46,48 60,99 74,48" fill="url(#brilho)" opacity=".85"/>
       <polygon points="26,46 42,24 78,24 94,46 78,56 42,56" fill="url(#folha)"/>
       <ellipse cx="60" cy="38" rx="18" ry="8" fill="url(#petala)"/>
       <circle cx="42" cy="48" r="3" fill="#FFFFFF"/><circle cx="60" cy="50" r="3.5" fill="#FFFFFF"/><circle cx="78" cy="48" r="3" fill="#FFFFFF"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Nave Plena ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="13" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="42" r="36" fill="url(#brilho)" opacity=".6"/>
${cascoPleno}
</svg>`;
}

/* ---------- 6. ETs ---------- */
function svgEt(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Sinal de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="90" r="10" fill="url(#brilho)" opacity=".8"/>
<circle cx="60" cy="92" r="4" fill="url(#petala)"/>
<ellipse cx="60" cy="92" rx="9" ry="3" fill="none" stroke="${p.c1}" stroke-width="1"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Cápsula de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="84" r="14" fill="url(#brilho)" opacity=".75"/>
<path d="M51 98 C51 78 69 78 69 98 Z" fill="url(#petala)" opacity=".85"/>
<circle cx="60" cy="88" r="5.5" fill="url(#folha)"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Visitante ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="3" fill="${p.groundMid}"/>
<path d="M48 99 C48 78 72 78 72 99 Z" fill="url(#folhaB)"/>
<path d="M60 79 C46 79 44 56 60 56 C76 56 74 79 60 79Z" fill="url(#petala)"/>
<ellipse transform="rotate(-18 54 68)" cx="54" cy="68" rx="4.5" ry="3" fill="#0C1020"/>
<ellipse transform="rotate(18 66 68)" cx="66" cy="68" rx="4.5" ry="3" fill="#0C1020"/>
<circle cx="53" cy="67" r="1" fill="#FFFFFF"/><circle cx="65" cy="67" r="1" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Telepata ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="56" r="26" fill="url(#brilho)" opacity=".7"/>
<path d="M44 99 C45 72 75 72 76 99 Z" fill="url(#folha)"/>
<path d="M60 72 C43 72 40 44 60 44 C80 44 77 72 60 72Z" fill="url(#petala)"/>
<ellipse transform="rotate(-18 53 58)" cx="53" cy="58" rx="5.5" ry="3.6" fill="#0C1020"/>
<ellipse transform="rotate(18 67 58)" cx="67" cy="58" rx="5.5" ry="3.6" fill="#0C1020"/>
<circle cx="52" cy="57" r="1.2" fill="#FFFFFF"/><circle cx="66" cy="57" r="1.2" fill="#FFFFFF"/>
<ellipse cx="60" cy="36" rx="14" ry="3.5" fill="none" stroke="${p.light}" stroke-width="1.5"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} teletransportado">
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="#2E294E"/>
<path d="M54 99 L58 64 L62 64 L66 99 Z" fill="#4E4870" opacity=".5"/>
<ellipse cx="60" cy="64" rx="10" ry="3" fill="none" stroke="#6E6893" stroke-dasharray="3 2"/>
</svg>`;
  }

  const detalheEt = v === 1
    ? `<path d="M53 36 Q46 22 40 24" fill="none" stroke="${p.c1}" stroke-width="2"/><circle cx="40" cy="24" r="3.2" fill="#FFFFFF"/>
       <path d="M67 36 Q74 22 80 24" fill="none" stroke="${p.c2}" stroke-width="2"/><circle cx="80" cy="24" r="3.2" fill="#FFFFFF"/>`
    : v === 2
    ? `<polygon points="60,14 68,28 52,28" fill="url(#petala)" stroke="#FFFFFF" stroke-width=".8"/>
       <circle cx="34" cy="52" r="4" fill="url(#folhaB)"/><circle cx="86" cy="52" r="4" fill="url(#folhaB)"/>`
    : v === 3
    ? `<circle cx="60" cy="43" r="2.8" fill="#0C1020"/><circle cx="59.4" cy="42.4" r="1" fill="#FFFFFF"/>
       <circle cx="34" cy="46" r="3.5" fill="${p.light}"/><circle cx="86" cy="46" r="3.5" fill="${p.light}"/>`
    : `<ellipse cx="60" cy="24" rx="20" ry="5" fill="none" stroke="${p.light}" stroke-width="2"/>
       <circle cx="60" cy="16" r="3.5" fill="#FFFFFF"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Sábio Galáctico ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="13" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="50" r="36" fill="url(#brilho)" opacity=".75"/>
<path d="M38 99 C40 66 80 66 82 99 Z" fill="url(#folha)"/>
<path d="M48 99 L60 72 L72 99 Z" fill="url(#folhaB)" opacity=".8"/>
<path d="M60 68 C40 68 36 36 60 36 C84 36 80 68 60 68Z" fill="url(#petala)"/>
<ellipse transform="rotate(-18 52 52)" cx="52" cy="52" rx="6.2" ry="4" fill="#0C1020"/>
<ellipse transform="rotate(18 68 52)" cx="68" cy="52" rx="6.2" ry="4" fill="#0C1020"/>
<circle cx="50.8" cy="51" r="1.4" fill="#FFFFFF"/><circle cx="66.8" cy="51" r="1.4" fill="#FFFFFF"/>
${detalheEt}
</svg>`;
}

/* ---------- 7. FOGUETES ---------- */
function svgFoguete(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Base de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="${p.groundMid}"/>
<polygon points="52,99 55,88 65,88 68,99" fill="url(#folha)"/>
<rect x="53" y="85" width="14" height="4" rx="1.5" fill="url(#petala)"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="1º Estágio de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="${p.groundMid}"/>
<polygon points="52,99 55,90 65,90 68,99" fill="${p.c3}"/>
<rect x="52" y="70" width="16" height="21" rx="3" fill="url(#petala)"/>
<polygon points="45,92 52,78 52,92" fill="url(#folhaB)"/><polygon points="75,92 68,78 68,92" fill="url(#folhaB)"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Fuselagem de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<path d="M60 44 C51 56 51 74 52 92 L68 92 C69 74 69 56 60 44Z" fill="url(#petala)"/>
<polygon points="42,94 52,74 52,92" fill="url(#folha)"/><polygon points="78,94 68,74 68,92" fill="url(#folha)"/>
<circle cx="60" cy="64" r="4.5" fill="#0C1020" stroke="${p.light}" stroke-width="1.5"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Ignição de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="14" ry="3.2" fill="${p.groundMid}"/>
<path d="M54 84 C50 92 55 99 60 100 C65 99 70 92 66 84 Z" fill="${p.c2}"/>
<path d="M60 30 C50 44 50 66 52 84 L68 84 C70 66 70 44 60 30Z" fill="url(#petala)"/>
<polygon points="40,86 52,66 52,84" fill="url(#folha)"/><polygon points="80,86 68,66 68,84" fill="url(#folha)"/>
<circle cx="60" cy="52" r="5" fill="#0C1020" stroke="${p.light}" stroke-width="1.6"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} abortado">
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="#2E294E"/>
<g transform="rotate(24 60 88)">
  <path d="M60 56 C52 66 52 80 53 94 L67 94 C68 80 68 66 60 56Z" fill="#4E4870"/>
  <circle cx="60" cy="74" r="4" fill="#2E294E"/>
</g>
</svg>`;
  }

  const boosters = v === 1
    ? `<rect x="40" y="38" width="8" height="28" rx="4" fill="url(#folhaB)"/>
       <rect x="72" y="38" width="8" height="28" rx="4" fill="url(#folhaB)"/>`
    : v === 2
    ? `<polygon points="30,62 50,38 50,64" fill="url(#folhaB)"/><polygon points="90,62 70,38 70,64" fill="url(#folhaB)"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Decolagem de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="15" ry="3.4" fill="${p.groundMid}"/>
<circle cx="60" cy="50" r="36" fill="url(#brilho)" opacity=".7"/>
<!-- Pluma de propulsão e nuvens de decolagem -->
<circle cx="46" cy="95" r="7" fill="${p.light}" opacity=".75"/><circle cx="74" cy="95" r="7" fill="${p.light}" opacity=".75"/>
<path d="M51 64 C44 78 52 94 60 100 C68 94 76 78 69 64 Z" fill="url(#folhaB)"/>
<path d="M55 64 C52 76 56 88 60 95 C64 88 68 76 65 64 Z" fill="#FFFFFF"/>
${boosters}
<path d="M60 10 C48 26 48 48 51 66 L69 66 C72 48 72 26 60 10Z" fill="url(#petala)" stroke="#FFFFFF" stroke-width=".8"/>
<path d="M60 10 C54 18 53 24 53 26 L67 26 C67 24 66 18 60 10Z" fill="url(#folha)"/>
<polygon points="38,68 51,48 51,66" fill="url(#folha)"/><polygon points="82,68 69,48 69,66" fill="url(#folha)"/>
<circle cx="60" cy="38" r="5.5" fill="#0C1020" stroke="#FFFFFF" stroke-width="1.6"/>
<circle cx="58.5" cy="36.5" r="1.6" fill="#FFFFFF"/>
</svg>`;
}

/* ---------- 8. LIVROS MÁGICOS ---------- */
function svgLivro(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Pergaminho de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="90" r="10" fill="url(#brilho)" opacity=".7"/>
<rect transform="rotate(-12 60 90)" x="49" y="87" width="22" height="6" rx="3" fill="url(#petala)"/>
<rect transform="rotate(-12 60 90)" x="58" y="86.5" width="4" height="7" rx="1" fill="${p.c3}"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Tomo de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<circle cx="60" cy="83" r="14" fill="url(#brilho)" opacity=".75"/>
<polygon points="44,86 60,78 76,86 60,94" fill="url(#folha)"/>
<polygon points="44,83 60,75 76,83 60,91" fill="url(#petala)"/>
<circle cx="60" cy="83" r="3" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Páginas de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="72" r="20" fill="url(#brilho)" opacity=".75"/>
<path d="M60 84 Q42 78 34 84 L38 68 Q48 64 60 72 Z" fill="url(#petala)" stroke="${p.c3}" stroke-width="1"/>
<path d="M60 84 Q78 78 86 84 L82 68 Q72 64 60 72 Z" fill="url(#petala)" stroke="${p.c3}" stroke-width="1"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Runas de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="60" r="26" fill="url(#brilho)" opacity=".75"/>
<path d="M60 80 Q40 72 30 80 L35 60 Q47 55 60 65 Z" fill="url(#petala)" stroke="${p.c1}" stroke-width="1.2"/>
<path d="M60 80 Q80 72 90 80 L85 60 Q73 55 60 65 Z" fill="url(#petala)" stroke="${p.c1}" stroke-width="1.2"/>
<circle cx="60" cy="42" r="8" fill="none" stroke="${p.light}" stroke-width="1.6" stroke-dasharray="4 2"/>
<polygon points="60,35 65,45 55,45" fill="url(#folhaB)"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} selado">
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="#2E294E"/>
<polygon points="44,90 60,84 76,90 60,96" fill="#4E4870"/>
<line x1="48" y1="86" x2="72" y2="94" stroke="#2E294E" stroke-width="2"/>
<line x1="72" y1="86" x2="48" y2="94" stroke="#2E294E" stroke-width="2"/>
</svg>`;
  }

  const projecaoArcana = v === 0
    ? `<polyline points="44,36 54,22 66,30 76,16" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>
       <circle cx="44" cy="36" r="2.8" fill="${p.c1}"/><circle cx="54" cy="22" r="3" fill="#FFFFFF"/><circle cx="66" cy="30" r="2.8" fill="${p.c2}"/><circle cx="76" cy="16" r="3.2" fill="#FFFFFF"/>`
    : v === 1
    ? `<polygon points="60,14 70,28 60,42 50,28" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1"/>
       <circle cx="60" cy="28" r="3.5" fill="#FFFFFF"/>`
    : v === 2
    ? `<path d="M60 54 L60 26" stroke="${p.light}" stroke-width="2.4"/>
       <circle cx="60" cy="24" r="10" fill="url(#folha)"/><circle cx="52" cy="28" r="7" fill="url(#folhaB)"/><circle cx="68" cy="28" r="7" fill="url(#petala)"/>`
    : v === 3
    ? `<circle cx="60" cy="28" r="14" fill="none" stroke="${p.c1}" stroke-width="1.8"/>
       <ellipse transform="rotate(35 60 28)" cx="60" cy="28" rx="18" ry="6" fill="none" stroke="${p.light}" stroke-width="1.4"/>
       <circle cx="60" cy="28" r="4" fill="#FFFFFF"/>`
    : `<polygon points="60,14 64,24 75,24 66,31 69,42 60,35 51,42 54,31 45,24 56,24" fill="url(#petala)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Grimório Arcano ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="13" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="48" r="36" fill="url(#brilho)" opacity=".75"/>
<!-- Livro aberto levitando -->
<path d="M60 78 Q36 68 24 78 L30 54 Q45 48 60 60 Z" fill="url(#folha)" stroke="${p.light}" stroke-width="1"/>
<path d="M60 78 Q84 68 96 78 L90 54 Q75 48 60 60 Z" fill="url(#folhaB)" stroke="${p.light}" stroke-width="1"/>
<path d="M60 74 Q38 64 28 73 L33 52 Q46 46 60 57 Z" fill="url(#petala)"/>
<path d="M60 74 Q82 64 92 73 L87 52 Q74 46 60 57 Z" fill="url(#petala)"/>
${projecaoArcana}
</svg>`;
}

/* ---------- 9. POÇÕES ---------- */
function svgPocao(e, stage) {
  const p = e.paleta;
  const v = e.variant % 5;
  const defs = defsPadrao(p);

  if (stage === 'semente') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Frasco de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<rect x="56" y="76" width="8" height="6" rx="1" fill="none" stroke="${p.light}" stroke-width="1.4"/>
<circle cx="60" cy="90" r="9" fill="none" stroke="${p.light}" stroke-width="1.5"/>
</svg>`;
  }

  if (stage === 'broto') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Gotas de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="10" ry="2.8" fill="${p.groundMid}"/>
<rect x="55" y="70" width="10" height="7" rx="1.5" fill="none" stroke="${p.light}" stroke-width="1.5"/>
<circle cx="60" cy="87" r="11" fill="none" stroke="${p.light}" stroke-width="1.6"/>
<path d="M51 90 A9 9 0 0 0 69 90 Z" fill="url(#folha)"/>
</svg>`;
  }

  if (stage === 'muda') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Ebulição de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="11" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="80" r="18" fill="url(#brilho)" opacity=".65"/>
<rect x="54" y="58" width="12" height="9" rx="2" fill="none" stroke="${p.light}" stroke-width="1.6"/>
<circle cx="60" cy="82" r="15" fill="none" stroke="${p.light}" stroke-width="1.8"/>
<path d="M47 82 A13 13 0 0 0 73 82 Z" fill="url(#petala)"/>
<circle cx="56" cy="78" r="2" fill="#FFFFFF"/><circle cx="63" cy="75" r="1.5" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'jovem') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Destilação de ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="12" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="70" r="26" fill="url(#brilho)" opacity=".75"/>
<rect x="53" y="46" width="14" height="10" rx="2" fill="none" stroke="${p.light}" stroke-width="1.8"/>
<circle cx="60" cy="76" r="19" fill="none" stroke="${p.light}" stroke-width="2"/>
<circle cx="60" cy="76" r="16" fill="url(#petala)"/>
<circle cx="55" cy="38" r="3" fill="${p.c1}"/><circle cx="64" cy="30" r="2.2" fill="#FFFFFF"/>
</svg>`;
  }

  if (stage === 'murcha') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="${e.nome} evaporada">
<ellipse cx="60" cy="99" rx="11" ry="2.8" fill="#2E294E"/>
<circle cx="60" cy="85" r="13" fill="none" stroke="#6E6893" stroke-width="1.6"/>
<path d="M54 80 L64 88" stroke="#6E6893" stroke-width="1.4"/>
</svg>`;
  }

  const frascoPleno = v === 1
    ? `<!-- Ampola Diamante -->
       <rect x="54" y="34" width="12" height="10" rx="2" fill="url(#folha)"/>
       <polygon points="60,44 84,68 60,96 36,68" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1.8"/>`
    : v === 2
    ? `<!-- Caldeirão Alquímico -->
       <path d="M36 58 L84 58 C88 82 76 96 60 96 C44 96 32 82 36 58Z" fill="url(#folha)" stroke="${p.light}" stroke-width="1.6"/>
       <ellipse cx="60" cy="58" rx="24" ry="6" fill="url(#petala)"/>`
    : v === 4
    ? `<!-- Destilador Triplo -->
       <rect x="36" y="48" width="12" height="46" rx="6" fill="url(#folha)" stroke="#FFFFFF" stroke-width="1.2"/>
       <rect x="54" y="36" width="12" height="58" rx="6" fill="url(#petala)" stroke="#FFFFFF" stroke-width="1.4"/>
       <rect x="72" y="48" width="12" height="46" rx="6" fill="url(#folhaB)" stroke="#FFFFFF" stroke-width="1.2"/>`
    : `<!-- Frasco Redondo Real -->
       <rect x="53" y="36" width="14" height="12" rx="2" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>
       <rect x="55" y="30" width="10" height="6" rx="2" fill="url(#folhaB)"/>
       <circle cx="60" cy="72" r="22" fill="url(#petala)" stroke="#FFFFFF" stroke-width="2"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" role="img" aria-label="Elixir Radiante ${e.nome}">${defs}
<ellipse cx="60" cy="99" rx="13" ry="3" fill="${p.groundMid}"/>
<circle cx="60" cy="58" r="36" fill="url(#brilho)" opacity=".75"/>
${frascoPleno}
<circle cx="52" cy="68" r="3" fill="#FFFFFF" opacity=".85"/><circle cx="66" cy="76" r="2.2" fill="#FFFFFF" opacity=".85"/>
<circle cx="60" cy="18" r="4" fill="#FFFFFF"/><circle cx="46" cy="24" r="2.5" fill="${p.c1}"/><circle cx="74" cy="22" r="2.5" fill="${p.c2}"/>
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
  } else if (item.tema === 'mascotes') {
    rawSvg = svgMascote(item, assetKey);
  } else if (item.tema === 'naves') {
    rawSvg = svgNave(item, assetKey);
  } else if (item.tema === 'ets') {
    rawSvg = svgEt(item, assetKey);
  } else if (item.tema === 'foguetes') {
    rawSvg = svgFoguete(item, assetKey);
  } else if (item.tema === 'livros') {
    rawSvg = svgLivro(item, assetKey);
  } else if (item.tema === 'pocoes') {
    rawSvg = svgPocao(item, assetKey);
  } else {
    rawSvg = svgPlanta(item, assetKey);
  }

  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
  CACHE_DATA_URI.set(cacheKey, dataUri);
  return dataUri;
}
