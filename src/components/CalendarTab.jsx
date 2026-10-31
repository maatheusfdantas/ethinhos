import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Check, 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Dumbbell,
  Calendar as CalendarIcon,
  MapPin,
  FileText,
  Bell,
  Users,
  X
} from 'lucide-react';
import { GoogleCalendarConnect } from './GoogleCalendarConnect';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAY_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

// Categorias com cores de bolinha/borda idênticas ao card "Categorias / Temas" e tons pastel para a grade
const EVENT_CATEGORIES = [
  { name: 'Faculdade', dotColor: '#7C6FEF', chipBg: '#EF867C', chipText: '#FFFFFF', bg: '#F3B6BE', border: '#E598A3', text: '#2A1820' },
  { name: 'Trabalho',  dotColor: '#00C2D1', chipBg: '#F4B860', chipText: '#FFFFFF', bg: '#B3C3F3', border: '#94AAE8', text: '#18223D' },
  { name: 'Saúde',     dotColor: '#F24E6C', chipBg: '#66C992', chipText: '#FFFFFF', bg: '#BAE4C9', border: '#96CFA9', text: '#163022' },
  { name: 'Pessoal',   dotColor: '#2CC295', chipBg: '#7C8CE8', chipText: '#FFFFFF', bg: '#C4BDE8', border: '#A89FDB', text: '#221D3A' },
  { name: 'Casa',      dotColor: '#F4C430', chipBg: '#6BC7C9', chipText: '#FFFFFF', bg: '#F7D9A8', border: '#E6C083', text: '#382912' },
  { name: 'Leitura',   dotColor: '#9B8CE8', chipBg: '#9B8CE8', chipText: '#FFFFFF', bg: '#C4BDE8', border: '#A89FDB', text: '#221D3A' }
];

const PRESET_PARTICIPANTS = [
  { id: 'p1', name: 'Lucas Dev', initials: 'LD', bg: '#4E67B8' },
  { id: 'p2', name: 'Ana Clara', initials: 'AC', bg: '#D96B78' },
  { id: 'p3', name: 'Prof. Marcos', initials: 'PM', bg: '#3BA386' },
  { id: 'p4', name: 'Matheus Pro', initials: 'MP', bg: '#6C5CE7' }
];

function getPaletteForCategory(cat = 'Trabalho', customColor = null, index = 0) {
  if (customColor) {
    return {
      bg: customColor,
      border: 'rgba(33, 31, 56, 0.18)',
      text: '#1A1B2F'
    };
  }
  const found = EVENT_CATEGORIES.find(c => c.name.toLowerCase() === String(cat).toLowerCase());
  if (found) return found;
  return EVENT_CATEGORIES[index % EVENT_CATEGORIES.length];
}

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayMonth(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

export function CalendarTab({ 
  events = [], 
  setEvents,
  habits = [], 
  setHabits,
  workouts = [], 
  onOpenAdd, 
  onToggleEvent,
  onAddEvent,
  onDeleteEvent,
  onSwitchTab,
  showToast
}) {
  // REQUISITO 2: Aba calendário sempre abre na visualização MENSAL ('month')
  const [viewMode, setViewMode] = useState('month'); // 'day' | 'week' | 'month'

  // Data de referência para navegação (avançar/voltar em qualquer visualização)
  const [cursorDate, setCursorDate] = useState(() => new Date());

  // REQUISITO 1: Nenhum menu de evento começa aberto sozinho
  const [openMenuId, setOpenMenuId] = useState(null);

  // =========================================================================
  // ESTADO DO MODAL LIQUID GLASS DE ADICIONAR / EDITAR EVENTO (NOVO DESIGN)
  // =========================================================================
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [evTitle, setEvTitle] = useState('');
  const [evStartDate, setEvStartDate] = useState(() => toISODate(new Date()));
  const [evEndDate, setEvEndDate] = useState(() => toISODate(new Date()));
  const [evStartTime, setEvStartTime] = useState('09:00');
  const [evEndTime, setEvEndTime] = useState('10:00');
  const [evCategory, setEvCategory] = useState('Faculdade');
  const [evCustomColor, setEvCustomColor] = useState('');
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [evLocation, setEvLocation] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evReminder, setEvReminder] = useState('15 min antes');
  const [evParticipantsText, setEvParticipantsText] = useState('');
  const [evSelectedParticipants, setEvSelectedParticipants] = useState(['p1', 'p2', 'p3']);

  // Eventos iniciais demonstrativos no mês atual
  const [localSeedEvents, setLocalSeedEvents] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return [
      { id: 'seed_1', title: 'Reunião de Equipe', category: 'Faculdade', date: `${y}-${m}-02`, endDate: `${y}-${m}-02`, startTime: '10:00', endTime: '11:00', location: 'Sala 204 / Meet', description: 'Alinhamento de entregas da sprint acadêmica.', participants: ['p1', 'p2'], completed: false },
      { id: 'seed_2', title: 'Reunião com Orientador', category: 'Faculdade', date: `${y}-${m}-03`, endDate: `${y}-${m}-03`, startTime: '09:30', endTime: '10:30', location: 'Gabinete 12', description: 'Revisão da metodologia do projeto.', participants: ['p3'], completed: false },
      { id: 'seed_3', title: 'Revisão de Código', category: 'Trabalho', date: `${y}-${m}-04`, endDate: `${y}-${m}-04`, startTime: '14:00', endTime: '16:00', location: 'Remoto / GitHub', description: 'Code review dos PRs da semana.', participants: ['p1', 'p4'], completed: false },
      { id: 'seed_4', title: 'Treino de Força (A)', category: 'Saúde', date: `${y}-${m}-05`, endDate: `${y}-${m}-05`, startTime: '18:00', endTime: '19:30', location: 'Academia', description: 'Foco em progressão de carga no supino.', participants: [], completed: false },
      { id: 'seed_5', title: "Ler 'Arquitetura Limpa'", category: 'Leitura', date: `${y}-${m}-06`, endDate: `${y}-${m}-06`, startTime: '16:00', endTime: '17:00', location: 'Biblioteca', description: 'Capítulos 12 a 15.', participants: [], completed: false },
      { id: 'seed_6', title: 'Planejamento de Sprint', category: 'Trabalho', date: `${y}-${m}-10`, endDate: `${y}-${m}-10`, startTime: '10:00', endTime: '11:30', location: 'Sala de Reuniões', description: 'Definição de metas quinzenais.', participants: ['p1', 'p2', 'p4'], completed: false },
      { id: 'seed_7', title: 'Entrega de Relatório', category: 'Faculdade', date: `${y}-${m}-14`, endDate: `${y}-${m}-14`, startTime: '09:00', endTime: '11:00', location: 'Portal Acadêmico', description: 'Envio da versão final em PDF.', participants: ['p2'], completed: false },
      { id: 'seed_8', title: 'Check-up Clínico', category: 'Saúde', date: `${y}-${m}-18`, endDate: `${y}-${m}-18`, startTime: '15:00', endTime: '16:00', location: 'Clínica Central', description: 'Exames de rotina anual.', participants: [], completed: false },
      { id: 'seed_9', title: 'Revisão Mensal de Metas', category: 'Pessoal', date: toISODate(now), endDate: toISODate(now), startTime: '11:00', endTime: '12:00', location: 'Home Office', description: 'Avaliar indicadores de vitalidade e hábitos.', participants: ['p1', 'p2', 'p3'], completed: false }
    ];
  });

  // Combina eventos reais do usuário + seeds locais (sem duplicar IDs)
  const combinedEvents = useMemo(() => {
    const userIds = new Set(events.map(e => e.id));
    return [...events, ...localSeedEvents.filter(se => !userIds.has(se.id))];
  }, [events, localSeedEvents]);

  // Abrir Modal para Criar Novo Evento em uma data específica
  const handleOpenNewEventModal = (targetDateISO) => {
    const dateStr = targetDateISO || toISODate(cursorDate);
    setEditingEventId(null);
    setEvTitle('');
    setEvStartDate(dateStr);
    setEvEndDate(dateStr);
    setEvStartTime('09:00');
    setEvEndTime('10:00');
    setEvCategory('Faculdade');
    setEvCustomColor('');
    setShowMoreCategories(false);
    setEvLocation('');
    setEvDescription('');
    setEvReminder('15 min antes');
    setEvParticipantsText('');
    setEvSelectedParticipants(['p1', 'p2', 'p3']);
    setIsEventModalOpen(true);
    setOpenMenuId(null);
  };

  // Abrir Modal para Editar Evento Existente
  const handleOpenEditEventModal = (ev) => {
    setEditingEventId(ev.id);
    setEvTitle(ev.title || '');
    setEvStartDate(ev.date || toISODate(cursorDate));
    setEvEndDate(ev.endDate || ev.date || toISODate(cursorDate));
    setEvStartTime(ev.startTime || '09:00');
    setEvEndTime(ev.endTime || '10:00');
    setEvCategory(ev.category || 'Trabalho');
    setEvCustomColor(ev.customColor || '');
    setShowMoreCategories(false);
    setEvLocation(ev.location || '');
    setEvDescription(ev.description || '');
    setEvReminder(ev.reminder || '15 min antes');
    setEvParticipantsText(ev.participantsText || '');
    setEvSelectedParticipants(ev.participants || ['p1', 'p2']);
    setIsEventModalOpen(true);
    setOpenMenuId(null);
  };

  // Salvar Novo Evento ou Edição
  const handleSaveEventModal = (e) => {
    e.preventDefault();
    if (!evTitle.trim()) return;

    const payload = {
      id: editingEventId || `ev_${Date.now()}`,
      title: evTitle.trim(),
      date: evStartDate,
      endDate: evEndDate || evStartDate,
      startTime: evStartTime,
      endTime: evEndTime,
      category: evCategory,
      customColor: evCustomColor,
      location: evLocation.trim(),
      description: evDescription.trim(),
      reminder: evReminder,
      participantsText: evParticipantsText.trim(),
      participants: evSelectedParticipants,
      allDay: false,
      completed: false
    };

    if (editingEventId) {
      if (String(editingEventId).startsWith('seed_')) {
        setLocalSeedEvents(prev => prev.map(item => item.id === editingEventId ? { ...item, ...payload } : item));
      } else if (setEvents) {
        setEvents(prev => prev.map(item => item.id === editingEventId ? { ...item, ...payload } : item));
      }
      showToast?.(`Evento "${payload.title}" atualizado com sucesso!`);
    } else {
      onAddEvent?.(payload);
      showToast?.(`Evento "${payload.title}" adicionado à agenda!`);
    }

    setIsEventModalOpen(false);
    setEditingEventId(null);
  };

  const toggleParticipantSelection = (pId) => {
    setEvSelectedParticipants(prev =>
      prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
    );
  };

  // =========================================================================
  // NAVEGAÇÃO DE DATAS (AVANÇAR / VOLTAR / HOJE) EM QUALQUER VIEW
  // =========================================================================
  const handleNavigate = (direction) => {
    setOpenMenuId(null);
    setCursorDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'day') {
        next.setDate(next.getDate() + direction);
      } else if (viewMode === 'week') {
        next.setDate(next.getDate() + direction * 7);
      } else {
        next.setMonth(next.getMonth() + direction);
      }
      return next;
    });
  };

  const handleGoToday = () => {
    setOpenMenuId(null);
    setCursorDate(new Date());
  };

  // =========================================================================
  // HANDLERS DE EVENTO (CONCLUIR E REMOVER)
  // =========================================================================
  const handleToggleEventItem = (ev) => {
    setOpenMenuId(null);
    const nextCompleted = !ev.completed;
    if (String(ev.id).startsWith('seed_')) {
      setLocalSeedEvents(prev => prev.map(item => item.id === ev.id ? { ...item, completed: nextCompleted } : item));
    } else {
      onToggleEvent?.(ev.id, nextCompleted);
    }
    showToast?.(nextCompleted ? `Evento "${ev.title}" concluído!` : `Evento "${ev.title}" reaberto.`);
  };

  const handleDeleteEventItem = (ev) => {
    setOpenMenuId(null);
    if (String(ev.id).startsWith('seed_')) {
      setLocalSeedEvents(prev => prev.filter(item => item.id !== ev.id));
    } else {
      onDeleteEvent?.(ev.id);
    }
    showToast?.(`Evento "${ev.title}" removido.`);
  };

  // =========================================================================
  // CÁLCULO DE DIAS PARA VISUALIZAÇÃO SEMANAL E MENSAL
  // =========================================================================
  const weekDays = useMemo(() => {
    const base = new Date(cursorDate);
    const day = base.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        dateObj: d,
        iso: toISODate(d),
        shortName: WEEKDAY_SHORT[d.getDay()],
        dayMonth: formatDayMonth(d),
        dayNumber: d.getDate(),
        dayOfWeek: d.getDay()
      };
    });
  }, [cursorDate]);

  const monthWeeks = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay();
    const offsetToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const gridStartDate = new Date(year, month, 1 - offsetToMonday);
    const totalDaysInMonth = lastDayOfMonth.getDate();
    const totalCells = Math.ceil((offsetToMonday + totalDaysInMonth) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStartDate);
      d.setDate(gridStartDate.getDate() + i);
      cells.push({
        dateObj: d,
        iso: toISODate(d),
        dayNumber: d.getDate(),
        isCurrentMonth: d.getMonth() === month,
        dayOfWeek: d.getDay()
      });
    }

    const rows = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(cells.slice(r, r + 7));
    }
    return rows;
  }, [cursorDate]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      const dName = WEEKDAY_FULL[cursorDate.getDay()];
      const dayNum = String(cursorDate.getDate()).padStart(2, '0');
      const mName = MONTH_NAMES[cursorDate.getMonth()];
      return `Agenda do Dia - ${dName}, ${dayNum} de ${mName} ${cursorDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const first = weekDays[0].dateObj;
      const last = weekDays[6].dateObj;
      const fDay = String(first.getDate()).padStart(2, '0');
      const lDay = String(last.getDate()).padStart(2, '0');
      const fMonth = MONTH_NAMES[first.getMonth()].slice(0, 3);
      const lMonth = MONTH_NAMES[last.getMonth()].slice(0, 3);
      return `Sua Agenda Semanal - ${fDay} ${fMonth} a ${lDay} ${lMonth} ${last.getFullYear()}`;
    }
    return `Sua Agenda Mensal - ${MONTH_NAMES[cursorDate.getMonth()]} ${cursorDate.getFullYear()}`;
  }, [viewMode, cursorDate, weekDays]);

  const todayISO = toISODate(new Date());
  const cursorISO = toISODate(cursorDate);

  // Renderizador de Card de Evento Pastel
  const renderEventCard = (ev, idx = 0, compact = false) => {
    const palette = getPaletteForCategory(ev.category, ev.customColor, idx);
    const isMenuOpen = openMenuId === ev.id;
    const timeLabel = ev.allDay ? 'Dia Todo' : `${ev.startTime || '09:00'}${ev.endTime ? ` - ${ev.endTime}` : ''}`;

    return (
      <div
        key={ev.id}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: palette.bg,
          border: `1px solid ${palette.border}`,
          borderRadius: compact ? '10px' : '12px',
          padding: compact ? '7px 9px' : '10px 11px',
          color: palette.text,
          fontSize: compact ? '11px' : '11.5px',
          lineHeight: 1.3,
          boxShadow: '0 3px 8px rgba(20, 18, 40, 0.06)',
          opacity: ev.completed ? 0.65 : 1,
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
          <div
            onClick={() => handleToggleEventItem(ev)}
            style={{
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: ev.completed ? 'line-through' : 'none',
              wordBreak: 'break-word',
              flex: 1
            }}
            title="Clique para marcar/desmarcar conclusão"
          >
            {ev.title}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(isMenuOpen ? null : ev.id);
            }}
            style={{
              background: 'rgba(255,255,255,0.45)',
              border: 'none',
              borderRadius: '6px',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: palette.text,
              cursor: 'pointer',
              flexShrink: 0,
              padding: 0
            }}
            title="Opções do evento"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>

        <div style={{ fontWeight: 500, opacity: 0.85, marginTop: '2px', fontSize: compact ? '10px' : '11px' }}>
          ({ev.category || 'Geral'}) {ev.location ? `• ${ev.location}` : ''}
        </div>
        <div style={{ fontWeight: 600, marginTop: '2px', fontSize: compact ? '10px' : '10.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{timeLabel}</span>
          {ev.completed && <Check size={11} strokeWidth={3} />}
        </div>

        {/* MENU POPOVER LIMPO: Concluir, Editar, Remover */}
        {isMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '26px',
              right: '6px',
              zIndex: 60,
              backgroundColor: '#1E1D32',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '132px',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleEventItem(ev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 9px',
                border: 'none',
                borderRadius: '8px',
                background: 'transparent',
                color: '#E2E4F0',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Check size={12} color="#34D399" />
              <span>{ev.completed ? 'Reabrir' : 'Concluir'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenEditEventModal(ev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 9px',
                border: 'none',
                borderRadius: '8px',
                background: 'transparent',
                color: '#E2E4F0',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Edit2 size={12} color="#93C5FD" />
              <span>Editar</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteEventItem(ev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '6px 9px',
                border: 'none',
                borderRadius: '8px',
                background: 'transparent',
                color: '#FCA5A5',
                fontSize: '11.5px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Trash2 size={12} color="#F87171" />
              <span>Remover</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={() => setOpenMenuId(null)}
      style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}
    >
      {/* ================================================================== */}
      {/* CARD PRINCIPAL DO CALENDÁRIO (MENSAL, SEMANAL E DIA)               */}
      {/* ================================================================== */}
      <div
        style={{
          backgroundColor: 'rgba(235, 235, 244, 0.56)',
          backdropFilter: 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          borderRadius: '26px',
          overflow: 'hidden',
          boxShadow: '0 14px 36px rgba(20, 18, 40, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.68)'
        }}
      >
        {/* TOP DARK PLUM BANNER COM NAVEGAÇÃO (< Hoje >) E SELETOR (Dia | Semanal | Mensal) */}
        <div
          style={{
            backgroundColor: '#211F38',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleNavigate(-1)}
                title="Período anterior"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={handleGoToday}
                title="Ir para Hoje"
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#E2E4F0',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => handleNavigate(1)}
                title="Próximo período"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <h2 style={{ fontSize: '17.5px', fontWeight: 600, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>
              {headerTitle}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '3px',
                borderRadius: '999px'
              }}
            >
              {[
                { id: 'day', label: 'Dia' },
                { id: 'week', label: 'Semanal' },
                { id: 'month', label: 'Mensal' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setViewMode(tab.id);
                    setOpenMenuId(null);
                  }}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: viewMode === tab.id ? '#56548A' : 'transparent',
                    color: viewMode === tab.id ? '#FFFFFF' : '#C5C7DE',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Botão Isolado OAuth 2.0: "Conectar com o Google" */}
            <GoogleCalendarConnect />

            <button
              type="button"
              onClick={() => handleOpenNewEventModal(cursorISO)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.22)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={14} />
              <span>Novo Evento</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* MODO 1: VISUALIZAÇÃO MENSAL (PADRÃO AO ABRIR)                    */}
        {/* ================================================================ */}
        {viewMode === 'month' && (
          <div className="overflow-x-auto">
            <div className="ethos-calendar-grid-inner">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid #D5D6E0',
                  backgroundColor: 'rgba(235, 235, 242, 0.75)'
                }}
              >
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dayLabel, idx) => (
                  <div
                    key={dayLabel}
                    style={{
                      padding: '11px 8px',
                      textAlign: 'center',
                      borderRight: idx < 6 ? '1px solid #D5D6E0' : 'none',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#1A1B2F'
                    }}
                  >
                    {dayLabel}
                  </div>
                ))}
              </div>

              {monthWeeks.map((weekRow, rIdx) => (
                <div
                  key={`row_${rIdx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    borderBottom: rIdx < monthWeeks.length - 1 ? '1px solid #D5D6E0' : 'none',
                    minHeight: '126px'
                  }}
                >
                  {weekRow.map((cell, cIdx) => {
                    const dayEvents = combinedEvents.filter(ev => ev.date === cell.iso);
                    const isToday = cell.iso === todayISO;
                    const isSelected = cell.iso === cursorISO;

                    return (
                      <div
                        key={cell.iso}
                        onClick={() => {
                          setCursorDate(cell.dateObj);
                          setOpenMenuId(null);
                        }}
                        style={{
                          borderRight: cIdx < 6 ? '1px solid #D5D6E0' : 'none',
                          padding: '8px',
                          backgroundColor: isToday
                            ? 'rgba(166, 180, 232, 0.22)'
                            : isSelected
                            ? 'rgba(255, 255, 255, 0.45)'
                            : cell.isCurrentMonth
                            ? 'rgba(244, 244, 248, 0.48)'
                            : 'rgba(220, 220, 230, 0.28)',
                          opacity: cell.isCurrentMonth ? 1 : 0.55,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNewEventModal(cell.iso);
                            }}
                            title={`Adicionar evento em ${cell.iso}`}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: 'rgba(33, 31, 56, 0.07)',
                              color: '#4E506B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            <Plus size={11} />
                          </button>

                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setCursorDate(cell.dateObj);
                              setViewMode('day');
                            }}
                            title="Ver agenda detalhada deste dia"
                            style={{
                              fontSize: '12px',
                              fontWeight: isToday ? 800 : 600,
                              color: isToday ? '#FFFFFF' : '#1A1B2F',
                              backgroundColor: isToday ? '#211F38' : 'transparent',
                              width: isToday ? '24px' : 'auto',
                              height: isToday ? '24px' : 'auto',
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: isToday ? 0 : '0 2px'
                            }}
                          >
                            {cell.dayNumber}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {dayEvents.map((ev, idx) => renderEventCard(ev, idx, true))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODO 2: VISUALIZAÇÃO SEMANAL                                     */}
        {/* ================================================================ */}
        {viewMode === 'week' && (
          <div className="overflow-x-auto">
            <div className="ethos-calendar-grid-inner">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  borderBottom: '1px solid #D5D6E0',
                  backgroundColor: 'rgba(235, 235, 242, 0.75)'
                }}
              >
                {weekDays.map((col, idx) => {
                  const isToday = col.iso === todayISO;
                  return (
                    <div
                      key={col.iso}
                      onClick={() => {
                        setCursorDate(col.dateObj);
                        setViewMode('day');
                      }}
                      title="Clique para abrir a visualização deste dia"
                      style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        borderRight: idx < 6 ? '1px solid #D5D6E0' : 'none',
                        backgroundColor: isToday ? 'rgba(166, 180, 232, 0.35)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1B2F' }}>
                        {col.shortName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5A5B75', fontWeight: 600, marginTop: '2px' }}>
                        {col.dayMonth}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  minHeight: '390px',
                  backgroundColor: 'rgba(244, 244, 248, 0.52)'
                }}
              >
                {weekDays.map((col, idx) => {
                  const dayEvents = combinedEvents.filter(ev => ev.date === col.iso);
                  const dayWorkouts = workouts.filter(w => (w.scheduledDays || []).includes(col.dayOfWeek));

                  return (
                    <div
                      key={col.iso}
                      style={{
                        borderRight: idx < 6 ? '1px solid #D5D6E0' : 'none',
                        padding: '10px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      {dayEvents.map((ev, eIdx) => renderEventCard(ev, eIdx, false))}

                      {dayWorkouts.map((wo) => (
                        <div
                          key={`${wo.id}_${col.iso}`}
                          onClick={() => onSwitchTab?.('workouts')}
                          style={{
                            backgroundColor: '#BAE4C9',
                            border: '1px solid #96CFA9',
                            borderRadius: '11px',
                            padding: '9px 10px',
                            color: '#163022',
                            fontSize: '11px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}
                          title="Ir para aba Musculação & Treino"
                        >
                          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Dumbbell size={11} />
                            <span>{wo.name}</span>
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>
                            (Treino • {wo.scheduledTime || '18:30'})
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleOpenNewEventModal(col.iso)}
                        style={{
                          marginTop: 'auto',
                          padding: '6px',
                          borderRadius: '8px',
                          border: '1px dashed #B8B9CC',
                          backgroundColor: 'transparent',
                          color: '#5A5B75',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={12} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MODO 3: VISUALIZAÇÃO DO DIA                                      */}
        {/* ================================================================ */}
        {viewMode === 'day' && (() => {
          const dayEvents = combinedEvents
            .filter(ev => ev.date === cursorISO)
            .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
          const dayWorkouts = workouts.filter(w => (w.scheduledDays || []).includes(cursorDate.getDay()));

          return (
            <div className="ethos-day-view-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                    Compromissos de {formatDayMonth(cursorDate)} ({dayEvents.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleOpenNewEventModal(cursorISO)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '999px',
                      backgroundColor: '#211F38',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Plus size={13} />
                    <span>Novo Compromisso no Dia</span>
                  </button>
                </div>

                {dayEvents.length === 0 ? (
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.55)',
                      borderRadius: '18px',
                      padding: '32px 20px',
                      textAlign: 'center',
                      border: '1px dashed #B8B9CC'
                    }}
                  >
                    <CalendarIcon size={26} color="#6E708E" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1B2F' }}>
                      Nenhum compromisso agendado para este dia
                    </div>
                    <p style={{ fontSize: '12px', color: '#5A5B75', margin: '4px 0 14px' }}>
                      Use os botões acima para navegar entre datas ou adicionar um novo evento.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenNewEventModal(cursorISO)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '999px',
                        backgroundColor: '#56548A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Criar Compromisso neste Dia
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {dayEvents.map((ev, idx) => {
                      const palette = getPaletteForCategory(ev.category, ev.customColor, idx);
                      return (
                        <div
                          key={ev.id}
                          style={{
                            backgroundColor: palette.bg,
                            border: `1px solid ${palette.border}`,
                            borderRadius: '16px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            color: palette.text,
                            opacity: ev.completed ? 0.65 : 1
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleEventItem(ev)}
                              style={{
                                width: '22px',
                                height: '22px',
                                marginTop: '2px',
                                borderRadius: '6px',
                                border: '1.5px solid rgba(0,0,0,0.3)',
                                backgroundColor: ev.completed ? '#211F38' : 'rgba(255,255,255,0.75)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0,
                                flexShrink: 0
                              }}
                            >
                              {ev.completed && <Check size={13} strokeWidth={3} />}
                            </button>

                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14.5px', fontWeight: 700, textDecoration: ev.completed ? 'line-through' : 'none' }}>
                                {ev.title}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.88, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                                <span>Categoria: <strong>{ev.category || 'Geral'}</strong></span>
                                <span>•</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                  <Clock size={11} />
                                  {ev.allDay ? 'Dia Todo' : `${ev.startTime || '09:00'} - ${ev.endTime || '10:00'}`}
                                </span>
                                {ev.location && (
                                  <>
                                    <span>•</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                      <MapPin size={11} />
                                      {ev.location}
                                    </span>
                                  </>
                                )}
                              </div>
                              {ev.description && (
                                <div style={{ fontSize: '11.5px', opacity: 0.82, marginTop: '4px' }}>
                                  {ev.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditEventModal(ev)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'rgba(255,255,255,0.55)',
                                color: '#1A1B2F',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={12} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEventItem(ev)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'rgba(239, 68, 68, 0.16)',
                                color: '#7F1D1D',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Remover</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna Direita da Visualização do Dia: Treinos Programados */}
              <div
                style={{
                  backgroundColor: 'rgba(255,255,255,0.52)',
                  borderRadius: '20px',
                  padding: '18px',
                  border: '1px solid rgba(255,255,255,0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1A1B2F', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Dumbbell size={16} color="#56548A" />
                  <span>Treinos de {WEEKDAY_FULL[cursorDate.getDay()]}</span>
                </div>

                {dayWorkouts.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#5A5B75', margin: 0 }}>
                    Nenhuma ficha de musculação programada para {WEEKDAY_FULL[cursorDate.getDay()]}.
                  </p>
                ) : (
                  dayWorkouts.map((wo) => (
                    <div
                      key={wo.id}
                      style={{
                        backgroundColor: '#211F38',
                        color: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{wo.name}</div>
                        <div style={{ fontSize: '11px', color: '#A9ABC6', marginTop: '2px' }}>
                          {wo.exercises?.length || 0} exercícios • Horário: {wo.scheduledTime || '18:30'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSwitchTab?.('workouts')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          backgroundColor: '#56548A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Abrir Treino
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ================================================================== */}
      {/* MODAL EM FORMATO RETÂNGULO DEITADO (PORTAL NO DOCUMENT.BODY)       */}
      {/* ================================================================== */}
      {isEventModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setIsEventModalOpen(false)}
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
            {/* Card Principal em formato Retângulo Deitado (Horizontal no Tablet/PC, Rolável no Celular) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="ethos-modal-card"
            >
            {/* CABEÇALHO COMPACTO */}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <CalendarIcon size={18} color="#38BDF8" />
                </div>

                <div>
                  <h2 style={{ fontSize: '15.5px', fontWeight: 700, color: '#1A1B2F', margin: 0, lineHeight: 1.15 }}>
                    {editingEventId ? 'Editar Evento' : 'Adicionar Novo Evento'}
                  </h2>
                  <p style={{ fontSize: '11px', color: '#5A5B75', margin: '2px 0 0 0', fontWeight: 500 }}>
                    Compromisso sincronizado na agenda
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                title="Fechar"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: '#DCDCE6',
                  color: '#211F38',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveEventModal}>
              <div className="ethos-modal-grid-2col">
                {/* COLUNA ESQUERDA: Título + Datas/Horas + Local/Descrição */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* 1. TÍTULO DO EVENTO */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                      Título do Evento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Reunião de Planejamento"
                      value={evTitle}
                      onChange={(e) => setEvTitle(e.target.value)}
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

                  {/* 2. GRADE 2x2 COMPACTA: DATA INÍCIO / HORA INÍCIO / DATA FIM / HORA FIM */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                        Data Início
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                        <CalendarIcon size={12} color="#5A5B75" style={{ flexShrink: 0 }} />
                        <input
                          type="date"
                          value={evStartDate}
                          onChange={(e) => {
                            setEvStartDate(e.target.value);
                            if (!evEndDate || evEndDate < e.target.value) setEvEndDate(e.target.value);
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
                        <Clock size={12} color="#5A5B75" style={{ flexShrink: 0 }} />
                        <input
                          type="time"
                          value={evStartTime}
                          onChange={(e) => setEvStartTime(e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                        Data Fim
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                        <CalendarIcon size={12} color="#5A5B75" style={{ flexShrink: 0 }} />
                        <input
                          type="date"
                          value={evEndDate}
                          onChange={(e) => setEvEndDate(e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                        Hora Fim
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 9px', borderRadius: '9px', backgroundColor: '#FFFFFF', border: '1px solid #D0D2E0' }}>
                        <Clock size={12} color="#5A5B75" style={{ flexShrink: 0 }} />
                        <input
                          type="time"
                          value={evEndTime}
                          onChange={(e) => setEvEndTime(e.target.value)}
                          style={{ border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 600, color: '#1A1B2F', width: '100%', outline: 'none' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. LOCAL E DESCRIÇÃO LADO A LADO */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: '#5A5B75', marginBottom: '3px' }}>
                        Local
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Sala 204, Meet..."
                        value={evLocation}
                        onChange={(e) => setEvLocation(e.target.value)}
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
                        value={evDescription}
                        onChange={(e) => setEvDescription(e.target.value)}
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

                {/* COLUNA DIREITA: Categoria / Tema + Lembretes e Participantes + Botões */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                  {/* 4. CATEGORIA / TEMA */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A5B75' }}>
                        Categoria / Tema
                      </label>

                      <label
                        title="Personalizar cor do card na agenda"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#DCDCE6',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#211F38',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="color"
                          value={evCustomColor || '#B3C3F3'}
                          onChange={(e) => setEvCustomColor(e.target.value)}
                          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
                        />
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: evCustomColor || 'linear-gradient(135deg, #7C6FEF, #00C2D1, #F24E6C)'
                          }}
                        />
                        Cor Card
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {EVENT_CATEGORIES.map((cat) => {
                        const isSelected = evCategory === cat.name;
                        const dotColor = cat.dotColor || '#7C6FEF';
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setEvCategory(cat.name);
                              setEvCustomColor('');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              backgroundColor: isSelected ? '#211F38' : '#FFFFFF',
                              borderRadius: '999px',
                              padding: '4px 10px',
                              border: `1.5px solid ${isSelected ? '#211F38' : dotColor}`,
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isSelected ? '#FFFFFF' : '#1A1B2F',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: dotColor
                              }}
                            />
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. LEMBRETES E PARTICIPANTES */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#5A5B75', marginBottom: '4px' }}>
                      Lembretes e Participantes
                    </label>

                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '11px',
                        padding: '8px 10px',
                        border: '1px solid #D0D2E0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          placeholder="Convidados ou lembrete..."
                          value={evParticipantsText}
                          onChange={(e) => setEvParticipantsText(e.target.value)}
                          style={{
                            flex: 1,
                            border: 'none',
                            background: 'transparent',
                            fontSize: '11.5px',
                            color: '#1A1B2F',
                            outline: 'none'
                          }}
                        />

                        <select
                          value={evReminder}
                          onChange={(e) => setEvReminder(e.target.value)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor: '#DCDCE6',
                            color: '#211F38',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="15 min antes">15 min antes</option>
                          <option value="30 min antes">30 min antes</option>
                          <option value="1 hora antes">1 hora antes</option>
                          <option value="1 dia antes">1 dia antes</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {PRESET_PARTICIPANTS.map((person) => {
                            const isIncluded = evSelectedParticipants.includes(person.id);
                            return (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() => toggleParticipantSelection(person.id)}
                                title={`${person.name} (${isIncluded ? 'Incluído' : 'Clique para incluir'})`}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '7px',
                                  backgroundColor: isIncluded ? '#211F38' : '#DCDCE6',
                                  color: isIncluded ? '#FFFFFF' : '#5A5B75',
                                  border: 'none',
                                  fontSize: '9.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {person.initials}
                              </button>
                            );
                          })}
                        </div>

                        <span style={{ fontSize: '10.5px', color: '#5A5B75', fontWeight: 500 }}>
                          {evSelectedParticipants.length} participante(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 6. BOTÕES DE AÇÃO (#DCDCE6 E #211F38) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px', paddingTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setIsEventModalOpen(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#DCDCE6',
                        color: '#211F38',
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
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
