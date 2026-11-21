import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Copy, ExternalLink, Music, Plus, Settings2, Trash2, X } from 'lucide-react';
import { calculateUserLevelAndXp } from '../../utils/biometricsAndAnalytics';
import { ProfileAccountSections } from '../profile/ProfileAccountSections';
import { MetaAgua } from './MetaAgua';
import '../../styles/espacos.css';
import '../../styles/telas.css';

/** Sugestões para preencher a música do perfil (as mesmas do perfil antigo). */
const SUGESTOES = [
  { title: 'Starboy', artist: 'The Weeknd, Daft Punk', album: 'Starboy', duration: 230 },
  { title: 'Midnight City', artist: 'M83', album: "Hurry Up, We're Dreaming", duration: 243 },
  { title: 'Veridis Quo', artist: 'Daft Punk', album: 'Discovery', duration: 345 },
  { title: 'After Dark', artist: 'Mr.Kitty', album: 'Time', duration: 259 }
];
const PLATAFORMAS = [['spotify', 'Spotify', '#1DB954'], ['youtube', 'YouTube Music', '#FF0000'], ['apple', 'Apple Music', '#FC3C44']];
const METRICAS = [
  ['shareStreaks', 'Sequência de hábitos'],
  ['shareFocusHours', 'Nível e XP'],
  ['shareWorkoutStreak', 'Fichas de treino'],
  ['shareSobrietyDays', 'Marcos de maus hábitos superados']
];
const REGRAS = [['Hábito concluído', 25], ['Hábito criado', 10], ['Dia de sequência', 15], ['Exercício em ficha', 20], ['Nota', 10], ['Playlist', 15]];

const chave = (nome, user) => `ethos_${nome}_${user?.id || 'default'}`;
const ler = (nome, user, fallback) => {
  try { const v = localStorage.getItem(chave(nome, user)); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const gravar = (nome, user, valor) => { try { localStorage.setItem(chave(nome, user), typeof valor === 'string' ? valor : JSON.stringify(valor)); } catch { /* sem armazenamento local */ } };
const putPerfil = (user, body) => (user?.id
  ? fetch(`/api/user/${user.id}/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => { if (!r.ok) throw new Error('falhou'); return r; })
  : Promise.resolve(null));

/**
 * Perfil no visual atual do Ethos (lote 2 de 21/11/2026). Mesmas props e mesmas funções do ProfileTab antigo
 * (que continua no código): foto, bio, @ copiável, nível e XP, saúde e contas, música do perfil, playlists,
 * métricas compartilhadas, hábitos fixados e conquistas. Saiu o "check-in diário" de +50 XP (pedido do usuário);
 * o XP já resgatado continua somado. Saíram também o player simulado e as conquistas de exemplo.
 */
export function PerfilTab({ user, setUser, habits = [], workouts = [], badges = [], friends = [], health = {}, setHealth, showToast, onOpenSettings, onOpenSupport, onLogout }) {
  const fileRef = useRef(null);
  const nome = user?.name || user?.username || 'Usuário';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'US';

  /* ---------- Bio ---------- */
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  useEffect(() => {
    if (user?.bio !== undefined) setBio(user.bio || '');
    else { try { const b = localStorage.getItem(chave('user_bio', user)); if (b) setBio(b); } catch { /* nada */ } }
  }, [user?.bio, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const salvarBio = async () => {
    const t = bio.slice(0, 150);
    setUser?.({ ...user, bio: t });
    setEditBio(false);
    gravar('user_bio', user, t);
    try { await putPerfil(user, { bio: t }); showToast?.('Bio salva.'); } catch { showToast?.('Bio salva só neste aparelho. Tente de novo com conexão.'); }
  };

  /* ---------- Foto ---------- */
  const trocarFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast?.('Escolha um arquivo de imagem.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result;
      if (!dataUrl) return;
      setUser?.({ ...user, avatar: dataUrl });
      gravar('user_avatar', user, dataUrl);
      try { await putPerfil(user, { avatar: dataUrl }); showToast?.('Foto atualizada.'); } catch { showToast?.('Foto salva só neste aparelho.'); }
    };
    reader.readAsDataURL(file);
  };

  /* ---------- @ ---------- */
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    const h = `@${user?.username || 'usuario'}`;
    navigator.clipboard?.writeText?.(h);
    setCopiado(true);
    showToast?.(`${h} copiado.`);
    setTimeout(() => setCopiado(false), 2200);
  };

  /* ---------- Música do perfil ---------- */
  const [musica, setMusica] = useState(() => (user?.activeTrack?.title ? user.activeTrack : ler('music_track', user, null)));
  const [editMusica, setEditMusica] = useState(null); // { title, artist, album } | null
  const salvarMusica = (e) => {
    e.preventDefault();
    if (!editMusica.title.trim() || !editMusica.artist.trim()) return;
    const t = { title: editMusica.title.trim(), artist: editMusica.artist.trim(), album: editMusica.album.trim() || 'Single', duration: editMusica.duration || 215 };
    setMusica(t);
    setUser?.((prev) => (prev ? { ...prev, activeTrack: t } : prev));
    setEditMusica(null);
    gravar('music_track', user, t);
    putPerfil(user, { activeTrack: t }).catch(() => {});
    showToast?.('Música do perfil atualizada.');
  };

  /* ---------- Playlists ---------- */
  const [playlists, setPlaylists] = useState(() => (Array.isArray(user?.playlists) && user.playlists.length ? user.playlists : ler('playlists', user, [])));
  const [novaPl, setNovaPl] = useState(null); // { title, url, platform, description } | null
  const gravarPlaylists = async (lista, msg) => {
    setPlaylists(lista);
    gravar('playlists', user, lista);
    try { await putPerfil(user, { playlists: lista }); showToast?.(msg); } catch { showToast?.('Playlists salvas só neste aparelho.'); }
  };
  const salvarPlaylist = (e) => {
    e.preventDefault();
    if (!novaPl.title.trim() || !novaPl.url.trim()) return;
    const accent = (PLATAFORMAS.find(([id]) => id === novaPl.platform) || [])[2] || '#8B5CF6';
    const item = { id: `pl_${Date.now()}`, title: novaPl.title.trim(), url: novaPl.url.trim(), platform: novaPl.platform, description: novaPl.description.trim(), accentColor: accent };
    setNovaPl(null);
    gravarPlaylists([item, ...playlists], 'Playlist adicionada.');
  };

  /* ---------- Nível (o bônus já resgatado continua somado) ---------- */
  const postIts = Array.isArray(user?.postIts) && user.postIts.length ? user.postIts : ler('postits', user, []);
  const bonusXp = (() => { try { return Number(localStorage.getItem(chave('bonus_xp', user))) || 0; } catch { return 0; } })();
  const streak = user?.streak_days || 0;
  const xp = calculateUserLevelAndXp({ basePoints: user?.points, habits, streakDays: streak, workouts, postIts, playlists, bonusXp });
  const taxaHabitos = habits.length ? Math.round((xp.completedHabitsCount / habits.length) * 100) : 0;

  /* ---------- Compartilhado com amigos ---------- */
  const [shared, setShared] = useState(() => (user?.sharedMetrics && Object.keys(user.sharedMetrics).length ? user.sharedMetrics
    : ler('shared_metrics', user, { shareStreaks: false, shareWorkoutStreak: false, shareFocusHours: false, shareSobrietyDays: false, selectedHabitIds: [] })));
  const [editShared, setEditShared] = useState(false);
  const alternarMetrica = async (k) => {
    const next = { ...shared, [k]: !shared[k] };
    setShared(next);
    gravar('shared_metrics', user, next);
    try { await putPerfil(user, { sharedMetrics: next }); } catch { showToast?.('Preferência salva só neste aparelho.'); }
  };
  const alternarFixado = (id) => {
    const ids = Array.isArray(shared.selectedHabitIds) ? shared.selectedHabitIds : [];
    const next = { ...shared, selectedHabitIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] };
    setShared(next);
    gravar('shared_metrics', user, next);
    putPerfil(user, { sharedMetrics: next }).catch(() => showToast?.('Preferência salva só neste aparelho.'));
  };
  const fixados = habits.filter((h) => (shared.selectedHabitIds?.length ? shared.selectedHabitIds.includes(h.id) : true)).slice(0, 4);
  const progressoHabito = (h) => {
    if (h.completed) return 'Feito hoje';
    const alvo = Number(h.target || 0);
    if (alvo > 1) return `${Number(h.current || 0)} de ${alvo}${h.unit ? ` ${h.unit}` : ''}`;
    return 'Pendente';
  };

  return (
    <div className="es pf">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={trocarFoto} />
      <div className="pf-top">
        <button type="button" className="pf-ava" onClick={() => fileRef.current?.click()} aria-label="Trocar foto do perfil">
          {user?.avatar && String(user.avatar).startsWith('data:') ? <img src={user.avatar} alt="" /> : <span>{user?.avatar && String(user.avatar).length <= 3 ? user.avatar : iniciais}</span>}
          <span className="cam" aria-hidden="true"><Camera size={14} /></span>
        </button>
        <div className="grow">
          <h1>{nome}</h1>
          <p className="rx-sub" style={{ margin: '6px 0 0', display: 'flex', gap: '4px 12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" className="rx-link" style={{ paddingLeft: 0 }} onClick={copiar} aria-label={`Copiar @${user?.username || 'usuario'}`}>
              @{user?.username || 'usuario'} {copiado ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <span>{friends?.length || 0} {(friends?.length || 0) === 1 ? 'conexão' : 'conexões'}</span>
            <span>Nível {xp.currentLevel}, {xp.levelTitle}</span>
          </p>
        </div>
      </div>

      <div className="es-grid">
        <div className="es-stack">
          <article className="es-card">
            <h2>Bio {!editBio && <button type="button" className="rx-link" onClick={() => setEditBio(true)}>Editar</button>}</h2>
            {editBio ? (
              <div style={{ marginTop: 12 }}>
                <textarea className="es-input pf-bio" aria-label="Bio" maxLength={150} rows={3} value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} autoFocus />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <span className="rx-sub">{bio.length} de 150</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="rx-btn ghost" onClick={() => { setBio(user?.bio || ''); setEditBio(false); }}>Cancelar</button>
                    <button type="button" className="rx-btn" onClick={salvarBio}>Salvar bio</button>
                  </span>
                </div>
              </div>
            ) : <p className="es-sub" style={{ marginTop: 8 }}>{bio || 'Sem bio. Conte em até 150 caracteres o que você está construindo.'}</p>}
          </article>

          <ProfileAccountSections user={user} setUser={setUser} health={health} setHealth={setHealth} showToast={showToast} onOpenSettings={onOpenSettings} onLogout={onLogout}
            waterSlot={<MetaAgua user={user} setUser={setUser} health={health} setHealth={setHealth} showToast={showToast} />} />

          <article className="es-card">
            <h2>Música do perfil <button type="button" className="rx-link" onClick={() => setEditMusica({ title: musica?.title || '', artist: musica?.artist || '', album: musica?.album || '' })}>{musica ? 'Trocar' : 'Definir'}</button></h2>
            {musica ? (
              <div className="pf-track"><span className="pf-cover" aria-hidden="true"><Music size={20} /></span><div><b>{musica.title}</b><p className="rx-sub" style={{ margin: '2px 0 0' }}>{musica.artist}{musica.album ? `, ${musica.album}` : ''}</p></div></div>
            ) : <p className="es-sub">Escolha uma música para aparecer no seu perfil. Para mostrar o que você está ouvindo agora, conecte o Spotify em Contas conectadas.</p>}
          </article>

          <article className="es-card">
            <h2>Playlists <button type="button" className="rx-link" onClick={() => setNovaPl({ title: '', url: '', platform: 'spotify', description: '' })}><Plus size={14} /> Adicionar</button></h2>
            {playlists.length === 0 ? <p className="es-sub">Nenhuma playlist ainda. Adicione o link de uma playlist do Spotify, YouTube Music ou Apple Music.</p> : playlists.map((pl) => (
              <div className="hb-row pf-pl" key={pl.id}>
                <span className="pf-cover" style={{ '--pf-acc': pl.accentColor || 'var(--rx-violet)' }} aria-hidden="true"><Music size={18} /></span>
                <div style={{ minWidth: 0 }}><div className="t">{pl.title}</div><div className="m">{(PLATAFORMAS.find(([id]) => id === pl.platform) || [null, 'Outra'])[1]}{pl.description ? <span>{pl.description}</span> : null}</div></div>
                <div className="hb-acts">
                  <a className="step" href={pl.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${pl.title}`}><ExternalLink size={15} /></a>
                  <button type="button" className="del" onClick={() => gravarPlaylists(playlists.filter((p) => p.id !== pl.id), 'Playlist removida.')} aria-label={`Remover ${pl.title}`}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </article>
        </div>

        <aside className="rx-rail">
          <section className="summary">
            <h2>Nível {xp.currentLevel}<span className="rx-sub" style={{ margin: 0, fontWeight: 500 }}>{xp.totalXp.toLocaleString('pt-BR')} XP</span></h2>
            <div className="pf-xp"><div className="rx-meter"><div className={`rx-fill ${xp.xpProgressPercent ? '' : 'zero'}`} style={{ width: `${xp.xpProgressPercent}%` }} /></div></div>
            <p className="rx-sub" style={{ marginTop: 8 }}>{xp.currentLevelProgressXp} de {xp.xpPerLevel} XP para o nível {xp.currentLevel + 1}.</p>
            <ul className="pf-regras">{REGRAS.map(([r, v]) => <li key={r}><span>{r}</span><span>+{v} XP</span></li>)}</ul>
          </section>
          <section>
            <h2>Para amigos <button type="button" className="rx-link" onClick={() => setEditShared(true)}><Settings2 size={14} /> Escolher</button></h2>
            <div className="pf-mini">
              {shared.shareStreaks && <div><span>Sequência</span><b>{streak} {streak === 1 ? 'dia' : 'dias'}</b></div>}
              {shared.shareFocusHours && <div><span>Nível</span><b>{xp.currentLevel}</b></div>}
              {shared.shareWorkoutStreak && <div><span>Fichas</span><b>{workouts.length}</b></div>}
              <div><span>Hábitos hoje</span><b>{taxaHabitos}%</b></div>
            </div>
            {fixados.length === 0 ? <p className="rx-sub">Crie hábitos para mostrar sua evolução aos amigos.</p> : (
              <ul className="pf-fix">{fixados.map((h) => <li key={h.id}><span>{h.title}</span><span className={h.completed ? 'ok' : ''}>{progressoHabito(h)}</span></li>)}</ul>
            )}
          </section>
          <section>
            <h2>Conquistas</h2>
            {badges.length === 0 ? <p className="rx-sub">Nenhuma conquista ainda.</p> : (
              <div className="es-chips" style={{ marginTop: 8 }}>{badges.slice(0, 4).map((b) => <span key={b.id} className="es-chip" style={{ cursor: 'default' }}>{b.icon ? <span aria-hidden="true">{b.icon}</span> : null}{b.name || b.title}</span>)}</div>
            )}
          </section>
          <section>
            <h2>Ajuda e preferências</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button type="button" className="rx-btn ghost" onClick={onOpenSupport}>Abrir chamado</button>
              <button type="button" className="rx-btn ghost" onClick={onOpenSettings}>Preferências da conta</button>
            </div>
          </section>
        </aside>
      </div>

      {editMusica && (
        <div className="rx-overlay" onClick={() => setEditMusica(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-mu-t" onClick={(e) => e.stopPropagation()} onSubmit={salvarMusica}>
            <h2 id="pf-mu-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Música do perfil <button type="button" className="rx-link" aria-label="Fechar" onClick={() => setEditMusica(null)}><X size={16} /></button></h2>
            <div className="rx-field" style={{ marginTop: 12 }}><label htmlFor="pf-mt">Música</label><input id="pf-mt" required value={editMusica.title} onChange={(e) => setEditMusica({ ...editMusica, title: e.target.value })} /></div>
            <div className="rx-field"><label htmlFor="pf-ma">Artista ou banda</label><input id="pf-ma" required value={editMusica.artist} onChange={(e) => setEditMusica({ ...editMusica, artist: e.target.value })} /></div>
            <div className="rx-field"><label htmlFor="pf-mb">Álbum <span className="rx-sub">(opcional)</span></label><input id="pf-mb" value={editMusica.album} onChange={(e) => setEditMusica({ ...editMusica, album: e.target.value })} /></div>
            <p style={{ margin: '0 0 8px' }}>Sugestões</p>
            <div className="es-chips" style={{ marginBottom: 16 }}>{SUGESTOES.map((s) => <button type="button" key={s.title} className="es-chip" onClick={() => setEditMusica({ title: s.title, artist: s.artist, album: s.album, duration: s.duration })}>{s.title}</button>)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setEditMusica(null)}>Cancelar</button>
              <button type="submit" className="rx-btn">Salvar música</button>
            </div>
          </form>
        </div>
      )}

      {novaPl && (
        <div className="rx-overlay" onClick={() => setNovaPl(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-pl-t" onClick={(e) => e.stopPropagation()} onSubmit={salvarPlaylist}>
            <h2 id="pf-pl-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>Nova playlist <button type="button" className="rx-link" aria-label="Fechar" onClick={() => setNovaPl(null)}><X size={16} /></button></h2>
            <div className="rx-field" style={{ marginTop: 12 }}><label htmlFor="pf-pt">Nome</label><input id="pf-pt" required value={novaPl.title} onChange={(e) => setNovaPl({ ...novaPl, title: e.target.value })} /></div>
            <p style={{ margin: '0 0 8px' }}>Plataforma</p>
            <div className="es-chips" style={{ marginBottom: 14 }}>{PLATAFORMAS.map(([id, label]) => <button type="button" key={id} className="es-chip" aria-pressed={novaPl.platform === id} onClick={() => setNovaPl({ ...novaPl, platform: id })}>{label}</button>)}</div>
            <div className="rx-field"><label htmlFor="pf-pu">Link</label><input id="pf-pu" type="url" required placeholder="https://" value={novaPl.url} onChange={(e) => setNovaPl({ ...novaPl, url: e.target.value })} /></div>
            <div className="rx-field"><label htmlFor="pf-pd">Descrição <span className="rx-sub">(opcional)</span></label><input id="pf-pd" value={novaPl.description} onChange={(e) => setNovaPl({ ...novaPl, description: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="rx-btn ghost" onClick={() => setNovaPl(null)}>Cancelar</button>
              <button type="submit" className="rx-btn">Adicionar playlist</button>
            </div>
          </form>
        </div>
      )}

      {editShared && (
        <div className="rx-overlay" onClick={() => setEditShared(false)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-sh-t" style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 id="pf-sh-t">O que seus amigos veem</h2>
            <p>Cada opção é salva na hora. A taxa de hábitos de hoje aparece sempre.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {METRICAS.map(([k, label]) => (
                <button type="button" key={k} className="es-switch" role="switch" aria-checked={Boolean(shared[k])} onClick={() => alternarMetrica(k)}><span className="knob" aria-hidden="true" />{label}</button>
              ))}
            </div>
            {habits.length > 0 && (<>
              <p style={{ margin: '0 0 8px' }}>Hábitos mostrados (até 4; sem escolha, aparecem os primeiros)</p>
              <div className="es-chips" style={{ marginBottom: 16 }}>{habits.map((h) => <button type="button" key={h.id} className="es-chip" aria-pressed={(shared.selectedHabitIds || []).includes(h.id)} onClick={() => alternarFixado(h.id)}>{h.title}</button>)}</div>
            </>)}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="rx-btn" onClick={() => setEditShared(false)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
