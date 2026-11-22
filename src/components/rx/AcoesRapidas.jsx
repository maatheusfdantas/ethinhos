import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Menu do "+" (proposta 12): um lugar só para criar ou registrar.
 * itens: [{ id, label, icon, cor, onSelect }]. Só entram ações que funcionam para a pessoa.
 */
export function AcoesRapidas({ open, onClose, itens = [] }) {
  const primeiro = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    primeiro.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="rx-acts-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="rx-acts" role="dialog" aria-modal="true" aria-labelledby="rxActsT">
        <div className="rx-acts-head">
          <div>
            <h2 id="rxActsT">O que você quer fazer?</h2>
            <p>Criar algo novo ou registrar o que já fez.</p>
          </div>
          <button type="button" className="rx-icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="rx-acts-grid">
          {itens.map((it, i) => {
            const Icon = it.icon;
            return (
              <button key={it.id} ref={i === 0 ? primeiro : undefined} type="button" data-testid={`acao-${it.id}`} onClick={() => { onClose?.(); it.onSelect?.(); }}>
                <span className="rx-tile solid lg" style={{ '--c': it.cor }}><Icon size={24} strokeWidth={1.9} /></span>
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
