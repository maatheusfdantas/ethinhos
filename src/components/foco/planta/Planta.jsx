import React, { memo, useState } from 'react';
import { urlDoAsset } from './assets';

/**
 * Desenha a planta. Memoizada: o relógio da sessão atualiza a tela várias vezes por segundo,
 * mas a planta só renderiza de novo quando o estágio ou o balanço mudam.
 * - Troca de estágio: entrada curta (escala leve), configurada na espécie.
 * - Balanço contínuo: só CSS, em torno da base; 'pause' congela, 'off' desliga.
 */
export const Planta = memo(function Planta({ especie, estagio, balanco = 'off' }) {
  // Sem animação no primeiro desenho; a partir da primeira troca de estágio, cada nova imagem entra com o efeito.
  const [ultimo, setUltimo] = useState(estagio.stageId);
  const [animar, setAnimar] = useState(false);
  if (ultimo !== estagio.stageId) { setUltimo(estagio.stageId); setAnimar(true); }

  const src = urlDoAsset(especie.id, estagio.assetKey);
  const chao = urlDoAsset(especie.id, especie.chao);
  return (
    <div className="rf-planta" data-sway={balanco} data-stage={estagio.stageId} aria-hidden="true"
      style={{ '--rf-entrada': `${especie.entrada.ms}ms`, '--rf-escala': especie.entrada.escala }}>
      <div className="solo">
        <div className="balanco">
          {src && <img key={estagio.stageId} className={`est${animar ? ' entra' : ''}`} src={src} alt="" draggable={false} />}
        </div>
      </div>
      {chao && <img className="chao" src={chao} alt="" draggable={false} />}
    </div>
  );
});
