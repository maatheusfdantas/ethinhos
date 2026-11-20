import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { espacosApi, fmtUntil } from './espacosApi';

/** Avisos recebidos dos espaços (lidos e não lidos), com a conversa privada de cada um. */
export function AvisosRecebidos({ toast }) {
  const [list, setList] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setList((await espacosApi.meusAvisos()).avisos || []); } catch { setList([]); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const abrir = async (id) => { try { setAberto(await espacosApi.meuAviso(id)); setTexto(''); load(); } catch (e) { toast?.(e.message); } };
  if (!list || list.length === 0) return null;
  return (
    <section className="es-card">
      <h2>Avisos recebidos</h2>
      {list.map((a) => (
        <div className="es-row" key={a.postId}>
          <span className="es-avatar"><Megaphone size={15} /></span>
          <div className="grow"><b>{a.title}{a.read ? '' : ' (novo)'}</b><small>{a.proName}, {a.spaceName}, {fmtUntil(a.createdAt)}{a.comments ? `, ${a.comments} ${a.comments === 1 ? 'mensagem' : 'mensagens'}` : ''}</small></div>
          <button type="button" className="rx-btn ghost tiny" onClick={() => abrir(a.postId)}>Abrir</button>
        </div>
      ))}
      {aberto && (
        <div className="rx-overlay" onClick={() => setAberto(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="avr-t" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="avr-t">{aberto.aviso.title}</h2>
            <p>{aberto.aviso.proName}, {aberto.aviso.spaceName}</p>
            <p style={{ whiteSpace: 'pre-line', color: 'var(--rx-ink-2)' }}>{aberto.aviso.body}</p>
            {aberto.conversa.map((c) => <div key={c.id} className="es-note" style={{ marginTop: 8, background: c.mine ? 'var(--rx-violet-wash)' : undefined }}><span><b>{c.mine ? 'Você' : aberto.aviso.proName}</b>, {fmtUntil(c.createdAt)}<br />{c.body}</span></div>)}
            {aberto.aviso.allowComments ? (
              <div className="es-field" style={{ marginTop: 12 }}><label htmlFor="avr-c">Comentar (só você e {aberto.aviso.proName} veem)</label><textarea id="avr-c" className="es-input" style={{ height: 80, paddingTop: 10 }} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
            ) : <p className="es-sub">Este aviso é só para leitura.</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setAberto(null)}>Fechar</button>
              {aberto.aviso.allowComments && <button type="button" className="rx-btn" disabled={busy || !texto.trim()} onClick={async () => {
                setBusy(true);
                try { await espacosApi.comentar(aberto.aviso.postId, texto); setTexto(''); setAberto(await espacosApi.meuAviso(aberto.aviso.postId)); toast?.('Comentário enviado.'); } catch (e) { toast?.(e.message); } finally { setBusy(false); }
              }}>Enviar</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
