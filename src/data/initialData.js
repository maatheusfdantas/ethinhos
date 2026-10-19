// INITIAL MOCK DATA AND ENTITIES FOR ETHOS OS

export const INITIAL_USER = {
  id: 'usr_matheus',
  name: 'Eu Matheus',
  email: 'matheus@ethos.dev',
  password: '123',
  isPublic: true, // US37: Configuração de perfil (Público/Privado)
  avatar: 'EM',
  bio: 'Engenharia de Software & Produtividade Extrema',
  streakDays: 7,
  points: 1420
};

export const INITIAL_TAGS = [
  { id: 'tag_facul', name: 'Faculdade', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  { id: 'tag_casa', name: 'Casa', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { id: 'tag_trab', name: 'Trabalho', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' },
  { id: 'tag_saude', name: 'Saúde', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' }
];

export const INITIAL_HABITS = [
  {
    id: 'hab_1',
    title: 'Estudar Sistemas Operacionais',
    category: 'Faculdade',
    iconName: 'BookOpen',
    target: 1,
    current: 0,
    unit: 'sessão',
    effort: 'Alto', // US01: Nível de esforço (Baixo, Médio, Alto)
    priority: 'Alta', // US20: Prioridade (Alta, Média, Baixa)
    tagId: 'tag_facul', // US39: Tag de cor
    repeatDays: [1, 2, 3, 4, 5], // US19: Repetição (seg a sex)
    completed: false,
    completionStyle: 'quick' // 'quick', 'numeric', 'steps'
  },
  {
    id: 'hab_2',
    title: 'Treino Hipertrofia (Treino A)',
    category: 'Saúde',
    iconName: 'Dumbbell',
    target: 1,
    current: 1,
    unit: 'treino',
    effort: 'Alto',
    priority: 'Alta',
    tagId: 'tag_saude',
    repeatDays: [1, 3, 5],
    completed: true,
    completionStyle: 'quick'
  },
  {
    id: 'hab_3',
    title: 'Leitura Profunda de Clean Code',
    category: 'Trabalho',
    iconName: 'Bookmark',
    target: 20,
    current: 15,
    unit: 'páginas',
    effort: 'Médio',
    priority: 'Média',
    tagId: 'tag_trab',
    repeatDays: [0, 1, 2, 3, 4, 5, 6],
    completed: false,
    completionStyle: 'numeric'
  },
  {
    id: 'hab_4',
    title: 'Organização do Quarto & Desk',
    category: 'Casa',
    iconName: 'Home',
    target: 1,
    current: 0,
    unit: 'check',
    effort: 'Baixo',
    priority: 'Baixa',
    tagId: 'tag_casa',
    repeatDays: [0, 6],
    completed: false,
    completionStyle: 'quick'
  },
  {
    id: 'hab_5',
    title: 'Revisão Semanal de Metas',
    category: 'Trabalho',
    iconName: 'CheckCircle2',
    target: 1,
    current: 1,
    unit: 'sessão',
    effort: 'Médio',
    priority: 'Média',
    tagId: 'tag_trab',
    repeatDays: [0],
    completed: true,
    completionStyle: 'quick'
  }
];

export const INITIAL_HEALTH = {
  waterGlasses: 7, // US09: Copos de água (meta 10 copos = 2500ml)
  waterTarget: 10,
  waterHistory: [
    { id: 1, timestamp: '08:30', amountMl: 250 },
    { id: 2, timestamp: '10:00', amountMl: 250 },
    { id: 3, timestamp: '11:45', amountMl: 250 },
    { id: 4, timestamp: '13:30', amountMl: 250 },
    { id: 5, timestamp: '15:15', amountMl: 250 },
    { id: 6, timestamp: '17:00', amountMl: 250 },
    { id: 7, timestamp: '19:10', amountMl: 250 }
  ],
  sleep: {
    // US10: Registro manual do ciclo de sono
    bedTime: '23:30',
    wakeTime: '07:00',
    targetHours: 8,
    logged: true
  }
};

export const INITIAL_WORKOUTS = [
  {
    id: 'wo_a',
    name: 'Treino A - Peito, Ombro e Tríceps',
    exercises: [
      { id: 'ex_1', name: 'Supino Reto com Barra', sets: 4, reps: 10, weightKg: 80, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_2', name: 'Desenvolvimento Militar', sets: 3, reps: 12, weightKg: 40, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_3', name: 'Tríceps Corda na Polia', sets: 4, reps: 15, weightKg: 25, restSec: 45, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_b',
    name: 'Treino B - Costas e Bíceps',
    exercises: [
      { id: 'ex_4', name: 'Puxada Frontal Alta', sets: 4, reps: 12, weightKg: 65, restSec: 60, showWeight: true, showRestTimer: true },
      { id: 'ex_5', name: 'Remada Curvada', sets: 4, reps: 10, weightKg: 70, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_6', name: 'Rosca Direta com Barra W', sets: 3, reps: 12, weightKg: 30, restSec: 60, showWeight: true, showRestTimer: true }
    ]
  },
  {
    id: 'wo_c',
    name: 'Treino C - Pernas e Abdômen',
    exercises: [
      { id: 'ex_7', name: 'Agachamento Livre', sets: 4, reps: 10, weightKg: 90, restSec: 120, showWeight: true, showRestTimer: true },
      { id: 'ex_8', name: 'Leg Press 45', sets: 4, reps: 12, weightKg: 180, restSec: 90, showWeight: true, showRestTimer: true },
      { id: 'ex_9', name: 'Abdominal Supra na Prancha', sets: 4, reps: 20, weightKg: 10, restSec: 45, showWeight: false, showRestTimer: true }
    ]
  }
];

export const INITIAL_BADGES = [
  // US16: Desbloqueio de Conquistas / Badges
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
  },
  {
    id: 'badge_iron',
    title: 'Titã da Força',
    description: 'Concluiu 10 treinos de musculação registrados no App.',
    iconName: 'Shield',
    unlocked: false,
    progress: '6/10'
  },
  {
    id: 'badge_scholar',
    title: 'Mente Brilhante',
    description: 'Vinculou 15 sessões de foco a matérias da faculdade.',
    iconName: 'GraduationCap',
    unlocked: false,
    progress: '9/15'
  }
];

export const INITIAL_FRIENDS = [
  // US32: Sistema de amizades N:N
  { id: 'usr_lucas', name: 'Lucas Silva', avatar: 'LS', isFriend: true, status: 'approved', bio: 'Dev Backend & Crossfit' },
  { id: 'usr_beatriz', name: 'Beatriz Lima', avatar: 'BL', isFriend: true, status: 'approved', bio: 'UI/UX Designer & Corrida' },
  { id: 'usr_gabriel', name: 'Gabriel Souza', avatar: 'GS', isFriend: false, status: 'pending_received', bio: 'Ciência da Computação' },
  { id: 'usr_clara', name: 'Clara Mendes', avatar: 'CM', isFriend: false, status: 'none', bio: 'Focada em Concursos' },
  { id: 'usr_rafael', name: 'Rafael Torres', avatar: 'RT', isFriend: false, status: 'none', bio: 'Fullstack Dev' }
];

export const INITIAL_FEED = [
  // US14: Feed Social de Eventos de Conclusão de Amigos Aprovados
  {
    id: 'feed_1',
    userId: 'usr_lucas',
    userName: 'Lucas Silva',
    userAvatar: 'LS',
    type: 'focus_completed',
    title: 'Sessão de Foco Concluída',
    details: '50 min dedicados a "Arquitetura de Software"',
    timestamp: 'Há 25 minutos',
    reactions: { like: 4, fire: 6, trophy: 2 },
    userReacted: 'fire'
  },
  {
    id: 'feed_2',
    userId: 'usr_beatriz',
    userName: 'Beatriz Lima',
    userAvatar: 'BL',
    type: 'workout_completed',
    title: 'Treino A Concluído',
    details: 'Superiores e 45min de intensidade máxima',
    timestamp: 'Há 2 horas',
    reactions: { like: 7, fire: 5, trophy: 3 },
    userReacted: null
  },
  {
    id: 'feed_3',
    userId: 'usr_matheus',
    userName: 'Eu Matheus',
    userAvatar: 'EM',
    type: 'badge_unlocked',
    title: 'Nova Conquista Desbloqueada!',
    details: 'Desbloqueou a insígnia "Guardião da Constância (7 dias)"',
    timestamp: 'Há 4 horas',
    reactions: { like: 12, fire: 9, trophy: 8 },
    userReacted: 'like'
  }
];

export const INITIAL_HEATMAP = [
  // US04: Calendário Matriz mensal (30 dias)
  { day: 1, level: 3, tasks: 5, water: 2500, focusMins: 75 },
  { day: 2, level: 2, tasks: 3, water: 2000, focusMins: 50 },
  { day: 3, level: 4, tasks: 7, water: 3000, focusMins: 100 },
  { day: 4, level: 1, tasks: 2, water: 1500, focusMins: 25 },
  { day: 5, level: 3, tasks: 5, water: 2500, focusMins: 80 },
  { day: 6, level: 4, tasks: 6, water: 2750, focusMins: 90 },
  { day: 7, level: 2, tasks: 4, water: 2000, focusMins: 50 },
  { day: 8, level: 3, tasks: 5, water: 2500, focusMins: 60 },
  { day: 9, level: 4, tasks: 6, water: 3000, focusMins: 110 },
  { day: 10, level: 3, tasks: 4, water: 2250, focusMins: 50 },
  { day: 11, level: 2, tasks: 3, water: 1750, focusMins: 35 },
  { day: 12, level: 4, tasks: 7, water: 2500, focusMins: 125 },
  { day: 13, level: 4, tasks: 6, water: 2800, focusMins: 90 },
  { day: 14, level: 3, tasks: 5, water: 2500, focusMins: 75 },
  { day: 15, level: 2, tasks: 3, water: 2000, focusMins: 45 },
  { day: 16, level: 4, tasks: 6, water: 2500, focusMins: 85 },
  { day: 17, level: 3, tasks: 4, water: 2250, focusMins: 60 },
  { day: 18, level: 4, tasks: 5, water: 2500, focusMins: 75 } // Dia atual
];
