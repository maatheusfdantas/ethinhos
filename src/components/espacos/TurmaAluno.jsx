import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, CalendarClock, Dumbbell, Flag, Megaphone, Ticket } from 'lucide-react';
import { espacosApi, fmtUntil, initialsOf } from './espacosApi';
import { prepararImagem } from './imagem';
import '../../styles/espacos.css';

const NOTIF = { evento_convite: 'Convite de evento', evento_cancelado: 'Evento cancelado', evento_texto: 'Evento atualizado', comentario: 'Resposta a um comentário', plano_publicado: 'Plano publicado' };

/** Capa retangular (como LinkedIn/YouTube) com a foto redonda do profissional sobreposta. */
export function CapaTurma({ capaUrl, fotoUrl, proName, small = false }) {
  return (
    <div className={`tc-top ${small ? 'small' : ''}`}>
      <div className="tc-cover" role={capaUrl ? 'img' : undefined} aria-label={capaUrl ? 'Capa da turma' : undefined} style={capaUrl ? { backgroundImage: `url(${capaUrl})` } : undefined} />
      <span className="tc-avatar">{fotoUrl ? <img src={fotoUrl} alt={`Foto de ${proName}`} /> : <span aria-hidden="true">{initialsOf(proName)}</span>}</span>
    </div>
  );
}

/** Card da turma para o aluno: nome, profissional, treino atribuído, novidades e "Abrir turma". */
export function TurmaCard({ espaco, turma, onOpen, onLeave }) {
  const novidades = (espaco.avisosNovos || 0) + (espaco.notificacoes || 0);
  return (
    <article className="tc-card" data-testid="card-turma">
      <CapaTurma capaUrl={turma.capaUrl} fotoUrl={espaco.fotoUrl} proName={espaco.proName} />
      <div className="tc-in">
        <h3>{turma.name} {novidades > 0 && <span className="rx-pill now">{novidades === 1 ? '1 novidade' : `${novidades} novidades`}</span>}</h3>
        <p className="es-sub" style={{ margin: 0 }}>{espaco.proName}, {espaco.modelLabel}. {espaco.spaceName}.</p>
        <div className="tc-cells">
          <div><b>Treino</b>{turma.treino || 'Nenhum treino atribuído ainda'}</div>
          <div><b>Avisos</b>{espaco.avisosNovos ? `${espaco.avisosNovos} ${espaco.avisosNovos === 1 ? 'novo' : 'novos'}` : 'Nada novo'}</div>
          <div><b>Notificações</b>{espaco.notificacoes ? `${espaco.notificacoes} sem ler` : 'Nada novo'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="rx-btn" onClick={onOpen}><Ticket size={16} />Abrir turma</button>
          <button type="button" className="rx-btn ghost tiny" onClick={onLeave}>Sair da turma</button>
        </div>
      </div>
    </article>
  );
}

/**
 * Tela da turma (aluno): treinos atribuídos, avisos, eventos aceitos e notificações do espaço.
 * A lista de colegas nunca aparece (o servidor nem envia).
 */
export function TurmaAluno({ memberId, onBack, onOpenTab, toast }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState(null);
  const [den, setDen] = useState(null);
  const top = useRef(null);
  useEffect(() => {
    espacosApi.minhaTurma(memberId).then(setD, (e) => setErro(e.message));
    top.current?.focus();
  }, [memberId]);
  if (erro) return <div className="es"><button type="button" className="rx-btn ghost tiny" onClick={onBack}><ArrowLeft size={15} />Espaços</button><div className="es-error" style={{ marginTop: 12 }}>{erro}</div></div>;
  if (!d) return <div className="es"><p className="es-sub">Carregando a turma…</p></div>;
  return (
    <div className="es">
      <button ref={top} type="button" className="rx-btn ghost tiny" onClick={onBack} style={{ marginBottom: 14 }}><ArrowLeft size={15} />Espaços</button>
      <article className="tc-card" style={{ marginBottom: 18 }}>
        <CapaTurma capaUrl={d.turma.capaUrl} fotoUrl={d.espaco.fotoUrl} proName={d.espaco.proName} />
        <div className="tc-in">
          <h1 style={{ margin: 0, fontSize: 'clamp(26px, 2.6vw, 34px)' }}>{d.turma.name}</h1>
          <p className="es-sub" style={{ margin: 0 }}>Turma de {d.espaco.proName}, {d.espaco.name}.</p>
          {(d.turma.capaUrl || d.espaco.fotoUrl) && <button type="button" className="rx-link" style={{ justifySelf: 'start' }} onClick={() => setDen({ kind: d.turma.capaUrl ? 'capa' : 'foto', reason: '' })}><Flag size={13} /> Denunciar imagem</button>}
        </div>
      </article>
      <div className="es-grid">
        <div className="es-stack">
          <article className="es-card">
            <h2>Treinos atribuídos</h2>
            {d.treinos.length === 0 ? <div className="es-empty"><p>Nenhum treino atribuído ainda.</p></div> : d.treinos.map((t) => (
              <div className="es-row" key={t.id}><span className="es-avatar"><Dumbbell size={15} /></span><div className="grow"><b>{t.name}</b><small>{t.exercises} {t.exercises === 1 ? 'exercício' : 'exercícios'}{t.daTurma ? ', da turma' : ', individual'}{t.adapted ? ', adaptado para você' : ''}</small></div></div>
            ))}
            {d.treinos.length > 0 && <button type="button" className="rx-btn tiny" style={{ marginTop: 10 }} onClick={() => onOpenTab?.('workouts')}>Treinar em “Do seu personal”</button>}
          </article>
          <article className="es-card">
            <h2>Avisos</h2>
            {d.avisos.length === 0 ? <div className="es-empty"><p>Nenhum aviso.</p></div> : d.avisos.map((a) => (
              <div className="es-row" key={a.id}><span className="es-avatar"><Megaphone size={15} /></span><div className="grow"><b>{a.title}{a.novo ? ' (novo)' : ''}</b><small>{fmtUntil(a.createdAt)}{a.daTurma ? ', para a turma' : ''}</small></div>
                <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { setAviso(await espacosApi.meuAviso(a.id)); setD({ ...d, avisos: d.avisos.map((x) => (x.id === a.id ? { ...x, novo: false } : x)) }); } catch (e) { toast?.(e.message); } }}>Abrir</button></div>
            ))}
          </article>
        </div>
        <aside className="rx-rail">
          <section className="summary"><h2>Eventos aceitos</h2>
            {d.eventos.length === 0 ? <p className="rx-sub">Nenhum evento aceito pela frente.</p> : <ul className="rx-list">{d.eventos.map((e) => <li key={e.id}><span className="ic"><CalendarClock size={16} /></span><div><b>{e.title}</b><p>{fmtUntil(e.startsAt)}{e.location ? `, ${e.location}` : ''}</p></div><span /></li>)}</ul>}
          </section>
          <section><h2>Notificações</h2>
            {d.notificacoes.length === 0 ? <p className="rx-sub">Nada novo.</p> : <ul className="rx-list">{d.notificacoes.map((n) => <li key={n.id}><span className="ic"><Bell size={16} /></span><div><b>{NOTIF[n.type] || 'Novidade'}</b><p>{fmtUntil(n.createdAt)}</p></div><span /></li>)}</ul>}
          </section>
        </aside>
      </div>

      {aviso && (
        <div className="rx-overlay" onClick={() => setAviso(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-av" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="ta-av">{aviso.aviso.title}</h2>
            <p>{aviso.aviso.proName}, {fmtUntil(aviso.aviso.createdAt)}</p>
            <p style={{ whiteSpace: 'pre-line', color: 'var(--rx-ink-2)' }}>{aviso.aviso.body}</p>
            <p className="es-sub">Para comentar em privado, use Pendências ou “Avisos recebidos”.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setAviso(null)}>Fechar</button></div>
          </div>
        </div>
      )}
      {den && (
        <div className="rx-overlay" onClick={() => setDen(null)}>
          <form className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ta-den" onClick={(e) => e.stopPropagation()} onSubmit={async (ev) => {
            ev.preventDefault();
            try { await espacosApi.denunciarImagem(memberId, den.kind, den.reason); toast?.('Denúncia enviada ao Ethos. Obrigado.'); setDen(null); } catch (e) { toast?.(e.message); }
          }}>
            <h2 id="ta-den">Denunciar imagem</h2>
            <p>O Ethos analisa e pode remover a imagem. O profissional não vê quem denunciou.</p>
            <div className="es-chips" style={{ marginBottom: 10 }}>
              {d.turma.capaUrl && <button type="button" className="es-chip" aria-pressed={den.kind === 'capa'} onClick={() => setDen({ ...den, kind: 'capa' })}>Capa da turma</button>}
              {d.espaco.fotoUrl && <button type="button" className="es-chip" aria-pressed={den.kind === 'foto'} onClick={() => setDen({ ...den, kind: 'foto' })}>Foto do profissional</button>}
            </div>
            <div className="es-field"><label htmlFor="ta-den-r">Motivo (opcional)</label><textarea id="ta-den-r" className="es-input" style={{ height: 70, paddingTop: 10 }} maxLength={280} value={den.reason} onChange={(e) => setDen({ ...den, reason: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button type="button" className="rx-btn ghost" onClick={() => setDen(null)}>Cancelar</button><button type="submit" className="rx-btn">Enviar denúncia</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

/** Profissional: foto redonda do espaço e capa de cada turma (decisão 5). */
export function AparenciaTurma({ turma, toast }) {
  const [m, setM] = useState(null);
  const [busy, setBusy] = useState(false);
  const fotoRef = useRef(null);
  const capaRef = useRef(null);
  const load = () => espacosApi.midia().then(setM, () => setM({ foto: null, capas: {} }));
  useEffect(() => { load(); }, [turma.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = async (file, kind) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await prepararImagem(file, kind);
      if (kind === 'foto') await espacosApi.enviarFoto(data); else await espacosApi.enviarCapa(turma.id, data);
      toast?.(kind === 'foto' ? 'Foto atualizada.' : 'Capa atualizada.');
      await load();
    } catch (e) { toast?.(e.message); } finally { setBusy(false); }
  };
  if (!m) return null;
  return (
    <div className="tc-edit">
      <h3>Aparência para os alunos</h3>
      <div className="tc-card" style={{ boxShadow: 'none' }}><CapaTurma capaUrl={m.capas?.[turma.id] || null} fotoUrl={m.foto} proName="Você" small /></div>
      <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { enviar(e.target.files?.[0], 'foto'); e.target.value = ''; }} />
      <input ref={capaRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { enviar(e.target.files?.[0], 'capa'); e.target.value = ''; }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={() => capaRef.current?.click()}>Trocar capa</button>
        <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={() => fotoRef.current?.click()}>Trocar foto</button>
        {m.capas?.[turma.id] && <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={async () => { try { await espacosApi.removerCapa(turma.id); toast?.('Capa removida.'); load(); } catch (e) { toast?.(e.message); } }}>Remover capa</button>}
        {m.foto && <button type="button" className="rx-btn ghost tiny" disabled={busy} onClick={async () => { try { await espacosApi.removerFoto(); toast?.('Foto removida.'); load(); } catch (e) { toast?.(e.message); } }}>Remover foto</button>}
      </div>
      <p className="es-sub">A foto vale para todas as suas turmas. JPG, PNG ou WebP.</p>
    </div>
  );
}
