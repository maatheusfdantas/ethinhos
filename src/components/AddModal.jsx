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
  Tag
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Faculdade', label: 'Faculdade', icon: BookOpen },
  { id: 'Trabalho', label: 'Trabalho', icon: Bookmark },
  { id: 'Saúde', label: 'Saúde', icon: Dumbbell },
  { id: 'Pessoal', label: 'Pessoal', icon: Sparkles },
  { id: 'Casa', label: 'Casa', icon: Home },
  { id: 'Finanças', label: 'Finanças', icon: Activity },
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

export function AddModal({ isOpen, onClose, onAddHabit, onAddEvent, tags, onAddTag }) {
  // Mode: 'choose', 'habit', 'event'
  const [mode, setMode] = useState('choose');

  // Habit Form States
  const [habitTitle, setHabitTitle] = useState('');
  const [completionStyle, setCompletionStyle] = useState('quick'); // 'quick', 'numeric', 'steps'
  const [targetNumber, setTargetNumber] = useState('1');
  const [targetUnit, setTargetUnit] = useState('vezes');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Seg a Sex default
  const [selectedCategory, setSelectedCategory] = useState('Faculdade');
  const [effort, setEffort] = useState('Médio'); // US01: Baixo, Médio, Alto
  const [priority, setPriority] = useState('Média'); // US20: Alta, Média, Baixa
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id || 'tag_facul');

  // Event Form States
  const [eventTitle, setEventTitle] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [repeat, setRepeat] = useState('Semanal');
  const [alertTime, setAlertTime] = useState('15 minutos antes');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleWeekdayToggle = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  const handleCreateHabitSubmit = (e) => {
    e.preventDefault();
    if (!habitTitle.trim()) return;

    const newHabit = {
      id: `hab_${Date.now()}`,
      title: habitTitle.trim(),
      category: selectedCategory,
      iconName: selectedCategory,
      target: parseInt(targetNumber, 10) || 1,
      current: 0,
      unit: targetUnit.trim() || 'vezes',
      effort,
      priority,
      tagId: selectedTagId,
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
    if (!eventTitle.trim()) return;

    const newEvent = {
      id: `ev_${Date.now()}`,
      title: eventTitle.trim(),
      allDay,
      startTime: allDay ? '00:00' : startTime,
      endTime: allDay ? '23:59' : endTime,
      repeat,
      alertTime,
      location,
      notes,
      date: new Date().toISOString().split('T')[0]
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
  };

  const SelectedCategoryIcon = CATEGORIES.find(c => c.id === selectedCategory)?.icon || BookOpen;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="modal-header">
          <h2 className="modal-title">
            {mode === 'choose' && 'O que deseja adicionar?'}
            {mode === 'habit' && 'Novo Hábito'}
            {mode === 'event' && 'Novo Evento na Agenda'}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: CHOOSE OVERLAY */}
        {mode === 'choose' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', padding: '10px 0' }}>
            <button 
              className="card-native" 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onClick={() => setMode('habit')}
            >
              <div className="habit-category-box" style={{ background: 'rgba(0, 229, 255, 0.15)', color: 'var(--accent-cyan)' }}>
                <CheckCircle2 size={26} strokeWidth={2.4} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Novo Hábito / Meta
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Acompanhe rotinas diárias com estilo de conclusão, esforço e frequência.
                </p>
              </div>
            </button>

            <button 
              className="card-native" 
              style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onClick={() => setMode('event')}
            >
              <div className="habit-category-box" style={{ background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent-indigo)' }}>
                <Calendar size={26} strokeWidth={2.4} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Novo Evento
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Agende compromissos, aulas, reuniões ou provas com lembretes e horários.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* STEP 2: NOVO HÁBITO FORM */}
        {mode === 'habit' && (
          <form onSubmit={handleCreateHabitSubmit}>
            {/* Campo de texto escuro para o nome com o ícone da categoria selecionada ao lado */}
            <div className="form-group">
              <label className="form-label">Nome do Hábito</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="habit-category-box" style={{ width: '44px', height: '44px' }}>
                  <SelectedCategoryIcon size={22} />
                </div>
                <input 
                  type="text" 
                  className="input-dark" 
                  placeholder="ex: Leitura Profunda" 
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Estilo de Conclusão: Segmented Control */}
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
                <button
                  type="button"
                  className={`segmented-btn ${completionStyle === 'steps' ? 'active' : ''}`}
                  onClick={() => setCompletionStyle('steps')}
                >
                  Múltiplos Passos
                </button>
              </div>
            </div>

            {/* Meta Base */}
            <div className="form-group">
              <label className="form-label">Meta Base</label>
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
                  placeholder="vezes (ex: páginas, km)"
                  required
                />
              </div>
            </div>

            {/* Frequência da Meta: Seletores redondos de dias da semana (S, T, Q, Q, S, S, D) */}
            <div className="form-group">
              <label className="form-label">Frequência da Meta</label>
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

            {/* Categoria: Fila horizontal de ícones vetorizados em quadrados de cantos arredondados */}
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <div className="category-row-scroll">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      className={`category-icon-box ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <Icon size={20} />
                      <span className="category-icon-label">{cat.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* US01: Nível de Esforço & US20: Prioridade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Nível de Esforço (US01)</label>
                <select 
                  className="input-dark" 
                  value={effort} 
                  onChange={(e) => setEffort(e.target.value)}
                >
                  <option value="Baixo">Baixo (1 pt)</option>
                  <option value="Médio">Médio (2 pts)</option>
                  <option value="Alto">Alto (3 pts)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Prioridade (US20)</label>
                <select 
                  className="input-dark" 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>

            {/* US39: Tags de Cores */}
            <div className="form-group">
              <label className="form-label">Tag de Cor (US39)</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTagId(t.id)}
                    className="tag-badge"
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      border: selectedTagId === t.id ? `2px solid ${t.color}` : `1px solid ${t.color}40`,
                      background: t.bg,
                      color: t.color,
                      fontWeight: selectedTagId === t.id ? 700 : 500
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setMode('choose')}
              >
                Voltar
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flex: 1.5 }}
              >
                Criar Hábito
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NOVO EVENTO FORM */}
        {mode === 'event' && (
          <form onSubmit={handleCreateEventSubmit}>
            <div className="form-group">
              <label className="form-label">Título do Evento</label>
              <input 
                type="text" 
                className="input-dark" 
                placeholder="ex: Prova de Sistemas Operacionais"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Toggle Dia Todo */}
            <div className="form-group">
              <div className="toggle-switch-wrap">
                <span className="switch-label">Dia todo</span>
                <div 
                  className={`switch-track ${allDay ? 'on' : ''}`}
                  onClick={() => setAllDay(!allDay)}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>

            {/* Seletores escuros de horário (Início / Término) */}
            {!allDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="form-label">Início</label>
                  <input 
                    type="time" 
                    className="input-dark"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Término</label>
                  <input 
                    type="time" 
                    className="input-dark"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Repetição & Alertas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Repetição</label>
                <select 
                  className="input-dark"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                >
                  <option value="Nunca">Nunca</option>
                  <option value="Diário">Diário</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
                </select>
              </div>

              <div>
                <label className="form-label">Alertas</label>
                <select 
                  className="input-dark"
                  value={alertTime}
                  onChange={(e) => setAlertTime(e.target.value)}
                >
                  <option value="No horário">No horário</option>
                  <option value="15 minutos antes">15 min antes</option>
                  <option value="30 minutos antes">30 min antes</option>
                  <option value="1 hora antes">1 hora antes</option>
                </select>
              </div>
            </div>

            {/* Localização & Anotações */}
            <div className="form-group">
              <label className="form-label">Localização</label>
              <input 
                type="text" 
                className="input-dark"
                placeholder="ex: Sala 304 - Bloco C"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anotações</label>
              <textarea 
                className="input-dark"
                rows={3}
                placeholder="Observações importantes, links ou ementa..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setMode('choose')}
              >
                Voltar
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flex: 1.5 }}
              >
                Salvar Evento
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
