import React, { useState } from 'react';
import { Bell, CalendarClock, Megaphone, Utensils, X } from 'lucide-react';
import { espacosApi, fmtUntil } from '../espacos/espacosApi';
import '../../styles/espacos.css';

/** Sino do topo com a contagem de pendências dos espaços. */
export function PendenciasBell({ total = 0, onOpen }) {
  return (
    <button type="button" className="rx-icon-btn es-bell" onClick={onOpen} aria-label={total ? `Pendências, ${total} novas` : 'Pendências'} data-testid="pend-bell">
      <Bell className="rx-i" strokeWidth={1.75} />
      {total > 0 && <span className="dot">{total > 9 ? '9+' : total}</span>}
    </button>
  );
}

const OUTRAS = {
  evento_cancelado: (o) => ({ title: `${o.title} foi cancelado`, detail: o.spaceName, icon: CalendarClock }),
  evento_texto: (o) => ({ title: `${o.title} foi atualizado`, detail: `${o.spaceName}: local ou detalhes mudaram. Seu aceite continua.`, icon: CalendarClock }),
  comentario: (o) => ({ title: `Resposta em “${o.title}”`, detail: o.spaceName, icon: Megaphone, aviso: o.refId }),
  plano_publicado: (o) => ({ title: `Plano alimentar publicado: ${o.title}`, detail: `${o.spaceName}. Veja as refeições e registre na aba Alimentação.`, icon: Utensils, tab: 'alimentacao' })
};

/**
 * Pendências (painel lateral): convites de evento, avisos novos e respostas.
 * Não bloqueia nada; convites somem quando respondidos ou quando o evento começa.
 */
export function PendenciasDrawer({ open, onClose, data, onChanged, toast, onOpenTab }) {
  const [aviso, setAviso] = useState(null);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const convites = data?.convites || [];
  const avisos = data?.avisos || [];
  const outras = data?.outras || [];

  const responder = async (c, resposta) => {
    setBusy(true);
    try {
      await espacosApi.responderConvite(c.inviteId, resposta);
      toast?.(resposta === 'aceito' ? `${c.title} entrou na sua agenda.` : 'Convite recusado.');
      await onChanged?.();
    } catch (e) { toast?.(e.message); } finally { setBusy(false); }
  };
  const abrirAviso = async (postId) => {
    try { setAviso(await espacosApi.meuAviso(postId)); setTexto(''); await onChanged?.(); } catch (e) { toast?.(e.message); }
  };

  return (
    <div className="es-drawer" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pend-t" onClick={(e) => e.stopPropagation()}>
        {!aviso ? (
          <>
            <h2 id="pend-t">Pendências <button type="button" className="es-x" onClick={onClose} aria-label="Fechar"><X size={18} /></button></h2>
            <p className="es-sub">Convites e avisos dos seus espaços. Nada aqui trava o app.</p>
            {convites.length + avisos.length + outras.length === 0 && <div className="es-empty"><h3>Tudo em dia</h3><p>Novos convites e avisos dos seus profissionais aparecem aqui.</p></div>}
            {convites.map((c) => (
              <div className="es-pend" key={c.inviteId} data-testid="pend-convite">
                <span className="es-badge"><CalendarClock size={13} />{c.changed ? 'Horário mudou' : 'Convite'}, {c.spaceName}</span>
                <b>{c.title}</b>
                <p>{fmtUntil(c.startsAt)}{c.location ? `, ${c.location}` : ''}</p>
                {c.changed && <p>Você tinha respondido. Confirme de novo para manter na agenda.</p>}
                {c.lembrete && <p>Lembrete de {c.proName}.</p>}
                <div className="btns">
                  <button type="button" className="rx-btn tiny" disabled={busy} onClick={() => responder(c, 'aceito')}>Aceitar</button>
                  <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={() => responder(c, 'recusado')}>Recusar</button>
                </div>
              </div>
            ))}
            {avisos.map((a) => (
              <div className="es-pend" key={a.postId} data-testid="pend-aviso">
                <span className="es-badge"><Megaphone size={13} />Aviso, {a.spaceName}</span>
                <b>{a.title}</b>
                <p>{a.proName}, {fmtUntil(a.createdAt)}</p>
                <div className="btns"><button type="button" className="rx-btn ghost tiny" onClick={() => abrirAviso(a.postId)}>Abrir aviso</button></div>
              </div>
            ))}
            {outras.map((o) => {
              const v = (OUTRAS[o.type] || (() => ({ title: o.title, detail: o.spaceName, icon: Bell })))(o);
              const Icon = v.icon;
              return (
                <div className="es-pend" key={o.id}>
                  <span className="es-badge"><Icon size={13} />{o.spaceName}</span>
                  <b>{v.title}</b>
                  <p>{v.detail}</p>
                  <div className="btns">
                    {v.aviso && <button type="button" className="rx-btn ghost tiny" onClick={() => abrirAviso(v.aviso)}>Abrir</button>}
                    {v.tab && onOpenTab && <button type="button" className="rx-btn tiny" onClick={() => onOpenTab(v.tab)}>Abrir Alimentação</button>}
                    <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { await espacosApi.lidas([o.id]); await onChanged?.(); } catch (e) { toast?.(e.message); } }}>Marcar como lida</button>
                  </div>
                </div>
              );
            })}
            <p className="es-sub" style={{ marginTop: 18 }}>Convites sem resposta deixam de aparecer quando o evento começa.</p>
          </>
        ) : (
          <>
            <h2 id="pend-t">{aviso.aviso.title} <button type="button" className="es-x" onClick={() => setAviso(null)} aria-label="Voltar"><X size={18} /></button></h2>
            <p className="es-sub">{aviso.aviso.proName}, {aviso.aviso.spaceName}, {fmtUntil(aviso.aviso.createdAt)}</p>
            <p style={{ whiteSpace: 'pre-line', color: 'var(--rx-ink-2)' }}>{aviso.aviso.body}</p>
            {aviso.conversa.map((c) => <div key={c.id} className="es-note" style={{ marginTop: 8, background: c.mine ? 'var(--rx-violet-wash)' : undefined }}><span><b>{c.mine ? 'Você' : aviso.aviso.proName}</b>, {fmtUntil(c.createdAt)}<br />{c.body}</span></div>)}
            {aviso.aviso.allowComments ? (
              <>
                <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="pend-c">Comentar (só você e {aviso.aviso.proName} veem)</label><textarea id="pend-c" className="es-input" style={{ height: 80, paddingTop: 10 }} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
                <div className="btns" style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="rx-btn tiny" disabled={busy || !texto.trim()} onClick={async () => {
                    setBusy(true);
                    try { await espacosApi.comentar(aviso.aviso.postId, texto); setTexto(''); setAviso(await espacosApi.meuAviso(aviso.aviso.postId)); toast?.('Comentário enviado.'); } catch (e) { toast?.(e.message); } finally { setBusy(false); }
                  }}>Enviar</button>
                  <button type="button" className="rx-btn ghost tiny" onClick={() => setAviso(null)}>Voltar</button>
                </div>
              </>
            ) : <p className="es-sub" style={{ marginTop: 12 }}>Este aviso não aceita comentários.</p>}
          </>
        )}
      </div>
    </div>
  );
}
