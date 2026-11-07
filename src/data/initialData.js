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
    is_shared: true,
    has_subclasses: true,
    subclasses: [
      { id: 'sub_redes', category_id: 'tag_facul', name: 'Redes de Computadores', priority: 'Alta', hours: 8 },
      { id: 'sub_calculo', category_id: 'tag_facul', name: 'Cálculo', priority: 'Alta', hours: 7 }
    ],
    members: [
      { id: 'mem_sebastian', category_id: 'tag_facul', user_id: 'usr_sebastian', name: 'Sebastian', email: 'sebastian@ethos.dev', role: 'collaborator' }
    ]
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
    name: 'Treino A (Peito & Tríceps)',
    scheduledDays: [2], // Terças
    scheduledTime: '18:30',
    exercises: [
      { id: 'ex_1', name: 'Supino Reto', sets: 4, reps: 4, weightKg: 65, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_2', name: 'Supino Inclinado', sets: 3, reps: 10, weightKg: 55, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_3', name: 'Crossover na Polia', sets: 3, reps: 12, weightKg: 15, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_4', name: 'Tríceps Testa', sets: 3, reps: 10, weightKg: 26, restSec: 45, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_b',
    name: 'Treino B (Costas & Bíceps)',
    scheduledDays: [4], // Quintas
    scheduledTime: '18:30',
    exercises: [
      { id: 'ex_5', name: 'Puxada Frontal Alta', sets: 4, reps: 12, weightKg: 65, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_6', name: 'Remada Curvada', sets: 4, reps: 10, weightKg: 70, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_7', name: 'Rosca Direta Barra W', sets: 3, reps: 12, weightKg: 30, restSec: 60, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_c',
    name: 'Treino C (Pernas & Ombros)',
    scheduledDays: [6], // Sábados
    scheduledTime: '10:00',
    exercises: [
      { id: 'ex_8', name: 'Agachamento Livre', sets: 4, reps: 8, weightKg: 90, restSec: 120, showWeight: true, showRestTimer: true },
      { id: 'ex_9', name: 'Leg Press 45°', sets: 4, reps: 12, weightKg: 180, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_10', name: 'Desenvolvimento com Halteres', sets: 3, reps: 10, weightKg: 24, restSec: 60, showWeight: true, showRestTimer: true }
    ]
  }
];

export const INITIAL_BADGES = [
  {
    id: 'badge_streak7',
    title: 'Guardião da Constância',
    description: '7 dias consecutivos de ofensiva e hábitos concluídos.',
    iconName: 'Flame',
    unlocked: true,
    unlockedAt: 'Hoje'
  },
  {
    id: 'badge_water',
    title: 'Mestre da Hidratação',
    description: 'Bateu a meta de 2.5L de água por 5 dias.',
    iconName: 'Droplets',
    unlocked: true,
    unlockedAt: 'Ontem'
  },
  {
    id: 'badge_focus',
    title: 'Foco Inabalável',
    description: 'Completou mais de 100 minutos de foco sem fraude.',
    iconName: 'Zap',
    unlocked: true,
    unlockedAt: 'Há 3 dias'
  }
];
