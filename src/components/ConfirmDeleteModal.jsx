import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * Modal Unificado de Confirmação de Exclusão (Ethos Dark Glassmorphism)
 * 
 * Regra:
 * 1. Para apagar qualquer registro no sistema, solicita confirmação explícita.
 * 2. Se for uma Categoria (isCategory === true), exige que o usuário digite "DELETAR" para liberar a ação.
 */
export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Exclusão',
  message,
  itemName = '',
  itemType = 'item', // 'categoria' | 'hábito' | 'evento' | 'ficha' | 'exercício' | 'amigo' | etc.
  isCategory = false
}) {
  const [typedKeyword, setTypedKeyword] = useState('');

  // Resetar texto digitado ao abrir/fechar modal
  useEffect(() => {
    if (isOpen) {
      setTypedKeyword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCategoryValid = !isCategory || typedKeyword.trim().toUpperCase() === 'DELETAR';

  const handleConfirmClick = () => {
    if (!isCategoryValid) return;
    onConfirm?.();
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose?.();
    } else if (e.key === 'Enter' && isCategoryValid) {
      e.preventDefault();
      handleConfirmClick();
    }
  };

  return (
    <div
      onClick={onClose}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(9, 11, 20, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
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
          maxWidth: '440px',
          backgroundColor: 'rgba(18, 20, 36, 0.96)',
          borderRadius: '26px',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(239, 68, 68, 0.15)',
          padding: '24px',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'ethosModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}
      >
        {/* CABEÇALHO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0
              }}
            >
              {isCategory ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                {title}
              </h3>
              <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                Ação irreversível
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#94A3B8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* CORPO / MENSAGEM */}
        <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
          {message || (
            <>
              Tem certeza que deseja apagar permanentemente{' '}
              {itemName ? (
                <strong style={{ color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '6px' }}>
                  {itemName}
                </strong>
              ) : (
                'este item'
              )}
              ? Esta ação não poderá ser desfeita.
            </>
          )}
        </div>

        {/* EXIGÊNCIA EXPLÍCITA PARA CATEGORIAS: DIGITAR "DELETAR" */}
        {isCategory && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px dashed rgba(239, 68, 68, 0.45)',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '11.5px', color: '#FCA5A5', lineHeight: 1.4 }}>
              Por segurança, digite a palavra <strong style={{ color: '#FFFFFF', textDecoration: 'underline' }}>DELETAR</strong> no campo abaixo para habilitar a exclusão:
            </span>
            <input
              type="text"
              autoFocus
              value={typedKeyword}
              onChange={(e) => setTypedKeyword(e.target.value)}
              placeholder='Escreva "DELETAR"'
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(10, 11, 20, 0.85)',
                border: isCategoryValid && typedKeyword.trim() ? '1.5px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#CBD5E1',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!isCategoryValid}
            style={{
              flex: 1.2,
              padding: '10px 16px',
              borderRadius: '12px',
              backgroundColor: isCategoryValid ? '#DC2626' : 'rgba(220, 38, 38, 0.25)',
              color: isCategoryValid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isCategoryValid ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: isCategoryValid ? '0 4px 16px rgba(239, 68, 68, 0.4)' : 'none',
              transition: 'all 0.18s ease'
            }}
          >
            <Trash2 size={14} />
            <span>Confirmar Exclusão</span>
          </button>
        </div>
      </div>
    </div>
  );
}

