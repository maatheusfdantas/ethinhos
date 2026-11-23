import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import confetti from 'canvas-confetti';
import { 
  ShieldOff, 
  HeartHandshake, 
  Flame, 
  Clock, 
  RotateCcw, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  Sparkles, 
  X, 
  CheckCircle2, 
  Info, 
  DollarSign, 
  Activity, 
  PhoneCall, 
  Compass, 
  Heart,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Wind,
  Eye,
  Hand,
  Ear,
  Snowflake,
  Play,
  Pause,
  Timer,
  Check
} from 'lucide-react';

const PRESET_BAD_HABITS = [
  {
    id: 'preset_cigarro',
    title: 'Cigarro / Nicotina',
    category: 'Saúde Física & Pulmonar',
    icon_name: 'Cigarette',
    cost_per_day: 15,
    motivational_reason: 'Recuperar o fôlego, a saúde cardiovascular e viver mais com a família.',
    impact_description: 'Sem nicotina, sua oxigenação cerebral e capacidade cardiovascular aumentam, reduzindo a ansiedade de pico em 40%.'
  },
  {
    id: 'preset_bebida',
    title: 'Bebida Alcoólica',
    category: 'Saúde Mental & Fígado',
    icon_name: 'Wine',
    cost_per_day: 25,
    motivational_reason: 'Ter clareza mental total, sono reparador e energia constante nos treinos.',
    impact_description: 'O sono REM profundo se restabelece, melhorando em 35% sua capacidade de retenção de estudos e recuperação muscular.'
  },
  {
    id: 'preset_automutilacao',
    title: 'Automutilação & Autocuidado',
    category: 'Equilíbrio Emocional & Acolhimento',
    icon_name: 'HeartHandshake',
    cost_per_day: 0,
    motivational_reason: 'Cuidar do meu corpo com gentileza e encontrar formas seguras de aliviar a dor emocional.',
    impact_description: 'Ao regular as emoções de forma compassiva, sua resiliência psicológica cresce e sua estabilidade diária se fortalece.'
  },
  {
    id: 'preset_redes',
    title: 'Doomscrolling / Redes Excessivas',
    category: 'Foco & Produtividade',
    icon_name: 'Smartphone',
    cost_per_day: 0,
    motivational_reason: 'Parar de queimar minha atenção e focar nos meus objetivos reais de vida.',
    impact_description: 'Redução da sobrecarga dopaminérgica, elevando seu foco contínuo no Pomodoro e reduzindo o cansaço mental.'
  },
  {
    id: 'preset_apostas',
    title: 'Apostas / Jogos de Azar (Bets)',
    category: 'Finanças & Estabilidade',
    icon_name: 'Coins',
    cost_per_day: 40,
    motivational_reason: 'Proteger meu patrimônio, minha paz de espírito e o respeito próprio.',
    impact_description: 'Eliminação da angústia financeira e do ciclo de perdas, garantindo estabilidade para planejar seu futuro.'
  },
  {
    id: 'preset_acucar',
    title: 'Açúcar & Junk Food Compulsivo',
    category: 'Nutrição & Vitalidade',
    icon_name: 'Sparkles',
    cost_per_day: 20,
    motivational_reason: 'Evitar picos de insulina, névoa mental e letargia durante a tarde.',
    impact_description: 'Níveis estáveis de glicose diminuem sonolência pós-almoço e aumentam sua disposição física para os treinos.'
  }
];

const MOTIVATIONAL_QUOTES = [
  {
    quote: "A vitória sobre si mesmo é a maior de todas as conquistas.",
    author: "Platão",
    theme: "Autodomínio"
  },
  {
    quote: "Cada momento de resistência reorganiza seus circuitos neurais em direção à liberdade.",
    author: "Neurociência Comportamental",
    theme: "Neuroplasticidade"
  },
  {
    quote: "Recaídas não anulam a jornada percorrida. O caminho continua no próximo passo.",
    author: "Apoio Psicológico",
    theme: "Resiliência"
  },
  {
    quote: "Você é muito maior do que qualquer impulso passageiro. Respire fundo e permaneça firme.",
    author: "Ethos Mindset",
    theme: "Força Interior"
  }
];

export function BadHabitsTab({ user, showToast }) {
  // Lista de maus hábitos do usuário (armazenada com chave do usuário)
  const storageKey = `ethos_bad_habits_${user?.id || 'default'}`;
  
  const [badHabits, setBadHabits] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Inicia 100% zerado para que contas novas comecem sem registros artificiais
    return [];
  });

  // Ticker de tempo em tempo real (atualiza a cada 1s)
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sincronizar com localStorage e com o backend
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(badHabits));
      if (user?.id) {
        fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badHabits })
        }).catch(() => {});
      }
    } catch (e) {}
  }, [badHabits, storageKey, user?.id]);

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [relapseModalHabit, setRelapseModalHabit] = useState(null);
  const [badHabitToDelete, setBadHabitToDelete] = useState(null);
  const [selectedTrigger, setSelectedTrigger] = useState('Estresse / Sobrecarga');
  const [relapseLesson, setRelapseLesson] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showBreathingModal, setShowBreathingModal] = useState(false);
  const [sosActiveTab, setSosActiveTab] = useState('breathing'); // 'breathing', 'grounding', 'urge_timer', 'cold'

  // Estados da Respiração Guiada (Box Breathing 4-4-4) - Inicia pausado para o usuário dar o play
  const [breathSeconds, setBreathSeconds] = useState(0); // 0 a 11
  const [breathCycle, setBreathCycle] = useState(1);
  const [isBreathingRunning, setIsBreathingRunning] = useState(false);

  // Estados do Aterramento 5-4-3-2-1
  const [groundingChecked, setGroundingChecked] = useState({});

  // Estados da Onda da Fissura (15 minutos = 900s)
  const [urgeSeconds, setUrgeSeconds] = useState(900);
  const [isUrgeRunning, setIsUrgeRunning] = useState(false);

  // Estados do Choque Térmico (30s de água fria/gelo)
  const [coldSeconds, setColdSeconds] = useState(30);
  const [isColdRunning, setIsColdRunning] = useState(false);

  // Timer de Respiração Guiada (4s Inspire, 4s Segure, 4s Expire)
  useEffect(() => {
    if (!isBreathingRunning || (!showBreathingModal && (!showSupportModal || sosActiveTab !== 'breathing'))) return;

    const interval = setInterval(() => {
      setBreathSeconds((prev) => {
        const next = (prev + 1) % 12;
        if (next === 0) {
          setBreathCycle((c) => c + 1);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathingRunning, showBreathingModal, showSupportModal, sosActiveTab]);

  // Timer da Fissura (15 min)
  useEffect(() => {
    if (!isUrgeRunning) return;

    const interval = setInterval(() => {
      setUrgeSeconds((prev) => {
        if (prev <= 1) {
          setIsUrgeRunning(false);
          try { confetti(); } catch (e) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isUrgeRunning]);

  // Timer do Choque Térmico (30s)
  useEffect(() => {
    if (!isColdRunning) return;

    const interval = setInterval(() => {
      setColdSeconds((prev) => {
        if (prev <= 1) {
          setIsColdRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isColdRunning]);

  // Derivações da Respiração
  const breathPhase = breathSeconds < 4 ? 'inhale' : breathSeconds < 8 ? 'hold' : 'exhale';
  const phaseCountdown = breathSeconds < 4 ? 4 - breathSeconds : breathSeconds < 8 ? 8 - breathSeconds : 12 - breathSeconds;

  // Itens do Aterramento 5-4-3-2-1
  const GROUNDING_SECTIONS = [
    {
      step: 5,
      type: 'see',
      title: '5 Coisas que você pode ver',
      color: '#0284C7',
      bg: '#F0F9FF',
      icon: Eye,
      items: [
        { id: 'v1', label: 'Um objeto na sua frente' },
        { id: 'v2', label: 'Uma fonte de luz ou sombra' },
        { id: 'v3', label: 'Um detalhe no chão ou parede' },
        { id: 'v4', label: 'Suas próprias mãos' },
        { id: 'v5', label: 'Uma cor diferente ao redor' }
      ]
    },
    {
      step: 4,
      type: 'touch',
      title: '4 Coisas que você pode tocar',
      color: '#059669',
      bg: '#F0FDF4',
      icon: Hand,
      items: [
        { id: 't1', label: 'O tecido da sua roupa' },
        { id: 't2', label: 'A superfície onde você está apoiado' },
        { id: 't3', label: 'A temperatura das suas mãos' },
        { id: 't4', label: 'O chão sob seus pés' }
      ]
    },
    {
      step: 3,
      type: 'hear',
      title: '3 Sons que você pode ouvir',
      color: '#D97706',
      bg: '#FFFBEB',
      icon: Ear,
      items: [
        { id: 'h1', label: 'Um som distante (rua, ventilador, ruído)' },
        { id: 'h2', label: 'Um som próximo no mesmo ambiente' },
        { id: 'h3', label: 'O som sutil da sua própria respiração' }
      ]
    },
    {
      step: 2,
      type: 'smell',
      title: '2 Cheiros que você pode notar',
      color: '#7C3AED',
      bg: '#F5F3FF',
      icon: Compass,
      items: [
        { id: 's1', label: 'O aroma do ar no ambiente atual' },
        { id: 's2', label: 'O cheiro das suas roupas ou mãos' }
      ]
    },
    {
      step: 1,
      type: 'taste',
      title: '1 Sabor ou Sensação Corporal',
      color: '#DB2777',
      bg: '#FDF2F8',
      icon: Heart,
      items: [
        { id: 'ta1', label: 'Dê um gole de água ou engula a saliva sentindo o corpo' }
      ]
    }
  ];

  const totalGroundingItems = 15;
  const completedGroundingCount = Object.values(groundingChecked).filter(Boolean).length;

  const toggleGroundingItem = (id) => {
    setGroundingChecked((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      const count = Object.values(updated).filter(Boolean).length;
      if (count === totalGroundingItems) {
        try { confetti(); } catch (e) {}
      }
      return updated;
    });
  };

  // Formulário de novo mau hábito
  const getNowLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getNowLocalTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Saúde Física & Mental');
  const [newCost, setNewCost] = useState('');
  const [newCostPeriod, setNewCostPeriod] = useState('none'); // 'none' | 'day' | 'week' | 'month'
  const [newCostValue, setNewCostValue] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newStartDate, setNewStartDate] = useState(getNowLocalDate);
  const [newStartTime, setNewStartTime] = useState(getNowLocalTime);

  const openAddModal = () => {
    setNewStartDate(getNowLocalDate());
    setNowLocalTimeState();
    setShowAddModal(true);
  };
  const setNowLocalTimeState = () => {
    setNewStartTime(getNowLocalTime());
  };

  // Cálculo de tempo limpo
  const calculateSobrietyTime = (startedAtIso) => {
    const started = new Date(startedAtIso).getTime();
    const diffMs = Math.max(0, currentTime - started);

    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, totalDays: days, totalHours, totalSeconds };
  };

  // Cálculo de marco/medalha
  const getMilestone = (days) => {
    if (days >= 365) return { title: '1 Ano Inquebrável', icon: '👑', color: '#F59E0B', next: '2 Anos', nextDays: 730 };
    if (days >= 180) return { title: '6 Meses de Transformação', icon: '💎', color: '#38BDF8', next: '1 Ano (365d)', nextDays: 365 };
    if (days >= 90) return { title: '90 Dias: Reset Neural', icon: '🏆', color: '#A855F7', next: '6 Meses (180d)', nextDays: 180 };
    if (days >= 30) return { title: '1 Mês de Vitória', icon: '🥇', color: '#10B981', next: '90 Dias', nextDays: 90 };
    if (days >= 14) return { title: '2 Semanas Firme', icon: '🥈', color: '#3B82F6', next: '30 Dias', nextDays: 30 };
    if (days >= 7) return { title: '1 Semana Limpo', icon: '🥉', color: '#F97316', next: '14 Dias', nextDays: 14 };
    if (days >= 3) return { title: 'Pico Inicial Vencido', icon: '🌱', color: '#34D399', next: '7 Dias', nextDays: 7 };
    if (days >= 1) return { title: 'Primeiras 24 Horas', icon: '⭐', color: '#EAB308', next: '3 Dias', nextDays: 3 };
    return { title: 'Primeiro Dia em Construção', icon: '🔥', color: '#A1A1AA', next: '24 Horas', nextDays: 1 };
  };

  // Total de dinheiro economizado
  const totalMoneySaved = badHabits.reduce((acc, h) => {
    const { totalDays } = calculateSobrietyTime(h.started_at);
    return acc + (totalDays * (Number(h.cost_per_day) || 0));
  }, 0);

  // Maior streak ativo
  const highestStreak = badHabits.reduce((max, h) => {
    const { totalDays } = calculateSobrietyTime(h.started_at);
    return Math.max(max, totalDays);
  }, 0);

  // Selecionar preset no modal
  const handleSelectPreset = (preset) => {
    setNewTitle(preset.title);
    setNewCategory(preset.category);
    if (preset.cost_per_day > 0) {
      setNewCostPeriod('day');
      setNewCostValue(String(preset.cost_per_day));
      setShowAdvancedOptions(true);
    } else {
      setNewCostPeriod('none');
      setNewCostValue('');
    }
    setNewReason(preset.motivational_reason);
  };

  // Adicionar novo vício
  const handleCreateBadHabit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let startDateTime;
    const now = new Date();
    const todayLocal = getNowLocalDate();
    const nowHm = getNowLocalTime();
    if (!newStartDate || (newStartDate === todayLocal && (!newStartTime || newStartTime === nowHm))) {
      startDateTime = now.toISOString();
    } else {
      startDateTime = new Date(`${newStartDate}T${newStartTime || nowHm}:00`).toISOString();
    }

    let calculatedCostPerDay = 0;
    const numVal = parseFloat(newCostValue) || 0;
    if (newCostPeriod === 'day') {
      calculatedCostPerDay = numVal;
    } else if (newCostPeriod === 'week') {
      calculatedCostPerDay = numVal > 0 ? Number((numVal / 7).toFixed(2)) : 0;
    } else if (newCostPeriod === 'month') {
      calculatedCostPerDay = numVal > 0 ? Number((numVal / 30).toFixed(2)) : 0;
    }

    const newHabit = {
      id: `bh_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory.trim() || 'Superação Pessoal',
      icon_name: 'ShieldOff',
      started_at: startDateTime,
      cost_per_day: calculatedCostPerDay,
      cost_period: newCostPeriod,
      cost_value: numVal,
      motivational_reason: newReason.trim() || 'Construir minha melhor versão com mais saúde e dignidade.',
      impact_description: 'Melhora progressiva da clareza mental e restabelecimento do equilíbrio corporal.',
      best_streak_days: 0,
      relapse_count: 0,
      relapses: []
    };

    setBadHabits(prev => [newHabit, ...prev]);
    setShowAddModal(false);
    showToast?.(`Vício / Mau Hábito "${newHabit.title}" adicionado para acompanhamento!`);

    // Limpar campos
    setNewTitle('');
    setNewCost('');
    setNewCostPeriod('none');
    setNewCostValue('');
    setShowAdvancedOptions(false);
    setNewReason('');
  };

  // Excluir vício
  const handleDeleteHabit = (id, title) => {
    setBadHabitToDelete({ id, title });
  };

  const executeDeleteBadHabit = () => {
    if (!badHabitToDelete) return;
    const { id, title } = badHabitToDelete;
    setBadHabits(prev => prev.filter(h => h.id !== id));
    showToast?.(`Acompanhamento de "${title}" removido.`);
    setBadHabitToDelete(null);
  };

  // Confirmar Recaída (Reset com Acolhimento)
  const handleConfirmRelapse = (e) => {
    e.preventDefault();
    if (!relapseModalHabit) return;

    const { totalDays } = calculateSobrietyTime(relapseModalHabit.started_at);
    const newBest = Math.max(relapseModalHabit.best_streak_days || 0, totalDays);

    const newRelapseEntry = {
      date: new Date().toISOString(),
      days_achieved: totalDays,
      trigger: selectedTrigger,
      lesson: relapseLesson.trim() || 'Acolher a recaída e retomar o foco imediatamente.'
    };

    setBadHabits(prev => prev.map(h => {
      if (h.id === relapseModalHabit.id) {
        return {
          ...h,
          started_at: new Date().toISOString(), // Reinicia o contador para agora
          best_streak_days: newBest,
          relapse_count: (h.relapse_count || 0) + 1,
          relapses: [newRelapseEntry, ...(h.relapses || [])]
        };
      }
      return h;
    }));

    setRelapseModalHabit(null);
    setSelectedTrigger('Estresse / Sobrecarga');
    setRelapseLesson('');
    showToast?.(`Contador reiniciado com acolhimento. Seu recorde de ${newBest} dias foi preservado!`);
  };

  // Frase do dia
  const quoteOfTheDay = MOTIVATIONAL_QUOTES[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % MOTIVATIONAL_QUOTES.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* 1. TOP HEADER DA ABA COM DESIGN NATIVO ETHOS */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: '4px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: 'rgba(244, 63, 94, 0.16)',
                color: '#F43F5E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldOff size={18} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1A1B2F', margin: 0, letterSpacing: '-0.02em' }}>
              Superação de Vícios & Maus Hábitos
            </h2>
          </div>
          <p style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 0 0 0' }}>
            Monitore seus dias limpo, mensure o ganho de desempenho e supere cada momento com suporte e acolhimento.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowSupportModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: '#F43F5E',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <HeartHandshake size={15} />
            <span>Preciso de Ajuda / SOS</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            style={{
              padding: '8px 18px',
              borderRadius: '999px',
              backgroundColor: '#1E1B4B',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(30, 27, 75, 0.25)'
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Mau Hábito</span>
          </button>
        </div>
      </div>

      {/* 2. HERO STATS CARDS (MÉTRICAS CONSOLIDADAS) */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Card 1: Maior Sequência Limpo */}
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Maior Vitória Ativa
            </span>
            <Flame size={18} color="#F97316" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#1E293B', lineHeight: 1.1 }}>
            {highestStreak} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>dias limpo</span>
          </div>
          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'block', marginTop: '4px' }}>
            Cada dia sem recaída reconstrói sua disciplina
          </span>
        </div>

        {/* Card 2: Economia Financeira */}
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Economia Financeira
            </span>
            <DollarSign size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', lineHeight: 1.1 }}>
            R$ {totalMoneySaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, display: 'block', marginTop: '4px' }}>
            Dinheiro protegido e disponível para investir
          </span>
        </div>

        {/* Card 3: Impacto na Performance */}
        <div 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Recuperação de Foco
            </span>
            <TrendingUp size={18} color="#3B82F6" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#3B82F6', lineHeight: 1.1 }}>
            +{Math.min(95, Math.round(highestStreak * 2.8 + 15))}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, display: 'block', marginTop: '4px' }}>
            Ganho de clareza cognitiva e energia matinal
          </span>
        </div>
      </div>

      {/* 3. CARD INSPIRACIONAL DO DIA */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #2E1065 100%)',
          borderRadius: '18px',
          padding: '18px 22px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 10px 24px rgba(30, 27, 75, 0.18)'
        }}
      >
        <div style={{ minWidth: '240px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={16} color="#FDE68A" />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FDE68A', fontWeight: 700 }}>
              Mensagem do Dia • {quoteOfTheDay.theme}
            </span>
          </div>
          <blockquote style={{ fontSize: '14.5px', fontWeight: 600, margin: '0 0 4px 0', fontStyle: 'italic', lineHeight: 1.4 }}>
            "{quoteOfTheDay.quote}"
          </blockquote>
          <span style={{ fontSize: '12px', color: '#C4B5FD' }}>— {quoteOfTheDay.author}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setBreathSeconds(0);
            setBreathCycle(1);
            setIsBreathingRunning(false);
            setShowBreathingModal(true);
          }}
          style={{
            padding: '8px 18px',
            borderRadius: '999px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s ease'
          }}
        >
          <Wind size={15} color="#38BDF8" />
          <span>Técnica de Respiração Rápida</span>
        </button>
      </div>

      {/* 4. LISTA DE CARDS DE VÍCIOS / MAUS HÁBITOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
          Seus Vícios & Maus Hábitos em Superação ({badHabits.length})
        </h3>

        {badHabits.length === 0 ? (
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '40px 20px',
              textAlign: 'center',
              border: '1px dashed #CBD5E1'
            }}
          >
            <ShieldCheck size={36} color="#10B981" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', margin: '0 0 4px 0' }}>
              Nenhum mau hábito cadastrado ainda
            </h4>
            <p style={{ fontSize: '12.5px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Acompanhe qualquer vício que você queira eliminar (cigarro, bebida, automutilação, redes excessivas) e comemore cada dia limpo.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              style={{
                padding: '8px 20px',
                borderRadius: '999px',
                backgroundColor: '#1E1B4B',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer'
              }}
            >
              Adicionar Primeiro Hábito
            </button>
          </div>
        ) : (
          badHabits.map(habit => {
            const time = calculateSobrietyTime(habit.started_at);
            const milestone = getMilestone(time.days);
            const moneySaved = time.totalDays * (Number(habit.cost_per_day) || 0);

            return (
              <div
                key={habit.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* LINHA SUPERIOR: TÍTULO, CATEGORIA, MARCO E AÇÕES */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(244, 63, 94, 0.1)',
                        color: '#F43F5E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}
                    >
                      {milestone.icon}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                        {habit.title}
                      </h4>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                        {habit.category} • Desde {new Date(habit.started_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Badge do Marco */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: `${milestone.color}15`,
                        color: milestone.color,
                        border: `1px solid ${milestone.color}35`
                      }}
                    >
                      {milestone.title}
                    </span>

                    {/* Botão de Excluir */}
                    <button
                      type="button"
                      onClick={() => handleDeleteHabit(habit.id, habit.title)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Excluir acompanhamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* CONTADOR DE TEMPO LIMPO VIVO */}
                <div 
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                    <div>
                      <span style={{ fontSize: '32px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>
                        {time.days}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginLeft: '4px' }}>
                        dias
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: '#334155' }}>
                        {time.hours}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginLeft: '3px' }}>
                        horas
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#475569' }}>
                        {time.minutes}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', marginLeft: '3px' }}>
                        min
                      </span>
                    </div>

                    <div>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#64748B' }}>
                        {time.seconds}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginLeft: '3px' }}>
                        seg
                      </span>
                    </div>
                  </div>

                  {/* Ação de Recaída com Acolhimento */}
                  <button
                    type="button"
                    onClick={() => setRelapseModalHabit(habit)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#DC2626',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Tive uma Recaída (Resetar)</span>
                  </button>
                </div>

                {/* MOTIVAÇÃO PESSOAL */}
                {habit.motivational_reason && (
                  <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '3px solid #38BDF8' }}>
                    "{habit.motivational_reason}"
                  </div>
                )}

                {/* ANÁLISE DE IMPACTO NO DESEMPENHO FINAL (REQUISITO FUNDAMENTAL) */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={15} color="#16A34A" />
                    <strong style={{ fontSize: '12px', color: '#15803D', textTransform: 'uppercase' }}>
                      Impacto no Desempenho Final & Saúde:
                    </strong>
                  </div>

                  <p style={{ fontSize: '12px', color: '#166534', margin: 0, lineHeight: 1.45 }}>
                    {habit.impact_description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {moneySaved > 0 && (
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#15803D' }}>
                        💰 R$ {moneySaved.toFixed(2)} economizados
                      </span>
                    )}
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#166534' }}>
                      🏆 Recorde histórico: {Math.max(habit.best_streak_days || 0, time.totalDays)} dias
                    </span>
                    {habit.relapse_count > 0 && (
                      <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                        🔄 {habit.relapse_count} recaída(s) superadas no histórico
                      </span>
                    )}
                  </div>
                </div>

                {/* HISTÓRICO DE APRENDIZADOS DE RECAÍDA (SE HOUVER) */}
                {habit.relapses && habit.relapses.length > 0 && (
                  <details style={{ fontSize: '11.5px', color: '#64748B', cursor: 'pointer' }}>
                    <summary style={{ fontWeight: 600, color: '#475569' }}>
                      Ver histórico de aprendizados anteriores ({habit.relapses.length})
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {habit.relapses.map((r, i) => (
                        <div key={i} style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>
                            {new Date(r.date).toLocaleDateString('pt-BR')} (Alcançou {r.days_achieved || 0} dias):
                          </span>{' '}
                          Gatilho: <span style={{ color: '#DC2626' }}>{r.trigger}</span>. Aprendizado: {r.lesson}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRAR RECAÍDA COM ACOLHIMENTO E SEM JULGAMENTO               */}
      {/* ========================================================================= */}
      {relapseModalHabit && createPortal(
        <div
          onClick={() => setRelapseModalHabit(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 99999,
            backgroundColor: 'rgba(11, 10, 20, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              maxHeight: 'calc(100dvh - 36px)',
              overflowY: 'auto',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    Acolhimento & Reinício
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {relapseModalHabit.title}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRelapseModalHabit(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MENSAGEM HUMANA DE APOIO */}
            <div style={{ backgroundColor: '#EFF6FF', borderRadius: '14px', padding: '14px', border: '1px solid #BFDBFE', marginBottom: '16px' }}>
              <strong style={{ fontSize: '12.5px', color: '#1D4ED8', display: 'block', marginBottom: '4px' }}>
                Você não fracassou. Recaídas fazem parte da cura.
              </strong>
              <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                Todos os dias que você passou limpo continuam existindo e fortaleceram seu cérebro. O que importa agora é levantar com gentileza e reiniciar sem culpa.
              </p>
            </div>

            <form onSubmit={handleConfirmRelapse} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Qual foi o gatilho principal?
                </label>
                <select
                  value={selectedTrigger}
                  onChange={(e) => setSelectedTrigger(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none'
                  }}
                >
                  <option value="Estresse / Sobrecarga no Trabalho ou Faculdade">Estresse / Sobrecarga no Trabalho ou Faculdade</option>
                  <option value="Ansiedade / Inquietação Interior">Ansiedade / Inquietação Interior</option>
                  <option value="Pressão Social / Ambiente com Amigos">Pressão Social / Ambiente com Amigos</option>
                  <option value="Tédio / Falta de Atividade">Tédio / Falta de Atividade</option>
                  <option value="Frustração Emocional / Solidão">Frustração Emocional / Solidão</option>
                  <option value="Cansaço Físico / Falta de Sono">Cansaço Físico / Falta de Sono</option>
                  <option value="Outro Motivo">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  O que podemos fazer de diferente da próxima vez?
                </label>
                <textarea
                  value={relapseLesson}
                  onChange={(e) => setRelapseLesson(e.target.value)}
                  placeholder="Ex: Beber água gelada, sair para caminhar, ligar para alguém quando sentir o impulso..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRelapseModalHabit(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1.5,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Reiniciar Cronômetro Agora
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 2: ADICIONAR NOVO MAU HÁBITO / VÍCIO                                */}
      {/* ========================================================================= */}
      {showAddModal && createPortal(
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 99999,
            backgroundColor: 'rgba(11, 10, 20, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: 'calc(100dvh - 36px)',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#EDE9FE', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    Novo Vício / Mau Hábito
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Defina o que você quer superar e marque o seu ponto de virada
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* PRESETS DE 1 CLIQUE */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                Sugestões Rápidas:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRESET_BAD_HABITS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: newTitle === p.title ? '1.5px solid #6D28D9' : '1px solid #E2E8F0',
                      backgroundColor: newTitle === p.title ? '#EDE9FE' : '#F8FAFC',
                      color: newTitle === p.title ? '#6D28D9' : '#334155',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateBadHabit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Nome do Mau Hábito / Vício *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cigarro, Álcool, Automutilação, Apostas..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '13px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Data do Início da Sobriedade
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#1E293B',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    Horário de Início (opcional)
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12.5px',
                      color: '#1E293B',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* OPÇÕES AVANÇADAS: CUSTO ESTIMADO COM ALTERNÂNCIA (DIÁRIO / SEMANAL / MENSAL OU NÃO COLOCADO) */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: '6px 0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={15} color="#059669" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1E293B' }}>
                      Opções Avançadas: Custo Financeiro Estimado
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    {showAdvancedOptions ? 'Ocultar ▲' : 'Configurar ▼'}
                  </span>
                </button>

                {showAdvancedOptions && (
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      padding: '12px',
                      border: '1px solid #E2E8F0',
                      marginTop: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                        Periodicidade do Custo:
                      </label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'none', label: 'Não colocar custo' },
                          { id: 'day', label: 'Diário (R$/dia)' },
                          { id: 'week', label: 'Semanal (R$/semana)' },
                          { id: 'month', label: 'Mensal (R$/mês)' }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewCostPeriod(opt.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '999px',
                              border: newCostPeriod === opt.id ? '1.5px solid #059669' : '1px solid #CBD5E1',
                              backgroundColor: newCostPeriod === opt.id ? 'rgba(5, 150, 105, 0.12)' : '#FFFFFF',
                              color: newCostPeriod === opt.id ? '#047857' : '#475569',
                              fontSize: '11.5px',
                              fontWeight: newCostPeriod === opt.id ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {newCostPeriod !== 'none' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          {newCostPeriod === 'day' ? 'Valor gasto por dia (R$)' : newCostPeriod === 'week' ? 'Valor gasto por semana (R$)' : 'Valor gasto por mês (R$)'}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder={newCostPeriod === 'day' ? 'Ex: 15.00' : newCostPeriod === 'week' ? 'Ex: 100.00' : 'Ex: 350.00'}
                          value={newCostValue}
                          onChange={(e) => setNewCostValue(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '12.5px',
                            color: '#1E293B',
                            outline: 'none',
                            boxSizing: 'border-box',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                        {parseFloat(newCostValue) > 0 && (
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                            ✓ Equivalente a R$ {
                              newCostPeriod === 'day'
                                ? parseFloat(newCostValue).toFixed(2)
                                : newCostPeriod === 'week'
                                ? (parseFloat(newCostValue) / 7).toFixed(2)
                                : (parseFloat(newCostValue) / 30).toFixed(2)
                            } economizados por dia de sobriedade
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Por que você decidiu vencer esse hábito? (Sua Motivação Central)
                </label>
                <textarea
                  placeholder="Ex: Quero viver com clareza, cuidar da minha saúde e ter orgulho de mim mesmo..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12.5px',
                    color: '#1E293B',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 1.5,
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#1E1B4B',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Iniciar Acompanhamento
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 2.1: RESPIRAÇÃO RÁPIDA GUIADA E ANIMADA (BOX BREATHING 4-4-4)      */}
      {/* ========================================================================= */}
      {showBreathingModal && createPortal(
        <div
          onClick={() => setShowBreathingModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 99999,
            backgroundColor: 'rgba(11, 10, 20, 0.88)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              backgroundColor: '#161427',
              borderRadius: '28px',
              maxWidth: '480px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
              border: '1px solid #282442',
              color: '#FFFFFF',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              maxHeight: 'calc(100dvh - 36px)',
              overflowY: 'auto',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={() => setShowBreathingModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Cabeçalho */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '8px' }}>
                <Wind size={13} color="#38BDF8" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Regulação do Sistema Nervoso
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#FFFFFF' }}>
                Respiração Rápida Guiada
              </h3>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                Sincronize sua respiração com o orbe visual para desacelerar seus batimentos cardíacos.
              </p>
            </div>

            {/* ORBE DE RESPIRAÇÃO ANIMADO */}
            <div 
              style={{ 
                height: '240px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                margin: '10px 0'
              }}
            >
              {/* Anel de Pulso Externo */}
              <div 
                style={{
                  position: 'absolute',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  border: `2px dashed ${
                    !isBreathingRunning && breathSeconds === 0 ? 'rgba(56, 189, 248, 0.4)' :
                    breathPhase === 'inhale' ? 'rgba(56, 189, 248, 0.35)' :
                    breathPhase === 'hold' ? 'rgba(168, 85, 247, 0.35)' :
                    'rgba(16, 185, 129, 0.35)'
                  }`,
                  transform: !isBreathingRunning && breathSeconds === 0 ? 'scale(1)' : breathPhase === 'exhale' ? 'scale(0.85)' : 'scale(1.35)',
                  transition: 'all 4s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />

              {/* Orbe Central com Expansão e Contração */}
              <div
                onClick={() => {
                  if (!isBreathingRunning) setIsBreathingRunning(true);
                  else setIsBreathingRunning(false);
                }}
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: !isBreathingRunning && breathSeconds === 0 ? 'scale(1)' : breathPhase === 'exhale' ? 'scale(0.82)' : 'scale(1.28)',
                  transition: 'all 4s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: !isBreathingRunning && breathSeconds === 0
                    ? 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(14, 165, 233, 0.1) 60%, rgba(22, 20, 39, 0.9) 100%)'
                    : breathPhase === 'inhale' 
                    ? 'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(14, 165, 233, 0.15) 60%, rgba(22, 20, 39, 0.8) 100%)'
                    : breathPhase === 'hold'
                    ? 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(124, 111, 239, 0.15) 60%, rgba(22, 20, 39, 0.8) 100%)'
                    : 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.15) 60%, rgba(22, 20, 39, 0.8) 100%)',
                  border: `2px solid ${
                    !isBreathingRunning && breathSeconds === 0 ? '#38BDF8' :
                    breathPhase === 'inhale' ? '#38BDF8' :
                    breathPhase === 'hold' ? '#A855F7' :
                    '#10B981'
                  }`,
                  boxShadow: `0 0 50px ${
                    !isBreathingRunning && breathSeconds === 0 ? 'rgba(56, 189, 248, 0.35)' :
                    breathPhase === 'inhale' ? 'rgba(56, 189, 248, 0.55)' :
                    breathPhase === 'hold' ? 'rgba(168, 85, 247, 0.55)' :
                    'rgba(16, 185, 129, 0.55)'
                  }`
                }}
              >
                {!isBreathingRunning && breathSeconds === 0 ? (
                  <>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                      <Play size={22} color="#38BDF8" style={{ marginLeft: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Clique para Iniciar
                    </span>
                  </>
                ) : (
                  <>
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        fontWeight: 800, 
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: !isBreathingRunning ? '#FDE047' : breathPhase === 'inhale' ? '#BAE6FD' : breathPhase === 'hold' ? '#E9D5FF' : '#A7F3D0',
                        marginBottom: '2px'
                      }}
                    >
                      {!isBreathingRunning ? 'PAUSADO' : breathPhase === 'inhale' ? 'INSPIRE' : breathPhase === 'hold' ? 'SEGURE' : 'EXPIRE'}
                    </span>
                    <span 
                      style={{ 
                        fontSize: '44px', 
                        fontWeight: 900, 
                        lineHeight: 1,
                        fontFamily: 'monospace',
                        color: '#FFFFFF'
                      }}
                    >
                      {phaseCountdown}s
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Frase e Instrução da Fase Atual */}
            <div style={{ minHeight: '44px', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9', margin: '0 0 4px 0' }}>
                {!isBreathingRunning && breathSeconds === 0 && 'Sente-se confortavelmente e clique em Iniciar quando estiver pronto.'}
                {isBreathingRunning && breathPhase === 'inhale' && 'Puxe o ar suavemente e profundamente pelo nariz...'}
                {isBreathingRunning && breathPhase === 'hold' && 'Mantenha os pulmões cheios com calma e serenidade...'}
                {isBreathingRunning && breathPhase === 'exhale' && 'Solte todo o ar devagar pela boca, relaxando os ombros...'}
                {!isBreathingRunning && breathSeconds > 0 && 'Exercício pausado. Clique em Continuar quando desejar.'}
              </p>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Técnica 4-4-4: a fissura e a ansiedade física passam em poucos ciclos.
              </span>
            </div>

            {/* Contador de Ciclos */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Ciclo {breathCycle}:</span>
              {[1, 2, 3, 4, 5].map((c) => (
                <div
                  key={c}
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: c <= breathCycle ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)',
                    boxShadow: c === breathCycle ? '0 0 10px #38BDF8' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>

            {/* Controles de Reprodução */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsBreathingRunning(!isBreathingRunning)}
                style={{
                  flex: 1.2,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: !isBreathingRunning && breathSeconds === 0 ? '#38BDF8' : isBreathingRunning ? 'rgba(255, 255, 255, 0.08)' : '#38BDF8',
                  color: !isBreathingRunning && breathSeconds === 0 ? '#0B0A14' : isBreathingRunning ? '#FFFFFF' : '#0B0A14',
                  border: isBreathingRunning ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: !isBreathingRunning ? '0 4px 15px rgba(56, 189, 248, 0.35)' : 'none'
                }}
              >
                {isBreathingRunning ? <Pause size={16} /> : <Play size={16} />}
                <span>
                  {!isBreathingRunning && breathSeconds === 0 ? 'Iniciar Respiração' : isBreathingRunning ? 'Pausar' : 'Continuar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBreathSeconds(0);
                  setBreathCycle(1);
                  setIsBreathingRunning(false);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#94A3B8',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Reiniciar Respiração"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  try { confetti(); } catch (e) {}
                  setShowBreathingModal(false);
                  showToast?.('Parabéns por cuidar da sua mente! O autocontrole é uma vitória diária.');
                }}
                style={{
                  flex: 1.3,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Concluir</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 3: SUPORTE EMOCIONAL E SOS (REDE DE APOIO + 4 FERRAMENTAS VISUAIS) */}
      {/* ========================================================================= */}
      {showSupportModal && createPortal(
        <div
          onClick={() => setShowSupportModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100dvh',
            zIndex: 99999,
            backgroundColor: 'rgba(11, 10, 20, 0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: '26px',
              maxWidth: '580px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              maxHeight: 'calc(100dvh - 36px)',
              overflowY: 'auto',
              animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
            }}
          >
            {/* Topo do Modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HeartHandshake size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    Espaço de Acolhimento & SOS
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    Você não precisa passar por isso sozinho. Respire.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTATOS DE EMERGÊNCIA (INTACTO CONFORME SOLICITADO) */}
            <div style={{ backgroundColor: '#FEF2F2', borderRadius: '16px', padding: '16px', border: '1px solid #FECACA', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <PhoneCall size={17} color="#DC2626" />
                <strong style={{ fontSize: '13.5px', color: '#991B1B' }}>Linha Gratuita de Apoio Emocional (CVV)</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                Atendimento sigiloso, acolhedor e gratuito 24 horas por dia por telefone ou chat online.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href="tel:188"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '999px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <PhoneCall size={14} />
                  Ligar 188 (Brasil)
                </a>
                <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>Disponível de qualquer telefone • Ligação Gratuita</span>
              </div>
            </div>

            {/* SELETOR DAS 4 FERRAMENTAS VISUAIS DE REGULAÇÃO EMOCIONAL */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '12.5px', color: '#334155' }}>
                  Técnicas Imediatas de Regulação (Escolha uma):
                </strong>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Interativo & Visual</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', backgroundColor: '#F1F5F9', padding: '4px', borderRadius: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSosActiveTab('breathing')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: sosActiveTab === 'breathing' ? '#FFFFFF' : 'transparent',
                    color: sosActiveTab === 'breathing' ? '#0284C7' : '#64748B',
                    fontWeight: sosActiveTab === 'breathing' ? 800 : 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: sosActiveTab === 'breathing' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Wind size={14} />
                  <span>Respiração</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSosActiveTab('grounding')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: sosActiveTab === 'grounding' ? '#FFFFFF' : 'transparent',
                    color: sosActiveTab === 'grounding' ? '#059669' : '#64748B',
                    fontWeight: sosActiveTab === 'grounding' ? 800 : 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: sosActiveTab === 'grounding' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Eye size={14} />
                  <span>5-4-3-2-1</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSosActiveTab('urge_timer')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: sosActiveTab === 'urge_timer' ? '#FFFFFF' : 'transparent',
                    color: sosActiveTab === 'urge_timer' ? '#D97706' : '#64748B',
                    fontWeight: sosActiveTab === 'urge_timer' ? 800 : 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: sosActiveTab === 'urge_timer' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Timer size={14} />
                  <span>Onda 15m</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSosActiveTab('cold')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: sosActiveTab === 'cold' ? '#FFFFFF' : 'transparent',
                    color: sosActiveTab === 'cold' ? '#4F46E5' : '#64748B',
                    fontWeight: sosActiveTab === 'cold' ? 800 : 600,
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: sosActiveTab === 'cold' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Snowflake size={14} />
                  <span>Gelo 30s</span>
                </button>
              </div>
            </div>

            {/* CONTEÚDO VISUAL DA ABA SELECIONADA */}

            {/* 1. ABA RESPIRAÇÃO VISUAL RÁPIDA (INTEGRADA NO MODAL) */}
            {sosActiveTab === 'breathing' && (
              <div style={{ backgroundColor: '#0B0A14', borderRadius: '18px', padding: '20px', color: '#FFFFFF', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Box Breathing 4-4-4
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Ciclo {breathCycle} de 4</span>
                </div>

                {/* Orbe Visual Integrado */}
                <div style={{ height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <div
                    onClick={() => {
                      if (!isBreathingRunning) setIsBreathingRunning(true);
                      else setIsBreathingRunning(false);
                    }}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transform: !isBreathingRunning && breathSeconds === 0 ? 'scale(1)' : breathPhase === 'exhale' ? 'scale(0.82)' : 'scale(1.22)',
                      transition: 'all 4s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: !isBreathingRunning && breathSeconds === 0
                        ? 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(14, 165, 233, 0.12) 70%, rgba(11, 10, 20, 0.8) 100%)'
                        : breathPhase === 'inhale' 
                        ? 'radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(14, 165, 233, 0.15) 70%, rgba(11, 10, 20, 0.8) 100%)'
                        : breathPhase === 'hold'
                        ? 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(124, 111, 239, 0.15) 70%, rgba(11, 10, 20, 0.8) 100%)'
                        : 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(5, 150, 105, 0.15) 70%, rgba(11, 10, 20, 0.8) 100%)',
                      border: `2px solid ${
                        !isBreathingRunning && breathSeconds === 0 ? '#38BDF8' :
                        breathPhase === 'inhale' ? '#38BDF8' :
                        breathPhase === 'hold' ? '#A855F7' :
                        '#10B981'
                      }`,
                      boxShadow: `0 0 35px ${
                        !isBreathingRunning && breathSeconds === 0 ? 'rgba(56, 189, 248, 0.4)' :
                        breathPhase === 'inhale' ? 'rgba(56, 189, 248, 0.5)' :
                        breathPhase === 'hold' ? 'rgba(168, 85, 247, 0.5)' :
                        'rgba(16, 185, 129, 0.5)'
                      }`
                    }}
                  >
                    {!isBreathingRunning && breathSeconds === 0 ? (
                      <>
                        <Play size={24} color="#38BDF8" style={{ marginBottom: '4px', marginLeft: '3px' }} />
                        <span style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#BAE6FD' }}>
                          INICIAR
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: breathPhase === 'inhale' ? '#BAE6FD' : breathPhase === 'hold' ? '#E9D5FF' : '#A7F3D0' }}>
                          {breathPhase === 'inhale' ? 'INSPIRE' : breathPhase === 'hold' ? 'SEGURE' : 'EXPIRE'}
                        </span>
                        <span style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'monospace' }}>
                          {phaseCountdown}s
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: '#E2E8F0', margin: '4px 0 14px 0' }}>
                  {!isBreathingRunning && breathSeconds === 0 && 'Clique em Iniciar para guiar o ritmo da sua respiração.'}
                  {isBreathingRunning && breathPhase === 'inhale' && 'Inspire pelo nariz enchendo suavemente o abdômen...'}
                  {isBreathingRunning && breathPhase === 'hold' && 'Mantenha o ar nos pulmões com calma...'}
                  {isBreathingRunning && breathPhase === 'exhale' && 'Expire lentamente pela boca soltando as tensões...'}
                  {!isBreathingRunning && breathSeconds > 0 && 'Exercício pausado. Clique em Continuar quando desejar.'}
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsBreathingRunning(!isBreathingRunning)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: !isBreathingRunning && breathSeconds === 0 ? '#38BDF8' : isBreathingRunning ? 'rgba(255, 255, 255, 0.1)' : '#38BDF8',
                      color: !isBreathingRunning && breathSeconds === 0 ? '#0B0A14' : isBreathingRunning ? '#FFFFFF' : '#0B0A14',
                      border: isBreathingRunning ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {!isBreathingRunning && breathSeconds === 0 ? 'Iniciar Respiração' : isBreathingRunning ? 'Pausar' : 'Continuar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowSupportModal(false);
                      setShowBreathingModal(true);
                    }}
                    style={{
                      flex: 1.5,
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: '#38BDF8',
                      color: '#0B0A14',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Abrir em Tela Cheia
                  </button>
                </div>
              </div>
            )}

            {/* 2. ABA ATERRAMENTO 5-4-3-2-1 INTERATIVO */}
            {sosActiveTab === 'grounding' && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '18px', padding: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Ancoragem no Momento Presente (5-4-3-2-1)
                    </h4>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Toque nos itens que você for identificando ao seu redor
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '12px' }}>
                    {completedGroundingCount} / {totalGroundingItems}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#E2E8F0', overflow: 'hidden', marginBottom: '14px' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(completedGroundingCount / totalGroundingItems) * 100}%`,
                      backgroundColor: '#10B981',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>

                {/* Lista de Sentidos com Checkboxes Clicáveis */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {GROUNDING_SECTIONS.map((sec) => {
                    const IconComponent = sec.icon;
                    return (
                      <div key={sec.type} style={{ backgroundColor: sec.bg, borderRadius: '12px', padding: '10px 12px', border: `1px solid ${sec.color}25` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <IconComponent size={14} color={sec.color} />
                          <strong style={{ fontSize: '11.5px', color: sec.color }}>{sec.title}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {sec.items.map((item) => {
                            const isChecked = Boolean(groundingChecked[item.id]);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleGroundingItem(item.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: isChecked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)',
                                  border: `1px solid ${isChecked ? '#10B981' : '#E2E8F0'}`,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <div
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '4px',
                                    backgroundColor: isChecked ? '#10B981' : '#FFFFFF',
                                    border: `1.5px solid ${isChecked ? '#10B981' : '#94A3B8'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFFFFF',
                                    flexShrink: 0
                                  }}
                                >
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span style={{ fontSize: '11.5px', color: isChecked ? '#0F172A' : '#475569', textDecoration: isChecked ? 'line-through' : 'none', fontWeight: isChecked ? 600 : 400 }}>
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ABA TEMPORIZADOR DA ONDA DA FISSURA (15 MINUTOS / URGE SURFING) */}
            {sosActiveTab === 'urge_timer' && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '18px', padding: '18px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Surfando a Onda da Fissura (Urge Surfing)
                  </h4>
                  <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 700 }}>Pico de 15 Minutos</span>
                </div>

                {/* Gráfico Visual da Onda Neuroquímica */}
                <div style={{ margin: '14px 0', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>
                    <span>0m: Início</span>
                    <span>3-5m: Pico Máximo</span>
                    <span>10m: Descompressão</span>
                    <span>15m: Mar Calmo</span>
                  </div>

                  {/* Barra da Curva com Marcador de Posição Atual */}
                  <div style={{ position: 'relative', height: '14px', borderRadius: '7px', background: 'linear-gradient(90deg, #F59E0B 0%, #EF4444 30%, #3B82F6 70%, #10B981 100%)', overflow: 'hidden' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${Math.min(98, Math.max(2, ((900 - urgeSeconds) / 900) * 100))}%`,
                        width: '4px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 0 8px rgba(0,0,0,0.8)'
                      }}
                    />
                  </div>
                </div>

                {/* Cronômetro Digital Grande */}
                <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'monospace', color: '#1E293B', lineHeight: 1, margin: '12px 0 6px 0' }}>
                  {String(Math.floor(urgeSeconds / 60)).padStart(2, '0')}:{String(urgeSeconds % 60).padStart(2, '0')}
                </div>

                {/* Mensagem Psicológica em Tempo Real */}
                <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4, margin: '0 0 16px 0', minHeight: '34px' }}>
                  {urgeSeconds === 900 
                    ? 'Clique em Iniciar. Dê 15 minutos para a onda química da fissura perder o oxigênio e se dissipar.'
                    : Math.floor((900 - urgeSeconds) / 60) < 3
                    ? '⚠️ Fase de Subida: O impulso parece urgente, mas dura poucos minutos. Respire fundo e não tome decisões agora.'
                    : Math.floor((900 - urgeSeconds) / 60) < 7
                    ? '🌊 Crista da Onda: Você já está resistindo há vários minutos! O cérebro está metabolizando o pico e ele começará a cair.'
                    : Math.floor((900 - urgeSeconds) / 60) < 12
                    ? '📉 Fase de Descida: A onda quebrou! A dopamina está se estabilizando e seu corpo está relaxando.'
                    : '🏆 Vitória Consolidada: Você provou que a fissura passa e você tem o controle.'
                  }
                </p>

                {/* Botões do Cronômetro */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsUrgeRunning(!isUrgeRunning)}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: isUrgeRunning ? '#E2E8F0' : '#D97706',
                      color: isUrgeRunning ? '#1E293B' : '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isUrgeRunning ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isUrgeRunning ? 'Pausar Espera' : 'Iniciar Espera de 15 Minutos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUrgeSeconds(900);
                      setIsUrgeRunning(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer'
                    }}
                    title="Reiniciar 15 Minutos"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* 4. ABA CHOQUE TÉRMICO SEGURO (REFLEXO DE MERGULHO DE 30s) */}
            {sosActiveTab === 'cold' && (
              <div style={{ backgroundColor: '#F0F9FF', borderRadius: '18px', padding: '18px', border: '1px solid #BAE6FD', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '6px' }}>
                  <Snowflake size={18} color="#0284C7" />
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0369A1', margin: 0 }}>
                    Choque Térmico Fisiológico (Reflexo Vagal)
                  </h4>
                </div>
                <p style={{ fontSize: '12px', color: '#075985', margin: '0 0 14px 0', lineHeight: 1.45 }}>
                  Coloque gelo nas mãos ou lave o rosto com água bem fria. Isso ativa o nervo vago e desacelera seu coração em até 20 batimentos em segundos.
                </p>

                {/* Temporizador de 30 Segundos */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #BAE6FD', marginBottom: '14px' }}>
                  <div style={{ fontSize: '38px', fontWeight: 900, fontFamily: 'monospace', color: '#0284C7', lineHeight: 1 }}>
                    {coldSeconds}s
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                    {isColdRunning ? '❄️ Respire devagar enquanto a água/gelo resfria seu rosto...' : 'Aplique o gelo ou água fria e inicie o tempo'}
                  </span>

                  {/* Barra regressiva */}
                  <div style={{ height: '6px', borderRadius: '999px', backgroundColor: '#E0F2FE', overflow: 'hidden', marginTop: '10px' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${(coldSeconds / 30) * 100}%`,
                        backgroundColor: '#0284C7',
                        transition: 'width 1s linear'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isColdRunning && coldSeconds === 0) setColdSeconds(30);
                      setIsColdRunning(!isColdRunning);
                    }}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: '10px',
                      backgroundColor: '#0284C7',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {isColdRunning ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isColdRunning ? 'Pausar' : 'Iniciar 30s de Resfriamento'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setColdSeconds(30);
                      setIsColdRunning(false);
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      border: '1px solid #CBD5E1',
                      cursor: 'pointer'
                    }}
                    title="Reiniciar 30s"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Botão de Fechar e Acalmar */}
            <button
              type="button"
              onClick={() => {
                try { confetti(); } catch (e) {}
                setShowSupportModal(false);
                showToast?.('Você superou esse momento! Continue firme, um dia de cada vez.');
              }}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#1E1B4B',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(30, 27, 75, 0.2)'
              }}
            >
              <CheckCircle2 size={16} color="#34D399" />
              <span>Estou Mais Calmo, Fechar</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CONFIRMAÇÃO PARA EXCLUIR VÍCIO */}
      <ConfirmDeleteModal
        isOpen={!!badHabitToDelete}
        onClose={() => setBadHabitToDelete(null)}
        isCategory={false}
        itemName={badHabitToDelete?.title}
        title="Excluir Registro de Vício"
        message={`Tem certeza que deseja apagar o acompanhamento de "${badHabitToDelete?.title}"? Seu progresso de sobriedade e histórico de recaídas serão excluídos.`}
        onConfirm={executeDeleteBadHabit}
      />
    </div>
  );
}