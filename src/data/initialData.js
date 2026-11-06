// 5 USUÁRIOS PRÉ-CONFIGURADOS (Requisito 6)
export const FIVE_SEEDED_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@ethos.dev',
    password: 'admin123',
    name: 'Administrador Ethos',
    avatar: 'AD',
    role: 'admin',
    is_active: true,
    subscription_tier: 'Enterprise / Fundador',
    is_public: true,
    badge: 'Admin Master',
    description: 'Acesso total ao portal de administração, controle de assinaturas e permissões.',
    streak_days: 0,
    points: 9999
  },
  {
    id: 'usr_matheus_pro',
    username: 'matheus.pro',
    email: 'matheus@pro.dev',
    password: '123',
    name: 'Matheus Alta Performance',
    avatar: 'MP',
    role: 'user',
    is_active: true,
    subscription_tier: 'Pro (Anual)',
    is_public: true,
    badge: 'Desempenho Muito Bom',
    description: 'Ofensiva de 14 dias, 100% de hábitos feitos, hidratação completa e eventos agendados.',
    streak_days: 14,
    points: 3450
  },
  {
    id: 'usr_lucas_dev',
    username: 'lucas.dev',
    email: 'lucas@dev.com',
    password: '123',
    name: 'Lucas Intermediário',
    avatar: 'LD',
    role: 'user',
    is_active: true,
    subscription_tier: 'Pro (Mensal)',
    is_public: true,
    badge: 'Uso Intermediário',
    description: 'Acompanha a rotina mas de forma moderada: 4 dias de ofensiva, hábitos parciais.',
    streak_days: 4,
    points: 1250
  },
  {
    id: 'usr_bruno_preguica',
    username: 'bruno.preguica',
    email: 'bruno@gmail.com',
    password: '123',
    name: 'Bruno Não Empenhado',
    avatar: 'BP',
    role: 'user',
    is_active: true,
    subscription_tier: 'Gratuito',
    is_public: true,
    badge: 'Pouco Empenhado',
    description: 'Constância baixa: 0 dias de ofensiva, poucos hábitos feitos, sono desregulado.',
    streak_days: 0,
    points: 180
  },
  {
    id: 'usr_clean',
    username: 'usuario.clean',
    email: 'clean@ethos.dev',
    password: '123',
    name: 'Novo Usuário Clean',
    avatar: 'UC',
    role: 'user',
    is_active: true,
    subscription_tier: 'Gratuito',
    is_public: true,
    badge: 'Totalmente Zerado',
    description: 'Conta 100% limpa para testar o sistema do zero: sem hábitos, sem água, sem eventos.',
    streak_days: 0,
    points: 0
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
