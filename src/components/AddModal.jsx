import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus,
  Minus,
  Layers,
  Sliders,
  CalendarDays,
  Repeat,
  Sparkles,
  Bookmark,
  Check,
  ChevronRight,
  Info,
  Hash,
  Activity,
  CalendarCheck2,
  Video,
  Bell,
  Shield,
  AlertCircle,
  CalendarX,
  Zap,
  Coffee,
  Briefcase,
  Mail,
  Lock,
  Globe,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Só paleta de cores para categorias do próprio usuário que não têm cor definida.
// NÃO são categorias: nunca aparecem quando o usuário não tem categorias (antes apareciam como "fantasmas").
const DEFAULT_TAG_STYLES = [
  { name: 'Faculdade', color: '#7C6FEF' },
  { name: 'Trabalho',  color: '#00C2D1' },
  { name: 'Saúde',     color: '#F24E6C' },
  { name: 'Pessoal',   color: '#2CC295' },
  { name: 'Casa',      color: '#F4C430' },
  { name: 'Leitura',   color: '#9B8CE8' }
];

const WEEKDAYS = [
  { dayIndex: 1, label: 'Seg' },
  { dayIndex: 2, label: 'Ter' },
  { dayIndex: 3, label: 'Qua' },
  { dayIndex: 4, label: 'Qui' },
  { dayIndex: 5, label: 'Sex' },
  { dayIndex: 6, label: 'Sáb' },
  { dayIndex: 0, label: 'Dom' }
];

const PRIORITY_OPTIONS = [
  { level: 'Alta', dot: '#F24E6C', border: '#F24E6C' },
  { level: 'Média', dot: '#F4C430', border: '#F4C430' },
  { level: 'Baixa', dot: '#2CC295', border: '#2CC295' }
];

const QUICK_UNITS = ['vezes', 'min', 'páginas', 'copos', 'km', 'ml', 'kcal', 'R$'];

export function AddModal({ 
  isOpen, 
  onClose, 
  onAddHabit, 
  onAddEvent, 
  tags = [],
  onCreateCategory,
  friends = [],
  initialMode = 'event'
}) {
  const _approvedFriends = Array.isArray(friends) ? friends.filter((f) => f.status === 'approved') : [];
  const [mode, setMode] = useState(initialMode); // 'event' | 'habit'

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || 'event');
    }
  }, [isOpen, initialMode]);

  // =========================================================================
  // ESTADOS DO FORMULÁRIO DE HÁBITOS AVANÇADO
  // =========================================================================
  const [habitTitle, setHabitTitle] = useState('');
  
  // 1. Escolha de como vai ser a marcação ('done' | 'counter' | 'value')
  const [trackingType, setTrackingType] = useState('done'); 

  // 2. Período que vai ter para marcar ('day' | 'week' | 'month' | 'custom')
  const [periodType, setPeriodType] = useState('day');

  // Sub-opções de 'Ao longo do dia' ('daily' | 'weekdays' | 'times_per_week' | 'month_days' | 'times_per_month')
  const [dayFrequency, setDayFrequency] = useState('daily');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Seg a Sex padrão
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [selectedMonthDays, setSelectedMonthDays] = useState([1, 10, 20]);
  const [timesPerMonth, setTimesPerMonth] = useState(10);

  // Sub-opções de 'Customizar'
  const [customIntervalType, setCustomIntervalType] = useState('every_x_days'); // 'every_x_days' | 'even_days' | 'odd_days'
  const [customIntervalDays, setCustomIntervalDays] = useState(2);

  // Customização de Meta e Unidade (o nº que deve ser feito ou marcado)
  const [targetNumber, setTargetNumber] = useState(1);
  const [targetUnit, setTargetUnit] = useState('vezes');

  // Categoria, Sub-classe, Prioridade e Esforço
  const [selectedCategory, setSelectedCategory] = useState(tags[0]?.name || 'Geral');
  const [selectedSubclassName, setSelectedSubclassName] = useState('');
  const [effort, setEffort] = useState('Médio');
  const [priority, setPriority] = useState('Média');

  // =========================================================================
  // ESTADOS DO FORMULÁRIO DE EVENTOS
  // =========================================================================
  const todayStr = new Date().toISOString().split('T')[0];
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventEndDate, setEventEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventCategory, setEventCategory] = useState(tags[0]?.name || 'Geral');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState('15 min antes');
  const [participantsText, setParticipantsText] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Opções Avançadas do Evento (Item 4: Recorrência, Exceções, Lembretes, Buffers, Energia)
  const [eventRepeat, setEventRepeat] = useState('Nunca');
  const [eventRepeatDays, setEventRepeatDays] = useState([1, 2, 3, 4, 5]);
  const [eventRepeatInterval, setEventRepeatInterval] = useState(1);
  const [eventRepeatEndType, setEventRepeatEndType] = useState('never'); // 'never' | 'until_date' | 'count'
  const [eventRepeatEndDate, setEventRepeatEndDate] = useState('');
  const [eventRepeatCount, setEventRepeatCount] = useState(10);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [newBlackoutInput, setNewBlackoutInput] = useState('');

  const [reminders, setReminders] = useState([
    { id: 'rem_1', time: '15 min antes', channel: 'app' }
  ]);

  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [isFloating, setIsFloating] = useState(false);

  const [energyLevel, setEnergyLevel] = useState('deep_focus');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [conflictPolicy, setConflictPolicy] = useState('allow');

  const [showAdvancedEventOptions, setShowAdvancedEventOptions] = useState(false);
  const [advancedTab, setAdvancedTab] = useState('recurrence');

  const handleAddBlackoutDate = () => {
    if (newBlackoutInput && !blackoutDates.includes(newBlackoutInput)) {
      setBlackoutDates([...blackoutDates, newBlackoutInput].sort());
      setNewBlackoutInput('');
    }
  };

  const handleRemoveBlackoutDate = (dateStr) => {
    setBlackoutDates(blackoutDates.filter(d => d !== dateStr));
  };

  const handleAddReminder = () => {
    const newRem = {
      id: `rem_${Date.now()}`,
      time: '1 hora antes',
      channel: 'email'
    };
    setReminders([...reminders, newRem]);
  };

  const handleRemoveReminder = (id) => {
    if (reminders.length > 1) {
      setReminders(reminders.filter(r => r.id !== id));
    }
  };

  const handleToggleEventWeekday = (dIdx) => {
    if (eventRepeatDays.includes(dIdx)) {
      if (eventRepeatDays.length > 1) {
        setEventRepeatDays(eventRepeatDays.filter(d => d !== dIdx));
      }
    } else {
      setEventRepeatDays([...eventRepeatDays, dIdx].sort((a,b) => a - b));
    }
  };

  // Atualiza unidade recomendada ao trocar o tipo de marcação
  const handleSelectTrackingType = (type) => {
    setTrackingType(type);
    if (type === 'done') {
      setTargetNumber(1);
      setTargetUnit('vez');
    } else if (type === 'counter') {
      if (targetNumber < 2) setTargetNumber(3);
      setTargetUnit('vezes');
    } else if (type === 'value') {
      if (targetNumber < 10) setTargetNumber(30);
      setTargetUnit('min');
    }
  };

  // Encontra a categoria atual e suas subclasses
  const currentCategoryObj = tags.find(t => t.name === selectedCategory) || tags[0];
  const hasCategorySubclasses = Boolean(currentCategoryObj?.has_subclasses && Array.isArray(currentCategoryObj.subclasses) && currentCategoryObj.subclasses.length > 0);

  // Alterna dias da semana
  const handleWeekdayToggle = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayIndex));
      }
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  // Alterna dias do mês (1 a 31)
  const handleMonthDayToggle = (dayNum) => {
    if (selectedMonthDays.includes(dayNum)) {
      if (selectedMonthDays.length > 1) {
        setSelectedMonthDays(selectedMonthDays.filter(d => d !== dayNum));
      }
    } else {
      setSelectedMonthDays([...selectedMonthDays, dayNum].sort((a, b) => a - b));
    }
  };

  const toggleParticipant = (pId) => {
    setSelectedParticipants(prev =>
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  const handleCreateHabitSubmit = (e) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    const chosenSubclass = hasCategorySubclasses && selectedSubclassName
      ? currentCategoryObj.subclasses.find(s => s.name === selectedSubclassName)
      : null;

    // Determina repeatDays conforme o período escolhido
    let effectiveRepeatDays = selectedDays;
    if (periodType === 'day') {
      if (dayFrequency === 'daily') effectiveRepeatDays = [0, 1, 2, 3, 4, 5, 6];
      else if (dayFrequency === 'weekdays') effectiveRepeatDays = selectedDays;
    } else if (periodType === 'week') {
      effectiveRepeatDays = selectedDays;
    }

    const newHabit = {
      id: `hab_${Date.now()}`,
      title: habitTitle.trim(),
      category: selectedCategory,
      subclassId: chosenSubclass?.id || null,
      subclassName: chosenSubclass?.name || (selectedSubclassName || null),
      iconName: 'CheckCircle2',
      target: Math.max(1, Number(targetNumber) || 1),
      current: 0,
      unit: targetUnit.trim() || (trackingType === 'counter' ? 'vezes' : trackingType === 'value' ? 'min' : 'vez'),
      effort,
      priority,
      tagId: currentCategoryObj?.id || 'tag_geral',
      repeatDays: effectiveRepeatDays,
      completed: false,
      completionStyle: trackingType === 'counter' ? 'increment' : trackingType === 'value' ? 'numeric' : 'quick',
      trackingType, // 'done' | 'counter' | 'value'
      periodType,   // 'day' | 'week' | 'month' | 'custom'
      periodConfig: {
        dayFrequency,
        selectedDays: effectiveRepeatDays,
        timesPerWeek: Number(timesPerWeek) || 3,
        selectedMonthDays,
        timesPerMonth: Number(timesPerMonth) || 10,
        customIntervalType,
        customIntervalDays: Number(customIntervalDays) || 2
      }
    };

    onAddHabit(newHabit);
    handleReset();
    onClose();
  };

  const handleCreateEventSubmit = (e) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;

    const newEvent = {
      id: `ev_${Date.now()}`,
      title: eventTitle.trim(),
      date: eventDate,
      endDate: eventEndDate || eventDate,
      allDay: isFloating,
      startTime: isFloating ? '00:00' : startTime,
      endTime: isFloating ? '23:59' : endTime,
      category: eventCategory,
      location: location.trim(),
      description: notes.trim(),
      repeat: eventRepeat,
      repeatConfig: {
        repeatDays: eventRepeatDays,
        repeatInterval: eventRepeat === 'Quinzenal' ? 2 : eventRepeatInterval,
        repeatEndType: eventRepeatEndType,
        repeatEndDate: eventRepeatEndDate,
        repeatCount: Number(eventRepeatCount) || 10,
        blackoutDates
      },
      reminders,
      bufferBefore: Number(bufferBefore) || 0,
      bufferAfter: Number(bufferAfter) || 0,
      isFloating,
      energyLevel,
      meetingUrl: meetingUrl.trim(),
      visibility,
      conflictPolicy,
      participantsText: participantsText.trim(),
      participants: selectedParticipants,
      completed: false
    };

    onAddEvent(newEvent);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setHabitTitle('');
    setEventTitle('');
    setLocation('');
    setNotes('');
    setParticipantsText('');
    setSelectedDays([1, 2, 3, 4, 5]);
    setSelectedMonthDays([1, 10, 20]);
    setPriority('Média');
    setSelectedSubclassName('');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const categoryList = tags.map((t, i) => ({
    name: t.name,
    color: t.color || DEFAULT_TAG_STYLES[i % DEFAULT_TAG_STYLES.length].color,
    has_subclasses: t.has_subclasses,
    subclasses: t.subclasses || []
  }));

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(18, 16, 36, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px'
      }}
    >
      {/* CARD MODAL RETANGULAR COM DESIGN LIQUID GLASS (#ECECF4) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="ethos-modal-card"
        style={{
          maxWidth: '820px',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        {/* TOPO: ÍCONE + TÍTULO + ALTERNADOR (EVENTO / HÁBITO) + FECHAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '1px solid rgba(33, 31, 56, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '11px',
                backgroundColor: '#211F38',
                color: mode === 'habit' ? '#38BDF8' : '#FDE68A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {mode === 'habit' ? <CheckCircle2 size={18} /> : <CalendarIcon size={18} />}
            </div>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1A1B2F', margin: 0, lineHeight: 1.15 }}>
                {mode === 'event' ? 'Novo Evento / Compromisso' : 'Novo Hábito Diário'}
              </h3>
              <span style={{ fontSize: '11px', color: '#5A5B75' }}>
                {mode === 'event' 
                  ? 'Compromisso sincronizado na agenda semanal e diária' 
                  : 'Rotina diária com meta, frequência e prioridade'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: '#DCDCE6',
                padding: '3px',
                borderRadius: '999px',
                gap: '3px'
              }}
            >
              <button
                type="button"
                onClick={() => setMode('event')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: mode === 'event' ? '#211F38' : 'transparent',
                  color: mode === 'event' ? '#FFFFFF' : '#1A1B2F',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Evento
              </button>
              <button
                type="button"
                onClick={() => setMode('habit')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: mode === 'habit' ? '#211F38' : 'transparent',
                  color: mode === 'habit' ? '#FFFFFF' : '#1A1B2F',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Hábito
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                backgroundColor: '#DCDCE6',
                color: '#211F38',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODO EVENTO                                                      */}
        {/* ================================================================= */}
        {mode === 'event' && (
          <form onSubmit={handleCreateEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
              {/* COLUNA ESQUERDA: Dados Principais do Evento */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                    Título do Evento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Reunião de Planejamento, Prova de Redes..."
                    value={eventTitle}
                    maxLength={120}
                    onChange={(e) => setEventTitle(e.target.value)}
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #D0D2E0',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#1A1B2F',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Grade de Data & Hora */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Data Início
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <CalendarIcon size={12} color="#5A5B75" />
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => {
                          setEventDate(e.target.value);
                          if (!eventEndDate || eventEndDate < e.target.value) setEventEndDate(e.target.value);
                        }}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Hora Início
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: isFloating ? '#F1F2F6' : '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <Clock size={12} color="#5A5B75" />
                      <input
                        type="time"
                        disabled={isFloating}
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: isFloating ? '#94A3B8' : '#1A1B2F', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Data Fim
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <CalendarIcon size={12} color="#5A5B75" />
                      <input
                        type="date"
                        value={eventEndDate}
                        onChange={(e) => setEventEndDate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Hora Fim
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: isFloating ? '#F1F2F6' : '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <Clock size={12} color="#5A5B75" />
                      <input
                        type="time"
                        disabled={isFloating}
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: isFloating ? '#94A3B8' : '#1A1B2F', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Local & Link da Reunião */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Local Físico
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 204, Prédio B..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #D0D2E0', backgroundColor: '#FFFFFF', fontSize: '11.5px', color: '#1A1B2F', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      <Video size={11} color="#6366F1" />
                      <span>Link Meet / Zoom</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #D0D2E0', backgroundColor: '#FFFFFF', fontSize: '11.5px', color: '#1A1B2F', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                    Descrição / Pauta
                  </label>
                  <input
                    type="text"
                    placeholder="Pauta ou observações pessoais do compromisso..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #D0D2E0', backgroundColor: '#FFFFFF', fontSize: '11.5px', color: '#1A1B2F', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* COLUNA DIREITA: Categorias + Painel Avançado de Recorrência & Flexibilidade */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '5px' }}>
                    Categoria / Tema
                  </label>
                  {categoryList.length === 0 && (
                    <div className="am-nocat" role="note">
                      <span>Você ainda não tem categorias. Este registro fica como <b>Sem categoria</b>.</span>
                      {onCreateCategory && <button type="button" onClick={onCreateCategory}>Criar categoria</button>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoryList.map((cat) => {
                      const isSel = eventCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setEventCategory(cat.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                            color: isSel ? '#FFFFFF' : '#1A1B2F',
                            border: `1.5px solid ${isSel ? '#211F38' : cat.color}`,
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* BOTÃO EXPANSÍVEL: OPÇÕES AVANÇADAS DO EVENTO (RECORRÊNCIA, EXCEÇÕES, LEMBRETES, BUFFERS) */}
                <div style={{ marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedEventOptions(!showAdvancedEventOptions)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #D0D2E0',
                      backgroundColor: '#F8F9FC',
                      color: '#211F38',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={13} color="#6366F1" />
                      <span>Opções Avançadas (Recorrência, Exceções & Buffer)</span>
                    </div>
                    {showAdvancedEventOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* PAINEL DE ABAS AVANÇADAS */}
                  {showAdvancedEventOptions && (
                    <div style={{ marginTop: '8px', padding: '10px', borderRadius: '12px', border: '1px solid #D0D2E0', backgroundColor: '#FFFFFF' }}>
                      {/* Sub-abas de Opções Avançadas */}
                      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px', borderBottom: '1px solid #E2E4F0' }}>
                        {[
                          { id: 'recurrence', label: 'Recorrência' },
                          { id: 'reminders', label: 'Lembretes' },
                          { id: 'buffer', label: 'Buffer & Tempo' },
                          { id: 'context', label: 'Energia' },
                          { id: 'sharing', label: 'Conflitos' }
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAdvancedTab(tab.id)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: advancedTab === tab.id ? '#211F38' : 'transparent',
                              color: advancedTab === tab.id ? '#FFFFFF' : '#5A5B75',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* ABA 1: RECORRÊNCIA, FREQUÊNCIA, LIMITE & EXCEÇÕES DE DATAS */}
                      {advancedTab === 'recurrence' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Frequência</label>
                              <select
                                value={eventRepeat}
                                onChange={(e) => setEventRepeat(e.target.value)}
                                style={{ width: '100%', padding: '5px', borderRadius: '7px', border: '1px solid #D0D2E0', fontSize: '11px', outline: 'none' }}
                              >
                                <option value="Nunca">Nunca</option>
                                <option value="Diário">Diário (Todos os dias)</option>
                                <option value="Semanal">Semanal (Dias específicos)</option>
                                <option value="Quinzenal">Quinzenal (A cada 2 semanas)</option>
                                <option value="Mensal">Mensal</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Limite de Término</label>
                              <select
                                value={eventRepeatEndType}
                                onChange={(e) => setEventRepeatEndType(e.target.value)}
                                style={{ width: '100%', padding: '5px', borderRadius: '7px', border: '1px solid #D0D2E0', fontSize: '11px', outline: 'none' }}
                              >
                                <option value="never">Sem data de término</option>
                                <option value="until_date">Até data específica</option>
                                <option value="count">Após X repetições</option>
                              </select>
                            </div>
                          </div>

                          {/* Seletor de dias da semana para semanal / quinzenal */}
                          {(eventRepeat === 'Semanal' || eventRepeat === 'Quinzenal') && (
                            <div>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '3px' }}>
                                Dias de Ocorrência na Semana:
                              </span>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {WEEKDAYS.map(w => {
                                  const isSel = eventRepeatDays.includes(w.dayIndex);
                                  return (
                                    <button
                                      key={w.dayIndex}
                                      type="button"
                                      onClick={() => handleToggleEventWeekday(w.dayIndex)}
                                      style={{
                                        width: '26px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        border: isSel ? '1px solid #211F38' : '1px solid #D0D2E0',
                                        backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                                        color: isSel ? '#FFFFFF' : '#5A5B75',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {w.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Configuração de Término Específico */}
                          {eventRepeatEndType === 'until_date' && (
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Repetir até a data:</label>
                              <input
                                type="date"
                                value={eventRepeatEndDate}
                                onChange={(e) => setEventRepeatEndDate(e.target.value)}
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '11px', outline: 'none' }}
                              />
                            </div>
                          )}

                          {eventRepeatEndType === 'count' && (
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Número de ocorrências:</label>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={eventRepeatCount}
                                onChange={(e) => setEventRepeatCount(e.target.value)}
                                style={{ width: '100%', padding: '4px 8px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '11px', outline: 'none' }}
                              />
                            </div>
                          )}

                          {/* EXCEÇÕES DE DATAS (BLACKOUT DATES) */}
                          <div style={{ borderTop: '1px solid #F1F2F6', paddingTop: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>
                              Exceções de Datas (Blackout Dates)
                            </span>
                            <span style={{ fontSize: '9.5px', color: '#797B9E', display: 'block', marginBottom: '4px' }}>
                              Datas em que o evento não deve ocorrer (viagens, feriados):
                            </span>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                              <input
                                type="date"
                                value={newBlackoutInput}
                                onChange={(e) => setNewBlackoutInput(e.target.value)}
                                style={{ flex: 1, padding: '3px 6px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                              />
                              <button
                                type="button"
                                onClick={handleAddBlackoutDate}
                                style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', backgroundColor: '#6366F1', color: '#FFFFFF', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                              >
                                + Exceção
                              </button>
                            </div>

                            {blackoutDates.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {blackoutDates.map(d => (
                                  <span key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '6px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: '10px', fontWeight: 600 }}>
                                    <span>{d}</span>
                                    <button type="button" onClick={() => handleRemoveBlackoutDate(d)} style={{ background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', padding: 0 }}>
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ABA 2: LEMBRETES & NOTIFICAÇÕES (MÚLTIPLOS ALERTAS & CANAIS) */}
                      {advancedTab === 'reminders' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75' }}>
                            Alertas e Canais de Notificação:
                          </span>
                          {reminders.map((r, idx) => (
                            <div key={r.id || idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: '4px', alignItems: 'center' }}>
                              <select
                                value={r.time}
                                onChange={(e) => {
                                  const updated = reminders.map(it => it.id === r.id ? { ...it, time: e.target.value } : it);
                                  setReminders(updated);
                                }}
                                style={{ padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                              >
                                <option value="10 min antes">10 min antes</option>
                                <option value="15 min antes">15 min antes</option>
                                <option value="30 min antes">30 min antes</option>
                                <option value="1 hora antes">1 hora antes</option>
                                <option value="2 horas antes">2 horas antes</option>
                                <option value="1 dia antes">1 dia antes</option>
                              </select>

                              <select
                                value={r.channel}
                                onChange={(e) => {
                                  const updated = reminders.map(it => it.id === r.id ? { ...it, channel: e.target.value } : it);
                                  setReminders(updated);
                                }}
                                style={{ padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                              >
                                <option value="app">Notificação no App</option>
                                <option value="email">E-mail (via Resend)</option>
                                <option value="both">Ambos (App + E-mail)</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveReminder(r.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '2px' }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddReminder}
                            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#6366F1', fontSize: '10.5px', fontWeight: 600, cursor: 'pointer', padding: '2px 0' }}
                          >
                            + Adicionar outro lembrete
                          </button>
                        </div>
                      )}

                      {/* ABA 3: BUFFER TIME & EVENTOS FLUTUANTES */}
                      {advancedTab === 'buffer' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>
                                Buffer Antes (Preparação)
                              </label>
                              <select
                                value={bufferBefore}
                                onChange={(e) => setBufferBefore(Number(e.target.value))}
                                style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                              >
                                <option value={0}>Nenhum</option>
                                <option value={10}>10 minutos antes</option>
                                <option value={15}>15 minutos antes</option>
                                <option value={30}>30 minutos antes</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>
                                Buffer Depois (Transição)
                              </label>
                              <select
                                value={bufferAfter}
                                onChange={(e) => setBufferAfter(Number(e.target.value))}
                                style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                              >
                                <option value={0}>Nenhum</option>
                                <option value={15}>15 minutos depois</option>
                                <option value={30}>30 minutos depois</option>
                              </select>
                            </div>
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#1A1B2F', fontWeight: 600, cursor: 'pointer', marginTop: '2px' }}>
                            <input
                              type="checkbox"
                              checked={isFloating}
                              onChange={(e) => setIsFloating(e.target.checked)}
                              style={{ accentColor: '#6366F1' }}
                            />
                            <span>Evento Flutuante (Deadline-driven: flexível sem horário rígido)</span>
                          </label>
                        </div>
                      )}

                      {/* ABA 4: NÍVEL DE ENERGIA & ESFORÇO */}
                      {advancedTab === 'context' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75' }}>
                            Classificação de Esforço & Foco:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                            {[
                              { id: 'deep_focus', label: 'Foco Profundo', icon: Zap, color: '#818CF8' },
                              { id: 'light_meeting', label: 'Reunião Leve', icon: Coffee, color: '#38BDF8' },
                              { id: 'quick_task', label: 'Tarefa Rápida', icon: Check, color: '#34D399' },
                              { id: 'recovery', label: 'Recuperação', icon: Sparkles, color: '#F472B6' }
                            ].map(item => {
                              const isSel = energyLevel === item.id;
                              const Icon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setEnergyLevel(item.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    border: isSel ? '1.5px solid #6366F1' : '1px solid #D0D2E0',
                                    backgroundColor: isSel ? 'rgba(99, 102, 241, 0.1)' : '#FFFFFF',
                                    color: isSel ? '#211F38' : '#5A5B75',
                                    fontSize: '10.5px',
                                    fontWeight: isSel ? 700 : 500,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Icon size={12} color={item.color} />
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ABA 5: VISIBILIDADE & CONFLITO */}
                      {advancedTab === 'sharing' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Visibilidade</label>
                            <select
                              value={visibility}
                              onChange={(e) => setVisibility(e.target.value)}
                              style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                            >
                              <option value="private">Privado (Apenas eu)</option>
                              <option value="busy">Disponível / Ocupado</option>
                              <option value="public">Público para amigos</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', fontWeight: 600, color: '#5A5B75', display: 'block', marginBottom: '2px' }}>Política de Conflito</label>
                            <select
                              value={conflictPolicy}
                              onChange={(e) => setConflictPolicy(e.target.value)}
                              style={{ width: '100%', padding: '4px', borderRadius: '6px', border: '1px solid #D0D2E0', fontSize: '10.5px', outline: 'none' }}
                            >
                              <option value="allow">Permitir sobreposição</option>
                              <option value="block">Bloquear se houver conflito</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BOTÕES CANCELAR & SALVAR */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#DCDCE6', color: '#1A1B2F', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', backgroundColor: '#211F38', color: '#FFFFFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(33, 31, 56, 0.2)' }}
                  >
                    Salvar Evento
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* MODO HÁBITO AVANÇADO: REQUISITOS 1, 2 E OBS                       */}
        {/* ================================================================= */}
        {mode === 'habit' && (
          <form onSubmit={handleCreateHabitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* LINHA SUPERIOR: Nome do Hábito */}
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3A3B55', marginBottom: '4px' }}>
                Nome do Hábito
              </label>
              <input
                type="text"
                placeholder="Ex: Ler 20 páginas, Meditação, Beber água..."
                value={habitTitle}
                maxLength={120}
                onChange={(e) => setHabitTitle(e.target.value)}
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '11px',
                  border: '1px solid #C8CAD8',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1A1B2F',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* GRID DE DUAS COLUNAS PRINCIPAIS */}
            <div className="ethos-modal-grid-2col">
              
              {/* COLUNA ESQUERDA: FORMA DE MARCAÇÃO + PERÍODO DE AGENDAMENTO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* ------------------------------------------------------------- */}
                {/* 1. ESCOLHA DE COMO VAI SER A MARCAÇÃO (REQUISITO 1)           */}
                {/* ------------------------------------------------------------- */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid #D5D7E5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#353358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      1. Forma de Marcação
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#6A67CE', fontWeight: 600 }}>
                      {trackingType === 'done' ? 'Binário (Feito/Não)' : trackingType === 'counter' ? 'Incremento Passo a Passo' : 'Valor com Unidade'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {/* Opção 1: Marcar como feito */}
                    <button
                      type="button"
                      onClick={() => handleSelectTrackingType('done')}
                      style={{
                        padding: '9px 6px',
                        borderRadius: '10px',
                        border: trackingType === 'done' ? '1.5px solid #211F38' : '1px solid #DCDCE6',
                        backgroundColor: trackingType === 'done' ? '#211F38' : '#F7F8FC',
                        color: trackingType === 'done' ? '#FFFFFF' : '#1A1B2F',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <CheckCircle2 size={16} color={trackingType === 'done' ? '#38BDF8' : '#56548A'} />
                      <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1.1 }}>Marcar como feito</span>
                      <span style={{ fontSize: '9px', opacity: 0.8, lineHeight: 1.1 }}>1 clique rápido</span>
                    </button>

                    {/* Opção 2: Contador */}
                    <button
                      type="button"
                      onClick={() => handleSelectTrackingType('counter')}
                      style={{
                        padding: '9px 6px',
                        borderRadius: '10px',
                        border: trackingType === 'counter' ? '1.5px solid #211F38' : '1px solid #DCDCE6',
                        backgroundColor: trackingType === 'counter' ? '#211F38' : '#F7F8FC',
                        color: trackingType === 'counter' ? '#FFFFFF' : '#1A1B2F',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Hash size={16} color={trackingType === 'counter' ? '#FDE68A' : '#56548A'} />
                      <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1.1 }}>Contador</span>
                      <span style={{ fontSize: '9px', opacity: 0.8, lineHeight: 1.1 }}>Somar +1 a +1</span>
                    </button>

                    {/* Opção 3: Adicionar valor */}
                    <button
                      type="button"
                      onClick={() => handleSelectTrackingType('value')}
                      style={{
                        padding: '9px 6px',
                        borderRadius: '10px',
                        border: trackingType === 'value' ? '1.5px solid #211F38' : '1px solid #DCDCE6',
                        backgroundColor: trackingType === 'value' ? '#211F38' : '#F7F8FC',
                        color: trackingType === 'value' ? '#FFFFFF' : '#1A1B2F',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Activity size={16} color={trackingType === 'value' ? '#34D399' : '#56548A'} />
                      <span style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1.1 }}>Adicionar valor</span>
                      <span style={{ fontSize: '9px', opacity: 0.8, lineHeight: 1.1 }}>Ex: páginas, min, ml</span>
                    </button>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* 2. PERÍODO QUE VAI TER PARA MARCAR (REQUISITO 2)              */}
                {/* ------------------------------------------------------------- */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid #D5D7E5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#353358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      2. Período para Marcar
                    </span>
                  </div>

                  {/* 4 Abas do Período */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '10px' }}>
                    {[
                      { id: 'day', label: 'Ao dia' },
                      { id: 'week', label: 'À semana' },
                      { id: 'month', label: 'Ao mês' },
                      { id: 'custom', label: 'Custom' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPeriodType(tab.id)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: periodType === tab.id ? '#56548A' : '#E8E9F2',
                          color: periodType === tab.id ? '#FFFFFF' : '#1A1B2F',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* SUB-SEÇÃO A: AO LONGO DO DIA */}
                  {periodType === 'day' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 600 }}>
                        Frequência Diária:
                      </span>
                      <select
                        value={dayFrequency}
                        onChange={(e) => setDayFrequency(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #C8CAD8',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#1A1B2F',
                          backgroundColor: '#F8F9FC',
                          outline: 'none'
                        }}
                      >
                        <option value="daily">Pode ser selecionado todo dia (Seg a Dom)</option>
                        <option value="weekdays">Em dias específicos da semana</option>
                        <option value="times_per_week">Número de vezes por semana</option>
                        <option value="month_days">Em dias específicos do mês</option>
                        <option value="times_per_month">Número de vezes por mês</option>
                      </select>

                      {/* Sub-opção: Dias específicos da semana */}
                      {dayFrequency === 'weekdays' && (
                        <div>
                          <span style={{ fontSize: '10px', color: '#5A5B75', display: 'block', marginBottom: '4px' }}>
                            Selecione os dias da semana ativos:
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {WEEKDAYS.map((wd) => {
                              const isSel = selectedDays.includes(wd.dayIndex);
                              return (
                                <button
                                  key={wd.dayIndex}
                                  type="button"
                                  onClick={() => handleWeekdayToggle(wd.dayIndex)}
                                  style={{
                                    flex: 1,
                                    padding: '5px 0',
                                    borderRadius: '7px',
                                    border: 'none',
                                    backgroundColor: isSel ? '#211F38' : '#E8E9F2',
                                    color: isSel ? '#FFFFFF' : '#1A1B2F',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {wd.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sub-opção: Número de vezes por semana */}
                      {dayFrequency === 'times_per_week' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E4F0' }}>
                          <span style={{ fontSize: '11px', color: '#1A1B2F', fontWeight: 600 }}>Quantas vezes por semana:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setTimesPerWeek(Math.max(1, timesPerWeek - 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#DCDCE6', color: '#1A1B2F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{timesPerWeek}x</span>
                            <button
                              type="button"
                              onClick={() => setTimesPerWeek(Math.min(7, timesPerWeek + 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#211F38', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sub-opção: Dias específicos do mês (Grade 1 a 31) */}
                      {dayFrequency === 'month_days' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#5A5B75' }}>Marque os dias do mês:</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#56548A' }}>{selectedMonthDays.length} selecionados</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', maxHeight: '110px', overflowY: 'auto', padding: '4px', backgroundColor: '#F8F9FC', borderRadius: '8px', border: '1px solid #E2E4F0' }}>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                              const isSel = selectedMonthDays.includes(d);
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => handleMonthDayToggle(d)}
                                  style={{
                                    height: '22px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                                    color: isSel ? '#FFFFFF' : '#1A1B2F',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {d}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sub-opção: Número de vezes por mês */}
                      {dayFrequency === 'times_per_month' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E4F0' }}>
                          <span style={{ fontSize: '11px', color: '#1A1B2F', fontWeight: 600 }}>Quantas vezes no mês:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setTimesPerMonth(Math.max(1, timesPerMonth - 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#DCDCE6', color: '#1A1B2F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '28px', textAlign: 'center' }}>{timesPerMonth}x</span>
                            <button
                              type="button"
                              onClick={() => setTimesPerMonth(Math.min(31, timesPerMonth + 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#211F38', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-SEÇÃO B: AO LONGO DA SEMANA */}
                  {periodType === 'week' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 600 }}>
                        Quais dias da semana vão ser contados para fazer o hábito:
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {WEEKDAYS.map((wd) => {
                          const isSel = selectedDays.includes(wd.dayIndex);
                          return (
                            <button
                              key={wd.dayIndex}
                              type="button"
                              onClick={() => handleWeekdayToggle(wd.dayIndex)}
                              style={{
                                flex: 1,
                                padding: '6px 0',
                                borderRadius: '7px',
                                border: 'none',
                                backgroundColor: isSel ? '#211F38' : '#E8E9F2',
                                color: isSel ? '#FFFFFF' : '#1A1B2F',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {wd.label}
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '10px', color: '#7E809A' }}>
                        Meta distribuída na semana. Qualquer dia selecionado conta para o total acumulado.
                      </span>
                    </div>
                  )}

                  {/* SUB-SEÇÃO C: AO LONGO DO MÊS */}
                  {periodType === 'month' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 600 }}>
                          Quais números do mês o hábito vai aparecer:
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#56548A' }}>
                          {selectedMonthDays.length} dias
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', maxHeight: '110px', overflowY: 'auto', padding: '4px', backgroundColor: '#F8F9FC', borderRadius: '8px', border: '1px solid #E2E4F0' }}>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                          const isSel = selectedMonthDays.includes(d);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleMonthDayToggle(d)}
                              style={{
                                height: '22px',
                                borderRadius: '5px',
                                border: 'none',
                                backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                                color: isSel ? '#FFFFFF' : '#1A1B2F',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-SEÇÃO D: CUSTOMIZAR */}
                  {periodType === 'custom' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 600 }}>
                        Regra de Intervalo Personalizada:
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { id: 'every_x_days', label: 'A cada X dias' },
                          { id: 'even_days', label: 'Dias pares' },
                          { id: 'odd_days', label: 'Dias ímpares' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setCustomIntervalType(opt.id)}
                            style={{
                              flex: 1,
                              padding: '5px 4px',
                              borderRadius: '7px',
                              border: 'none',
                              backgroundColor: customIntervalType === opt.id ? '#211F38' : '#E8E9F2',
                              color: customIntervalType === opt.id ? '#FFFFFF' : '#1A1B2F',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {customIntervalType === 'every_x_days' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8F9FC', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E4F0' }}>
                          <span style={{ fontSize: '11px', color: '#1A1B2F', fontWeight: 600 }}>Repetir a cada:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setCustomIntervalDays(Math.max(1, customIntervalDays - 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#DCDCE6', color: '#1A1B2F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Minus size={12} />
                            </button>
                            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>
                              {customIntervalDays} {customIntervalDays === 1 ? 'dia' : 'dias'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCustomIntervalDays(Math.min(30, customIntervalDays + 1))}
                              style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', backgroundColor: '#211F38', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

              {/* COLUNA DIREITA: OBS (META + UNIDADE) + CATEGORIA + SUB-CLASSE + BOTÕES */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                
                {/* ------------------------------------------------------------- */}
                {/* OBS ATENDIDA: META & UNIDADE (O NÚMERO QUE DEVE SER FEITO)    */}
                {/* ------------------------------------------------------------- */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid #D5D7E5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#353358', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Meta & Unidade a Cumprir
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 700 }}>
                      {targetNumber} {targetUnit}
                    </span>
                  </div>

                  {/* Controle de Quantidade Numérica */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F8F9FC', padding: '4px', borderRadius: '9px', border: '1px solid #D0D2E0' }}>
                      <button
                        type="button"
                        onClick={() => setTargetNumber(Math.max(1, Number(targetNumber) - 1))}
                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', backgroundColor: '#DCDCE6', color: '#1A1B2F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={targetNumber}
                        onChange={(e) => setTargetNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{ width: '45px', textAlign: 'center', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#1A1B2F', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setTargetNumber(Number(targetNumber) + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '7px', border: 'none', backgroundColor: '#211F38', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Unidade (ex: vezes, min, páginas)..."
                        value={targetUnit}
                        onChange={(e) => setTargetUnit(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '9px', border: '1px solid #D0D2E0', backgroundColor: '#FFFFFF', fontSize: '12px', fontWeight: 600, color: '#1A1B2F', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Pills de Unidades Rápidas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {QUICK_UNITS.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setTargetUnit(u)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: targetUnit === u ? '1.5px solid #211F38' : '1px solid #DCDCE6',
                          backgroundColor: targetUnit === u ? '#211F38' : '#F7F8FC',
                          color: targetUnit === u ? '#FFFFFF' : '#5A5B75',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria / Tema */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                    Categoria / Tema
                  </label>
                  {categoryList.length === 0 && (
                    <div className="am-nocat" role="note">
                      <span>Você ainda não tem categorias. Este registro fica como <b>Sem categoria</b>.</span>
                      {onCreateCategory && <button type="button" onClick={onCreateCategory}>Criar categoria</button>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {categoryList.map((cat) => {
                      const isSel = selectedCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            setSelectedSubclassName('');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                            color: isSel ? '#FFFFFF' : '#1A1B2F',
                            border: `1.5px solid ${isSel ? '#211F38' : cat.color}`,
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-classes se a categoria tiver has_subclasses === true */}
                {hasCategorySubclasses && (
                  <div style={{ backgroundColor: '#F8F9FC', padding: '8px 10px', borderRadius: '10px', border: '1px solid #D5D7E5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#353358' }}>
                        Sub-classe / Matéria (Opcional):
                      </span>
                      {selectedSubclassName && (
                        <button
                          type="button"
                          onClick={() => setSelectedSubclassName('')}
                          style={{ background: 'none', border: 'none', color: '#7E809A', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedSubclassName('')}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: !selectedSubclassName ? '1.5px solid #211F38' : '1px solid #DCDCE6',
                          backgroundColor: !selectedSubclassName ? '#211F38' : '#FFFFFF',
                          color: !selectedSubclassName ? '#FFFFFF' : '#1A1B2F',
                          fontSize: '10px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Geral
                      </button>
                      {currentCategoryObj.subclasses.map((sub) => {
                        const isSubSel = selectedSubclassName === sub.name;
                        return (
                          <button
                            key={sub.id || sub.name}
                            type="button"
                            onClick={() => setSelectedSubclassName(sub.name)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: isSubSel ? '1.5px solid #56548A' : '1px solid #DCDCE6',
                              backgroundColor: isSubSel ? '#56548A' : '#FFFFFF',
                              color: isSubSel ? '#FFFFFF' : '#1A1B2F',
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {sub.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prioridade e Esforço */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Prioridade
                    </label>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {PRIORITY_OPTIONS.map((opt) => {
                        const isSel = priority === opt.level;
                        return (
                          <button
                            key={opt.level}
                            type="button"
                            onClick={() => setPriority(opt.level)}
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              padding: '4px 2px',
                              borderRadius: '999px',
                              backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                              color: isSel ? '#FFFFFF' : '#1A1B2F',
                              border: `1.5px solid ${isSel ? '#211F38' : opt.border}`,
                              fontSize: '10px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: opt.dot }} />
                            <span>{opt.level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Esforço
                    </label>
                    <select
                      value={effort}
                      onChange={(e) => setEffort(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '4.5px 6px',
                        borderRadius: '999px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#FFFFFF',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: '#1A1B2F',
                        outline: 'none'
                      }}
                    >
                      <option value="Baixo">Baixo</option>
                      <option value="Médio">Médio</option>
                      <option value="Alto">Alto</option>
                    </select>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={onClose}
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
                    Salvar Hábito
                  </button>
                </div>

              </div>

            </div>

          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
