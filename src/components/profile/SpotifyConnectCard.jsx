import React, { useCallback, useEffect, useRef, useState } from 'react';

const EXPLAIN = [
  'Ver a música que está tocando agora.',
  'Ver a última música que você ouviu.'
];
const NOT_DONE = 'O Ethos não controla o player e não vê suas playlists, biblioteca, e-mail nem dados de pagamento.';

const fmtWhen = (iso) => {
  try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

/** Conexão opcional com o Spotify (só leitura). Vinculada à conta Ethos logada; não é método de login. */
export function SpotifyConnectCard({ showToast }) {
  const [status, setStatus] = useState({ loading: true, available: true, connected: false, displayName: '' });
  const [now, setNow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const alive = useRef(true);

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/integrations/spotify/status');
      const d = await r.json();
      if (alive.current) setStatus({ loading: false, available: d.available !== false, connected: !!d.connected, displayName: d.displayName || '' });
    } catch {
      if (alive.current) setStatus((s) => ({ ...s, loading: false }));
    }
  }, []);

  const loadNow = useCallback(async () => {
    try {
      const r = await fetch('/api/integrations/spotify/now-playing');
      const d = await r.json();
      if (!alive.current) return;
      if (d.connected === false) { setNow(null); setStatus((s) => ({ ...s, connected: false })); if (d.reason === 'expirada') setError('O acesso ao Spotify expirou. Conecte de novo.'); return; }
      setNow(d);
    } catch { /* mantém o que já está na tela */ }
  }, []);

  useEffect(() => { alive.current = true; loadStatus(); return () => { alive.current = false; }; }, [loadStatus]);

  // Atualiza a cada minuto só enquanto a aba está visível
  useEffect(() => {
    if (!status.connected) return undefined;
    loadNow();
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadNow(); }, 60000);
    return () => clearInterval(t);
  }, [status.connected, loadNow]);

  const connect = async () => {
    setBusy(true); setError('');
    try {
      const r = await fetch('/api/integrations/spotify/start', { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d.url) { setError(d.error || 'Não foi possível iniciar a conexão agora.'); setBusy(false); return; }
      window.location.href = d.url;
    } catch {
      setError('Não foi possível iniciar a conexão agora.'); setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/integrations/spotify', { method: 'DELETE' });
      if (!r.ok) throw new Error('falha');
      setStatus((s) => ({ ...s, connected: false, displayName: '' })); setNow(null); setConfirming(false);
      showToast?.('Spotify desconectado. Seus dados de acesso foram apagados.');
    } catch {
      setError('Não foi possível desconectar agora. Tente de novo.');
    } finally { setBusy(false); }
  };

  const track = now?.track;
  return (
    <section className="sp-card" aria-labelledby="spTitle">
      <div className="sp-head">
        <h3 id="spTitle">Spotify</h3>
        {status.connected && <span className="sp-badge">Conectado{status.displayName ? ` como ${status.displayName}` : ''}</span>}
      </div>

      {status.loading && <p className="sp-muted">Carregando…</p>}

      {!status.loading && !status.connected && (
        <>
          <p className="sp-text">Conexão opcional. Ao conectar, o Ethos vai poder:</p>
          <ul className="sp-list">{EXPLAIN.map((e) => <li key={e}>{e}</li>)}</ul>
          <p className="sp-muted">{NOT_DONE} Você pode desconectar quando quiser.</p>
          {!status.available
            ? <p className="sp-muted" role="status">A conexão com o Spotify ainda não está disponível.</p>
            : <button type="button" className="sp-btn" onClick={connect} disabled={busy}>{busy ? 'Abrindo o Spotify…' : 'Conectar Spotify'}</button>}
        </>
      )}

      {status.connected && (
        <>
          {!now && <p className="sp-muted" role="status">Buscando sua música…</p>}
          {now?.state === 'indisponivel' && <p className="sp-muted" role="status">O Spotify não respondeu agora. Vamos tentar de novo em instantes.</p>}
          {now?.state === 'none' && <p className="sp-muted">Nenhuma música recente encontrada. Toque algo no Spotify e volte aqui.</p>}
          {track && (
            <div className="sp-track">
              {track.image ? <img src={track.image} alt="" width="64" height="64" /> : <div className="sp-cover" aria-hidden="true" />}
              <div className="sp-meta">
                <span className="sp-state">{now.state === 'playing' ? 'Tocando agora' : `Última música${track.playedAt ? ` · ${fmtWhen(track.playedAt)}` : ''}`}</span>
                <b>{track.name}</b>
                <span>{track.artists.join(', ')}{track.album ? ` · ${track.album}` : ''}</span>
                {track.url && <a href={track.url} target="_blank" rel="noopener noreferrer">Abrir no Spotify</a>}
              </div>
            </div>
          )}
          {!confirming
            ? <button type="button" className="sp-btn ghost" onClick={() => setConfirming(true)}>Desconectar</button>
            : (
              <div className="sp-confirm" role="alertdialog" aria-label="Confirmar desconexão">
                <p>Desconectar o Spotify? Apagamos a conexão e os dados de acesso guardados. Você também pode remover o Ethos em spotify.com/account/apps.</p>
                <button type="button" className="sp-btn" onClick={disconnect} disabled={busy}>{busy ? 'Desconectando…' : 'Sim, desconectar'}</button>
                <button type="button" className="sp-btn ghost" onClick={() => setConfirming(false)}>Cancelar</button>
              </div>
            )}
        </>
      )}
      {error && <p className="sp-error" role="alert">{error}</p>}
    </section>
  );
}
