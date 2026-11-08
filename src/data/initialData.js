// USUÁRIOS ATIVOS DO SISTEMA (ADMIN E USUÁRIO DE TESTE)
export const FIVE_SEEDED_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@ethos.dev',
    password: 'Admin@2026!Ethos',
    name: 'Administrador Ethos',
    avatar: 'AD',
    role: 'admin',
    is_active: true,
    subscription_tier: 'Enterprise / Fundador',
    is_public: true,
    badge: 'Admin Master',
    description: 'Acesso total ao portal de administração, controle de configurações e métricas globais.',
    streak_days: 0,
    points: 9999
  },
  {
    id: 'usr_teste',
    username: 'teste',
    email: 'eumatheusdantas1214@gmail.com',
    password: 'Teste@2026!Ethos',
    name: 'Usuário Teste',
    avatar: 'UT',
    role: 'user',
    is_active: true,
    subscription_tier: 'Pro (Anual)',
    is_public: true,
    badge: 'Conta de Teste',
    description: 'Conta padrão de usuário para testes funcionais de hábitos, agenda, foco e métricas.',
    streak_days: 1,
    points: 500
  }
];

// CATEGORIAS E TEMAS PADRÃO (ARQUITETURA DE CATEGORIAS DINÂMICAS E MODULARES)
// Separa estritamente o Rótulo (name, color, icon) das Capacidades (is_shared, has_subclasses, subclasses, members)
export const INITIAL_TAGS = [
  {
    id: 'tag_facul',
    user_id: 'global',
    name: 'Faculdade',
    color: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.15)',
    icon: 'BookOpen',
    is_shared: false,
    has_subclasses: false,
    subclasses: [],
    members: []
  },
  {
    id: 'tag_trab',
    user_id: 'global',
    name: 'Trabalho',
    color: '#00e5ff',
    bg: 'rgba(0, 229, 255, 0.15)',
    icon: 'Bookmark',
    is_shared: false,
    has_subclasses: false,
    subclasses: [],
    members: []
  },
  {
    id: 'tag_saude',
    user_id: 'global',
    name: 'Saúde',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.15)',
    icon: 'Dumbbell',
    is_shared: false,
    has_subclasses: false,
    subclasses: [],
    members: []
  },
  {
    id: 'tag_pessoal',
    user_id: 'global',
    name: 'Pessoal',
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.15)',
    icon: 'Sparkles',
    is_shared: false,
    has_subclasses: false,
    subclasses: [],
    members: []
  },
  {
    id: 'tag_casa',
    user_id: 'global',
    name: 'Casa',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.15)',
    icon: 'Home',
    is_shared: false,
    has_subclasses: false,
    subclasses: [],
    members: []
  }
];

export const INITIAL_WORKOUTS = [
  {
    id: 'wo_a',
    name: 'Treino A • Peito & Tríceps',
    subtitle: 'Supino reto, inclinado, crossover e tríceps testa • Hipertrofia & Força',
    theme: 'orange',
    scheduledDays: [1, 4], // Segundas e Quintas
    scheduledTime: '18:30',
    exercises: [
      { id: 'ex_1', name: 'Supino Reto com Barra', sets: 4, reps: 8, weightKg: 65, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_2', name: 'Supino Inclinado com Halteres', sets: 3, reps: 10, weightKg: 24, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_3', name: 'Crossover na Polia Média', sets: 3, reps: 12, weightKg: 15, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_4', name: 'Tríceps Testa Barra W', sets: 3, reps: 10, weightKg: 26, restSec: 45, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_b',
    name: 'Treino B • Costas & Bíceps',
    subtitle: 'Puxadas frontais, remada curvada e rosca direta • Tração & Densidade',
    theme: 'blue',
    scheduledDays: [2, 5], // Terças e Sextas
    scheduledTime: '18:30',
    exercises: [
      { id: 'ex_5', name: 'Puxada Frontal Alta Aberta', sets: 4, reps: 12, weightKg: 65, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_6', name: 'Remada Curvada com Barra', sets: 4, reps: 10, weightKg: 70, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_7', name: 'Rosca Direta com Barra W', sets: 3, reps: 12, weightKg: 28, restSec: 60, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_c',
    name: 'Treino C • Pernas & Ombros',
    subtitle: 'Agachamento livre, leg press 45° e desenvolvimento • Membros Inferiores',
    theme: 'navy',
    scheduledDays: [3, 6], // Quartas e Sábados
    scheduledTime: '10:00',
    exercises: [
      { id: 'ex_8', name: 'Agachamento Livre com Barra', sets: 4, reps: 8, weightKg: 90, restSec: 120, showWeight: true, showRestTimer: true },
      { id: 'ex_9', name: 'Leg Press 45° Articulado', sets: 4, reps: 12, weightKg: 180, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_10', name: 'Desenvolvimento com Halteres', sets: 3, reps: 10, weightKg: 22, restSec: 60, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_d',
    name: 'Treino D • Cardio & HIIT',
    subtitle: 'Corrida intervalada na esteira, pranchas e core dinâmico • Movimento & Esporte',
    theme: 'red',
    scheduledDays: [1, 3], // Segundas e Quartas
    scheduledTime: '07:00',
    exercises: [
      { id: 'ex_11', name: 'HIIT / Corrida Intervalada', sets: 5, reps: 1, weightKg: 0, restSec: 60, showWeight: false, showRestTimer: true },
      { id: 'ex_12', name: 'Prancha Abdominal Isométrica', sets: 4, reps: 60, weightKg: 0, restSec: 45, showWeight: false, showRestTimer: true },
      { id: 'ex_13', name: 'Abdominal Infra na Paralela', sets: 3, reps: 15, weightKg: 0, restSec: 45, showWeight: false, showRestTimer: true }
    ]
  },
  {
    id: 'wo_e',
    name: 'Treino E • Mobilidade & Saúde',
    subtitle: 'Alongamentos ativos, descompressão articular e postura • Saúde Física',
    theme: 'peach',
    scheduledDays: [0], // Domingos
    scheduledTime: '09:00',
    exercises: [
      { id: 'ex_14', name: 'Alongamento de Cadeia Posterior', sets: 3, reps: 45, weightKg: 0, restSec: 30, showWeight: false, showRestTimer: true },
      { id: 'ex_15', name: 'Mobilidade Torácica & Quadril', sets: 3, reps: 12, weightKg: 0, restSec: 30, showWeight: false, showRestTimer: true }
    ]
  },
  {
    id: 'wo_f',
    name: 'Treino F • Foco & Funcional',
    subtitle: 'Kettlebell swings e flexões para foco mental e produtividade diária',
    theme: 'green',
    scheduledDays: [5], // Sextas
    scheduledTime: '17:30',
    exercises: [
      { id: 'ex_16', name: 'Kettlebell Swing Russo', sets: 4, reps: 15, weightKg: 16, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_17', name: 'Flexão de Braço Militar', sets: 4, reps: 15, weightKg: 0, restSec: 60, showWeight: false, showRestTimer: true }
    ]
  }
];

export const INITIAL_BADGES = [
  {
    id: 'badge_streak7',
    title: 'Guardião da Constância',
    description: '7 dias consecutivos de ofensiva e hábitos concluídos.',
    iconName: 'Flame',
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'badge_water',
    title: 'Mestre da Hidratação',
    description: 'Bateu a meta de 2.5L de água por 5 dias.',
    iconName: 'Droplets',
    unlocked: false,
    unlockedAt: null
  },
  {
    id: 'badge_focus',
    title: 'Foco Inabalável',
    description: 'Completou mais de 100 minutos de foco sem fraude.',
    iconName: 'Zap',
    unlocked: false,
    unlockedAt: null
  }
];
