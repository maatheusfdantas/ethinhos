// USUÁRIOS ATIVOS DO SISTEMA
export const FIVE_SEEDED_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    email: 'admin@ethos.local',
    password: 'Admin@2026!Ethos',
    name: 'Administrador Ethos',
    avatar: 'AD',
    role: 'admin',
    is_active: true,
    subscription_tier: 'Enterprise / Fundador',
    is_public: true,
    badge: 'Admin Master',
    description: 'Acesso total ao portal de administração.',
    streak_days: 0,
    points: 0
  }
];

// CATEGORIAS E TEMAS PADRÃO (Inicia 100% zerado até ser criado pelo usuário)
export const INITIAL_TAGS = [];

export const INITIAL_WORKOUTS = [];

export const INITIAL_BADGES = [];
