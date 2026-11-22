import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { lerTema, salvarTema } from './tema';

/** Botão do topo que alterna entre o tema claro e o escuro. */
export function TemaBotao() {
  const [tema, setTema] = useState(lerTema);
  const escuro = tema === 'escuro';
  const trocar = () => { const novo = escuro ? 'claro' : 'escuro'; salvarTema(novo); setTema(novo); };
  return (
    <button type="button" className="rx-icon-btn" onClick={trocar} aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'} title={escuro ? 'Tema claro' : 'Tema escuro'} data-testid="tema-botao">
      {escuro ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
