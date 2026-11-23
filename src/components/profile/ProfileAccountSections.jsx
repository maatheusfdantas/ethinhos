import React, { useCallback, useEffect, useState } from 'react';
import ProfileBiometricsCard from './ProfileBiometricsCard';
import { SpotifyConnectCard } from './SpotifyConnectCard';

const GOALS = [
  ['', 'Não definido'], ['perder_peso', 'Perder peso'], ['manter', 'Manter o peso'], ['ganhar_massa', 'Ganhar massa'],
  ['condicionamento', 'Melhorar o condicionamento'], ['sono', 'Dormir melhor'], ['outro', 'Outro']
];
const ACTIVITY = [['', 'Não definido'], ['sedentario', 'Sedentário'], ['leve', 'Leve (1 a 2 treinos por semana)'], ['moderado', 'Moderado (3 a 4 treinos)'], ['intenso', 'Intenso (5 ou mais)']];
const SECTIONS = [['ps-saude', 'Saúde'], ['ps-contas', 'Contas conectadas'], ['ps-seguranca', 'Segurança'], ['ps-dados', 'Dados e privacidade']];

const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

const initialWeightStr = (user) => {
  const uid = user?.id || 'default';
  const v = Number(user?.weight || localStorage.getItem(`ethos_weight_${uid}`));
  return Number.isFinite(v) && v >= 20 && v <= 400 ? String(v) : '';
};

const initialHeightStr = (user) => {
  const uid = user?.id || 'default';
  const localCm = Number(localStorage.getItem(`ethos_height_cm_${uid}`));
  if (Number.isFinite(localCm) && localCm >= 50 && localCm <= 250) return String(Math.round(localCm));
  if (!user?.height) return '';
  const h = Number(user.height);
  if (!Number.isFinite(h) || h <= 0) return '';
  return String(Math.round(h < 3 ? h * 100 : h));
};

/** Saúde, contas conectadas, segurança e dados. Tudo ligado à própria conta.
 * `waterSlot` (opcional) troca ou oculta (`false`) o cartão legado de peso e água quando a seção de Água é exibida separadamente. */
export function ProfileAccountSections({ user, setUser, health, setHealth, showToast, onOpenSettings, onLogout, waterSlot = null }) {
  /* ---------- Saúde (privado: Peso e Altura + perfil de saúde) ---------- */
  const [hp, setHp] = useState(() => ({
    weight: initialWeightStr(user),
    height: initialHeightStr(user),
    goal: '',
    activityLevel: '',
    birthDate: ''
  }));
  const [hpState, setHpState] = useState('idle'); // idle | saving | saved | error
  const [hpError, setHpError] = useState('');

  useEffect(() => {
    let alive = true;
    const uid = user?.id || 'default';
    fetch('/api/account/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const w = d.weight ? String(d.weight) : initialWeightStr(user);
        const h = d.height ? String(Math.round(Number(d.height) < 3 ? Number(d.height) * 100 : Number(d.height))) : initialHeightStr(user);
        if (d.weight) localStorage.setItem(`ethos_weight_${uid}`, String(d.weight));
        if (d.height) localStorage.setItem(`ethos_height_cm_${uid}`, h);
        setHp({
          weight: w,
          height: h,
          goal: d.goal || '',
          activityLevel: d.activityLevel || '',
          birthDate: d.birthDate || ''
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [user?.id]);

  const saveHealth = async (e) => {
    e.preventDefault();
    setHpState('saving');
    setHpError('');
    const uid = user?.id || 'default';
    const w = hp.weight === '' ? null : Number(hp.weight);
    const hCm = hp.height === '' ? null : Number(hp.height);

    if (w !== null && (!Number.isFinite(w) || w < 20 || w > 400)) {
      setHpError('Peso deve estar entre 20 e 400 kg.');
      setHpState('error');
      return;
    }
    if (hCm !== null && (!Number.isFinite(hCm) || hCm < 50 || hCm > 250)) {
      setHpError('Altura deve estar entre 50 e 250 cm.');
      setHpState('error');
      return;
    }

    try {
      if (w !== null) localStorage.setItem(`ethos_weight_${uid}`, String(w));
      if (hCm !== null) localStorage.setItem(`ethos_height_cm_${uid}`, String(hCm));

      const nextUser = {
        ...user,
        ...(w !== null ? { weight: w } : {}),
        ...(hCm !== null ? { height: Number(hCm) / 100 } : {})
      };
      setUser?.(nextUser);

      if (user?.id && (w !== null || hCm !== null)) {
        fetch(`/api/user/${user.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(w !== null ? { weight: w } : {}),
            ...(hCm !== null ? { height: Number(hCm) / 100 } : {})
          })
        }).catch(() => {});
      }

      const r = await fetch('/api/account/health', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: w,
          height: hCm,
          goal: hp.goal,
          activityLevel: hp.activityLevel,
          birthDate: hp.birthDate
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 503) {
        setHpError(d.error || 'Não foi possível salvar agora.');
        setHpState('error');
        return;
      }
      setHpState('saved');
      showToast?.('Dados de saúde salvos.');
    } catch {
      setHpState('saved');
      showToast?.('Dados de saúde salvos.');
    }
  };

  /* ---------- Contas conectadas: Google ---------- */
  const [google, setGoogle] = useState({ loading: true, linked: false, email: '', available: false });
  const [accErr, setAccErr] = useState('');
  const [unlinking, setUnlinking] = useState(false);
  const loadAccounts = useCallback(async () => {
    try {
      const [ids, prov] = await Promise.all([fetch('/api/auth/oauth/identities').then((r) => r.json()), fetch('/api/auth/oauth/providers').then((r) => r.json())]);
      const g = (ids.identities || []).find((i) => i.provider === 'google');
      setGoogle({ loading: false, linked: !!g, email: g?.provider_email || '', available: !!prov.google });
    } catch { setGoogle((s) => ({ ...s, loading: false })); }
  }, []);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  const linkGoogle = async () => {
    setAccErr('');
    try {
      const r = await fetch('/api/auth/oauth/link-ticket', { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d.ticket) { setAccErr(d.error || 'Não foi possível conectar agora.'); return; }
      window.location.href = `/api/auth/oauth/google?link=${encodeURIComponent(d.ticket)}`;
    } catch { setAccErr('Não foi possível conectar agora.'); }
  };
  const unlinkGoogle = async () => {
    setAccErr('');
    try {
      const r = await fetch('/api/auth/oauth/identities?provider=google', { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setAccErr(d.error || 'Não foi possível desconectar agora.'); setUnlinking(false); return; }
      setUnlinking(false); showToast?.('Google desconectado.'); loadAccounts();
    } catch { setAccErr('Não foi possível desconectar agora.'); }
  };

  /* ---------- Dados e privacidade ---------- */
  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    setExporting(true);
    try {
      const r = await fetch('/api/account/export');
      if (!r.ok) throw new Error('falha');
      const blob = new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ethos-meus-dados-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      showToast?.('Seus dados foram baixados.');
    } catch { showToast?.('Não foi possível baixar seus dados agora.'); } finally { setExporting(false); }
  };

  const [del, setDel] = useState(null); // null | { username, password, error, busy }
  const deleteAccount = async (e) => {
    e.preventDefault(); setDel((d) => ({ ...d, busy: true, error: '' }));
    try {
      const r = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: del.username, password: del.password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setDel((x) => ({ ...x, busy: false, error: d.error || 'Não foi possível excluir agora.' })); return; }
      onLogout?.();
    } catch { setDel((x) => ({ ...x, busy: false, error: 'Não foi possível excluir agora.' })); }
  };
  const typed = String(del?.username || '').replace(/^@+/, '').toLowerCase() === String(user?.username || '').toLowerCase();

  return (
    <div className="ps">
      <nav className="ps-nav" aria-label="Seções do perfil">
        {SECTIONS.map(([id, label]) => <button type="button" key={id} onClick={() => jump(id)}>{label}</button>)}
      </nav>

      <section id="ps-saude" className="ps-card" aria-labelledby="psSaude" data-testid="secao-saude">
        <div className="ps-head"><h3 id="psSaude">Saúde</h3><span className="ps-lock">Só você vê</span></div>
        <p className="ps-muted">
          Preencha seu <b>Peso</b> e sua <b>Altura</b> para cálculos de saúde e sugestão diária de hidratação. Esses dados são só seus e não aparecem na comunidade.
        </p>
        {waterSlot !== false && (waterSlot || <ProfileBiometricsCard user={user} setUser={setUser} health={health} setHealth={setHealth} showToast={showToast} hideConsumption />)}
        <form onSubmit={saveHealth} className="ps-form">
          <div className="ps-row">
            <label htmlFor="psWeightKg">
              Peso (kg)
              <input
                id="psWeightKg"
                type="number"
                inputMode="decimal"
                min="20"
                max="400"
                step="0.5"
                value={hp.weight}
                onChange={(e) => setHp({ ...hp, weight: e.target.value })}
                placeholder="Ex.: 70"
              />
            </label>
            <label htmlFor="psHeightCm">
              Altura (cm)
              <input
                id="psHeightCm"
                type="number"
                inputMode="numeric"
                min="50"
                max="250"
                value={hp.height}
                onChange={(e) => setHp({ ...hp, height: e.target.value })}
                placeholder="Ex.: 172"
              />
            </label>
            <label>
              Data de nascimento <span className="ps-opt">(opcional)</span>
              <input
                type="date"
                value={hp.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setHp({ ...hp, birthDate: e.target.value })}
              />
            </label>
          </div>
          <div className="ps-row">
            <label>Objetivo principal<select value={hp.goal} onChange={(e) => setHp({ ...hp, goal: e.target.value })}>{GOALS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label>Nível de atividade<select value={hp.activityLevel} onChange={(e) => setHp({ ...hp, activityLevel: e.target.value })}>{ACTIVITY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          </div>
          <button type="submit" className="ps-btn" disabled={hpState === 'saving'}>{hpState === 'saving' ? 'Salvando…' : 'Salvar dados de saúde'}</button>
          {hpState === 'saved' && <span className="ps-ok" role="status">Salvo.</span>}
          {hpError && <span className="ps-error" role="alert">{hpError}</span>}
        </form>
      </section>

      <section id="ps-contas" className="ps-card" aria-labelledby="psContas">
        <h3 id="psContas">Contas conectadas</h3>
        <p className="ps-muted">Conexões opcionais. Você pode desconectar quando quiser.</p>
        <div className="ps-account">
          <div><b>Google</b><span>{google.loading ? 'Verificando…' : google.linked ? `Conectado${google.email ? ` · ${google.email}` : ''}` : 'Entrar no Ethos com sua conta Google'}</span></div>
          {!google.loading && google.linked && !unlinking && <button type="button" className="ps-btn ghost" onClick={() => setUnlinking(true)}>Desconectar</button>}
          {!google.loading && !google.linked && google.available && <button type="button" className="ps-btn" onClick={linkGoogle}>Conectar Google</button>}
          {!google.loading && !google.linked && !google.available && <span className="ps-muted">Indisponível no momento</span>}
        </div>
        {unlinking && (
          <div className="ps-confirm" role="alertdialog" aria-label="Confirmar desconexão do Google">
            <p>Desconectar o Google? Você continua entrando com e-mail e senha. Se essa for sua única forma de entrar, a desconexão é recusada.</p>
            <button type="button" className="ps-btn" onClick={unlinkGoogle}>Sim, desconectar</button>
            <button type="button" className="ps-btn ghost" onClick={() => setUnlinking(false)}>Cancelar</button>
          </div>
        )}
        {accErr && <p className="ps-error" role="alert">{accErr}</p>}
        <SpotifyConnectCard showToast={showToast} />
      </section>

      <section id="ps-seguranca" className="ps-card" aria-labelledby="psSeg">
        <h3 id="psSeg">Segurança e preferências</h3>
        <p className="ps-muted">Senha, módulos visíveis e demais preferências da conta ficam em Configurações.</p>
        <button type="button" className="ps-btn ghost" onClick={onOpenSettings}>Abrir configurações da conta</button>
      </section>

      <section id="ps-dados" className="ps-card" aria-labelledby="psDados">
        <h3 id="psDados">Dados e privacidade</h3>
        <p className="ps-muted">Você é dono dos seus dados. Pode levar uma cópia ou apagar tudo.</p>
        <div className="ps-account">
          <div><b>Baixar meus dados</b><span>Um arquivo com seu perfil, hábitos, agenda, notas e saúde.</span></div>
          <button type="button" className="ps-btn ghost" onClick={exportData} disabled={exporting}>{exporting ? 'Preparando…' : 'Baixar'}</button>
        </div>
        <div className="ps-account danger">
          <div><b>Excluir minha conta</b><span>Apaga a conta e todos os seus dados. Não dá para desfazer.</span></div>
          {user?.role === 'admin'
            ? <span className="ps-muted">Contas de administrador não podem ser excluídas aqui.</span>
            : <button type="button" className="ps-btn danger" onClick={() => setDel({ username: '', password: '', error: '', busy: false })}>Excluir conta</button>}
        </div>
      </section>

      {del && (
        <div className="rx-overlay" onClick={() => !del.busy && setDel(null)}>
          <form className="rx-dialog ps-del" role="alertdialog" aria-modal="true" aria-labelledby="psDel" onClick={(e) => e.stopPropagation()} onSubmit={deleteAccount}>
            <h2 id="psDel">Excluir sua conta?</h2>
            <p>Vamos apagar para sempre seu perfil, hábitos, eventos, notas, dados de saúde e conexões. Isso não pode ser desfeito. Se quiser uma cópia, baixe seus dados antes.</p>
            <label htmlFor="psDelUser">Digite seu @ (<b>@{user?.username}</b>) para confirmar</label>
            <input id="psDelUser" autoComplete="off" autoFocus value={del.username} onChange={(e) => setDel({ ...del, username: e.target.value, error: '' })} />
            <label htmlFor="psDelPass">Senha <span className="ps-opt">(se sua conta usa senha)</span></label>
            <input id="psDelPass" type="password" autoComplete="current-password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value, error: '' })} />
            {del.error && <p className="ps-error" role="alert">{del.error}</p>}
            <div className="nt-form-btns">
              <button type="submit" className="ps-btn danger" disabled={!typed || del.busy}>{del.busy ? 'Excluindo…' : 'Excluir tudo'}</button>
              <button type="button" className="ps-btn ghost" onClick={() => setDel(null)} disabled={del.busy}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
