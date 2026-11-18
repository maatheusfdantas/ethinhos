import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Plus, 
  Minus, 
  Play,
  Pause,
  RotateCcw, 
  Check, 
  CheckCircle2, 
  X, 
  Clock, 
  Trash2,
  Edit3,
  Award,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  ArrowLeft,
  BookOpen,
  Lock,
  Search,
  Square,
  Timer
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

// =====================================================================
// BIBLIOTECA DE CARDS DE EXERCÍCIOS PARA ESCOLHER E COLOCAR NA FICHA
// =====================================================================
export const EXERCISE_LIBRARY_GROUPS = [
  { id: 'all', label: 'Todos', emoji: '🏋️' },
  { id: 'peito', label: 'Peitoral', emoji: '💪' },
  { id: 'costas', label: 'Costas & Dorsal', emoji: '🦅' },
  { id: 'pernas', label: 'Pernas & Glúteos', emoji: '🦵' },
  { id: 'ombros', label: 'Ombros & Trapézio', emoji: '🔱' },
  { id: 'bracos', label: 'Bíceps & Tríceps', emoji: '⚡' },
  { id: 'core', label: 'Abdômen & Core', emoji: '🔥' },
  { id: 'cardio', label: 'Cardio & Funcional', emoji: '🏃' }
];

export const EXERCISE_LIBRARY_CATALOG = [
  // PEITORAL
  { id: 'lib_supino_reto', name: 'Supino Reto com Barra', group: 'peito', muscle: 'Peitoral Maior', sets: 4, reps: 10, weightKg: 60, restSec: 90, level: 'Intermediário', desc: 'Exercício clássico composto para força e volume de peitoral.' },
  { id: 'lib_supino_inclinado_halter', name: 'Supino Inclinado com Halteres', group: 'peito', muscle: 'Peitoral Superior', sets: 4, reps: 10, weightKg: 24, restSec: 75, level: 'Intermediário', desc: 'Foco na porção clavicular (superior) com maior amplitude.' },
  { id: 'lib_crucifixo_maquina', name: 'Crucifixo na Máquina (Peck Deck)', group: 'peito', muscle: 'Peitoral Medial', sets: 3, reps: 12, weightKg: 45, restSec: 60, level: 'Iniciante', desc: 'Isolamento seguro com tensão constante no pico de contração.' },
  { id: 'lib_crossover_polia', name: 'Crossover na Polia Alta', group: 'peito', muscle: 'Peitoral Inferior & Miolo', sets: 4, reps: 12, weightKg: 20, restSec: 60, level: 'Intermediário', desc: 'Excelente definição e alongamento das fibras peitorais.' },
  { id: 'lib_flexao_bracos', name: 'Flexão de Braços Tradicional', group: 'peito', muscle: 'Peitoral & Core', sets: 3, reps: 15, weightKg: 0, restSec: 45, level: 'Iniciante', desc: 'Calistenia fundamental para resistência de empurrar.' },

  // COSTAS & DORSAL
  { id: 'lib_puxada_frontal', name: 'Puxada Alta Frontal (Pulldown)', group: 'costas', muscle: 'Grande Dorsal', sets: 4, reps: 10, weightKg: 55, restSec: 75, level: 'Iniciante', desc: 'Expansão dorsal e fortalecimento da largura das costas.' },
  { id: 'lib_remada_curvada', name: 'Remada Curvada com Barra', group: 'costas', muscle: 'Dorsal & Romboides', sets: 4, reps: 10, weightKg: 50, restSec: 90, level: 'Avançado', desc: 'Construção de densidade e espessura para toda a cadeia posterior.' },
  { id: 'lib_remada_baixa', name: 'Remada Baixa no Triângulo', group: 'costas', muscle: 'Meio das Costas', sets: 4, reps: 12, weightKg: 50, restSec: 60, level: 'Iniciante', desc: 'Trabalho controlado para retração escapular e postura.' },
  { id: 'lib_serrote_halter', name: 'Remada Unilateral (Serrote)', group: 'costas', muscle: 'Grande Dorsal', sets: 3, reps: 12, weightKg: 26, restSec: 60, level: 'Intermediário', desc: 'Corrige assimetrias e permite grande amplitude de puxada.' },
  { id: 'lib_barra_fixa', name: 'Barra Fixa Pronada (Pull-up)', group: 'costas', muscle: 'Dorsal & Bíceps', sets: 4, reps: 8, weightKg: 0, restSec: 90, level: 'Avançado', desc: 'Força relativa máxima para membros superiores.' },

  // PERNAS & GLÚTEOS
  { id: 'lib_agachamento_livre', name: 'Agachamento Livre com Barra', group: 'pernas', muscle: 'Quadríceps & Glúteos', sets: 4, reps: 8, weightKg: 80, restSec: 120, level: 'Avançado', desc: 'O exercício base mais completo para força de membros inferiores.' },
  { id: 'lib_leg_press_45', name: 'Leg Press 45°', group: 'pernas', muscle: 'Quadríceps & Glúteos', sets: 4, reps: 12, weightKg: 160, restSec: 90, level: 'Intermediário', desc: 'Alto volume de carga com estabilidade para a coluna.' },
  { id: 'lib_cadeira_extensora', name: 'Cadeira Extensora', group: 'pernas', muscle: 'Quadríceps Isolado', sets: 4, reps: 15, weightKg: 55, restSec: 60, level: 'Iniciante', desc: 'Isolamento total do reto femoral e vastos.' },
  { id: 'lib_mesa_flexora', name: 'Mesa Flexora', group: 'pernas', muscle: 'Posteriores de Coxa', sets: 4, reps: 12, weightKg: 45, restSec: 60, level: 'Iniciante', desc: 'Fortalecimento de isquiotibiais e proteção articular do joelho.' },
  { id: 'lib_stiff_barra', name: 'Stiff com Barra ou Halteres', group: 'pernas', muscle: 'Posterior & Glúteos', sets: 4, reps: 10, weightKg: 60, restSec: 90, level: 'Intermediário', desc: 'Alongamento sob carga para cadeia posterior e glúteos.' },
  { id: 'lib_elevacao_pelvica', name: 'Elevação Pélvica na Máquina/Barra', group: 'pernas', muscle: 'Glúteo Máximo', sets: 4, reps: 12, weightKg: 70, restSec: 75, level: 'Intermediário', desc: 'Ativação máxima de glúteos com pico de contração no topo.' },
  { id: 'lib_panturrilha_pe', name: 'Panturrilha em Pé na Máquina', group: 'pernas', muscle: 'Gastrocnêmio', sets: 4, reps: 15, weightKg: 60, restSec: 45, level: 'Iniciante', desc: 'Hipertrofia e resistência para panturrilhas.' },

  // OMBROS & TRAPÉZIO
  { id: 'lib_desenvolvimento_halter', name: 'Desenvolvimento com Halteres', group: 'ombros', muscle: 'Deltoide Anterior & Lateral', sets: 4, reps: 10, weightKg: 20, restSec: 75, level: 'Intermediário', desc: 'Construção de força vertical e estabilidade escapular.' },
  { id: 'lib_elevacao_lateral', name: 'Elevação Lateral com Halteres', group: 'ombros', muscle: 'Deltoide Lateral', sets: 4, reps: 14, weightKg: 10, restSec: 45, level: 'Iniciante', desc: 'Principal exercício para largura estética dos ombros (formato V).' },
  { id: 'lib_crucifixo_inverso', name: 'Crucifixo Inverso (Deltoide Posterior)', group: 'ombros', muscle: 'Deltoide Posterior', sets: 3, reps: 15, weightKg: 35, restSec: 60, level: 'Iniciante', desc: 'Equilíbrio articular do ombro e postura.' },
  { id: 'lib_encolhimento_halter', name: 'Encolhimento de Ombros (Trapézio)', group: 'ombros', muscle: 'Trapézio Superior', sets: 4, reps: 12, weightKg: 28, restSec: 60, level: 'Iniciante', desc: 'Fortalecimento cervical e volume de trapézio.' },

  // BÍCEPS & TRÍCEPS
  { id: 'lib_rosca_direta', name: 'Rosca Direta na Barra W', group: 'bracos', muscle: 'Bíceps Braquial', sets: 4, reps: 10, weightKg: 30, restSec: 60, level: 'Iniciante', desc: 'Construção de massa para bíceps com pegada anatômica.' },
  { id: 'lib_rosca_martelo', name: 'Rosca Martelo com Halteres', group: 'bracos', muscle: 'Braquial & Antebraço', sets: 3, reps: 12, weightKg: 14, restSec: 60, level: 'Iniciante', desc: 'Densidade lateral do braço e força de pegada.' },
  { id: 'lib_rosca_scott', name: 'Rosca Scott na Máquina/Banco', group: 'bracos', muscle: 'Cabeça Curta do Bíceps', sets: 3, reps: 12, weightKg: 25, restSec: 60, level: 'Intermediário', desc: 'Isolamento rigoroso sem roubo de tronco.' },
  { id: 'lib_triceps_pulley', name: 'Tríceps Pulley na Barra Reta/V', group: 'bracos', muscle: 'Tríceps Lateral', sets: 4, reps: 12, weightKg: 30, restSec: 60, level: 'Iniciante', desc: 'Estabilidade e foco na extensão completa do cotovelo.' },
  { id: 'lib_triceps_corda', name: 'Tríceps na Polia com Corda', group: 'bracos', muscle: 'Tríceps (3 Cabeças)', sets: 4, reps: 12, weightKg: 25, restSec: 60, level: 'Iniciante', desc: 'Abertura final para contração máxima do tríceps.' },
  { id: 'lib_triceps_frances', name: 'Tríceps Francês / Testa', group: 'bracos', muscle: 'Cabeça Longa do Tríceps', sets: 3, reps: 10, weightKg: 22, restSec: 60, level: 'Intermediário', desc: 'Alongamento máximo para volume posterior do braço.' },

  // ABDÔMEN & CORE
  { id: 'lib_abdominal_infra', name: 'Elevação de Pernas (Abdominal Infra)', group: 'core', muscle: 'Abdômen Inferior', sets: 4, reps: 15, weightKg: 0, restSec: 45, level: 'Intermediário', desc: 'Controle pélvico e fortalecimento da região infra-abdominal.' },
  { id: 'lib_abdominal_cabo', name: 'Abdominal Supra na Polia (Crunch)', group: 'core', muscle: 'Reto Abdominal', sets: 4, reps: 15, weightKg: 35, restSec: 45, level: 'Intermediário', desc: 'Progressão de carga real para hipertrofia dos gomos abdominais.' },
  { id: 'lib_prancha_isometrica', name: 'Prancha Isométrica (Segundos)', group: 'core', muscle: 'Core Profundo & Transverso', sets: 3, reps: 60, weightKg: 0, restSec: 45, level: 'Iniciante', desc: 'Estabilidade lombar e resistência isométrica.' },

  // CARDIO & FUNCIONAL
  { id: 'lib_esteira_hiit', name: 'Tiros de Corrida HIIT na Esteira', group: 'cardio', muscle: 'Cardiovascular & VO2 Máx', sets: 6, reps: 1, weightKg: 0, restSec: 60, level: 'Intermediário', desc: 'Alta queima calórica pós-treino (efeito EPOC).' },
  { id: 'lib_escada_ergometrica', name: 'Simulador de Escada Contínuo', group: 'cardio', muscle: 'Cardio & Glúteos', sets: 1, reps: 20, weightKg: 0, restSec: 60, level: 'Intermediário', desc: '20 minutos de condicionamento intenso sem impacto articular.' },
  { id: 'lib_kettlebell_swing', name: 'Kettlebell Swing Russo', group: 'cardio', muscle: 'Potência de Quadril & Core', sets: 4, reps: 15, weightKg: 16, restSec: 60, level: 'Intermediário', desc: 'Explosão muscular e condicionamento metabólico.' }
];

function formatWorkoutStopwatch(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  return [
    String(hrs).padStart(2, '0'),
    String(mins).padStart(2, '0'),
    String(remSec).padStart(2, '0')
  ].join(':');
}

// =====================================================================
// PALETA DE TEMAS ESTILO HEADSPACE (CORES VIBRANTES E ILUSTRAÇÕES)
// =====================================================================
export const WORKOUT_THEMES = [
  {
    id: 'orange',
    bg: '#E86A33',
    gradient: 'linear-gradient(135deg, #FA7B38 0%, #E86A33 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'meditation',
    accent: '#FA7B38',
    label: 'Laranja Energético'
  },
  {
    id: 'blue',
    bg: '#3B82F6',
    gradient: 'linear-gradient(135deg, #38BDF8 0%, #2563EB 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'cloud',
    accent: '#38BDF8',
    label: 'Azul Céu'
  },
  {
    id: 'navy',
    bg: '#334155',
    gradient: 'linear-gradient(135deg, #475569 0%, #1E293B 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(255, 255, 255, 0.14)',
    illustration: 'night',
    accent: '#818CF8',
    label: 'Azul Noturno'
  },
  {
    id: 'red',
    bg: '#E54B4B',
    gradient: 'linear-gradient(135deg, #F87171 0%, #DC2626 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'runner',
    accent: '#F87171',
    label: 'Vermelho Esporte'
  },
  {
    id: 'peach',
    bg: '#E09582',
    gradient: 'linear-gradient(135deg, #F2A995 0%, #D8816C 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.92)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'heart',
    accent: '#E09582',
    label: 'Pêssego Saúde'
  },
  {
    id: 'green',
    bg: '#52B788',
    gradient: 'linear-gradient(135deg, #74C69D 0%, #40916C 100%)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.90)',
    tagBg: 'rgba(0, 0, 0, 0.16)',
    illustration: 'gears',
    accent: '#52B788',
    label: 'Verde Foco'
  }
];

function getWorkoutTheme(workout, index = 0) {
  if (workout?.theme) {
    const found = WORKOUT_THEMES.find(t => t.id === workout.theme);
    if (found) return found;
  }
  const safeIdx = typeof index === 'number' && index >= 0 ? index : 0;
  return WORKOUT_THEMES[safeIdx % WORKOUT_THEMES.length] || WORKOUT_THEMES[0];
}

// =====================================================================
// ILUSTRAÇÕES VETORIAIS FIÉIS AO ESTILO HEADSPACE DA REFERÊNCIA
// =====================================================================
function CardIllustration({ type }) {
  switch (type) {
    case 'meditation':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <path d="M 12 40 C 22 28, 32 50, 44 38" stroke="rgba(255,255,255,0.28)" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 20 54 C 28 46, 36 60, 48 52" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 46 42 C 46 22, 90 22, 90 42" stroke="#211F38" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="68" cy="45" r="23" fill="#FDBA74" />
          <rect x="42" y="36" width="9" height="15" rx="4.5" fill="#F59E0B" stroke="#211F38" strokeWidth="1.5" />
          <rect x="85" y="36" width="9" height="15" rx="4.5" fill="#F59E0B" stroke="#211F38" strokeWidth="1.5" />
          <path d="M 59 43 Q 63 39, 67 43" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 73 43 Q 77 39, 81 43" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="56" cy="49" r="3.2" fill="#EA580C" opacity="0.45" />
          <circle cx="83" cy="49" r="3.2" fill="#EA580C" opacity="0.45" />
          <path d="M 62 49 Q 69 57, 77 49" stroke="#211F38" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'cloud':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <path d="M 16 32 Q 22 24, 30 28 Q 38 24, 44 30 Q 48 36, 40 40 Q 20 40, 16 32 Z" fill="rgba(255,255,255,0.22)" />
          <circle cx="22" cy="18" r="1.8" fill="#FFFFFF" opacity="0.8" />
          <circle cx="98" cy="22" r="2.2" fill="#FFFFFF" opacity="0.8" />
          <path 
            d="M 38 58 C 30 58, 24 50, 28 42 C 28 32, 40 26, 50 30 C 56 19, 74 19, 82 30 C 92 27, 102 34, 100 44 C 106 50, 102 58, 92 58 Z" 
            fill="#E0F2FE" 
          />
          <path d="M 50 44 Q 55 42, 60 44" stroke="#0284C7" strokeWidth="2.3" strokeLinecap="round" fill="none" />
          <path d="M 70 44 Q 75 42, 80 44" stroke="#0284C7" strokeWidth="2.3" strokeLinecap="round" fill="none" />
          <circle cx="47" cy="49" r="3" fill="#38BDF8" opacity="0.6" />
          <circle cx="83" cy="49" r="3" fill="#38BDF8" opacity="0.6" />
          <path d="M 61 50 Q 65.5 54, 70 50" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'night':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <path 
            d="M 28 16 C 26 21, 27 26, 31 29 C 34 31, 38 31, 41 29 C 37 34, 30 35, 25 31 C 21 27, 22 20, 28 16 Z" 
            fill="#FDE047" 
            opacity="0.9" 
          />
          <circle cx="16" cy="18" r="1.5" fill="#FFFFFF" opacity="0.75" />
          <circle cx="46" cy="14" r="1.3" fill="#FFFFFF" opacity="0.7" />
          <rect x="46" y="24" width="6" height="44" rx="3" fill="#818CF8" opacity="0.6" />
          <rect x="52" y="32" width="22" height="26" rx="6" fill="#F8FAFC" transform="rotate(-6 52 32)" />
          <ellipse cx="76" cy="42" rx="14" ry="12" fill="#FED7AA" />
          <path d="M 60 48 C 66 44, 75 45, 82 48 L 102 58 C 104 60, 102 68, 96 68 L 56 68 Z" fill="#6366F1" />
          <path d="M 72 41 Q 76 44, 80 41" stroke="#4338CA" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'runner':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <path d="M 32 62 L 44 62" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 26 56 L 38 56" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="52" r="2" fill="rgba(255,255,255,0.35)" />
          <circle cx="75" cy="28" r="11" fill="#FED7AA" />
          <rect x="65" y="23" width="20" height="4.5" rx="2" fill="#38BDF8" />
          <circle cx="78" cy="27" r="1.4" fill="#991B1B" />
          <path d="M 74 30 Q 78 33, 81 30" stroke="#991B1B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M 72 38 L 77 52 L 68 52 Z" fill="#1E293B" />
          <path d="M 70 40 Q 60 38, 57 44" stroke="#FED7AA" strokeWidth="3.8" strokeLinecap="round" fill="none" />
          <path d="M 74 40 Q 84 42, 90 36" stroke="#FED7AA" strokeWidth="3.8" strokeLinecap="round" fill="none" />
          <path d="M 69 52 L 58 60 L 52 60" stroke="#FED7AA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <rect x="46" y="58" width="10" height="5" rx="2.5" fill="#2DD4BF" />
          <path d="M 75 52 L 83 62 L 91 63" stroke="#FED7AA" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <rect x="88" y="61" width="11" height="5" rx="2.5" fill="#2DD4BF" />
        </svg>
      );

    case 'heart':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <circle cx="72" cy="42" r="26" stroke="rgba(255,255,255,0.24)" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M 56 43 C 48 43, 44 36, 47 30 C 49 26, 54 28, 54 32" stroke="#DC2626" strokeWidth="5.2" strokeLinecap="round" fill="none" />
          <path d="M 86 43 C 94 43, 100 36, 96 28 C 94 24, 88 26, 88 31" stroke="#DC2626" strokeWidth="5.2" strokeLinecap="round" fill="none" />
          <path 
            d="M 72 62 C 64 54, 52 46, 52 36 C 52 28, 58 23, 65 23 C 69 23, 71 26, 72 28 C 73 26, 75 23, 79 23 C 86 23, 92 28, 92 36 C 92 46, 80 54, 72 62 Z" 
            fill="#EF4444" 
          />
          <circle cx="72" cy="36" r="6" fill="#FFFFFF" />
          <circle cx="73" cy="36" r="3.2" fill="#1E293B" />
          <circle cx="74" cy="35" r="1.2" fill="#FFFFFF" />
          <path d="M 66 45 Q 72 51, 78 45" stroke="#991B1B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'gears':
      return (
        <svg width="112" height="78" viewBox="0 0 112 78" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
          <g transform="translate(44, 48)">
            <circle cx="0" cy="0" r="14" fill="#A7F3D0" />
            <circle cx="0" cy="0" r="6" fill="#047857" />
            <rect x="-2" y="-17" width="4" height="34" rx="2" fill="#A7F3D0" />
            <rect x="-17" y="-2" width="34" height="4" rx="2" fill="#A7F3D0" />
          </g>
          <g transform="translate(78, 38)">
            <circle cx="0" cy="0" r="22" fill="#FEF08A" />
            <circle cx="0" cy="0" r="10" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="4.5" fill="#047857" />
            <rect x="-3" y="-26" width="6" height="52" rx="2.5" fill="#FEF08A" />
            <rect x="-26" y="-3" width="52" height="6" rx="2.5" fill="#FEF08A" />
            <rect x="-18" y="-18" width="36" height="36" rx="4" fill="#FEF08A" transform="rotate(45)" />
          </g>
          <path d="M 94 14 Q 96 18, 100 20 Q 96 22, 94 26 Q 92 22, 88 20 Q 92 18, 94 14 Z" fill="#FFFFFF" opacity="0.85" />
          <circle cx="34" cy="24" r="2.2" fill="#FFFFFF" opacity="0.75" />
        </svg>
      );

    default:
      return null;
  }
}

// =====================================================================
// COMPONENTE PRINCIPAL: WORKOUT TAB
// =====================================================================
export function WorkoutTab({ workouts = [], setWorkouts, onCompleteWorkout }) {
  const safeWorkouts = Array.isArray(workouts) ? workouts : [];
  // Controle de Visualização: 'list' (visão geral dos cards) ou 'session' (tela dedicada do treino)
  const [currentView, setCurrentView] = useState('list');
  const [activeWorkoutId, setActiveWorkoutId] = useState(() => safeWorkouts[0]?.id || null);
  
  // Estados dos Modais
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [showExerciseLibraryModal, setShowExerciseLibraryModal] = useState(false);
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);
  const [showEditWorkoutModal, setShowEditWorkoutModal] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteExerciseConfirm, setShowDeleteExerciseConfirm] = useState(null);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);

  // Estados da Biblioteca de Exercícios
  const [libraryGroupFilter, setLibraryGroupFilter] = useState('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [libraryTargetWorkoutId, setLibraryTargetWorkoutId] = useState('');
  const [libraryAddedFeedback, setLibraryAddedFeedback] = useState('');

  // Estados do Cronômetro de Sessão Ativa (Início ao Término + Bloqueio de Edição)
  const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState(null);
  const [workoutElapsedSec, setWorkoutElapsedSec] = useState(0);
  const [lastDurationByWorkout, setLastDurationByWorkout] = useState({});

  useEffect(() => {
    let timer = null;
    if (isWorkoutRunning) {
      timer = setInterval(() => {
        setWorkoutElapsedSec(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWorkoutRunning]);

  // Estados de Criação de Ficha
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [newWorkoutSubtitle, setNewWorkoutSubtitle] = useState('');
  const [newWorkoutTheme, setNewWorkoutTheme] = useState('orange');
  const [newWorkoutDays, setNewWorkoutDays] = useState([1]);
  const [newWorkoutTime, setNewWorkoutTime] = useState('18:30');

  // Estados de Edição Rápida de Ficha
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [editWorkoutName, setEditWorkoutName] = useState('');
  const [editWorkoutSubtitle, setEditWorkoutSubtitle] = useState('');
  const [editWorkoutTheme, setEditWorkoutTheme] = useState('orange');
  const [editWorkoutDays, setEditWorkoutDays] = useState([1]);
  const [editWorkoutTime, setEditWorkoutTime] = useState('18:30');

  // Estados do Formulário de Exercício (Adicionar / Editar)
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(60);
  const [showWeight, setShowWeight] = useState(true);
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [restSec, setRestSec] = useState(60);

  // Contagem de séries feitas por exercício: { [exerciseId]: number }
  const [completedSetsMap, setCompletedSetsMap] = useState({});

  // Treinos concluídos na data de hoje: { [workoutId]: boolean }
  const [completedWorkoutsToday, setCompletedWorkoutsToday] = useState({});

  // Cronômetro de Descanso por atividade
  const [restingExerciseId, setRestingExerciseId] = useState(null);
  const [activeRestSeconds, setActiveRestSeconds] = useState(0);
  const [initialRestSeconds, setInitialRestSeconds] = useState(60);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isResting && activeRestSeconds > 0) {
      interval = setInterval(() => {
        setActiveRestSeconds(prev => prev - 1);
      }, 1000);
    } else if (activeRestSeconds === 0 && isResting) {
      setIsResting(false);
    }
    return () => clearInterval(interval);
  }, [isResting, activeRestSeconds]);

  const currentWorkout = safeWorkouts.find(w => w.id === activeWorkoutId) || safeWorkouts[0] || null;
  const currentExercises = currentWorkout && Array.isArray(currentWorkout.exercises) ? currentWorkout.exercises : [];
  const workoutIndex = currentWorkout ? safeWorkouts.findIndex(w => w.id === currentWorkout.id) : -1;
  const currentWorkoutTheme = getWorkoutTheme(currentWorkout || { theme: 'orange' }, workoutIndex >= 0 ? workoutIndex : 0);
  const isWorkoutCompleted = currentWorkout ? !!completedWorkoutsToday[currentWorkout.id] : false;

  // Iniciar ou reiniciar descanso em uma atividade específica
  const handleStartExerciseRest = (exId, seconds) => {
    const duration = seconds || 60;
    setRestingExerciseId(exId);
    setInitialRestSeconds(duration);
    setActiveRestSeconds(duration);
    setIsResting(true);
  };

  const handleTogglePauseRest = () => {
    setIsResting(prev => !prev);
  };

  const handleStopRest = () => {
    setIsResting(false);
    setActiveRestSeconds(0);
    setRestingExerciseId(null);
  };

  // Alterar rapidamente o tempo de descanso padrão de um exercício
  const handleChangeExerciseRestSec = (exId, newSec) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => ex.id === exId ? { ...ex, restSec: newSec, showRestTimer: true } : ex)
        };
      }
      return w;
    }));
  };

  // Marcar/desmarcar séries feitas de um exercício
  const handleSetCountChange = (ex, nextDoneCount, autoRest = false) => {
    const totalSets = Math.max(1, Number(ex.sets) || 1);
    const clamped = Math.max(0, Math.min(totalSets, nextDoneCount));
    const prevDone = completedSetsMap[ex.id] || 0;

    setCompletedSetsMap(prev => ({
      ...prev,
      [ex.id]: clamped
    }));

    if (autoRest && clamped > prevDone && ex.showRestTimer !== false) {
      handleStartExerciseRest(ex.id, ex.restSec || 60);
    }
  };

  // Marcar ou desmarcar todas as séries do exercício de uma vez
  const handleToggleAllSets = (ex) => {
    const totalSets = Math.max(1, Number(ex.sets) || 1);
    const currentDone = completedSetsMap[ex.id] || 0;
    const nextDone = currentDone >= totalSets ? 0 : totalSets;
    handleSetCountChange(ex, nextDone, false);
  };

  // Ajuste rápido de carga (-1kg / +1kg)
  const handleAdjustWeight = (exId, delta) => {
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === exId) {
              const newWeight = Math.max(0, (ex.weightKg || 0) + delta);
              return { ...ex, weightKg: newWeight };
            }
            return ex;
          })
        };
      }
      return w;
    }));
  };

  // Abrir modal para adicionar exercício (bloqueado durante treino iniciado)
  const handleOpenAddExercise = () => {
    if (isWorkoutRunning) return;
    setExerciseName('');
    setSets(4);
    setReps(10);
    setWeightKg(50);
    setShowWeight(true);
    setShowRestTimer(true);
    setRestSec(60);
    setShowNewExerciseModal(true);
  };

  // Abrir Biblioteca de Cards de Exercícios (bloqueado durante treino iniciado)
  const handleOpenExerciseLibrary = (targetWId = null) => {
    if (isWorkoutRunning) return;
    setLibraryTargetWorkoutId(targetWId || activeWorkoutId || safeWorkouts[0]?.id || '');
    setLibraryGroupFilter('all');
    setLibrarySearchQuery('');
    setLibraryAddedFeedback('');
    setShowExerciseLibraryModal(true);
  };

  // Adicionar Card da Biblioteca direto na Ficha
  const handleAddFromLibrary = (libCard) => {
    if (isWorkoutRunning) return;
    const targetId = libraryTargetWorkoutId || activeWorkoutId || safeWorkouts[0]?.id;
    if (!targetId) return;

    const newEx = {
      id: `ex_lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: libCard.name,
      muscle: libCard.muscle,
      sets: libCard.sets || 4,
      reps: libCard.reps || 10,
      weightKg: libCard.weightKg || 0,
      restSec: libCard.restSec || 60,
      showWeight: (libCard.weightKg || 0) > 0,
      showRestTimer: true
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === targetId) {
        return {
          ...w,
          exercises: [...(w.exercises || []), newEx]
        };
      }
      return w;
    }));

    setLibraryAddedFeedback(`"${libCard.name}" adicionado à ficha!`);
    setTimeout(() => setLibraryAddedFeedback(''), 2500);
  };

  // Abrir modal para editar exercício (bloqueado durante treino iniciado)
  const handleOpenEditExercise = (ex) => {
    if (isWorkoutRunning) return;
    setEditingExerciseId(ex.id);
    setExerciseName(ex.name);
    setSets(ex.sets || 3);
    setReps(ex.reps || 10);
    setWeightKg(ex.weightKg || 0);
    setShowWeight(ex.showWeight !== false);
    setShowRestTimer(ex.showRestTimer !== false);
    setRestSec(ex.restSec || 60);
    setShowEditExerciseModal(true);
  };

  // Submeter Adição de Exercício
  const handleAddExerciseSubmit = (e) => {
    e.preventDefault();
    if (isWorkoutRunning || !exerciseName.trim()) return;

    const newEx = {
      id: `ex_${Date.now()}`,
      name: exerciseName.trim(),
      sets,
      reps,
      weightKg: showWeight ? weightKg : 0,
      restSec,
      showWeight,
      showRestTimer
    };

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: [...(w.exercises || []), newEx]
        };
      }
      return w;
    }));

    setShowNewExerciseModal(false);
  };

  // Submeter Edição de Exercício
  const handleEditExerciseSubmit = (e) => {
    e.preventDefault();
    if (isWorkoutRunning || !exerciseName.trim() || !editingExerciseId) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.map(ex => {
            if (ex.id === editingExerciseId) {
              return {
                ...ex,
                name: exerciseName.trim(),
                sets,
                reps,
                weightKg: showWeight ? weightKg : 0,
                restSec,
                showWeight,
                showRestTimer
              };
            }
            return ex;
          })
        };
      }
      return w;
    }));

    setShowEditExerciseModal(false);
    setEditingExerciseId(null);
  };

  // Excluir exercício (bloqueado durante treino iniciado)
  const handleDeleteExercise = (exId) => {
    if (isWorkoutRunning) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === activeWorkoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(ex => ex.id !== exId)
        };
      }
      return w;
    }));
    setShowDeleteExerciseConfirm(null);
  };

  // Excluir ficha de treino inteira
  const handleDeleteWorkout = (wId) => {
    if (isWorkoutRunning) return;
    const remaining = safeWorkouts.filter(w => w.id !== wId);
    setWorkouts(remaining);
    setActiveWorkoutId(remaining[0]?.id || null);
    if (activeWorkoutId === wId || remaining.length === 0) {
      setCurrentView('list');
    }
  };

  // Abrir Modal de Edição de Ficha de Treino (bloqueado durante treino iniciado)
  const handleOpenEditWorkout = (workout, e) => {
    if (e) e.stopPropagation();
    if (isWorkoutRunning) return;
    setEditingWorkoutId(workout.id);
    setEditWorkoutName(workout.name);
    setEditWorkoutSubtitle(workout.subtitle || '');
    setEditWorkoutTheme(workout.theme || 'orange');
    setEditWorkoutDays(workout.scheduledDays || [1]);
    setEditWorkoutTime(workout.scheduledTime || '18:30');
    setShowEditWorkoutModal(true);
  };

  // Submeter Edição de Ficha
  const handleEditWorkoutSubmit = (e) => {
    e.preventDefault();
    if (!editWorkoutName.trim() || !editingWorkoutId) return;

    setWorkouts(prev => prev.map(w => {
      if (w.id === editingWorkoutId) {
        return {
          ...w,
          name: editWorkoutName.trim(),
          subtitle: editWorkoutSubtitle.trim() || 'Foco em força e hipertrofia progressiva',
          theme: editWorkoutTheme || 'orange',
          scheduledDays: editWorkoutDays,
          scheduledTime: editWorkoutTime || '18:30'
        };
      }
      return w;
    }));

    setShowEditWorkoutModal(false);
    setEditingWorkoutId(null);
  };

  // Iniciar Cronômetro do Treino (Bloqueia Edição/Adição e contabiliza tempo do início ao término)
  const handleStartTimedWorkout = (workoutId = activeWorkoutId) => {
    if (workoutId) setActiveWorkoutId(workoutId);
    setCurrentView('session');
    setIsWorkoutRunning(true);
    setWorkoutStartTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setWorkoutElapsedSec(0);
  };

  // Confirmar Finalização do Treino (Encerra cronômetro e salva duração total)
  const handleConfirmFinishWorkout = () => {
    if (!currentWorkout) return;
    const finalElapsed = workoutElapsedSec;
    setIsWorkoutRunning(false);
    if (finalElapsed > 0) {
      setLastDurationByWorkout(prev => ({
        ...prev,
        [currentWorkout.id]: finalElapsed
      }));
    }
    setCompletedWorkoutsToday(prev => ({
      ...prev,
      [currentWorkout.id]: true
    }));
    setShowFinishConfirmModal(false);
    onCompleteWorkout(currentWorkout.name);
  };

  // Confirmar Reinício do Treino
  const handleConfirmResetWorkout = () => {
    if (!currentWorkout) return;
    setIsWorkoutRunning(false);
    setWorkoutElapsedSec(0);
    setWorkoutStartTime(null);
    setCompletedWorkoutsToday(prev => ({
      ...prev,
      [currentWorkout.id]: false
    }));
    const exIds = currentWorkout.exercises?.map(e => e.id) || [];
    setCompletedSetsMap(prev => {
      const next = { ...prev };
      exIds.forEach(id => delete next[id]);
      return next;
    });
    setShowResetConfirmModal(false);
    handleStopRest();
  };

  // Alternar dia de execução na agenda semanal
  const handleToggleWorkoutDay = (workoutId, dayIdx) => {
    if (isWorkoutRunning) return;
    setWorkouts(prev => prev.map(w => {
      if (w.id === workoutId) {
        const currentDays = w.scheduledDays || [];
        const nextDays = currentDays.includes(dayIdx)
          ? currentDays.filter(d => d !== dayIdx)
          : [...currentDays, dayIdx];
        return {
          ...w,
          scheduledDays: nextDays
        };
      }
      return w;
    }));
  };

  // Submeter criação de nova ficha de treino
  const handleCreateWorkoutSubmit = (e) => {
    e.preventDefault();
    if (!newWorkoutName.trim()) return;

    const newId = `wo_${Date.now()}`;
    const newWorkoutObj = {
      id: newId,
      name: newWorkoutName.trim(),
      subtitle: newWorkoutSubtitle.trim() || 'Foco em força e hipertrofia progressiva',
      theme: newWorkoutTheme || 'orange',
      scheduledDays: newWorkoutDays,
      scheduledTime: newWorkoutTime || '18:30',
      exercises: []
    };

    setWorkouts(prev => [...prev, newWorkoutObj]);
    setActiveWorkoutId(newId);
    setNewWorkoutName('');
    setNewWorkoutSubtitle('');
    setNewWorkoutDays([1]);
    setShowNewWorkoutModal(false);
  };

  // Iniciar treino cronometrado direto do card ou abrir ficha para edição
  const handleStartWorkoutSession = (workoutId, e, startTimerImmediately = false) => {
    if (e) e.stopPropagation();
    setActiveWorkoutId(workoutId);
    setCurrentView('session');
    if (startTimerImmediately) {
      setIsWorkoutRunning(true);
      setWorkoutStartTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setWorkoutElapsedSec(0);
    }
  };

  // Métricas gerais da sessão atual baseadas nas séries feitas
  const totalTargetSets = currentExercises.reduce((acc, ex) => acc + Math.max(1, Number(ex.sets) || 1), 0);
  const totalDoneSets = currentExercises.reduce((acc, ex) => {
    const maxS = Math.max(1, Number(ex.sets) || 1);
    return acc + Math.min(maxS, completedSetsMap[ex.id] || 0);
  }, 0);
  const completedExercisesCount = currentExercises.filter(ex => {
    const maxS = Math.max(1, Number(ex.sets) || 1);
    return (completedSetsMap[ex.id] || 0) >= maxS;
  }).length;

  const progressPercent = totalTargetSets > 0 ? Math.round((totalDoneSets / totalTargetSets) * 100) : 0;

  // Cálculo para o anel circular de progresso
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const effectiveProgress = isWorkoutCompleted ? 100 : progressPercent;
  const ringOffset = ringCircumference - (effectiveProgress / 100) * ringCircumference;

  const restingExerciseObj = currentExercises.find(e => e.id === restingExerciseId);

  // Estimativa de volume de carga movimentada hoje
  const totalEstimatedWeightMoved = currentExercises.reduce((acc, ex) => {
    const done = completedSetsMap[ex.id] || 0;
    const repsCount = Number(ex.reps) || 10;
    const kg = Number(ex.weightKg) || 0;
    return acc + (done * repsCount * kg);
  }, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {currentView === 'session' && currentWorkout ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BARRA SUPERIOR DE NAVEGAÇÃO E RETORNO */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCurrentView('list')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.85)',
                borderRadius: '999px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1A1B2F',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 6px 18px rgba(33, 31, 56, 0.08)'
              }}
            >
              <ArrowLeft size={16} />
              <span>Voltar para Todas as Fichas</span>
            </button>

            {/* Troca Rápida de Ficha na barra superior (bloqueada durante treino iniciado) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {safeWorkouts.map((w) => {
                const isSelected = w.id === activeWorkoutId;
                const isDone = !!completedWorkoutsToday[w.id];
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={isWorkoutRunning && !isSelected}
                    onClick={() => {
                      if (!isWorkoutRunning) setActiveWorkoutId(w.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid #211F38' : '1px solid rgba(33, 31, 56, 0.12)',
                      backgroundColor: isSelected ? '#211F38' : 'rgba(255, 255, 255, 0.65)',
                      color: isSelected ? '#FFFFFF' : '#1A1B2F',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: isWorkoutRunning && !isSelected ? 'not-allowed' : 'pointer',
                      opacity: isWorkoutRunning && !isSelected ? 0.5 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{w.name}</span>
                    {isDone && <CheckCircle2 size={13} color="#34D399" />}
                  </button>
                );
              })}

              {!isWorkoutRunning && currentWorkout && (
                <button
                  type="button"
                  onClick={() => setWorkoutToDelete(currentWorkout)}
                  title="Excluir esta ficha de treino"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.28)',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginLeft: '4px'
                  }}
                >
                  <Trash2 size={12} />
                  <span>Excluir Ficha</span>
                </button>
              )}
            </div>
          </div>

          {/* PAINEL DE CRONÔMETRO DE TREINO (INÍCIO AO TÉRMINO) & BLOQUEIO DE EDIÇÃO */}
          <div
            style={{
              background: isWorkoutRunning
                ? 'linear-gradient(135deg, #1E1B36 0%, #2D2A4E 100%)'
                : 'rgba(255, 255, 255, 0.78)',
              borderRadius: '24px',
              padding: '18px 24px',
              border: isWorkoutRunning
                ? '1.5px solid rgba(52, 211, 153, 0.45)'
                : '1px solid rgba(33, 31, 56, 0.12)',
              boxShadow: isWorkoutRunning
                ? '0 12px 32px rgba(30, 27, 54, 0.28)'
                : '0 8px 24px rgba(20, 18, 40, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              color: isWorkoutRunning ? '#FFFFFF' : '#1A1B2F'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: isWorkoutRunning ? 'rgba(52, 211, 153, 0.18)' : 'rgba(86, 84, 138, 0.12)',
                  color: isWorkoutRunning ? '#34D399' : '#56548A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isWorkoutRunning ? '1px solid rgba(52, 211, 153, 0.4)' : 'none',
                  flexShrink: 0
                }}
              >
                <Timer size={26} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: isWorkoutRunning ? '#34D399' : '#56548A'
                    }}
                  >
                    {isWorkoutRunning
                      ? `⏱️ Treino Iniciado às ${workoutStartTime || 'agora'}`
                      : lastDurationByWorkout[currentWorkout.id]
                      ? `✅ Último Tempo Registrado: ${formatWorkoutStopwatch(lastDurationByWorkout[currentWorkout.id])}`
                      : 'Modo de Preparação & Edição da Ficha'}
                  </span>

                  {isWorkoutRunning && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: '#FBBF24',
                        border: '1px solid rgba(245, 158, 11, 0.4)'
                      }}
                    >
                      <Lock size={11} /> Edição e adição de exercícios bloqueadas
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '4px' }}>
                  <span
                    style={{
                      fontSize: '28px',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em',
                      color: isWorkoutRunning ? '#FFFFFF' : '#1A1B2F'
                    }}
                  >
                    {formatWorkoutStopwatch(
                      isWorkoutRunning ? workoutElapsedSec : (lastDurationByWorkout[currentWorkout.id] || 0)
                    )}
                  </span>
                  <span style={{ fontSize: '12px', color: isWorkoutRunning ? '#C5C7DE' : '#5A5B75' }}>
                    {isWorkoutRunning
                      ? 'Contabilizando tempo do início até o término do treino'
                      : 'Ao iniciar o treino, o cronômetro dispara e a ficha fica bloqueada para edições'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {!isWorkoutRunning ? (
                <button
                  type="button"
                  onClick={() => handleStartTimedWorkout(currentWorkout.id)}
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '11px 22px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <Play size={15} fill="#FFFFFF" />
                  <span>Iniciar Treino (Cronometrar)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFinishConfirmModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '11px 22px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 18px rgba(239, 68, 68, 0.35)'
                  }}
                >
                  <Square size={14} fill="#FFFFFF" />
                  <span>Encerrar e Finalizar Treino</span>
                </button>
              )}
            </div>
          </div>

          {/* HERO BANNER DA FICHA ATIVA COM TEMA VISUAL E ILUSTRAÇÃO */}
          <div
            style={{
              background: currentWorkoutTheme.gradient,
              borderRadius: '26px',
              padding: '24px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '18px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.28)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    color: '#FFFFFF',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: '1px solid rgba(255, 255, 255, 0.4)'
                  }}
                >
                  {isWorkoutRunning ? '🔥 Treino Ativo (Bloqueado para Edição)' : '📋 Ficha de Treino'}
                </span>

                {isWorkoutCompleted && (
                  <span
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Award size={13} /> Concluído Hoje (+50 pts)
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '26px', fontWeight: 800, margin: '4px 0 6px 0', letterSpacing: '-0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                {currentWorkout.name}
              </h2>

              <p style={{ fontSize: '14px', color: currentWorkoutTheme.subColor, margin: '0 0 14px 0', fontWeight: 500, lineHeight: 1.4 }}>
                {currentWorkout.subtitle || 'Foco em força, hipertrofia e progressão de carga.'}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {!isWorkoutRunning ? (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditWorkout(currentWorkout, e)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1A1B2F',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '7px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Editar Esta Ficha</span>
                  </button>
                ) : (
                  <span
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      color: '#FFFFFF',
                      borderRadius: '999px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Lock size={12} /> Ficha em execução
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: currentWorkoutTheme.subColor }}>
                    Dias:
                  </span>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
                    const isSelected = (currentWorkout.scheduledDays || []).includes(dIdx);
                    return (
                      <button
                        key={dName}
                        type="button"
                        disabled={isWorkoutRunning}
                        onClick={() => handleToggleWorkoutDay(currentWorkout.id, dIdx)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.22)',
                          color: isSelected ? '#1A1B2F' : '#FFFFFF',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: isWorkoutRunning ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {dName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center' }}>
              <CardIllustration type={currentWorkoutTheme.illustration} />
            </div>
          </div>

          {/* MÉTRICAS DE PROGRESSO DA SESSÃO */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.56)',
              backdropFilter: 'blur(18px) saturate(150%)',
              WebkitBackdropFilter: 'blur(18px) saturate(150%)',
              borderRadius: '24px',
              padding: '20px 24px',
              border: '1px solid rgba(255, 255, 255, 0.72)',
              boxShadow: '0 10px 28px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div style={{ width: '66px', height: '66px', position: 'relative', flexShrink: 0 }}>
                <svg width="66" height="66" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r={ringRadius} fill="none" stroke="#CFCFD9" strokeWidth="6.5" />
                  <circle
                    cx="34"
                    cy="34"
                    r={ringRadius}
                    fill="none"
                    stroke={isWorkoutCompleted ? '#10B981' : '#211F38'}
                    strokeWidth="6.5"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 34 34)"
                    style={{ transition: 'stroke-dashoffset 0.35s ease' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: isWorkoutCompleted ? '#059669' : '#1A1B2F'
                  }}
                >
                  {effectiveProgress}%
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                  {totalDoneSets} de {totalTargetSets} séries concluídas
                </h3>
                <p style={{ fontSize: '12px', color: '#5A5B75', margin: '3px 0 0 0' }}>
                  {completedExercisesCount} de {currentExercises.length} exercícios finalizados • {totalEstimatedWeightMoved} kg movimentados
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {!isWorkoutRunning ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenExerciseLibrary(currentWorkout.id)}
                    style={{
                      backgroundColor: '#56548A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '9px 18px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(86, 84, 138, 0.25)'
                    }}
                  >
                    <BookOpen size={14} />
                    <span>Biblioteca de Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddExercise}
                    style={{
                      backgroundColor: '#211F38',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '9px 18px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
                    }}
                  >
                    <Plus size={14} />
                    <span>Novo Exercício</span>
                  </button>
                </>
              ) : (
                <span
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(33, 31, 56, 0.08)',
                    color: '#4E506B',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Lock size={13} /> Adição/Edição bloqueada durante o treino
                </span>
              )}

              {!isWorkoutCompleted ? (
                <button
                  type="button"
                  onClick={() => setShowFinishConfirmModal(true)}
                  style={{
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '9px 20px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Finalizar Treino (+50 pts)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(true)}
                  style={{
                    backgroundColor: 'rgba(33, 31, 56, 0.12)',
                    color: '#211F38',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '9px 18px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reiniciar Sessão</span>
                </button>
              )}
            </div>
          </div>

          {/* BANNER DE CRONÔMETRO DE DESCANSO ATIVO */}
          {activeRestSeconds > 0 && (
            <div
              style={{
                backgroundColor: '#211F38',
                border: '1px solid rgba(166, 180, 232, 0.35)',
                borderRadius: '20px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 8px 24px rgba(33, 31, 56, 0.25)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: '#56548A',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#A6B4E8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Descanso em Andamento {restingExerciseObj ? `• ${restingExerciseObj.name}` : ''}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15 }}>
                    {activeRestSeconds}s <span style={{ fontSize: '13px', fontWeight: 500, color: '#C5C7DE' }}>restantes</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleTogglePauseRest}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {isResting ? <Pause size={13} /> : <Play size={13} />}
                  <span>{isResting ? 'Pausar' : 'Retomar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRestSeconds(prev => prev + 15)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.14)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  +15s
                </button>

                <button
                  type="button"
                  onClick={handleStopRest}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: '#E6E7F2',
                    color: '#1A1B2F',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Encerrar Descanso
                </button>
              </div>
            </div>
          )}

          {/* LISTA DE EXERCÍCIOS DA FICHA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentExercises.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.56)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: '22px',
                  padding: '42px 24px',
                  textAlign: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.72)'
                }}
              >
                <Dumbbell size={36} color="#56548A" style={{ margin: '0 auto 12px auto', display: 'block', opacity: 0.6 }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1B2F', margin: '0 0 6px 0' }}>
                  Nenhum exercício cadastrado nesta ficha ainda
                </p>
                <p style={{ fontSize: '13px', color: '#5A5B75', margin: '0 0 18px 0' }}>
                  Escolha cards prontos na Biblioteca de Exercícios ou crie seu próprio exercício personalizado.
                </p>
                {!isWorkoutRunning && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenExerciseLibrary(currentWorkout.id)}
                      style={{
                        backgroundColor: '#56548A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '10px 22px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <BookOpen size={15} />
                      <span>Abrir Biblioteca de Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddExercise}
                      style={{
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '10px 22px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={15} />
                      <span>Criar Exercício Personalizado</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              currentExercises.map((ex, index) => {
                const totalSets = Math.max(1, Number(ex.sets) || 1);
                const doneSets = Math.min(totalSets, completedSetsMap[ex.id] || 0);
                const isAllSetsDone = doneSets >= totalSets;
                const isThisResting = restingExerciseId === ex.id && activeRestSeconds > 0;
                const setPercent = Math.round((doneSets / totalSets) * 100);

                return (
                  <div
                    key={ex.id || index}
                    style={{
                      backgroundColor: isAllSetsDone ? 'rgba(220, 252, 231, 0.75)' : '#FFFFFF',
                      borderRadius: '20px',
                      padding: '18px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      border: isAllSetsDone ? '1.5px solid #10B981' : isThisResting ? '1.5px solid #56548A' : '1px solid rgba(33, 31, 56, 0.08)',
                      boxShadow: '0 6px 20px rgba(33, 31, 56, 0.05)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {/* Linha superior: Check geral, nome, meta, carga, descanso, ações */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                        <button
                          type="button"
                          onClick={() => handleToggleAllSets(ex)}
                          title={isAllSetsDone ? 'Reiniciar séries deste exercício' : 'Marcar todas as séries como concluídas'}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '9px',
                            border: isAllSetsDone ? 'none' : '2px solid #56548A',
                            backgroundColor: isAllSetsDone ? '#10B981' : '#FFFFFF',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            padding: 0
                          }}
                        >
                          {isAllSetsDone && <Check size={16} strokeWidth={3} />}
                        </button>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#1A1B2F',
                                textDecoration: isAllSetsDone ? 'line-through' : 'none',
                                opacity: isAllSetsDone ? 0.75 : 1
                              }}
                            >
                              {ex.name}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: '999px',
                                backgroundColor: isAllSetsDone ? 'rgba(16, 185, 129, 0.22)' : 'rgba(33, 31, 56, 0.08)',
                                color: isAllSetsDone ? '#065F46' : '#211F38'
                              }}
                            >
                              {doneSets}/{totalSets} séries ({setPercent}%)
                            </span>
                          </div>

                          <div style={{ fontSize: '12.5px', color: '#4E506B', fontWeight: 500, marginTop: '2px' }}>
                            Meta: {totalSets} séries × {ex.reps} repetições
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Cronômetro e Seletor de Descanso */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: isThisResting ? '#211F38' : '#ECEEF5',
                            borderRadius: '999px',
                            padding: '3px 4px 3px 10px',
                            gap: '6px'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleStartExerciseRest(ex.id, ex.restSec || 60)}
                            title="Ativar cronômetro de descanso"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isThisResting ? '#6EE7B7' : '#211F38',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 4px'
                            }}
                          >
                            <Clock size={13} />
                            <span>
                              {isThisResting ? `Descansando: ${activeRestSeconds}s` : 'Descanso'}
                            </span>
                          </button>

                          <select
                            value={ex.restSec || 60}
                            disabled={isWorkoutRunning}
                            onChange={(e) => handleChangeExerciseRestSec(ex.id, Number(e.target.value))}
                            title="Escolher tempo de descanso"
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#1A1B2F',
                              border: 'none',
                              borderRadius: '999px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: isWorkoutRunning ? 'not-allowed' : 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value={30}>30s</option>
                            <option value={45}>45s</option>
                            <option value={60}>60s</option>
                            <option value={90}>90s</option>
                            <option value={120}>120s</option>
                            <option value={180}>180s</option>
                          </select>
                        </div>

                        {/* Ajuste de Carga */}
                        {ex.showWeight !== false && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#ECEEF5',
                              borderRadius: '999px',
                              padding: '3px 6px'
                            }}
                          >
                            {!isWorkoutRunning && (
                              <button
                                type="button"
                                onClick={() => handleAdjustWeight(ex.id, -1)}
                                title="Diminuir carga (-1 kg)"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: '#FFFFFF',
                                  color: '#211F38',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  fontSize: '14px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                −
                              </button>
                            )}

                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#1A1B2F',
                                minWidth: '48px',
                                textAlign: 'center',
                                padding: isWorkoutRunning ? '2px 8px' : 0
                              }}
                            >
                              {ex.weightKg} kg
                            </span>

                            {!isWorkoutRunning && (
                              <button
                                type="button"
                                onClick={() => handleAdjustWeight(ex.id, 1)}
                                title="Aumentar carga (+1 kg)"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: '#FFFFFF',
                                  color: '#211F38',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  fontSize: '14px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}
                              >
                                +
                              </button>
                            )}
                          </div>
                        )}

                        {/* Botões Editar / Excluir Exercício (Ocultados/Bloqueados quando o treino está iniciado) */}
                        {!isWorkoutRunning && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditExercise(ex)}
                              title="Editar exercício"
                              style={{
                                background: 'rgba(33, 31, 56, 0.08)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#3A3C58',
                                cursor: 'pointer',
                                padding: '6px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700
                              }}
                            >
                              <Edit3 size={13} />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowDeleteExerciseConfirm(ex.id)}
                              title="Excluir exercício"
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#991B1B',
                                cursor: 'pointer',
                                padding: '7px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Barra de Marcação de Séries Feitas */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(33, 31, 56, 0.07)',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4E506B', marginRight: '4px' }}>
                          Marcar Séries:
                        </span>

                        {Array.from({ length: totalSets }, (_, sIdx) => {
                          const setNumber = sIdx + 1;
                          const isSetDone = setNumber <= doneSets;

                          return (
                            <button
                              key={setNumber}
                              type="button"
                              onClick={() => {
                                const nextVal = isSetDone && doneSets === setNumber ? setNumber - 1 : setNumber;
                                handleSetCountChange(ex, nextVal, nextVal > doneSets);
                              }}
                              style={{
                                padding: '6px 13px',
                                borderRadius: '10px',
                                border: isSetDone ? 'none' : '1px solid #C4C6D8',
                                backgroundColor: isSetDone ? '#211F38' : '#F8FAFC',
                                color: isSetDone ? '#FFFFFF' : '#3A3C58',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: isSetDone ? '0 3px 8px rgba(33, 31, 56, 0.2)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSetDone && <Check size={12} strokeWidth={3} color="#34D399" />}
                              <span>{setNumber}ª Série</span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleSetCountChange(ex, doneSets - 1, false)}
                          disabled={doneSets <= 0}
                          style={{
                            padding: '5px 11px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'rgba(33, 31, 56, 0.08)',
                            color: '#211F38',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: doneSets <= 0 ? 'not-allowed' : 'pointer',
                            opacity: doneSets <= 0 ? 0.45 : 1
                          }}
                        >
                          −1 Série
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetCountChange(ex, doneSets + 1, true)}
                          disabled={doneSets >= totalSets}
                          style={{
                            padding: '5px 13px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: doneSets >= totalSets ? '#10B981' : '#56548A',
                            color: '#FFFFFF',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: doneSets >= totalSets ? 'default' : 'pointer'
                          }}
                        >
                          {doneSets >= totalSets ? 'Concluído ✓' : '+1 Série Feita'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* ================================================================== */}
          {/* TOP CARDS: MÉTRICAS E RELATÓRIOS (MANTIDOS E APRIMORADOS)          */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* CARD 1 (7 COLUNAS): PROGRESSO GERAL & FORÇA */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '24px',
            padding: '20px 22px',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 10px 28px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}
          className="lg:col-span-7"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#211F38" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0, letterSpacing: '-0.01em' }}>
                  Progresso da Sessão
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#5A5B75', marginTop: '2px', display: 'block' }}>
                {totalDoneSets} de {totalTargetSets} séries executadas ({completedExercisesCount}/{currentExercises.length} exercícios concluídos)
              </span>
            </div>

            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                backgroundColor: isWorkoutCompleted ? '#10B981' : '#211F38',
                color: '#FFFFFF',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {isWorkoutCompleted ? <CheckCircle2 size={13} /> : null}
              {isWorkoutCompleted ? 'Treino Concluído' : `${effectiveProgress}% Concluído`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#3A3C58', lineHeight: 1.3 }}>
              Strength<br />Gains
            </div>

            <div style={{ flex: 1, maxWidth: '170px', height: '52px' }}>
              <svg viewBox="0 0 130 48" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="strengthGradList" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D6B9E" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#6D6B9E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 6 42 Q 25 22, 42 28 T 78 24 T 118 6 L 118 44 L 6 44 Z"
                  fill="url(#strengthGradList)"
                />
                <path
                  d="M 6 42 Q 25 22, 42 28 T 78 24 T 118 6"
                  fill="none"
                  stroke="#4D4B7C"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="34" cy="26" r="3" fill="#211F38" />
                <circle cx="72" cy="27" r="3" fill="#211F38" />
                <circle cx="118" cy="6" r="3.2" fill="#211F38" />
              </svg>
            </div>

            <div style={{ width: '66px', height: '66px', position: 'relative', flexShrink: 0 }}>
              <svg width="66" height="66" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r={ringRadius} fill="none" stroke="#CFCFD9" strokeWidth="6.5" />
                <circle
                  cx="34"
                  cy="34"
                  r={ringRadius}
                  fill="none"
                  stroke={isWorkoutCompleted ? '#10B981' : '#211F38'}
                  strokeWidth="6.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 34 34)"
                  style={{ transition: 'stroke-dashoffset 0.35s ease' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isWorkoutCompleted ? '#059669' : '#1A1B2F'
                }}
              >
                {effectiveProgress}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(33, 31, 56, 0.08)' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4E506B', backgroundColor: 'rgba(33, 31, 56, 0.06)', padding: '3px 9px', borderRadius: '8px' }}>
              ✓ {totalDoneSets}/{totalTargetSets} Séries Feitas
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4E506B', backgroundColor: 'rgba(33, 31, 56, 0.06)', padding: '3px 9px', borderRadius: '8px' }}>
              🏋️ {totalEstimatedWeightMoved} kg movimentados
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '3px 9px', borderRadius: '8px' }}>
              +50 pts por sessão
            </span>
          </div>
        </div>

        {/* CARD 2 (5 COLUNAS): RELATÓRIO SEMANAL & CONSISTÊNCIA */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.56)',
            backdropFilter: 'blur(18px) saturate(150%)',
            WebkitBackdropFilter: 'blur(18px) saturate(150%)',
            borderRadius: '24px',
            padding: '20px 22px',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 10px 28px rgba(20, 18, 40, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px'
          }}
          className="lg:col-span-5"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#211F38" />
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                  Frequência Semanal
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                Consistência e divisão das rotinas
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEE2E2', padding: '4px 10px', borderRadius: '999px', color: '#DC2626', fontSize: '11.5px', fontWeight: 700 }}>
              <Flame size={14} />
              <span>7 Dias Streak</span>
            </div>
          </div>

          {/* Calendário Semanal com Indicadores */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
              const hasWorkout = safeWorkouts.some(w => (w.scheduledDays || []).includes(dIdx));
              const isToday = new Date().getDay() === dIdx;

              return (
                <div
                  key={dName}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '12px',
                    backgroundColor: isToday ? '#211F38' : hasWorkout ? 'rgba(86, 84, 138, 0.14)' : 'rgba(33, 31, 56, 0.05)',
                    color: isToday ? '#FFFFFF' : '#1A1B2F',
                    border: isToday ? '1px solid #211F38' : '1px solid transparent'
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, opacity: isToday ? 0.8 : 0.6 }}>
                    {dName}
                  </div>
                  <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
                    {hasWorkout ? (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isToday ? '#34D399' : '#56548A' }} />
                    ) : (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'transparent' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(33, 31, 56, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: '#56548A' }}>
              <Layers size={14} />
              <span>{safeWorkouts.length} fichas configuradas</span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewWorkoutModal(true)}
              style={{
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={13} />
              <span>Nova Ficha</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEÇÃO ABAIXO DAS MÉTRICAS: CARDS ESTILO HEADSPACE (REFERÊNCIA)     */}
      {/* ================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1B2F', margin: 0, letterSpacing: '-0.01em' }}>
              Minhas Fichas de Treino & Rotinas
            </h3>
            <span style={{ fontSize: '12.5px', color: '#5A5B75' }}>
              Escolha exercícios na Biblioteca de Cards, edite sua ficha ou inicie o treino cronometrado
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleOpenExerciseLibrary(activeWorkoutId)}
              style={{
                backgroundColor: '#56548A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 18px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(86, 84, 138, 0.25)'
              }}
            >
              <BookOpen size={14} />
              <span>Biblioteca de Cards ({EXERCISE_LIBRARY_CATALOG.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewWorkoutModal(true)}
              style={{
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '999px',
                padding: '8px 18px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(33, 31, 56, 0.2)'
              }}
            >
              <Plus size={14} />
              <span>Adicionar Ficha</span>
            </button>
          </div>
        </div>

        {/* LISTA DE CARDS ESTILO HEADSPACE (SEM EXPANDIR ABAIXO DO CARD) */}
        {safeWorkouts.length === 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '48px 24px',
            textAlign: 'center',
            border: '1.5px dashed rgba(33, 31, 56, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#211F38',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(33, 31, 56, 0.25)'
            }}>
              <Dumbbell size={28} />
            </div>
            <div>
              <h4 style={{ fontSize: '19px', fontWeight: 800, color: '#211F38', margin: '0 0 6px 0' }}>
                Nenhuma ficha de treino cadastrada
              </h4>
              <p style={{ fontSize: '13px', color: '#686687', maxWidth: '400px', margin: 0, lineHeight: 1.5 }}>
                Sua rotina de treinos está zerada para esta conta. Crie sua primeira ficha personalizada com divisão de grupos musculares, repetições e pesos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewWorkoutModal(true)}
              style={{
                marginTop: '6px',
                background: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '11px 22px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(33, 31, 56, 0.2)'
              }}
            >
              <Plus size={16} />
              <span>Criar Primeira Ficha</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {safeWorkouts.map((w, idx) => {
            const theme = getWorkoutTheme(w, idx);
            const isDone = !!completedWorkoutsToday[w.id];
            const exerciseCount = w.exercises?.length || 0;
            const targetSets = w.exercises?.reduce((acc, ex) => acc + Math.max(1, Number(ex.sets) || 1), 0) || 0;

            return (
              <div
                key={w.id}
                onClick={() => handleStartWorkoutSession(w.id, null, false)}
                style={{
                  background: theme.gradient,
                  borderRadius: '24px',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* LINHA SUPERIOR: TÍTULO, SUBTÍTULO E ILUSTRAÇÃO */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  {/* LADO ESQUERDO: TÍTULO, SUBTÍTULO E DIAS */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '16px', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h4
                        style={{
                          fontSize: '19px',
                          fontWeight: 800,
                          color: theme.textColor,
                          margin: 0,
                          letterSpacing: '-0.01em',
                          textShadow: '0 1px 2px rgba(0,0,0,0.12)'
                        }}
                      >
                        {w.name}
                      </h4>

                      {isDone && (
                        <span
                          style={{
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Concluído (+50 pts)
                        </span>
                      )}

                      {lastDurationByWorkout[w.id] && (
                        <span
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.22)',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Timer size={12} />
                          Tempo: {formatWorkoutStopwatch(lastDurationByWorkout[w.id])}
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '13px',
                        color: theme.subColor,
                        margin: 0,
                        lineHeight: 1.4,
                        fontWeight: 500,
                        textShadow: '0 1px 2px rgba(0,0,0,0.08)'
                      }}
                    >
                      {w.subtitle || `${exerciseCount} exercícios • ${targetSets} séries • Foco em execução e hipertrofia`}
                    </p>

                    {/* DIAS AGENDADOS NA SEMANA */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: theme.subColor, opacity: 0.9 }}>
                        Dias:
                      </span>
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dName, dIdx) => {
                        const isDay = (w.scheduledDays || []).includes(dIdx);
                        if (!isDay) return null;
                        return (
                          <span
                            key={dName}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: 'rgba(255,255,255,0.22)',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {dName}
                          </span>
                        );
                      })}
                      {(!w.scheduledDays || w.scheduledDays.length === 0) && (
                        <span style={{ fontSize: '10.5px', color: theme.subColor, opacity: 0.8 }}>
                          Livre / Sem agendamento
                        </span>
                      )}
                    </div>
                  </div>

                  {/* LADO DIREITO: ILUSTRAÇÃO TEMÁTICA ESTILO HEADSPACE */}
                  <div style={{ flexShrink: 0, zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CardIllustration type={theme.illustration} />
                  </div>
                </div>

                {/* BARRA DE ACESSO RÁPIDO DO CARD: INICIAR TREINO, MONTAR/EDITAR EXERCÍCIOS, BIBLIOTECA, EDITAR FICHA */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '14px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                    flexWrap: 'wrap',
                    zIndex: 2
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => handleStartWorkoutSession(w.id, e, true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#1A1B2F',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '7px 18px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    <Play size={13} fill="#1A1B2F" />
                    <span>Iniciar Treino (Cronometrar)</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleStartWorkoutSession(w.id, e, false)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.24)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: '999px',
                      padding: '7px 15px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backdropFilter: 'blur(6px)'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Ver / Editar Exercícios ({exerciseCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenExerciseLibrary(w.id);
                    }}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '999px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <BookOpen size={13} />
                    <span>Biblioteca</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenEditWorkout(w, e)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.18)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '999px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Editar Card</span>
                  </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkoutToDelete(w);
                      }}
                      title="Excluir ficha de treino"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '999px',
                        width: '32px',
                        height: '32px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
        </div>
      )}

      {/* =====================================================================
          MODAIS FUNCIONAIS (SEMPRE RENDERIZADOS EM AMBAS AS VISÕES)
         ===================================================================== */}

      {/* MODAL: BIBLIOTECA DE CARDS DE EXERCÍCIOS PARA ESCOLHER E COLOCAR NA FICHA */}
      {showExerciseLibraryModal && (
        <div className="modal-overlay" onClick={() => setShowExerciseLibraryModal(false)}>
          <div
            className="modal-sheet"
            style={{ maxWidth: '720px', width: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="var(--accent-cyan)" />
                <div>
                  <h2 className="modal-title" style={{ margin: 0 }}>Biblioteca de Cards de Exercícios</h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Escolha os cards prontos de exercícios para adicionar diretamente à sua ficha de treino
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowExerciseLibraryModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Seletor de Ficha de Destino + Busca */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px', marginBottom: '12px' }}>
              <div style={{ flex: '1 1 220px' }}>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '4px' }}>Colocar na Ficha:</label>
                <select
                  className="input-dark"
                  value={libraryTargetWorkoutId || activeWorkoutId}
                  onChange={(e) => setLibraryTargetWorkoutId(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  {safeWorkouts.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.exercises?.length || 0} exercícios)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 240px' }}>
                <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '4px' }}>Buscar Exercício ou Músculo:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="Ex: Supino, Agachamento, Ombro, Bíceps..."
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    style={{ padding: '8px 12px 8px 34px', fontSize: '0.84rem' }}
                  />
                  <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '11px', top: '11px' }} />
                </div>
              </div>
            </div>

            {/* Abas de Grupos Musculares */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px' }}>
              {EXERCISE_LIBRARY_GROUPS.map((grp) => {
                const isSelected = libraryGroupFilter === grp.id;
                return (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setLibraryGroupFilter(grp.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '999px',
                      border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(0, 229, 255, 0.16)' : 'var(--surface-elevated)',
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>{grp.emoji}</span>
                    <span>{grp.label}</span>
                  </button>
                );
              })}
            </div>

            {libraryAddedFeedback && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.16)',
                  border: '1px solid #10B981',
                  color: '#34D399',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>{libraryAddedFeedback}</span>
              </div>
            )}

            {/* Grid de Cards da Biblioteca */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '10px',
                paddingRight: '4px'
              }}
            >
              {EXERCISE_LIBRARY_CATALOG.filter((item) => {
                const matchesGroup = libraryGroupFilter === 'all' || item.group === libraryGroupFilter;
                const q = librarySearchQuery.trim().toLowerCase();
                const matchesQuery =
                  !q ||
                  item.name.toLowerCase().includes(q) ||
                  item.muscle.toLowerCase().includes(q) ||
                  item.desc.toLowerCase().includes(q);
                return matchesGroup && matchesQuery;
              }).map((card) => {
                const targetWorkout = safeWorkouts.find((w) => w.id === (libraryTargetWorkoutId || activeWorkoutId));
                const alreadyInSheet = targetWorkout?.exercises?.some(
                  (e) => e.name.toLowerCase() === card.name.toLowerCase()
                );

                return (
                  <div
                    key={card.id}
                    className="card-native"
                    style={{
                      background: 'var(--surface-elevated)',
                      border: alreadyInSheet ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(129, 140, 248, 0.16)',
                            color: '#A5B4FC'
                          }}
                        >
                          {card.muscle}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {card.level}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                        {card.name}
                      </h4>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {card.desc}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                        gap: '8px'
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {card.sets}x{card.reps} {card.weightKg > 0 ? `• ${card.weightKg}kg` : ''} • ⏱️{card.restSec}s
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddFromLibrary(card)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: alreadyInSheet ? 'rgba(16, 185, 129, 0.2)' : 'var(--accent-cyan)',
                          color: alreadyInSheet ? '#34D399' : '#030712',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Plus size={13} />
                        <span>{alreadyInSheet ? 'Adicionar +1' : 'Colocar na Ficha'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO PARA EXCLUIR FICHA DE TREINO */}
      <ConfirmDeleteModal
        isOpen={!!workoutToDelete}
        onClose={() => setWorkoutToDelete(null)}
        isCategory={false}
        itemName={workoutToDelete?.name}
        title="Excluir Ficha de Treino"
        message={`Tem certeza que deseja apagar a ficha de treino "${workoutToDelete?.name}"? Todos os exercícios e configurações associados serão removidos.`}
        onConfirm={() => {
          if (!workoutToDelete) return;
          handleDeleteWorkout(workoutToDelete.id);
          setWorkoutToDelete(null);
        }}
      />

      {/* MODAL: EDITAR FICHA DE TREINO */}
      {showEditWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowEditWorkoutModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={19} color="#56548A" />
                <h2 className="modal-title">Editar Ficha de Treino</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditWorkoutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditWorkoutSubmit}>
              <div className="form-group">
                <label className="form-label">Nome da Ficha de Treino</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Treino A • Peito & Tríceps"
                  value={editWorkoutName}
                  onChange={(e) => setEditWorkoutName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subtítulo / Descrição do Foco</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Supino, inclinado e tríceps • Hipertrofia"
                  value={editWorkoutSubtitle}
                  onChange={(e) => setEditWorkoutSubtitle(e.target.value)}
                />
              </div>

              {/* Seletor de Tema Visual */}
              <div className="form-group">
                <label className="form-label">Estilo Visual do Card</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {WORKOUT_THEMES.map((theme) => {
                    const isSelected = editWorkoutTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setEditWorkoutTheme(theme.id)}
                        style={{
                          background: theme.gradient,
                          color: '#FFFFFF',
                          border: isSelected ? '2.5px solid #FFFFFF' : '1px solid transparent',
                          borderRadius: '12px',
                          padding: '10px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.25)' : 'none'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dias na Agenda Semanal</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLetter, dayIdx) => {
                    const isSelected = editWorkoutDays.includes(dayIdx);
                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditWorkoutDays(prev => prev.filter(d => d !== dayIdx));
                          } else {
                            setEditWorkoutDays(prev => [...prev, dayIdx]);
                          }
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                          background: isSelected ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: isSelected ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {dayLetter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Horário Sugerido na Agenda</label>
                <input 
                  type="time" 
                  className="input-dark" 
                  value={editWorkoutTime}
                  onChange={(e) => setEditWorkoutTime(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    const target = safeWorkouts.find(w => w.id === editingWorkoutId);
                    if (target) {
                      setShowEditWorkoutModal(false);
                      setWorkoutToDelete(target);
                    }
                  }}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.28)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={14} />
                  <span>Excluir Ficha</span>
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowEditWorkoutModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO EXERCÍCIO */}
      {showNewExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowNewExerciseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Novo Exercício Personalizado</h2>
              <button className="modal-close-btn" onClick={() => setShowNewExerciseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExerciseSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Supino Inclinado, Agachamento Livre, etc."
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Séries</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setSets(Math.max(1, sets - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {sets}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setSets(sets + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Repetições</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setReps(Math.max(1, reps - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {reps}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setReps(reps + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Carga (Peso em Kg)</span>
                  <div 
                    className={`switch-track ${showWeight ? 'on' : ''}`}
                    onClick={() => setShowWeight(!showWeight)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showWeight && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label">Carga Inicial (kg)</label>
                    <input 
                      type="number" 
                      className="input-dark" 
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                      min="0"
                      step="1"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Tempo de Descanso Entre Séries</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {[30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className="segmented-btn"
                        style={{
                          background: restSec === sec ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: restSec === sec ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          border: '1px solid var(--border-subtle)'
                        }}
                        onClick={() => setRestSec(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowNewExerciseModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Adicionar à Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR EXERCÍCIO EXISTENTE */}
      {showEditExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowEditExerciseModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Exercício</h2>
              <button className="modal-close-btn" onClick={() => setShowEditExerciseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditExerciseSubmit}>
              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Séries</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setSets(Math.max(1, sets - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {sets}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setSets(sets + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="card-native" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="form-label" style={{ marginBottom: '6px' }}>Repetições</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <button 
                      type="button" 
                      className="btn-icon-round"
                      onClick={() => setReps(Math.max(1, reps - 1))}
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: '32px' }}>
                      {reps}
                    </span>
                    <button 
                      type="button" 
                      className="btn-icon-round primary"
                      onClick={() => setReps(reps + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="toggle-switch-wrap">
                  <span className="switch-label">Exibir Carga (Peso em Kg)</span>
                  <div 
                    className={`switch-track ${showWeight ? 'on' : ''}`}
                    onClick={() => setShowWeight(!showWeight)}
                  >
                    <div className="switch-thumb" />
                  </div>
                </div>

                {showWeight && (
                  <div style={{ marginTop: '10px' }}>
                    <label className="form-label">Carga Atual (kg)</label>
                    <input 
                      type="number" 
                      className="input-dark" 
                      value={weightKg}
                      onChange={(e) => setWeightKg(Math.max(0, Number(e.target.value)))}
                      min="0"
                      step="1"
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <div style={{ marginTop: '10px' }}>
                  <label className="form-label">Tempo de Descanso Entre Séries</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {[30, 45, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className="segmented-btn"
                        style={{
                          background: restSec === sec ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: restSec === sec ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          border: '1px solid var(--border-subtle)'
                        }}
                        onClick={() => setRestSec(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowEditExerciseModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR FINALIZAÇÃO DE TREINO */}
      {showFinishConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowFinishConfirmModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Award size={30} color="var(--accent-emerald)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Finalizar Treino de Hoje?
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Você executou a ficha <strong>{currentWorkout.name}</strong> ({totalDoneSets}/{totalTargetSets} séries feitas). Ao confirmar, o cronômetro será encerrado, a edição será desbloqueada e você ganhará <strong>+50 pontos (XP)</strong>.
              </p>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#34D399',
                  fontSize: '0.9rem',
                  fontWeight: 800
                }}
              >
                <Timer size={16} />
                <span>Tempo Total Contabilizado: {formatWorkoutStopwatch(workoutElapsedSec)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowFinishConfirmModal(false)}
              >
                Voltar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.5, background: 'var(--accent-emerald)', borderColor: 'var(--accent-emerald)', color: '#030712' }}
                onClick={handleConfirmFinishWorkout}
              >
                <CheckCircle2 size={16} /> Confirmar e Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR REINÍCIO DE TREINO */}
      {showResetConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowResetConfirmModal(false)}>
          <div className="modal-sheet" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0, 229, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <RotateCcw size={28} color="var(--accent-cyan)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Reiniciar Treino de Hoje?
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Deseja zerar a contagem de séries desta sessão (<strong>{currentWorkout.name}</strong>) para realizar o treino novamente?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowResetConfirmModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.5 }}
                onClick={handleConfirmResetWorkout}
              >
                <RotateCcw size={16} /> Sim, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO DE EXERCÍCIO */}
      {showDeleteExerciseConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteExerciseConfirm(null)}>
          <div className="modal-sheet" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Trash2 size={24} color="var(--accent-rose)" />
              </div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Excluir Exercício?
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Tem certeza que deseja remover este exercício desta ficha de treino?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setShowDeleteExerciseConfirm(null)}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ flex: 1.2, background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                onClick={() => handleDeleteExercise(showDeleteExerciseConfirm)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVO TREINO */}
      {showNewWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowNewWorkoutModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Dumbbell size={20} color="var(--accent-rose)" />
                <h2 className="modal-title">Criar Nova Ficha de Treino</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowNewWorkoutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWorkoutSubmit}>
              <div className="form-group">
                <label className="form-label">Nome da Ficha de Treino</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Treino D • Ombros & Abdômen"
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subtítulo / Descrição do Foco</label>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Elevação lateral, desenvolvimento e pranchas • Hipertrofia"
                  value={newWorkoutSubtitle}
                  onChange={(e) => setNewWorkoutSubtitle(e.target.value)}
                />
              </div>

              {/* Seletor de Tema Visual */}
              <div className="form-group">
                <label className="form-label">Estilo Visual do Card</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {WORKOUT_THEMES.map((theme) => {
                    const isSelected = newWorkoutTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setNewWorkoutTheme(theme.id)}
                        style={{
                          background: theme.gradient,
                          color: '#FFFFFF',
                          border: isSelected ? '2.5px solid #FFFFFF' : '1px solid transparent',
                          borderRadius: '12px',
                          padding: '10px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.25)' : 'none'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dias na Agenda Semanal</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLetter, dayIdx) => {
                    const isSelected = newWorkoutDays.includes(dayIdx);
                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewWorkoutDays(prev => prev.filter(d => d !== dayIdx));
                          } else {
                            setNewWorkoutDays(prev => [...prev, dayIdx]);
                          }
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                          background: isSelected ? 'var(--accent-cyan)' : 'var(--surface-elevated)',
                          color: isSelected ? '#030712' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {dayLetter}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Horário Sugerido na Agenda</label>
                <input 
                  type="time" 
                  className="input-dark" 
                  value={newWorkoutTime}
                  onChange={(e) => setNewWorkoutTime(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setShowNewWorkoutModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1.5 }}
                >
                  Criar Ficha de Treino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}