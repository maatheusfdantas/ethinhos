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
  ShieldCheck,
  Radio,
  Mail
} from 'lucide-react';
import { IconPicker, CleanIcon, CATEGORY_COLOR_PALETTE } from './IconLibrary';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

const COLOR_OPTIONS = CATEGORY_COLOR_PALETTE;

export function CategoryConfigModal({
  isOpen,
  category,
  onClose,
  onSaveConfig,
  onDeleteCategory,
  onTriggerSharedPomodoro
}) {
  const isNew = Boolean(category?.isNew);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#818cf8');
  const [bg, setBg] = useState('rgba(129, 140, 248, 0.15)');
  const [icon, setIcon] = useState('BookOpen');

  // Capacidades modulares
  const [hasSubclasses, setHasSubclasses] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Sub-classes (Tabela Subclasses)
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
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState(null);
  const subclassInputRef = useRef(null);

  useEffect(() => {
    if (category && isOpen) {
      setName(category.name || '');
      setColor(category.color || '#818cf8');
      setBg(category.bg || 'rgba(129, 140, 248, 0.15)');
      setIcon(category.icon || 'BookOpen');
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
      category_id: category.id || 'new_cat',
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
        'Restrição Antibug: Você removeu todas as sub-classes. Cadastre ao menos 1 item ou desative o interruptor de Sub-classes.'
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
      category_id: category.id || 'new_cat',
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
    if (!name.trim()) {
      setAntiBugError('Por favor, informe o nome da categoria.');
      return;
    }

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
      id: category.id || `tag_${Date.now()}`,
      name: name.trim(),
      color,
      bg: bg || `${color}25`,
      icon,
      has_subclasses: Boolean(hasSubclasses && subclasses.length > 0),
      is_shared: Boolean(isShared),
      subclasses: hasSubclasses ? subclasses : [],
      members: isShared ? members : [],
      isNew: false
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
          maxWidth: '740px',
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
        {/* HEADER DO MODAL */}
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
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: '#211F38',
                color: color || '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 16px rgba(33, 31, 56, 0.22)'
              }}
            >
              <CleanIcon name={icon} size={22} color={color || '#818cf8'} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1A1B2F', margin: 0 }}>
                  {isNew ? 'Nova Categoria Modular' : `Configuração: ${name || category.name}`}
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
                  {hasSubclasses || isShared ? 'Modular Avançada' : 'Básica'}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#5A5B75' }}>
                {isNew 
                  ? 'Defina o rótulo visual e adicione sub-classes ou compartilhamento conforme sua necessidade.'
                  : 'Separação estrita entre Rótulo e Capacidades (Sub-classes & Modo Colaborativo)'}
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

        {/* SEÇÃO 1: RÓTULO BÁSICO & BIBLIOTECA DE ÍCONES CLEAN */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '18px',
            marginBottom: '16px',
            border: '1px solid #DFDFE8',
            boxShadow: '0 4px 14px rgba(33, 31, 56, 0.04)'
          }}
        >
          <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#5A5B75', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            1. Rótulo Visual & Identidade
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3A3C58', marginBottom: '4px' }}>
                Nome da Categoria
              </label>
              <input
                type="text"
                placeholder="ex: Faculdade, Finanças, Saúde..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus={isNew}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #C5C7DE',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1A1B2F',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#3A3C58' }}>
                  Cor da Categoria ({COLOR_OPTIONS.length} cores + Personalizada)
                </label>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    cursor: 'pointer',
                    backgroundColor: '#F1F5F9',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #CBD5E1'
                  }}
                  title="Escolher qualquer cor personalizada"
                >
                  <input
                    type="color"
                    value={color && color.startsWith('#') && color.length === 7 ? color : '#6366f1'}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setColor(hex);
                      setBg(`${hex}26`);
                    }}
                    style={{ width: '16px', height: '16px', border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                  />
                  <span>Cor Livre ({color})</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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
                      border: color === pal.color ? '2.5px solid #1A1B2F' : '2px solid rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                      boxShadow: color === pal.color ? '0 2px 8px rgba(0,0,0,0.28)' : '0 1px 3px rgba(0,0,0,0.1)',
                      transform: color === pal.color ? 'scale(1.12)' : 'scale(1)',
                      transition: 'all 0.12s ease'
                    }}
                    title={`${pal.name} (${pal.family})`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* BIBLIOTECA DE ÍCONES (DIRETRIZES DE ESTILO CLEAN) */}
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #ECEEF4' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#3A3C58', marginBottom: '8px' }}>
              Biblioteca de Ícones Separados por Tema (112 Ícones Disponíveis)
            </label>
            <IconPicker
              selectedIcon={icon}
              onSelectIcon={setIcon}
              activeColor={color}
              maxHeight="280px"
            />
          </div>
        </div>

        {/* SEÇÃO 2: INTERRUPTORES DE CAPACIDADES MODULARES */}
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
              2. Capacidades Modulares
            </span>
            <span style={{ fontSize: '11px', color: '#6EE7B7', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ShieldCheck size={14} /> Arquitetura Modular
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {/* Toggle 1: Sub-classes / Matérias */}
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
                    color: hasSubclasses ? '#211F38' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Sub-classes / Matérias</div>
                  <div style={{ fontSize: '11px', color: '#A9ABC6' }}>
                    {hasSubclasses ? `${subclasses.length} matérias vinculadas` : 'Desativado (Categoria Básica)'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '999px',
                  backgroundColor: hasSubclasses ? '#818cf8' : 'rgba(255,255,255,0.18)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: hasSubclasses ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>

            {/* Toggle 2: Modo Colaborativo / Compartilhada */}
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
                    color: isShared ? '#211F38' : '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Modo Colaborativo</div>
                  <div style={{ fontSize: '11px', color: '#A9ABC6' }}>
                    {isShared ? `${members.length} colaboradores` : 'Pessoal / Privado'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: '38px',
                  height: '22px',
                  borderRadius: '999px',
                  backgroundColor: isShared ? '#38BDF8' : 'rgba(255,255,255,0.18)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isShared ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
              </div>
            </div>
          </div>
        </div>

        {/* RESTRIÇÃO ANTIBUG: ALERTA SE SUB-CLASSES ATIVADAS SEM ITENS */}
        {antiBugError && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1.5px solid #EF4444',
              borderRadius: '14px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#991B1B',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{antiBugError}</span>
          </div>
        )}

        {/* SEÇÃO 3: TELA DEDICADA DE SUB-CLASSES (SE HABILITADO) */}
        {hasSubclasses && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '18px',
              marginBottom: '16px',
              border: '1.5px solid #818cf8',
              boxShadow: '0 6px 18px rgba(129, 140, 248, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} color="#818cf8" />
                  Matérias & Sub-classes Vinculadas ({subclasses.length})
                </span>
                <span style={{ fontSize: '11px', color: '#5A5B75' }}>
                  Cada sub-classe pode ser selecionada opcionalmente nas sessões de estudo.
                </span>
              </div>
            </div>

            {/* FORMULÁRIO DE ADIÇÃO DE SUB-CLASSE */}
            <form onSubmit={handleAddSubclass} style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input
                ref={subclassInputRef}
                type="text"
                placeholder="Nome da matéria (ex: Cálculo, Redes, Algoritmos)..."
                value={newSubName}
                onChange={(e) => {
                  setNewSubName(e.target.value);
                  setAntiBugError('');
                }}
                style={{
                  flex: 2,
                  minWidth: '180px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12px',
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
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  outline: 'none'
                }}
              >
                <option value="Alta">Prioridade Alta</option>
                <option value="Média">Prioridade Média</option>
                <option value="Baixa">Prioridade Baixa</option>
              </select>

              <input
                type="number"
                placeholder="Meta horas"
                value={newSubHours}
                onChange={(e) => setNewSubHours(e.target.value)}
                min="0"
                step="1"
                style={{
                  width: '90px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#818cf8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </form>

            {/* LISTA DE SUB-CLASSES CADASTRADAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {subclasses.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', color: '#64748B', fontSize: '12px' }}>
                  Nenhuma sub-classe cadastrada ainda. Adicione pelo menos 1 item acima!
                </div>
              ) : (
                subclasses.map((s) => (
                  <div
                    key={s.id || s.name}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A1B2F' }}>{s.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          backgroundColor: s.priority === 'Alta' ? '#FEE2E2' : '#F1F5F9',
                          color: s.priority === 'Alta' ? '#DC2626' : '#475569'
                        }}
                      >
                        {s.priority}
                      </span>
                      {Number(s.hours) > 0 && (
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          {s.hours}h acumuladas
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTarget({ type: 'subclass', id: s.id, name: s.name })}
                      style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      title={`Remover ${s.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEÇÃO 4: MEMBROS COLABORATIVOS (SE HABILITADO) */}
        {isShared && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '18px',
              marginBottom: '16px',
              border: '1.5px solid #38BDF8',
              boxShadow: '0 6px 18px rgba(56, 189, 248, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Users size={16} color="#0284C7" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1A1B2F' }}>
                Colaboradores Convidados ({members.length})
              </span>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="E-mail do colaborador (ex: colega@ethos.dev)..."
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                style={{
                  flex: 2,
                  minWidth: '200px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                placeholder="Nome (opcional)"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                style={{
                  width: '130px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #C5C7DE',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Plus size={14} /> Convidar
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
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

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteTarget({ type: 'member', id: m.id, name: m.name || m.email })}
                    style={{ background: 'none', border: 'none', color: '#E11D48', cursor: 'pointer', display: 'flex' }}
                    title="Remover membro"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RODAPÉ DE AÇÃO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '12px' }}>
          <div>
            {!isNew && onDeleteCategory && (
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget({ type: 'category', id: category.id, name: name || category.name })}
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={13} />
                <span>Excluir Categoria</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <span>{isNew ? 'Criar Categoria Modular' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!confirmDeleteTarget}
        onClose={() => setConfirmDeleteTarget(null)}
        isCategory={confirmDeleteTarget?.type === 'category'}
        itemName={confirmDeleteTarget?.name}
        title={
          confirmDeleteTarget?.type === 'category'
            ? 'Excluir Categoria Modular'
            : confirmDeleteTarget?.type === 'subclass'
            ? 'Remover Sub-classe'
            : 'Remover Colaborador'
        }
        message={
          confirmDeleteTarget?.type === 'category'
            ? `Tem certeza que deseja excluir a categoria "${confirmDeleteTarget?.name}"? Esta ação removerá a categoria de todos os módulos.`
            : confirmDeleteTarget?.type === 'subclass'
            ? `Deseja remover a sub-classe "${confirmDeleteTarget?.name}" desta categoria?`
            : `Deseja remover o colaborador "${confirmDeleteTarget?.name}" desta categoria compartilhada?`
        }
        onConfirm={() => {
          if (!confirmDeleteTarget) return;
          if (confirmDeleteTarget.type === 'category') {
            onDeleteCategory(confirmDeleteTarget.id, confirmDeleteTarget.name);
            onClose();
          } else if (confirmDeleteTarget.type === 'subclass') {
            handleRemoveSubclass(confirmDeleteTarget.id);
          } else if (confirmDeleteTarget.type === 'member') {
            handleRemoveMember(confirmDeleteTarget.id);
          }
          setConfirmDeleteTarget(null);
        }}
      />
    </div>,
    document.body
  );
}