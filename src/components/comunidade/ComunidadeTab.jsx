import React, { useCallback, useEffect, useState } from 'react';
import { AtSign, Copy, Check, Search, UserPlus, Users, Clock, Inbox, ShieldCheck, X } from 'lucide-react';
import '../../styles/comunidade.css';

/**
 * Comunidade (proposta 14, aprovada em 22/11/2026). Mesmas chamadas ao servidor da SocialTab antiga,
 * que continua no código. Feed de atividades, Conquistas e Ofensiva saíram da tela por decisão do usuário:
 * o servidor não guarda atividades, a lista de conquistas é sempre vazia e a ofensiva nunca é calculada.
 */

const CORES = ['#7C5CFF', '#0EA5E9', '#16A34A', '#EA580C', '#DB2777', '#0D9488'];
const corDe = (s = '') => CORES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];
const iniciais = (nome = '') => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || 'E';
const ehImagem = (v) => typeof v === 'string' && /^(data:image|https?:)/.test(v);

function Avatar({ pessoa, grande = false }) {
  const chave = pessoa?.username || pessoa?.name || '';
  return (
    <span className={`cm-av${grande ? ' lg' : ''}`} style={{ '--c': corDe(chave) }} aria-hidden="true">
      {ehImagem(pessoa?.avatar) ? <img src={pessoa.avatar} alt="" /> : iniciais(pessoa?.name || chave)}
    </span>
  );
}

function Pessoa({ pessoa, children }) {
  return (
    <div className="cm-person" data-testid="cm-pessoa">
      <Avatar pessoa={pessoa} />
      <div className="tx">
        <b>{pessoa.name || pessoa.username}</b>
        {pessoa.username && <span className="at">@{String(pessoa.username).replace(/^@/, '')}</span>}
        {pessoa.bio && <p>{pessoa.bio}</p>}
        <div className="acts">{children}</div>
      </div>
    </div>
  );
}

export function ComunidadeTab({ user, friends = [], setFriends }) {
  const [aba, setAba] = useState('conexoes'); // 'conexoes' | 'pedidos'
  const [busca, setBusca] = useState('');
  const [verRede, setVerRede] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [remover, setRemover] = useState(null);
  const handle = String(user?.username || 'usuario').replace(/^@/, '');
  const userId = user?.id;

  const carregarConexoes = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user/${userId}/connections`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.connections)) {
          setFriends?.(data.connections.map((c) => ({
            id: c.friend_id,
            name: c.friend_name,
            avatar: c.friend_avatar,
            bio: c.friend_bio || '',
            username: c.friend_username || String(c.friend_name || '').toLowerCase().replace(/\s+/g, ''),
            status: c.status,
            streakDays: c.streak_days || 0,
            points: c.points || 0
          })));
        }
      }
    } catch { /* sem conexão: mantém a lista atual */ }
  }, [userId, setFriends]);

  useEffect(() => { carregarConexoes(); }, [carregarConexoes]);

  // Busca na rede (mesma rota de antes); só roda quando a pessoa busca ou pede para ver a rede
  const procurar = busca.trim().length > 0 || verRede;
  useEffect(() => {
    if (!procurar) return undefined;
    let vivo = true;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const token = localStorage.getItem('ethos_access_token') || sessionStorage.getItem('ethos_access_token');
        const res = await fetch(`/api/community/users?q=${encodeURIComponent(busca)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!vivo) return;
        if (res.ok) { const data = await res.json(); setResultados(data.users || []); } else setResultados([]);
      } catch { if (vivo) setResultados([]); } finally { if (vivo) setBuscando(false); }
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [busca, procurar]);

  const copiarHandle = () => {
    navigator.clipboard?.writeText(`@${handle}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const conectar = async (alvo) => {
    if (!user?.id) return;
    setOcupado(alvo.id);
    try {
      const res = await fetch(`/api/user/${user.id}/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: alvo.id, targetUsername: alvo.username }) });
      if (res.ok) {
        setResultados((prev) => prev.map((u) => (u.id === alvo.id ? { ...u, status: 'pending_sent' } : u)));
        await carregarConexoes();
      }
    } catch { /* falha de rede: nada muda na tela */ } finally { setOcupado(null); }
  };
  const aceitar = async (id) => {
    if (!user?.id) return;
    setOcupado(id);
    try { const res = await fetch(`/api/user/${user.id}/connect/${id}/accept`, { method: 'PUT' }); if (res.ok) await carregarConexoes(); } catch { /* sem conexão */ } finally { setOcupado(null); }
  };
  // Recusar, cancelar pedido enviado e desconectar usam a mesma rota (remove o vínculo nos dois sentidos)
  const desfazer = async (id) => {
    if (!user?.id) return;
    setOcupado(id);
    try { const res = await fetch(`/api/user/${user.id}/connect/${id}`, { method: 'DELETE' }); if (res.ok) await carregarConexoes(); } catch { /* sem conexão */ } finally { setOcupado(null); setRemover(null); }
  };

  const conectados = friends.filter((f) => f.status === 'approved');
  const recebidos = friends.filter((f) => f.status === 'pending_received');
  const enviados = friends.filter((f) => f.status === 'pending_sent');
  const estadoDe = (u) => friends.find((f) => f.id === u.id)?.status || u.status || 'none';

  const acaoRede = (u) => {
    if (u.id === user?.id) return <span className="cm-state">Você</span>;
    const st = estadoDe(u);
    if (st === 'approved') return <span className="cm-state ok"><Check size={15} />Conectado</span>;
    if (st === 'pending_sent') return <span className="cm-state"><Clock size={15} />Pedido enviado</span>;
    if (st === 'pending_received') return <button type="button" className="rx-btn tiny" disabled={ocupado === u.id} onClick={() => aceitar(u.id)}>Aceitar pedido</button>;
    return <button type="button" className="rx-btn tiny" disabled={ocupado === u.id} onClick={() => conectar(u)}><UserPlus size={15} />Conectar</button>;
  };

  return (
    <div className="cm">
      <div className="cm-head">
        <h1>Comunidade</h1>
        <p>Conecte-se com pessoas pelo @ e acompanhe quem você escolheu.</p>
      </div>
      <div className="cm-grid-main">
        <div className="cm-col">
          <section className="cm-me rx-glass-card">
            <Avatar pessoa={user} grande />
            <div className="cm-me-tx">
              <h2>{user?.name || 'Seu perfil'}</h2>
              <button type="button" className="cm-handle" onClick={copiarHandle} title="Copiar seu @" aria-label={`Copiar seu @${handle}`}>
                <AtSign size={15} />{handle}{copiado ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <p>{copiado ? 'Copiado. Agora é só mandar para alguém.' : 'Mande seu @ para alguém te encontrar.'}</p>
            </div>
            <div className="cm-stats">
              <div><b>{conectados.length}</b><span>{conectados.length === 1 ? 'conexão' : 'conexões'}</span></div>
              <div><b>{recebidos.length}</b><span>{recebidos.length === 1 ? 'pedido novo' : 'pedidos novos'}</span></div>
            </div>
          </section>

          <section className="cm-card rx-glass-card">
            <h2><span className="rx-tile sm solid" style={{ '--c': 'var(--rx-m-social)' }}><Search size={16} /></span>Encontrar pessoas</h2>
            <label className="cm-field">
              <Search size={18} />
              <input type="search" placeholder="Buscar por @ ou nome" aria-label="Buscar pessoas" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            {procurar ? (
              <>
                <p className="cm-grp">{busca.trim() ? `Resultados para “${busca.trim()}”` : 'Pessoas na rede'}{buscando ? ', buscando…' : ''}</p>
                {!buscando && resultados.length === 0 ? (
                  <p className="rx-sub">{busca.trim() ? 'Ninguém com esse @ ou nome. Confira a grafia ou peça o @ à pessoa.' : 'Ninguém na rede ainda.'}</p>
                ) : (
                  <div className="cm-list">{resultados.map((u) => <Pessoa key={u.id} pessoa={u}>{acaoRede(u)}</Pessoa>)}</div>
                )}
              </>
            ) : (
              <button type="button" className="rx-btn ghost tiny cm-ver" onClick={() => setVerRede(true)}>Ver pessoas na rede</button>
            )}
          </section>

          <section className="cm-card rx-glass-card">
            <div className="cm-seg" role="group" aria-label="Lista">
              <button type="button" aria-pressed={aba === 'conexoes'} onClick={() => setAba('conexoes')}>Conexões <span>{conectados.length}</span></button>
              <button type="button" aria-pressed={aba === 'pedidos'} onClick={() => setAba('pedidos')}>Pedidos {recebidos.length > 0 ? <em className="cm-badge" aria-label={`${recebidos.length} novos`}>{recebidos.length}</em> : <span>{enviados.length}</span>}</button>
            </div>
            {aba === 'conexoes' ? (
              conectados.length ? (
                <div className="cm-list">{conectados.map((f) => (
                  <Pessoa key={f.id} pessoa={f}><button type="button" className="rx-btn ghost tiny" disabled={ocupado === f.id} onClick={() => setRemover(f)}>Desconectar</button></Pessoa>
                ))}</div>
              ) : (
                <div className="cm-empty"><span className="rx-tile lg" style={{ '--c': 'var(--rx-m-social)' }}><Users size={24} /></span><b>Nenhuma conexão ainda</b><p>Busque alguém pelo @ ou mande o seu para um amigo.</p></div>
              )
            ) : (
              <>
                {recebidos.length > 0 && (<><p className="cm-grp">Recebidos</p><div className="cm-list">{recebidos.map((f) => (
                  <Pessoa key={f.id} pessoa={f}>
                    <button type="button" className="rx-btn tiny" disabled={ocupado === f.id} onClick={() => aceitar(f.id)}><Check size={15} />Aceitar</button>
                    <button type="button" className="rx-btn ghost tiny" disabled={ocupado === f.id} onClick={() => desfazer(f.id)}>Recusar</button>
                  </Pessoa>
                ))}</div></>)}
                {enviados.length > 0 && (<><p className="cm-grp">Enviados por você</p><div className="cm-list">{enviados.map((f) => (
                  <Pessoa key={f.id} pessoa={f}>
                    <span className="cm-state"><Clock size={15} />Aguardando resposta</span>
                    <button type="button" className="rx-btn ghost tiny" disabled={ocupado === f.id} onClick={() => desfazer(f.id)}>Cancelar pedido</button>
                  </Pessoa>
                ))}</div></>)}
                {recebidos.length === 0 && enviados.length === 0 && (
                  <div className="cm-empty"><span className="rx-tile lg" style={{ '--c': 'var(--rx-m-social)' }}><Inbox size={24} /></span><b>Nenhum pedido</b><p>Pedidos que você recebe ou envia aparecem aqui.</p></div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="cm-card rx-glass-card cm-side">
          <h2>Como funciona</h2>
          <ul>
            <li><span className="rx-tile sm" style={{ '--c': 'var(--rx-m-social)' }}><UserPlus size={16} /></span><div><b>Conectar pede confirmação</b>A outra pessoa precisa aceitar o seu pedido.</div></li>
            <li><span className="rx-tile sm" style={{ '--c': 'var(--rx-m-espacos)' }}><ShieldCheck size={16} /></span><div><b>Seus registros continuam seus</b>Hábitos, notas, saúde e agenda não aparecem aqui. Seus amigos veem seu nome, @, foto e bio.</div></li>
            <li><span className="rx-tile sm" style={{ '--c': 'var(--rx-m-perfil)' }}><X size={16} /></span><div><b>Desconectar quando quiser</b>A pessoa sai da sua lista; ela não é avisada.</div></li>
          </ul>
        </aside>
      </div>

      {remover && (
        <div className="rx-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRemover(null); }}>
          <div className="rx-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cmRemT">
            <h2 id="cmRemT">Desconectar de {remover.name || remover.username}?</h2>
            <p>A pessoa sai da sua lista de conexões. Para voltar, é preciso enviar um novo pedido.</p>
            <div className="opts">
              <button type="button" className="rx-btn" onClick={() => desfazer(remover.id)} disabled={ocupado === remover.id}>Desconectar</button>
              <button type="button" className="rx-btn ghost" onClick={() => setRemover(null)} autoFocus>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
