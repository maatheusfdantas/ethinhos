import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings,
  X,
  Layers,
  Users,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Bookmark,
  Dumbbell,
  Home,
  Gamepad2,
  Briefcase,
  Code,
  ShieldCheck,
  Radio,
  Mail
} from 'lucide-react';

const ICON_OPTIONS = [
  { id: 'BookOpen', label: 'Estudos', Icon: BookOpen },
  { id: 'Bookmark', label: 'Trabalho', Icon: Bookmark },
  { id: 'Dumbbell', label: 'Saúde', Icon: Dumbbell },
  { id: 'Sparkles', label: 'Pessoal', Icon: Sparkles },
  { id: 'Home', label: 'Casa', Icon: Home },
  { id: 'Gamepad2', label: 'Lazer', Icon: Gamepad2 },
  { id: 'Briefcase', label: 'Projetos', Icon: Briefcase },
  { id: 'Code', label: 'Tech', Icon: Code }
];

const COLOR_OPTIONS = [
  { name: 'Índigo', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)' },
  { name: 'Ciano', color: '#00e5ff', bg: 'rgba(0, 229, 255, 0.15)' },
  { name: 'Rosa', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  { name: 'Esmeralda', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  { name: 'Âmbar', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  { name: 'Violeta', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' }
];

export function CategoryConfigModal({
  isOpen,
  category,
  onClose,
  onSaveConfig,
  onTriggerSharedPomodoro
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#818cf8');
  const [bg, setBg] = useState('rgba(129, 140, 248, 0.15)');
  const [icon, setIcon] = useState('BookOpen');

  // Capacidades modulares (Passo B)
  const [hasSubclasses, setHasSubclasses] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Tela Dedicada de Sub-classes (Tabela Subclasses)
  const [subclasses, setSubclasses] = useState([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubPriority, setNewSubPriority] = useState('Alta');
  const [newSubHours, setNewSubHours] = useState('');

  // Membros Colaborativos (Tabela Category_Members)
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');

  // Estado de erro da Restrição Antibug
  const [antiBugError, setAntiBugError] = useState('');
  const subclassInputRef = useRef(null);

  useEffect(() => {
    if (category && isOpen) {
      setName(category.name || '');
      setColor(category.color || '#818cf8');
      setBg(category.bg || 'rgba(129, 140, 248, 0.15)');
      setIcon(category.icon || 'Bookmark');
      setHasSubclasses(Boolean(category.has_subclasses));
      setIsShared(Boolean(category.is_shared));
      setSubclasses(Array.isArray(category.subclasses) ? [...category.subclasses] : []);
      setMembers(Array.isArray(category.members) ? [...category.members] : []);
      setNewSubName('');
      setNewSubHours('');
      setMemberEmail('');
      setMemberName('');
      setAntiBugError('');
    }
  }, [category, isOpen]);

  if (!isOpen || !category || typeof document === 'undefined') return null;

  // Passo B: Ao ativar has_subclasses, direciona obrigatoriamente para o cadastro de Sub-classes
  const handleToggleSubclasses = () => {
    const nextVal = !hasSubclasses;
    setHasSubclasses(nextVal);
    setAntiBugError('');
    if (nextVal) {
      setTimeout(() => {
        subclassInputRef.current?.focus();
      }, 80);
    }
  };

  const handleAddSubclass = (e) => {
    e?.preventDefault();
    const cleanName = newSubName.trim();
    if (!cleanName) return;

    if (subclasses.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      setAntiBugError(`A sub-classe "${cleanName}" já está cadastrada nesta categoria.`);
      return;
    }

    const newItem = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category_id: category.id,
      name: cleanName,
      priority: newSubPriority,
      hours: Math.max(0, Number(newSubHours) || 0)
    };

    setSubclasses((prev) => [...prev, newItem]);
    setNewSubName('');
    setNewSubHours('');
    setAntiBugError('');
    subclassInputRef.current?.focus();
  };

  const handleRemoveSubclass = (subId) => {
    const nextList = subclasses.filter((s) => s.id !== subId);
    setSubclasses(nextList);
    if (hasSubclasses && nextList.length === 0) {
      setAntiBugError(
        'Restrição Antibug: Você removeu todas as matérias/sub-classes. Cadastre ao menos 1 item ou desative o interruptor de Sub-classes.'
      );
    }
  };

  const handleAddMember = (e) => {
    e?.preventDefault();
    const cleanEmail = memberEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    if (members.some((m) => (m.email || '').toLowerCase() === cleanEmail)) {
      return;
    }

    const derivedName =
      memberName.trim() ||
      cleanEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const newMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category_id: category.id,
      user_id: `usr_${cleanEmail.split('@')[0]}`,
      email: cleanEmail,
      name: derivedName,
      role: 'collaborator'
    };

    setMembers((prev) => [...prev, newMember]);
    setMemberEmail('');
    setMemberName('');
  };

  const handleRemoveMember = (memId) => {
    setMembers((prev) => prev.filter((m) => m.id !== memId));
  };

  const handleSave = () => {
    // RESTRIÇÃO ANTIBUG OBRIGATÓRIA (Passo B):
    // Impede que has_subclasses fique ativo sem sub-classes cadastradas
    if (hasSubclasses && subclasses.length === 0) {
      setAntiBugError(
        'Restrição Antibug Ativa: Não é permitido habilitar Sub-classes com a lista vazia. Cadastre pelo menos 1 matéria/sub-classe (ex: Cálculo, Redes) abaixo antes de salvar!'
      );
      subclassInputRef.current?.focus();
      return;
    }

    const updatedCategory = {
      ...category,
      name: name.trim() || category.name,
      color,
      bg,
      icon,
      has_subclasses: Boolean(hasSubclasses && subclasses.length > 0),
      is_shared: Boolean(isShared),
      subclasses: hasSubclasses ? subclasses : subclasses,
      members: isShared ? members : members
    };

    onSaveConfig?.(updatedCategory);
    onClose?.();
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(15, 14, 30, 0.65)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ECECF4',
          borderRadius: '26px',
          padding: '24px',
          color: '#1A1B2F',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 24px 60px rgba(15, 14, 30, 0.4)'
        }}
      >
        {/* HEADER DO PAINEL DE CONFIGURAÇÃO AVANÇADA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: '16px',
            marginBottom: '18px',
            borderBottom: '1px solid rgba(33, 31, 56, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '13px',
                backgroundColor: '#211F38',
                color: color || '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 16px rgba(33, 31, 56, 0.22)'
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1A1B2F', margin: 0 }}>
                  Configuração Avançada: {name || category.name}
                </h3>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: '999px',
                    backgroundColor: hasSubclasses || isShared ? '#211F38' : '#DCDCE6',
                    color: hasSubclasses || isShared ? '#6EE7B7' : '#5A5B75'
                  }}
                >
                  {hasSubclasses || isShared ? 'Categoria Modular Avançada' : 'Categoria Básica'}
                </span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#5A5B75' }}>
                Separação estrita entre Rótulo e Capacidades (Sub-classes & Modo Colaborativo)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: '#DCDCE6',
              color: '#1A1B2F',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* SEÇÃO 1: RÓTULO BÁSICO (NOME, COR E ÍCONE) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            marginBottom: '16px',
            border: '1px solid #DFDFE8'
          }}
        >
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#5A5B75', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            1. O Núcleo (Rótulo Visual da Categoria)
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5B75', marginBottom: '4px' }}>
                Nome da Categoria
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1A1B2F',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5B75', marginBottom: '4px' }}>
                Cor do Rótulo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {COLOR_OPTIONS.map((pal) => (
                  <button
                    key={pal.color}
                    type="button"
                    onClick={() => {
                      setColor(pal.color);
                      setBg(pal.bg);
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: pal.color,
                      border: color === pal.color ? '2.5px solid #1A1B2F' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                    title={pal.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5B75', marginBottom: '6px' }}>
              Ícone da Área de Foco
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {ICON_OPTIONS.map((item) => {
                const IconComp = item.Icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 11px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #211F38' : '1px solid #D5D6E2',
                      backgroundColor: isSelected ? '#211F38' : '#F6F6FA',
                      color: isSelected ? '#FFFFFF' : '#1A1B2F',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <IconComp size={13} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: INTERRUPTORES DE CAPACIDADES (FEATURE TOGGLES - PASSO B) */}
        <div
          style={{
            backgroundColor: '#211F38',
            borderRadius: '20px',
            padding: '18px',
            color: '#FFFFFF',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#A9ABC6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              2. Interruptores de Capacidade (Feature Toggles)
            </span>
            <span style={{ fontSize: '11px', color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ShieldCheck size={14} /> Restrição Antibug Ativa
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {/* Toggle 1: Habilitar Sub-classes / Matérias */}
            <div
              onClick={handleToggleSubclasses}
              style={{
                backgroundColor: hasSubclasses ? 'rgba(129, 140, 248, 0.18)' : '#2C2A4A',
                border: hasSubclasses ? '1.5px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: hasSubclasses ? '#818cf8' : 'rgba(255,255,255,0.08)',
                    color: hasSubclasses ? '#1A1B2F' : '#C5C7DE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    Habilitar Sub-classes / Matérias
                  </div>
                  <div style={{ fontSize: '11px', color: '#A9ABC6' }}>
                    Ex: Cálculo, Redes de Computadores, S.O.
                  </div>
                </div>
              </div>

              {/* Switch Visual */}
              <div
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '999px',
                  backgroundColor: hasSubclasses ? '#34D399' : 'rgba(255,255,255,0.18)',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: hasSubclasses ? 'flex-end' : 'flex-start',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>

            {/* Toggle 2: Habilitar Compartilhamento / Colaboração */}
            <div
              onClick={() => setIsShared(!isShared)}
              style={{
                backgroundColor: isShared ? 'rgba(56, 189, 248, 0.18)' : '#2C2A4A',
                border: isShared ? '1.5px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: isShared ? '#38BDF8' : 'rgba(255,255,255,0.08)',
                    color: isShared ? '#1A1B2F' : '#C5C7DE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    Habilitar Compartilhamento
                  </div>
                  <div style={{ fontSize: '11px', color: '#A9ABC6' }}>
                    Círculo colaborativo e Pomodoro em equipe
                  </div>
                </div>
              </div>

              {/* Switch Visual */}
              <div
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '999px',
                  backgroundColor: isShared ? '#38BDF8' : 'rgba(255,255,255,0.18)',
                  padding: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isShared ? 'flex-end' : 'flex-start',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ALERTA DE RESTRIÇÃO ANTIBUG SE HOUVER */}
        {antiBugError && (
          <div
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.14)',
              border: '1.5px solid #F43F5E',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#9F1239',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <AlertTriangle size={18} color="#E11D48" style={{ flexShrink: 0 }} />
            <span>{antiBugError}</span>
          </div>
        )}

        {/* SEÇÃO 3: TELA DEDICADA DE SUB-CLASSES / MATÉRIAS (QUANDO ATIVO) */}
        {hasSubclasses && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px',
              marginBottom: '16px',
              border: '2px solid #818cf8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#56548A" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A1B2F' }}>
                  Tela Dedicada de Sub-classes / Matérias ({subclasses.length})
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#56548A', fontWeight: 600 }}>
                Obrigatório ao menos 1 item para liberar formulários dinâmicos
              </span>
            </div>

            {/* Formulário de Adição de Sub-classe */}
            <form onSubmit={handleAddSubclass} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <input
                ref={subclassInputRef}
                type="text"
                placeholder="Nome da sub-classe / matéria (ex: Redes de Computadores, Cálculo)..."
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                style={{
                  flex: '1 1 220px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12.5px',
                  color: '#1A1B2F',
                  outline: 'none'
                }}
              />

              <select
                value={newSubPriority}
                onChange={(e) => setNewSubPriority(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  backgroundColor: '#F8F8FC',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1A1B2F'
                }}
              >
                <option value="Alta">Prioridade Alta</option>
                <option value="Média">Prioridade Média</option>
                <option value="Baixa">Prioridade Baixa</option>
              </select>

              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Horas (opc.)"
                value={newSubHours}
                onChange={(e) => setNewSubHours(e.target.value)}
                style={{
                  width: '105px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12px',
                  color: '#1A1B2F'
                }}
                title="Horas já acumuladas na semana (para relatório)"
              />

              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Cadastrar</span>
              </button>
            </form>

            {/* Lista de Sub-classes Cadastradas */}
            {subclasses.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: '#FFF1F2',
                  border: '1px dashed #F43F5E',
                  color: '#9F1239',
                  fontSize: '12px',
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                Nenhuma sub-classe cadastrada ainda. Digite acima (ex: "Cálculo", "Redes de Computadores") e clique em Cadastrar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {subclasses.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '11px',
                      backgroundColor: '#F4F4FA',
                      border: '1px solid #E2E2F0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '6px',
                          backgroundColor: '#211F38',
                          color: '#FFFFFF',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1B2F' }}>{sub.name}</span>
                      <span
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          backgroundColor: '#E0E7FF',
                          color: '#3730A3',
                          fontWeight: 600
                        }}
                      >
                        {sub.priority || 'Alta'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#5A5B75', fontWeight: 600 }}>
                        • {Number(sub.hours || 0)}h registradas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSubclass(sub.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#E11D48',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Remover sub-classe"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 4: ESPAÇO COMPARTILHADO / MODO COLABORATIVO (PASSO D) */}
        {isShared && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '16px',
              marginBottom: '16px',
              border: '2px solid #38BDF8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#0284C7" />
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A1B2F' }}>
                  Círculo Compartilhado — Membros ({members.length + 1})
                </span>
              </div>

              {members.length > 0 && onTriggerSharedPomodoro && (
                <button
                  type="button"
                  onClick={() => {
                    const firstMember = members[0];
                    const firstSub = subclasses[0]?.name || 'Redes de Computadores';
                    onTriggerSharedPomodoro({
                      memberName: firstMember.name || 'Sebastian',
                      categoryName: name || category.name,
                      subclassName: firstSub
                    });
                    onClose?.();
                  }}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '999px',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                  title="Simular início de Pomodoro sincronizado pelo colega"
                >
                  <Radio size={12} />
                  <span>Simular Alerta de Pomodoro ({members[0]?.name || 'Sebastian'})</span>
                </button>
              )}
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 10px', borderRadius: '10px', border: '1px solid #C5C7DE', backgroundColor: '#FFFFFF' }}>
                <Mail size={14} color="#5A5B75" />
                <input
                  type="email"
                  placeholder="E-mail do colega (ex: sebastian@ethos.dev)"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    border: 'none',
                    fontSize: '12.5px',
                    color: '#1A1B2F',
                    outline: 'none'
                  }}
                />
              </div>

              <input
                type="text"
                placeholder="Nome (ex: Sebastian)"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                style={{
                  width: '150px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12.5px',
                  color: '#1A1B2F',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#211F38',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
                <span>Convidar</span>
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Proprietário (Owner) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#211F38', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    VC
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1B2F' }}>Você (Proprietário)</span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#211F38', color: '#FFFFFF' }}>
                  owner
                </span>
              </div>

              {/* Colaboradores convidados */}
              {members.map((m) => (
                <div
                  key={m.id || m.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {(m.name || 'CL').slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1B2F' }}>{m.name}</span>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>&lt;{m.email}&gt;</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#E0F2FE', color: '#0369A1' }}>
                      {m.role || 'collaborator'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', display: 'flex' }}
                      title="Remover membro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RODAPÉ DE AÇÃO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#DCDCE6',
              color: '#1A1B2F',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '10px 22px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#211F38',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(33, 31, 56, 0.25)'
            }}
          >
            <CheckCircle2 size={15} />
            <span>Salvar Arquitetura da Categoria</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

