import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  Plus,
  Minus
} from 'lucide-react';

const DEFAULT_TAG_STYLES = [
  { name: 'Faculdade', color: '#7C6FEF' },
  { name: 'Trabalho',  color: '#00C2D1' },
  { name: 'Saúde',     color: '#F24E6C' },
  { name: 'Pessoal',   color: '#2CC295' },
  { name: 'Casa',      color: '#F4C430' },
  { name: 'Leitura',   color: '#9B8CE8' }
];

const PRESET_PARTICIPANTS = [
  { id: 'p1', name: 'Lucas Dev', initials: 'LD', bg: '#211F38' },
  { id: 'p2', name: 'Ana Clara', initials: 'AC', bg: '#56548A' },
  { id: 'p3', name: 'Prof. Marcos', initials: 'PM', bg: '#059669' },
  { id: 'p4', name: 'Matheus Pro', initials: 'MP', bg: '#3B82F6' }
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

export function AddModal({ isOpen, onClose, onAddHabit, onAddEvent, tags = [] }) {
  // Abre direto em modo horizontal ('event' ou 'habit') com alternância rápida no topo
  const [mode, setMode] = useState('event'); // 'event' | 'habit'

  // Estados do Formulário de Hábitos
  const [habitTitle, setHabitTitle] = useState('');
  const [completionStyle, setCompletionStyle] = useState('quick');
  const [targetNumber, setTargetNumber] = useState(1);
  const [targetUnit, setTargetUnit] = useState('vezes');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [selectedCategory, setSelectedCategory] = useState(tags[0]?.name || 'Faculdade');
  const [effort, setEffort] = useState('Médio');
  const [priority, setPriority] = useState('Média');

  // Estados do Formulário de Eventos
  const todayStr = new Date().toISOString().split('T')[0];
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventEndDate, setEventEndDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [eventCategory, setEventCategory] = useState('Faculdade');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState('15 min antes');
  const [participantsText, setParticipantsText] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState(['p1', 'p2']);

  if (!isOpen) return null;

  // Mescla tags do usuário com as cores padrão do card Categorias/Temas
  const categoryList = tags.length > 0
    ? tags.map((t, i) => ({
        name: t.name,
        color: t.color || DEFAULT_TAG_STYLES[i % DEFAULT_TAG_STYLES.length].color
      }))
    : DEFAULT_TAG_STYLES;

  const handleWeekdayToggle = (dayIndex) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
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

    const foundTag = tags.find(t => t.name === selectedCategory);
    const newHabit = {
      id: `hab_${Date.now()}`,
      title: habitTitle.trim(),
      category: selectedCategory,
      iconName: 'CheckCircle2',
      target: Number(targetNumber) || 1,
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
      date: eventDate,
      endDate: eventEndDate || eventDate,
      allDay: false,
      startTime,
      endTime,
      category: eventCategory,
      location: location.trim(),
      description: notes.trim(),
      reminder,
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
    setPriority('Média');
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(18, 16, 36, 0.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* CARD EM FORMATO RETÂNGULO DEITADO (ADAPTÁVEL PARA CELULAR, TABLET E PC) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="ethos-modal-card"
      >
        {/* TOPO COMPACTO: SQUIRCLE #211F38 + TÍTULO + SELETOR PÍLULA (EVENTO | HÁBITO) + FECHAR */}
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
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#1A1B2F', margin: 0, lineHeight: 1.15 }}>
                {mode === 'event' ? 'Adicionar Novo Evento' : 'Novo Hábito Diário'}
              </h3>
              <span style={{ fontSize: '11px', color: '#5A5B75' }}>
                {mode === 'event' ? 'Compromisso sincronizado na agenda' : 'Rotina diária com meta e prioridade'}
              </span>
            </div>
          </div>

          {/* Alternador de modo (Evento / Hábito) no estilo pílula #DCDCE6 e #211F38 */}
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
                  padding: '5px 13px',
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
                  padding: '5px 13px',
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
        {/* MODO EVENTO — LAYOUT HORIZONTAL EM 2 COLUNAS (RETÂNGULO DEITADO)  */}
        {/* ================================================================= */}
        {mode === 'event' && (
          <form onSubmit={handleCreateEventSubmit}>
            <div className="ethos-modal-grid-2col">
              {/* COLUNA ESQUERDA: Título + Datas/Horas + Local/Descrição */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Título */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                    Título do Evento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Reunião de Planejamento"
                    value={eventTitle}
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

                {/* Datas e Horários em 2x2 compacto */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <Clock size={12} color="#5A5B75" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                      <Clock size={12} color="#5A5B75" />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Local e Descrição lado a lado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Local
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Sala 204, Meet..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '9px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#FFFFFF',
                        fontSize: '11.5px',
                        color: '#1A1B2F',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                      Descrição
                    </label>
                    <input
                      type="text"
                      placeholder="Pauta ou observação rápida..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '9px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#FFFFFF',
                        fontSize: '11.5px',
                        color: '#1A1B2F',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: Categorias / Temas + Lembretes e Participantes + Botões */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                {/* Categorias / Temas (Idêntico ao card Categorias / Temas) */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '5px' }}>
                    Categoria / Tema
                  </label>
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
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lembretes e Participantes */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                    Lembretes e Participantes
                  </label>
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D0D2E0',
                      borderRadius: '11px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Convidados ou lembrete..."
                        value={participantsText}
                        onChange={(e) => setParticipantsText(e.target.value)}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '11.5px', color: '#1A1B2F', outline: 'none' }}
                      />
                      <select
                        value={reminder}
                        onChange={(e) => setReminder(e.target.value)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#DCDCE6',
                          color: '#1A1B2F',
                          border: 'none',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="15 min antes">15 min antes</option>
                        <option value="30 min antes">30 min antes</option>
                        <option value="1 hora antes">1 hora antes</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {PRESET_PARTICIPANTS.map((person) => {
                          const isInc = selectedParticipants.includes(person.id);
                          return (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() => toggleParticipant(person.id)}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '7px',
                                border: 'none',
                                backgroundColor: isInc ? '#211F38' : '#DCDCE6',
                                color: isInc ? '#FFFFFF' : '#5A5B75',
                                fontSize: '9.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={person.name}
                            >
                              {person.initials}
                            </button>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 500 }}>
                        {selectedParticipants.length} selecionado(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação (#DCDCE6 e #211F38) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', paddingTop: '2px' }}>
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
                    Salvar Evento
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* MODO HÁBITO — LAYOUT HORIZONTAL EM 2 COLUNAS (RETÂNGULO DEITADO)  */}
        {/* ================================================================= */}
        {mode === 'habit' && (
          <form onSubmit={handleCreateHabitSubmit}>
            <div className="ethos-modal-grid-2col">
              {/* COLUNA ESQUERDA: Nome do Hábito + Meta Diária (- / +) + Dias da Semana */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                    Nome do Hábito
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ler 20 páginas, Meditação, Beber água..."
                    value={habitTitle}
                    onChange={(e) => setHabitTitle(e.target.value)}
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

                {/* Meta Diária no estilo Hidratação Diária (- e +) */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D2E0',
                    borderRadius: '11px',
                    padding: '9px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1B2F' }}>
                      Meta Diária: {targetNumber} {targetUnit}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#5A5B75' }}>
                      {targetNumber > 1 ? 'Incremento (+1 por clique)' : 'Conclusão rápida (1 clique)'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(1, Number(targetNumber) - 1);
                        setTargetNumber(next);
                        setCompletionStyle(next > 1 ? 'increment' : 'quick');
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        backgroundColor: '#DCDCE6',
                        color: '#1A1B2F',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const next = Number(targetNumber) + 1;
                        setTargetNumber(next);
                        setCompletionStyle('increment');
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Dias da Semana */}
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '4px' }}>
                    Dias da Semana
                  </label>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {WEEKDAYS.map((wd) => {
                      const isActive = selectedDays.includes(wd.dayIndex);
                      return (
                        <button
                          key={wd.dayIndex}
                          type="button"
                          onClick={() => handleWeekdayToggle(wd.dayIndex)}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isActive ? '#211F38' : '#DCDCE6',
                            color: isActive ? '#FFFFFF' : '#1A1B2F',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: Categoria / Tema + Prioridade/Esforço + Botões */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '5px' }}>
                    Categoria / Tema
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoryList.map((cat) => {
                      const isSel = selectedCategory === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setSelectedCategory(cat.name)}
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
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prioridade e Esforço */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '4px' }}>
                      Prioridade
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                              gap: '4px',
                              padding: '5px 6px',
                              borderRadius: '999px',
                              backgroundColor: isSel ? '#211F38' : '#FFFFFF',
                              color: isSel ? '#FFFFFF' : '#1A1B2F',
                              border: `1.5px solid ${isSel ? '#211F38' : opt.border}`,
                              fontSize: '10.5px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: opt.dot }} />
                            <span>{opt.level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '4px' }}>
                      Esforço
                    </label>
                    <select
                      value={effort}
                      onChange={(e) => setEffort(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '5.5px 8px',
                        borderRadius: '999px',
                        border: '1px solid #D0D2E0',
                        backgroundColor: '#FFFFFF',
                        fontSize: '11px',
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

                {/* Botões de Ação (#DCDCE6 e #211F38) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', paddingTop: '2px' }}>
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
