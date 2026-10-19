import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  Bell, 
  FileText, 
  BookOpen, 
  Dumbbell, 
  Bookmark, 
  Home, 
  Sparkles, 
  Activity,
  Plus,
  Tag,
  Palette,
  Check
} from 'lucide-react';

const DEFAULT_COLOR_PALETTES = [
  { name: 'Ciano', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' },
  { name: 'Índigo', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  { name: 'Esmeralda', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { name: 'Rosa Vibrante', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  { name: 'Âmbar Dourado', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { name: 'Violeta', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
];

const WEEKDAYS = [
  { dayIndex: 1, label: 'S' }, // Seg
  { dayIndex: 2, label: 'T' }, // Ter
  { dayIndex: 3, label: 'Q' }, // Qua
  { dayIndex: 4, label: 'Q' }, // Qui
  { dayIndex: 5, label: 'S' }, // Sex
  { dayIndex: 6, label: 'S' }, // Sáb
  { dayIndex: 0, label: 'D' }, // Dom
];

const PRIORITY_OPTIONS = [
  { level: 'Alta', color: 'var(--accent-rose)', border: 'rgba(244, 63, 94, 0.4)', bg: 'rgba(244, 63, 94, 0.18)' },
  { level: 'Média', color: 'var(--accent-amber)', border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(251, 191, 36, 0.18)' },
  { level: 'Baixa', color: 'var(--accent-emerald)', border: 'rgba(52, 211, 153, 0.4)', bg: 'rgba(52, 211, 153, 0.18)' }
];

export function AddModal({ isOpen, onClose, onAddHabit, onAddEvent, tags = [], onAddTag }) {
  // Mode: 'choose', 'habit', 'event'
  const [mode, setMode] = useState('choose');

  // Habit Form States
  const [habitTitle, setHabitTitle] = useState('');
  const [completionStyle, setCompletionStyle] = useState('quick');
  const [targetNumber, setTargetNumber] = useState('1');
  const [targetUnit, setTargetUnit] = useState('vezes');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [selectedCategory, setSelectedCategory] = useState(tags[0]?.name || 'Faculdade');
  const [effort, setEffort] = useState('Médio');
  const [priority, setPriority] = useState('Média');

  // Event Form States (Requisito 3: Data e Horário)
  const todayStr = new Date().toISOString().split('T')[0];
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayStr); // Data explícita obrigatória
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00'); // Horário Início
  const [endTime, setEndTime] = useState('10:30'); // Horário Término
  const [eventCategory, setEventCategory] = useState(tags[0]?.name || 'Geral');
  const [eventPriority, setEventPriority] = useState('Média');
  const [repeat, setRepeat] = useState('Nunca');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Requisito 4: Criador de Novo Tema / Categoria
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(DEFAULT_COLOR_PALETTES[0]);

  if (!isOpen) return null;

  const handleWeekdayToggle = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleCreateCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newTag = {
      id: `tag_${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor.color,
      bg: newCatColor.bg,
      icon: 'Tag'
    };

    onAddTag(newTag);
    setSelectedCategory(newTag.name);
    setEventCategory(newTag.name);
    setNewCatName('');
    setShowCategoryCreator(false);
  };

  const handleCreateHabitSubmit = (e) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    const foundTag = tags.find(t => t.name === selectedCategory);
    const newHabit = {
      id: `hab_${Date.now()}`,
      title: habitTitle.trim(),
      category: selectedCategory,
      iconName: 'CheckCircle2',
      target: parseInt(targetNumber, 10) || 1,
      current: 0,
      unit: targetUnit.trim() || 'vezes',
      effort,
      priority,
      tagId: foundTag?.id || 'tag_geral',
      repeatDays: selectedDays,
      completed: false,
      completionStyle
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
      date: eventDate, // Data selecionada
      allDay,
      startTime: allDay ? '00:00' : startTime, // Horário início
      endTime: allDay ? '23:59' : endTime, // Horário término
      category: eventCategory,
      priority: eventPriority,
      repeat,
      location,
      notes,
      completed: false
    };

    onAddEvent(newEvent);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setMode('choose');
    setHabitTitle('');
    setEventTitle('');
    setSelectedDays([1, 2, 3, 4, 5]);
    setPriority('Média');
    setEventPriority('Média');
    setShowCategoryCreator(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {mode === 'choose' && 'O que deseja registrar?'}
              {mode === 'habit' && 'Novo Hábito (Rotina Diária)'}
              {mode === 'event' && 'Novo Evento na Agenda & Calendário'}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {mode === 'habit' && 'Será alocado nos Hábitos Diários do Dashboard para acompanhamento de ofensiva.'}
              {mode === 'event' && 'Será alocado com data e horários específicos na sua Agenda e no Calendário.'}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: CHOOSE OVERLAY (REQUISITO 1: ONDE CADA UM É ALOCADO) */}
        {mode === 'choose' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', padding: '10px 0' }}>
            <button 
              className="card-native" 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', width: '100%', borderColor: 'rgba(0, 229, 255, 0.3)' }}
              onClick={() => setMode('habit')}
            >
              <div className="habit-category-box" style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--accent-cyan)' }}>
                <CheckCircle2 size={26} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Novo Hábito de Rotina
                  </h3>
                  <span className="section-badge" style={{ color: 'var(--accent-cyan)' }}>Dashboard</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Acompanhe hábitos contínuos com nível de esforço, repetição semanal e metas (ex: Leitura, Treino, Beber Água).
                </p>
              </div>
            </button>

            <button 
              className="card-native" 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', width: '100%', borderColor: 'rgba(129, 140, 248, 0.3)' }}
              onClick={() => setMode('event')}
            >
              <div className="habit-category-box" style={{ background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent-indigo)' }}>
                <Calendar size={26} strokeWidth={2.4} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Novo Evento ou Compromisso
                  </h3>
                  <span className="section-badge" style={{ color: 'var(--accent-indigo)' }}>Agenda & Calendário</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Compromisso marcado em data e horário pontuais (ex: Prova, Reunião, Consulta, Apresentação).
                </p>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: NOVO HÁBITO FORM */}
        {mode === 'habit' && (
          <form onSubmit={handleCreateHabitSubmit}>
            <div className="form-group">
              <label className="form-label">Nome do Hábito</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="ex: Leitura Profunda de Livro Técnico" 
                value={habitTitle}
                onChange={(e) => setHabitTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* SELEÇÃO E CRIAÇÃO DE CATEGORIA / TEMA (REQUISITO 4) */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Tema / Categoria</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => setShowCategoryCreator(!showCategoryCreator)}
                >
                  <Plus size={14} />
                  + Nova Categoria / Tema
                </button>
              </div>

              {/* CRIADOR INLINE DE CATEGORIAS */}
              {showCategoryCreator && (
                <div className="card-native" style={{ background: 'var(--surface-elevated)', marginBottom: '12px', padding: '12px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Cadastrar Novo Tema:</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input 
                      type="text"
                      className="input-dark"
                      placeholder="Nome do tema (ex: Finanças, Inglês)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                    />
                    <button 
                      type="button" 
                      className="btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      onClick={handleCreateCategory}
                    >
                      Salvar
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cor:</span>
                    {DEFAULT_COLOR_PALETTES.map((pal, idx) => (
                      <span 
                        key={idx}
                        onClick={() => setNewCatColor(pal)}
                        style={{ 
                          width: 18, 
                          height: 18, 
                          borderRadius: '50%', 
                          background: pal.color, 
                          cursor: 'pointer',
                          border: newCatColor.color === pal.color ? '2px solid #fff' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SELETORES DE CATEGORIA EXISTENTES */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tags.map((t) => (
                  <button
                    key={t.id || t.name}
                    type="button"
                    onClick={() => setSelectedCategory(t.name)}
                    className="tag-badge"
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      border: selectedCategory === t.name ? `2px solid ${t.color}` : `1px solid ${t.color}40`,
                      background: t.bg,
                      color: t.color,
                      fontWeight: selectedCategory === t.name ? 700 : 500
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Estilo de Conclusão */}
            <div className="form-group">
              <label className="form-label">Estilo de Conclusão</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${completionStyle === 'quick' ? 'active' : ''}`}
                  onClick={() => setCompletionStyle('quick')}
                >
                  Toque Rápido
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${completionStyle === 'numeric' ? 'active' : ''}`}
                  onClick={() => setCompletionStyle('numeric')}
                >
                  Teclado Numérico
                </button>
              </div>
            </div>

            {/* Meta Base */}
            <div className="form-group">
              <label className="form-label">Meta Diária</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input 
                  type="number" 
                  min="1" 
                  className="input-dark" 
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  placeholder="1"
                  required
                />
                <input 
                  type="text" 
                  className="input-dark" 
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  placeholder="vezes (ex: páginas, sessões)"
                  required
                />
              </div>
            </div>

            {/* Frequência */}
            <div className="form-group">
              <label className="form-label">Frequência da Meta (Dias da Semana)</label>
              <div className="weekdays-selector">
                {WEEKDAYS.map((w, idx) => {
                  const isSelected = selectedDays.includes(w.dayIndex);
                  return (
                    <button
                      type="button"
                      key={idx}
                      className={`weekday-circle-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleWeekdayToggle(w.dayIndex)}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Esforço & Prioridade com Classificação de Cores */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Prioridade da Atividade</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isSel = priority === opt.level;
                    return (
                      <button
                        key={opt.level}
                        type="button"
                        onClick={() => setPriority(opt.level)}
                        style={{
                          padding: '9px 8px',
                          borderRadius: '8px',
                          border: isSel ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)',
                          background: isSel ? opt.bg : 'var(--surface-elevated)',
                          color: isSel ? opt.color : 'var(--text-secondary)',
                          fontWeight: isSel ? 800 : 600,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                        {opt.level}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label">Nível de Esforço</label>
                <select className="input-dark" value={effort} onChange={(e) => setEffort(e.target.value)}>
                  <option value="Baixo">Baixo (1 pt)</option>
                  <option value="Médio">Médio (2 pts)</option>
                  <option value="Alto">Alto (3 pts)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setMode('choose')}>
                Voltar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>
                Criar Hábito Diário
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NOVO EVENTO FORM (REQUISITO 3: DATA E HORÁRIO EXPLÍCITOS) */}
        {mode === 'event' && (
          <form onSubmit={handleCreateEventSubmit}>
            <div className="form-group">
              <label className="form-label">Título do Evento / Atividade</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="ex: Prova Final de Sistemas Operacionais"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* DATA OBRIGATÓRIA (REQUISITO 3) */}
            <div className="form-group">
              <label className="form-label">
                <Calendar size={14} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-cyan)' }} />
                Data Marcada (Obrigatório)
              </label>
              <input 
                type="date" 
                className="input-dark"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>

            {/* TOGGLE DIA TODO */}
            <div className="form-group">
              <div className="toggle-switch-wrap">
                <span className="switch-label">Dia Todo (Sem horário específico)</span>
                <div 
                  className={`switch-track ${allDay ? 'on' : ''}`}
                  onClick={() => setAllDay(!allDay)}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>

            {/* SELETORES DE HORÁRIO INÍCIO E TÉRMINO (REQUISITO 3) */}
            {!allDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">
                    <Clock size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-indigo)' }} />
                    Horário de Início
                  </label>
                  <input 
                    type="time" 
                    className="input-dark"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">
                    <Clock size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--accent-indigo)' }} />
                    Horário de Término
                  </label>
                  <input 
                    type="time" 
                    className="input-dark"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* CATEGORIA DO EVENTO & CRIADOR */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Tema / Categoria</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => setShowCategoryCreator(!showCategoryCreator)}
                >
                  + Nova Categoria
                </button>
              </div>

              {showCategoryCreator && (
                <div className="card-native" style={{ background: 'var(--surface-elevated)', marginBottom: '12px', padding: '12px' }}>
                  <input 
                    type="text"
                    className="input-dark"
                    placeholder="Nome da categoria"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.82rem', marginBottom: '8px' }}
                  />
                  <button type="button" className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.78rem' }} onClick={handleCreateCategory}>
                    Criar e Selecionar
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tags.map((t) => (
                  <button
                    key={t.id || t.name}
                    type="button"
                    onClick={() => setEventCategory(t.name)}
                    className="tag-badge"
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      border: eventCategory === t.name ? `2px solid ${t.color}` : `1px solid ${t.color}40`,
                      background: t.bg,
                      color: t.color,
                      fontWeight: eventCategory === t.name ? 700 : 500
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Prioridade do Evento com Classificação de Cores */}
            <div className="form-group">
              <label className="form-label">Prioridade da Atividade</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const isSel = eventPriority === opt.level;
                  return (
                    <button
                      key={opt.level}
                      type="button"
                      onClick={() => setEventPriority(opt.level)}
                      style={{
                        padding: '9px 8px',
                        borderRadius: '8px',
                        border: isSel ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)',
                        background: isSel ? opt.bg : 'var(--surface-elevated)',
                        color: isSel ? opt.color : 'var(--text-secondary)',
                        fontWeight: isSel ? 800 : 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                      {opt.level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Localização & Anotações */}
            <div className="form-group">
              <label className="form-label">Localização (Física ou Link)</label>
              <input 
                type="text" 
                className="input-dark"
                placeholder="ex: Sala 304 - Bloco C ou Link Google Meet"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anotações e Detalhes</label>
              <textarea 
                className="input-dark"
                rows={2}
                placeholder="Lembretes, ementa, material necessário..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setMode('choose')}>
                Voltar
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1.5 }}>
                Agendar no Calendário
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
