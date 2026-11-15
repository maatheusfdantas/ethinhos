import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle,
  Plus, 
  Minus, 
  Search, 
  Filter, 
  Flame, 
  Clock, 
  TrendingUp, 
  Trash2, 
  RotateCcw, 
  Hash, 
  Activity, 
  Sliders, 
  Calendar, 
  Layers, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Bookmark,
  Dumbbell,
  Home,
  Check,
  X
} from 'lucide-react';

const CATEGORY_ICON_MAP = {
  Faculdade: BookOpen,
  Trabalho: Bookmark,
  Saúde: Dumbbell,
  Casa: Home,
  Pessoal: Sparkles,
  Finanças: Activity,
  Geral: CheckCircle2
};

const PRIORITY_COLOR_MAP = {
  Alta: { bg: 'rgba(244, 63, 94, 0.16)', color: '#F43F5E', dot: '#F43F5E' },
  Média: { bg: 'rgba(245, 158, 11, 0.16)', color: '#F59E0B', dot: '#F59E0B' },
  Baixa: { bg: 'rgba(16, 185, 129, 0.16)', color: '#10B981', dot: '#10B981' }
};

export function HabitsTab({
  habits = [],
  setHabits,
  tags = [],
  user = null,
  onOpenAddHabit,
  onLogSubclassEffort,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTracking, setFilterTracking] = useState('all'); // 'all' | 'done' | 'counter' | 'value'
  const [filterPeriod, setFilterPeriod] = useState('all');     // 'all' | 'day' | 'week' | 'month' | 'custom'
  const [filterStatus, setFilterStatus] = useState('all');     // 'all' | 'pending' | 'completed'
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(true);

  // Modal rápido inline para adicionar valor numérico a hábitos do tipo 'value'
  const [valuePromptHabit, setValuePromptHabit] = useState(null);
  const [valueInputAmount, setValueInputAmount] = useState('');

  // -------------------------------------------------------------------------
  // CÁLCULOS E MÉTRICAS EXECUTIVAS DE HÁBITOS
  // -------------------------------------------------------------------------
  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.completed);
  const pendingHabits = habits.filter(h => !h.completed);
  const completionRate = totalHabits > 0 ? Math.round((completedHabits.length / totalHabits) * 100) : 0;

  const countDoneType = habits.filter(h => !h.trackingType || h.trackingType === 'done').length;
  const countCounterType = habits.filter(h => h.trackingType === 'counter').length;
  const countValueType = habits.filter(h => h.trackingType === 'value').length;

  // -------------------------------------------------------------------------
  // HANDLERS DE INTERAÇÃO
  // -------------------------------------------------------------------------

  // 1. Alternar Hábito (Feito / Não Feito)
  const handleToggleHabit = async (habitId) => {
    const target = habits.find(h => h.id === habitId);
    if (!target) return;

    const nextCompleted = !target.completed;
    const nextCurrent = nextCompleted ? target.target : 0;

    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, completed: nextCompleted, current: nextCurrent };
      }
      return h;
    }));

    if (nextCompleted && target.subclassName && onLogSubclassEffort) {
      onLogSubclassEffort(target.category, target.subclassName, 1);
    }

    showToast?.(
      nextCompleted ? `Hábito "${target.title}" concluído!` : `Hábito "${target.title}" reaberto`,
      () => handleToggleHabit(habitId)
    );

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${habitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextCurrent, completed: nextCompleted })
        });
      } catch (err) {
        console.error('Erro ao atualizar hábito:', err);
      }
    }
  };

  // 2. Incrementar Contador (+1)
  const handleIncrementCounter = async (habitId, delta = 1) => {
    const target = habits.find(h => h.id === habitId);
    if (!target) return;

    const nextCurrent = Math.max(0, (target.current || 0) + delta);
    const nextCompleted = nextCurrent >= target.target;

    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, current: nextCurrent, completed: nextCompleted };
      }
      return h;
    }));

    if (nextCompleted && !target.completed) {
      showToast?.(`Meta atingida em "${target.title}"! (${nextCurrent}/${target.target} ${target.unit})`);
      if (target.subclassName && onLogSubclassEffort) {
        onLogSubclassEffort(target.category, target.subclassName, 1);
      }
    }

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${habitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextCurrent, completed: nextCompleted })
        });
      } catch (err) {
        console.error('Erro ao incrementar hábito:', err);
      }
    }
  };

  // 3. Adicionar Valor Numérico Flexível (Ex: +20 páginas ou +500 ml)
  const handleOpenValuePrompt = (habit) => {
    setValuePromptHabit(habit);
    setValueInputAmount('');
  };

  const handleApplyValueSubmit = async (e) => {
    e.preventDefault();
    if (!valuePromptHabit) return;

    const added = parseFloat(valueInputAmount);
    if (isNaN(added) || added <= 0) return;

    const nextCurrent = Number(((valuePromptHabit.current || 0) + added).toFixed(2));
    const nextCompleted = nextCurrent >= valuePromptHabit.target;
    const habitId = valuePromptHabit.id;
    const habitTitle = valuePromptHabit.title;
    const habitUnit = valuePromptHabit.unit;

    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, current: nextCurrent, completed: nextCompleted };
      }
      return h;
    }));

    setValuePromptHabit(null);
    setValueInputAmount('');

    showToast?.(`+${added} ${habitUnit} adicionados a "${habitTitle}" (${nextCurrent}/${valuePromptHabit.target})`);

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${habitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: nextCurrent, completed: nextCompleted })
        });
      } catch (err) {
        console.error('Erro ao somar valor no hábito:', err);
      }
    }
  };

  // 4. Resetar Progresso
  const handleResetProgress = async (habitId) => {
    const target = habits.find(h => h.id === habitId);
    if (!target) return;

    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        return { ...h, current: 0, completed: false };
      }
      return h;
    }));

    showToast?.(`Progresso de "${target.title}" redefinido para zero.`);

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${habitId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current: 0, completed: false })
        });
      } catch (err) {
        console.error('Erro ao resetar hábito:', err);
      }
    }
  };

  // 5. Deletar Hábito
  const handleDeleteHabit = async (habitId) => {
    const target = habits.find(h => h.id === habitId);
    if (!target) return;

    setHabits(prev => prev.filter(h => h.id !== habitId));

    showToast?.(`Hábito "${target.title}" excluído.`, () => {
      setHabits(prev => [target, ...prev]);
    });

    if (user) {
      try {
        await fetch(`/api/user/${user.id}/habit/${habitId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Erro ao deletar hábito:', err);
      }
    }
  };

  // -------------------------------------------------------------------------
  // FILTRAGEM
  // -------------------------------------------------------------------------
  const filteredHabits = habits.filter(h => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = h.title?.toLowerCase().includes(q);
      const matchCat = h.category?.toLowerCase().includes(q);
      const matchSub = h.subclassName?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchSub) return false;
    }

    if (filterCategory !== 'all' && h.category !== filterCategory) return false;

    if (filterTracking !== 'all') {
      const type = h.trackingType || (h.completionStyle === 'numeric' || h.completionStyle === 'increment' ? 'counter' : 'done');
      if (type !== filterTracking) return false;
    }

    if (filterPeriod !== 'all') {
      const p = h.periodType || 'day';
      if (p !== filterPeriod) return false;
    }

    if (filterStatus === 'pending' && h.completed) return false;
    if (filterStatus === 'completed' && !h.completed) return false;

    return true;
  });

  const displayPending = filteredHabits.filter(h => !h.completed);
  const displayCompleted = filteredHabits.filter(h => h.completed);

  // Formata o resumo do período em texto amigável
  const formatPeriodBadge = (habit) => {
    const pType = habit.periodType || 'day';
    const cfg = habit.periodConfig || {};

    if (pType === 'day') {
      const freq = cfg.dayFrequency || 'daily';
      if (freq === 'daily') return 'Ao dia • Todo dia';
      if (freq === 'weekdays') return 'Ao dia • Dias da semana';
      if (freq === 'times_per_week') return `Ao dia • ${cfg.timesPerWeek || 3}x/semana`;
      if (freq === 'month_days') return `Ao dia • ${cfg.selectedMonthDays?.length || 3} dias no mês`;
      if (freq === 'times_per_month') return `Ao dia • ${cfg.timesPerMonth || 10}x/mês`;
      return 'Ao longo do dia';
    }

    if (pType === 'week') {
      return `À semana • ${habit.target} ${habit.unit}/sem`;
    }

    if (pType === 'month') {
      return `Ao mês • ${cfg.selectedMonthDays?.length || 'Dias'} programados`;
    }

    if (pType === 'custom') {
      if (cfg.customIntervalType === 'even_days') return 'Custom • Dias pares';
      if (cfg.customIntervalType === 'odd_days') return 'Custom • Dias ímpares';
      return `Custom • A cada ${cfg.customIntervalDays || 2} dias`;
    }

    return 'Diário';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* ===================================================================== */}
      {/* 1. TOPO DA ABA DE HÁBITOS: TÍTULO + BOTÃO NOVO HÁBITO               */}
      {/* ===================================================================== */}
      <div 
        style={{
          backgroundColor: '#211F38',
          borderRadius: '26px',
          padding: '24px 28px',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 14px 34px rgba(33, 31, 56, 0.18)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '15px',
              backgroundColor: '#56548A',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(86, 84, 138, 0.35)'
            }}
          >
            <CheckCircle2 size={24} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Hábitos & Rotinas
              </h1>
              <span 
                style={{
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.18)',
                  color: '#38BDF8'
                }}
              >
                {totalHabits} Cadastrados
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#A9ABC6', margin: '4px 0 0 0' }}>
              Acompanhamento diário, semanal e mensal com marcação por clique, contador e valor flexível.
            </p>
          </div>
        </div>

        {/* Botão Novo Hábito */}
        <button
          type="button"
          onClick={onOpenAddHabit}
          style={{
            padding: '11px 22px',
            borderRadius: '999px',
            backgroundColor: '#6A67CE',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(106, 103, 206, 0.45)',
            transition: 'transform 0.15s ease'
          }}
        >
          <Plus size={16} strokeWidth={2.8} />
          <span>Novo Hábito</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. LINHA DE MÉTRICAS EXECUTIVAS DE HÁBITOS                          */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Taxa de Conclusão */}
        <div style={{ backgroundColor: '#211F38', borderRadius: '20px', padding: '18px 20px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(33, 31, 56, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#A9ABC6', textTransform: 'uppercase' }}>Taxa de Hoje</span>
            <TrendingUp size={16} color="#34D399" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
            {completionRate}%
          </div>
          <div style={{ width: '100%', height: '6px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', margin: '10px 0 6px' }}>
            <div style={{ width: `${completionRate}%`, height: '100%', backgroundColor: '#34D399', transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '11.5px', color: '#A9ABC6' }}>
            {completedHabits.length} de {totalHabits} hábitos concluídos
          </span>
        </div>

        {/* Card 2: Hábitos Pendentes */}
        <div style={{ backgroundColor: '#211F38', borderRadius: '20px', padding: '18px 20px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(33, 31, 56, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#A9ABC6', textTransform: 'uppercase' }}>Pendentes Hoje</span>
            <Clock size={16} color="#FDE68A" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>
            {pendingHabits.length}
          </div>
          <span style={{ fontSize: '11.5px', color: '#A9ABC6', display: 'block', marginTop: '16px' }}>
            Aguardando cumprimento hoje
          </span>
        </div>

        {/* Card 3: Ofensiva / Sequência */}
        <div style={{ backgroundColor: '#211F38', borderRadius: '20px', padding: '18px 20px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(33, 31, 56, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#A9ABC6', textTransform: 'uppercase' }}>Ofensiva Ativa</span>
            <Flame size={16} color="#F43F5E" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {user?.streak_days || 0} <span style={{ fontSize: '13px', fontWeight: 600, color: '#A9ABC6' }}>dias seguidos</span>
          </div>
          <span style={{ fontSize: '11.5px', color: '#34D399', display: 'block', marginTop: '16px', fontWeight: 600 }}>
            🔥 Ritmo consistente mantido
          </span>
        </div>

        {/* Card 4: Distribuição por Tipo */}
        <div style={{ backgroundColor: '#211F38', borderRadius: '20px', padding: '18px 20px', color: '#FFFFFF', boxShadow: '0 8px 20px rgba(33, 31, 56, 0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#A9ABC6', textTransform: 'uppercase' }}>Formatos Ativos</span>
            <Sliders size={16} color="#C4B5FD" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#E2E4F0' }}>
              <span>Feito (Check):</span>
              <strong>{countDoneType}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#E2E4F0' }}>
              <span>Contador:</span>
              <strong>{countCounterType}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#E2E4F0' }}>
              <span>Valor Flexível:</span>
              <strong>{countValueType}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 3. BARRA DE FILTROS, BUSCA E CONTROLES                               */}
      {/* ===================================================================== */}
      <div 
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '22px',
          padding: '16px 20px',
          border: '1px solid #D5D7E5',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 6px 18px rgba(20, 18, 40, 0.05)'
        }}
      >
        {/* Linha 1: Input de Busca + Filtro de Categoria */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* Busca */}
          <div 
            style={{
              flex: 1,
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '12px',
              backgroundColor: '#F3F4F8',
              border: '1px solid #D5D7E5'
            }}
          >
            <Search size={16} color="#7E809A" />
            <input
              type="text"
              placeholder="Pesquisar hábito por nome, categoria ou matéria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12.5px',
                fontWeight: 500,
                color: '#1A1B2F'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#7E809A', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro de Status (Pendentes, Concluídos, Todos) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F8', padding: '3px', borderRadius: '12px' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'completed', label: 'Concluídos' }
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setFilterStatus(st.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: filterStatus === st.id ? '#211F38' : 'transparent',
                  color: filterStatus === st.id ? '#FFFFFF' : '#5A5B75',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

        </div>

        {/* Linha 2: Filtros de Categoria, Forma de Marcação e Período */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '4px', borderTop: '1px solid #EBECEF' }}>
          
          {/* Categorias */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#5A5B75', whiteSpace: 'nowrap' }}>
              Categoria:
            </span>
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                border: filterCategory === 'all' ? '1.5px solid #211F38' : '1px solid #D5D7E5',
                backgroundColor: filterCategory === 'all' ? '#211F38' : '#FFFFFF',
                color: filterCategory === 'all' ? '#FFFFFF' : '#1A1B2F',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Todas
            </button>
            {tags.map(t => (
              <button
                key={t.id || t.name}
                type="button"
                onClick={() => setFilterCategory(t.name)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: filterCategory === t.name ? `1.5px solid ${t.color || '#211F38'}` : '1px solid #D5D7E5',
                  backgroundColor: filterCategory === t.name ? (t.color || '#211F38') : '#FFFFFF',
                  color: filterCategory === t.name ? '#FFFFFF' : '#1A1B2F',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Filtros de Tipo e Período */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Tipo de Marcação */}
            <select
              value={filterTracking}
              onChange={(e) => setFilterTracking(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '10px',
                border: '1px solid #D5D7E5',
                backgroundColor: '#F8F9FC',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#1A1B2F',
                outline: 'none'
              }}
            >
              <option value="all">Todas as Marcações</option>
              <option value="done">Marcar como feito</option>
              <option value="counter">Contador (+1)</option>
              <option value="value">Adicionar valor</option>
            </select>

            {/* Período */}
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '10px',
                border: '1px solid #D5D7E5',
                backgroundColor: '#F8F9FC',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#1A1B2F',
                outline: 'none'
              }}
            >
              <option value="all">Todos os Períodos</option>
              <option value="day">Ao dia</option>
              <option value="week">À semana</option>
              <option value="month">Ao mês</option>
              <option value="custom">Customizado</option>
            </select>
          </div>

        </div>

      </div>

      {/* ===================================================================== */}
      {/* 4. LISTA DE HÁBITOS PENDENTES                                        */}
      {/* ===================================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {displayPending.length === 0 && displayCompleted.length === 0 ? (
          <div 
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid #D5D7E5',
              boxShadow: '0 8px 24px rgba(20, 18, 40, 0.05)'
            }}
          >
            <CheckCircle2 size={42} color="#6A67CE" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
              Nenhum hábito encontrado
            </h3>
            <p style={{ fontSize: '13px', color: '#5A5B75', maxWidth: '420px', margin: '6px auto 16px' }}>
              {searchQuery || filterCategory !== 'all' || filterTracking !== 'all' || filterPeriod !== 'all'
                ? 'Tente ajustar os filtros ou a busca acima para encontrar os hábitos desejados.'
                : 'Comece criando a sua primeira rotina com meta e frequência personalizadas.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddHabit}
              style={{
                padding: '10px 22px',
                borderRadius: '999px',
                backgroundColor: '#211F38',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Criar Primeiro Hábito
            </button>
          </div>
        ) : displayPending.length === 0 ? (
          <div 
            style={{
              backgroundColor: '#211F38',
              borderRadius: '22px',
              padding: '24px',
              textAlign: 'center',
              color: '#FFFFFF',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <Check size={28} color="#34D399" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '16px', fontWeight: 700 }}>
              Todos os hábitos pendentes foram concluídos!
            </div>
            <div style={{ fontSize: '12px', color: '#A9ABC6', marginTop: '4px' }}>
              Parabéns pela constância de hoje. Veja a seção abaixo para revisar ou desfazer.
            </div>
          </div>
        ) : (
          displayPending.map((habit) => {
            const IconComp = CATEGORY_ICON_MAP[habit.category] || BookOpen;
            const catObj = tags.find(t => t.name === habit.category);
            const prioStyle = PRIORITY_COLOR_MAP[habit.priority] || PRIORITY_COLOR_MAP.Média;
            const progress = habit.target > 0 ? Math.min(100, Math.round(((habit.current || 0) / habit.target) * 100)) : 0;
            const trackType = habit.trackingType || (habit.completionStyle === 'numeric' || habit.completionStyle === 'increment' ? 'counter' : 'done');

            return (
              <div
                key={habit.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  border: '1px solid #D5D7E5',
                  boxShadow: '0 6px 18px rgba(20, 18, 40, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Lado Esquerdo: Ícone + Título + Badges de Período e Sub-classe */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '14px',
                      backgroundColor: '#211F38',
                      color: catObj?.color || '#38BDF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <IconComp size={20} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A1B2F' }}>
                        {habit.title}
                      </span>

                      {/* Badge da Categoria */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(33, 31, 56, 0.08)',
                          color: catObj?.color || '#56548A',
                          border: `1px solid ${catObj?.color ? `${catObj.color}40` : 'rgba(33,31,56,0.15)'}`
                        }}
                      >
                        {habit.category}
                      </span>

                      {/* Sub-classe se houver */}
                      {habit.subclassName && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(106, 103, 206, 0.12)',
                            color: '#56548A'
                          }}
                        >
                          {habit.subclassName}
                        </span>
                      )}

                      {/* Badge de Prioridade */}
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: prioStyle.bg,
                          color: prioStyle.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: prioStyle.dot }} />
                        {habit.priority || 'Média'}
                      </span>
                    </div>

                    {/* Linha de Metadados: Período + Formato de Marcação */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#5A5B75', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} color="#7E809A" />
                        {formatPeriodBadge(habit)}
                      </span>

                      <span style={{ fontSize: '11px', color: '#7E809A' }}>•</span>

                      <span style={{ fontSize: '11.5px', color: '#5A5B75', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {trackType === 'done' ? (
                          <>
                            <CheckCircle2 size={13} color="#38BDF8" />
                            <span>1 clique</span>
                          </>
                        ) : trackType === 'counter' ? (
                          <>
                            <Hash size={13} color="#F59E0B" />
                            <span>Contador passo a passo</span>
                          </>
                        ) : (
                          <>
                            <Activity size={13} color="#10B981" />
                            <span>Adicionar valor livre</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Barra de Progresso Suave */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1, height: '7px', borderRadius: '999px', backgroundColor: '#E8E9F2', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${progress}%`,
                            height: '100%',
                            borderRadius: '999px',
                            backgroundColor: '#6A67CE',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A1B2F', flexShrink: 0 }}>
                        {habit.current || 0} / {habit.target} {habit.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Ações Interativas Conforme a Forma de Marcação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  
                  {/* CASO 1: Marcar como feito (1 clique) */}
                  {trackType === 'done' && (
                    <button
                      type="button"
                      onClick={() => handleToggleHabit(habit.id)}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '12px',
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(33, 31, 56, 0.2)'
                      }}
                      title="Marcar hábito como concluído"
                    >
                      <Check size={16} strokeWidth={2.6} />
                      <span>Concluir</span>
                    </button>
                  )}

                  {/* CASO 2: Contador (+1 / -1) */}
                  {trackType === 'counter' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleIncrementCounter(habit.id, -1)}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          backgroundColor: '#E8E9F2',
                          color: '#1A1B2F',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Subtrair 1"
                      >
                        <Minus size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleIncrementCounter(habit.id, 1)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          backgroundColor: '#211F38',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
                        }}
                        title="Incrementar +1"
                      >
                        <Plus size={15} strokeWidth={2.6} />
                        <span>+1</span>
                      </button>
                    </div>
                  )}

                  {/* CASO 3: Adicionar Valor Flexível */}
                  {trackType === 'value' && (
                    <button
                      type="button"
                      onClick={() => handleOpenValuePrompt(habit)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
                      }}
                      title={`Registrar valor em ${habit.unit}`}
                    >
                      <Plus size={15} strokeWidth={2.6} />
                      <span>+ {habit.unit}</span>
                    </button>
                  )}

                  {/* Botão de Excluir Hábito */}
                  <button
                    type="button"
                    onClick={() => setHabitToDelete(habit)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: 'transparent',
                      color: '#9E9EB5',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Excluir hábito"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}

      </div>

      {/* ===================================================================== */}
      {/* 5. ACORDEÃO DE HÁBITOS CONCLUÍDOS HOJE                              */}
      {/* ===================================================================== */}
      {displayCompleted.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '16px',
              backgroundColor: '#211F38',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '13.5px',
              fontWeight: 700
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: '#34D399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={14} strokeWidth={3} />
              </span>
              <span>Hábitos Concluídos Hoje ({displayCompleted.length})</span>
            </div>
            {showCompletedAccordion ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showCompletedAccordion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {displayCompleted.map((habit) => (
                <div
                  key={habit.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    border: '1px solid #D5D7E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    opacity: 0.85
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '7px',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#7E809A', textDecoration: 'line-through' }}>
                        {habit.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#9E9EB5' }}>
                        {habit.category} • {habit.current || habit.target} / {habit.target} {habit.unit} • Meta Batida
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleResetProgress(habit.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        backgroundColor: '#F3F4F8',
                        color: '#5A5B75',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Redefinir progresso para zero"
                    >
                      <RotateCcw size={12} />
                      <span>Resetar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleHabit(habit.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Desfazer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. MODAL RÁPIDO PARA ADICIONAR VALOR FLEXÍVEL                       */}
      {/* ===================================================================== */}
      {valuePromptHabit && (
        <div
          onClick={() => setValuePromptHabit(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(18, 16, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#ECECF4',
              borderRadius: '22px',
              padding: '20px',
              border: '1.5px solid #FFFFFF',
              boxShadow: '0 24px 60px rgba(15, 14, 34, 0.45)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#6A67CE" />
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                  Registrar Progresso
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setValuePromptHabit(null)}
                style={{ background: 'none', border: 'none', color: '#7E809A', cursor: 'pointer', padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '12.5px', color: '#5A5B75', margin: '0 0 14px' }}>
              Quanto você realizou em <strong>"{valuePromptHabit.title}"</strong>?
              <br />
              <span style={{ fontSize: '11px', color: '#7E809A' }}>
                Atual: {valuePromptHabit.current || 0} / Meta: {valuePromptHabit.target} {valuePromptHabit.unit}
              </span>
            </p>

            <form onSubmit={handleApplyValueSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  required
                  placeholder={`Valor em ${valuePromptHabit.unit}...`}
                  value={valueInputAmount}
                  onChange={(e) => setValueInputAmount(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #C8CAD8',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#1A1B2F',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#211F38' }}>
                  {valuePromptHabit.unit}
                </span>
              </div>

              {/* Botões rápidos de acréscimo (+5, +10, +25, etc.) */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {[5, 10, 15, 25].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValueInputAmount(String(v))}
                    style={{
                      flex: 1,
                      padding: '5px 0',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D5D7E5',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#1A1B2F',
                      cursor: 'pointer'
                    }}
                  >
                    +{v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setValuePromptHabit(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#DCDCE6',
                    color: '#1A1B2F',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#211F38',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)'
                  }}
                >
                  Adicionar Valor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

