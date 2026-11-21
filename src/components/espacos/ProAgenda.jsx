import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, Megaphone, MessageSquare } from 'lucide-react';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { espacosApi, fmtUntil, initialsOf } from './espacosApi';

const localTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'; } catch { return 'America/Sao_Paulo'; } };
const pad = (n) => String(n).padStart(2, '0');
const toLocalParts = (iso) => { const d = new Date(iso); return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
const toIso = (date, time) => { const d = new Date(`${date}T${time}`); return Number.isFinite(d.getTime()) ? d.toISOString() : null; };
const STATUS = { pendente: 'Pendente', aceito: 'Aceito', recusado: 'Recusado', sem_resposta: 'Sem resposta' };

/** Escolha de destinatários: turma, pessoas ou todo o espaço (fixos quando vêm da turma ou da área individual). */
function Destinatarios({ value, onChange, fixed }) {
  const [opts, setOpts] = useState({ turmas: [], pessoas: [] });
  useEffect(() => {
    if (fixed) return;
    Promise.all([espacosApi.meu(), espacosApi.pessoas()]).then(([m, p]) => setOpts({ turmas: (m.turmas || []).filter((t) => t.status === 'ativa'), pessoas: p.pessoas || [] }), () => {});
  }, [fixed]);
  if (fixed) return <p className="es-sub" style={{ marginBottom: 12 }}>Para: {fixed}</p>;
  return (
    <div className="es-field">
      <span className="lbl">Para</span>
      <div className="es-chips" style={{ marginBottom: 8 }}>
        <button type="button" className="es-chip" aria-pressed={value.audience === 'turma'} disabled={!opts.turmas.length} onClick={() => onChange({ ...value, audience: 'turma', groupId: value.groupId || opts.turmas[0]?.id })}>Turma</button>
        <button type="button" className="es-chip" aria-pressed={value.audience === 'pessoas'} onClick={() => onChange({ ...value, audience: 'pessoas' })}>Pessoas</button>
        <button type="button" className="es-chip" aria-pressed={value.audience === 'espaco'} onClick={() => onChange({ ...value, audience: 'espaco' })}>Todo o espaço</button>
      </div>
      {value.audience === 'turma' && <select className="es-input" aria-label="Turma" value={value.groupId || ''} onChange={(e) => onChange({ ...value, groupId: e.target.value })}>{opts.turmas.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members} {t.members === 1 ? 'pessoa' : 'pessoas'})</option>)}</select>}
      {value.audience === 'pessoas' && (
        <div className="es-radio">{opts.pessoas.map((p) => (
          <label key={p.linkId}><input type="checkbox" checked={(value.linkIds || []).includes(p.linkId)} onChange={(e) => onChange({ ...value, linkIds: e.target.checked ? [...(value.linkIds || []), p.linkId] : (value.linkIds || []).filter((x) => x !== p.linkId) })} /><span>{p.name}<small>@{p.username}</small></span></label>
        ))}</div>
      )}
    </div>
  );
}

/** Eventos do espaço (opcionalmente só de uma turma ou de uma pessoa), com criar, detalhe, mudar, cancelar, lembrar e presença. */
export function EventosPanel({ groupId = null, linkId = null, fixedLabel = null, toast, title = 'Agenda' }) {
  const [quando, setQuando] = useState('futuros');
  const [list, setList] = useState(null);
  const [novo, setNovo] = useState(null);
  const novoDirty = Boolean(novo) && ['title', 'body', 'description', 'location'].some((k) => String(novo[k] || '').trim());
  const guardNovo = useUnsavedGuard(novoDirty, { label: novo?.body !== undefined ? 'o aviso novo' : 'o evento novo' });
  const [det, setDet] = useState(null);
  const [mudar, setMudar] = useState(null);
  const [busy, setBusy] = useState(false);
  const params = { quando, ...(groupId ? { groupId } : {}), ...(linkId ? { linkId } : {}) };

  const load = useCallback(async () => {
    try { setList((await espacosApi.eventos(params)).eventos || []); } catch (e) { setList([]); toast?.(e.message); }
  }, [quando, groupId, linkId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const openDet = async (id) => { try { setDet(await espacosApi.evento(id)); } catch (e) { toast?.(e.message); } };

  const startNovo = () => {
    const d = new Date(Date.now() + 86400000);
    setNovo({ title: '', date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, start: '18:00', end: '19:00', location: '', description: '', audience: groupId ? 'turma' : linkId ? 'pessoas' : 'turma', groupId: groupId || '', linkIds: linkId ? [linkId] : [] });
  };
  const criar = async () => {
    const startsAt = toIso(novo.date, novo.start);
    const endsAt = toIso(novo.date, novo.end);
    if (!startsAt || !endsAt) { toast?.('Data ou horário inválidos.'); return; }
    setBusy(true);
    try {
      const r = await espacosApi.criarEvento({ title: novo.title, description: novo.description, location: novo.location, startsAt, endsAt, tz: localTz(), audience: novo.audience, groupId: novo.groupId, linkIds: novo.linkIds });
      toast?.(`Convite enviado a ${r.convidados} ${r.convidados === 1 ? 'pessoa' : 'pessoas'}. O evento entra na agenda de quem aceitar.`);
      setNovo(null); load();
    } catch (e) { toast?.(e.message); } finally { setBusy(false); }
  };
  const salvarMudanca = async () => {
    const body = { title: mudar.title, location: mudar.location, description: mudar.description };
    const startsAt = toIso(mudar.date, mudar.start);
    const endsAt = toIso(mudar.date, mudar.end);
    if (startsAt !== mudar.origStart || endsAt !== mudar.origEnd) { body.startsAt = startsAt; body.endsAt = endsAt; }
    setBusy(true);
    try {
      const r = await espacosApi.editarEvento(mudar.id, body);
      toast?.(r.reconfirmar ? 'Horário mudado. Quem tinha respondido precisa confirmar de novo.' : 'Evento atualizado. Quem aceitou recebe o aviso.');
      setMudar(null); setDet(null); load();
    } catch (e) { toast?.(e.message); } finally { setBusy(false); }
  };

  return (
    <article className="es-card">
      <h2>{title}
        <span style={{ display: 'flex', gap: 6 }}>
          <span className="es-chips"><button type="button" className="es-chip" aria-pressed={quando === 'futuros'} onClick={() => setQuando('futuros')}>Próximos</button><button type="button" className="es-chip" aria-pressed={quando === 'passados'} onClick={() => setQuando('passados')}>Passados</button></span>
          <button type="button" className="rx-btn tiny" onClick={startNovo}><CalendarPlus size={15} />Novo evento</button>
        </span>
      </h2>
      {list === null ? <p className="es-sub">Carregando…</p> : list.length === 0 ? <div className="es-empty"><p>{quando === 'futuros' ? 'Nenhum evento marcado. Crie um: os convidados recebem uma pendência e o evento entra na agenda de quem aceitar.' : 'Nenhum evento passado.'}</p></div> : list.map((e) => (
        <div className="es-row" key={e.id} style={{ alignItems: 'flex-start' }}>
          <div className="grow">
            <b style={e.status === 'cancelado' ? { textDecoration: 'line-through', color: 'var(--rx-ink-3)' } : undefined}>{e.title}</b>
            <small>{fmtUntil(e.startsAt)}{e.location ? `, ${e.location}` : ''}{e.groupName ? `, turma ${e.groupName}` : e.audience === 'espaco' ? ', todo o espaço' : ''}</small>
            <div className="es-counts">{e.status === 'cancelado' ? <span className="rx-pill es-pill-off">Cancelado</span> : (
              <><span className="es-count in"><b>{e.aceitos}</b>aceitos</span><span className="es-count"><b>{quando === 'futuros' ? e.pendentes : e.semResposta}</b>{quando === 'futuros' ? 'pendentes' : 'sem resposta'}</span><span className="es-count"><b>{e.recusados}</b>recusados</span>{quando === 'passados' && <span className="es-count"><b>{e.presentes}</b>presentes</span>}</>
            )}</div>
          </div>
          <button type="button" className="rx-btn ghost tiny" onClick={() => openDet(e.id)}>Abrir</button>
        </div>
      ))}
      <p className="es-sub" style={{ marginTop: 8 }}>Mudar data ou horário pede nova confirmação.</p>

      {novo && (
        <div className="rx-overlay" onClick={() => guardNovo.confirm(() => setNovo(null))}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ev-n" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="ev-n">Novo evento</h2>
            <p>Os convidados recebem uma pendência. O evento só entra na agenda de quem aceitar.</p>
            <div className="es-field"><label htmlFor="ev-t">Título</label><input id="ev-t" className="es-input" maxLength={120} value={novo.title} onChange={(e) => setNovo({ ...novo, title: e.target.value })} placeholder="Ex.: Avaliação em grupo" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8 }}>
              <div className="es-field"><label htmlFor="ev-d">Data</label><input id="ev-d" type="date" className="es-input" value={novo.date} onChange={(e) => setNovo({ ...novo, date: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="ev-s">Início</label><input id="ev-s" type="time" className="es-input" value={novo.start} onChange={(e) => setNovo({ ...novo, start: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="ev-e">Fim</label><input id="ev-e" type="time" className="es-input" value={novo.end} onChange={(e) => setNovo({ ...novo, end: e.target.value })} /></div>
            </div>
            <div className="es-field"><label htmlFor="ev-l">Local (opcional)</label><input id="ev-l" className="es-input" maxLength={200} value={novo.location} onChange={(e) => setNovo({ ...novo, location: e.target.value })} /></div>
            <div className="es-field"><label htmlFor="ev-x">Detalhes (opcional)</label><textarea id="ev-x" className="es-input" style={{ height: 70, paddingTop: 10 }} maxLength={1000} value={novo.description} onChange={(e) => setNovo({ ...novo, description: e.target.value })} /></div>
            <Destinatarios value={novo} onChange={setNovo} fixed={fixedLabel} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => guardNovo.confirm(() => setNovo(null))}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={busy || !novo.title.trim()} onClick={criar}>Enviar convites</button>
            </div>
          </div>
        </div>
      )}

      {det && !mudar && (
        <div className="rx-overlay" onClick={() => setDet(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ev-dt" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="ev-dt" style={det.evento.status === 'cancelado' ? { textDecoration: 'line-through' } : undefined}>{det.evento.title}</h2>
            <p>{fmtUntil(det.evento.startsAt)} até {new Date(det.evento.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{det.evento.location ? `, ${det.evento.location}` : ''}.{det.evento.status === 'cancelado' ? ' Cancelado.' : ''}</p>
            {det.evento.description && <p className="es-sub" style={{ marginTop: -6 }}>{det.evento.description}</p>}
            {det.convites.map((c) => {
              const started = new Date(det.evento.startsAt).getTime() <= Date.now();
              return (
                <div className="es-row" key={c.inviteId}>
                  <span className="es-avatar">{initialsOf(c.name)}</span>
                  <div className="grow"><b>{c.name}</b><small>{STATUS[c.status] || c.status}</small></div>
                  {!started && c.status === 'pendente' && det.evento.status === 'ativo' && <button type="button" className="rx-btn ghost tiny" onClick={async () => { try { await espacosApi.lembrar(det.evento.id, c.inviteId); toast?.(`Lembrete enviado a ${c.name}. Aparece uma vez nas pendências dela.`); } catch (e) { toast?.(e.message); } }}>Lembrar</button>}
                  {started && det.evento.status === 'ativo' && (
                    <select className="es-input" style={{ height: 34, width: 'auto', fontSize: 13.5 }} aria-label={`Presença de ${c.name}`} value={c.attendance || ''} onChange={async (e) => { try { await espacosApi.presenca(det.evento.id, c.inviteId, e.target.value || null); openDet(det.evento.id); } catch (er) { toast?.(er.message); } }}>
                      <option value="">Presença…</option><option value="presente">Presente</option><option value="faltou">Faltou</option>
                    </select>
                  )}
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' }}>
              {det.evento.status === 'ativo' && new Date(det.evento.startsAt).getTime() > Date.now() && (
                <>
                  <button type="button" className="es-danger" onClick={async () => { try { await espacosApi.cancelarEvento(det.evento.id); toast?.('Evento cancelado. Aparece riscado para quem aceitou.'); setDet(null); load(); } catch (e) { toast?.(e.message); } }}>Cancelar evento</button>
                  <button type="button" className="rx-btn ghost" onClick={() => { const s = toLocalParts(det.evento.startsAt); const f = toLocalParts(det.evento.endsAt); setMudar({ id: det.evento.id, title: det.evento.title, location: det.evento.location, description: det.evento.description, date: s.date, start: s.time, end: f.time, origStart: det.evento.startsAt, origEnd: det.evento.endsAt }); }}>Mudar</button>
                </>
              )}
              <button type="button" className="rx-btn" onClick={() => setDet(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {mudar && (
        <div className="rx-overlay" onClick={() => setMudar(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="ev-m" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="ev-m">Mudar evento</h2>
            <p>Mudar data ou horário volta todo mundo para “pendente”. Mudar só o texto ou o local mantém quem aceitou e envia um aviso.</p>
            <div className="es-field"><label htmlFor="evm-t">Título</label><input id="evm-t" className="es-input" maxLength={120} value={mudar.title} onChange={(e) => setMudar({ ...mudar, title: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 8 }}>
              <div className="es-field"><label htmlFor="evm-d">Data</label><input id="evm-d" type="date" className="es-input" value={mudar.date} onChange={(e) => setMudar({ ...mudar, date: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="evm-s">Início</label><input id="evm-s" type="time" className="es-input" value={mudar.start} onChange={(e) => setMudar({ ...mudar, start: e.target.value })} /></div>
              <div className="es-field"><label htmlFor="evm-e">Fim</label><input id="evm-e" type="time" className="es-input" value={mudar.end} onChange={(e) => setMudar({ ...mudar, end: e.target.value })} /></div>
            </div>
            <div className="es-field"><label htmlFor="evm-l">Local</label><input id="evm-l" className="es-input" maxLength={200} value={mudar.location} onChange={(e) => setMudar({ ...mudar, location: e.target.value })} /></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setMudar(null)}>Voltar</button>
              <button type="button" className="rx-btn" disabled={busy} onClick={salvarMudanca}>Salvar mudança</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/** Avisos do espaço (opcionalmente de uma turma ou recebidos por uma pessoa), com conversas privadas. */
export function AvisosPanel({ groupId = null, linkId = null, fixedLabel = null, toast }) {
  const [list, setList] = useState(null);
  const [novo, setNovo] = useState(null);
  const novoDirty = Boolean(novo) && ['title', 'body', 'description', 'location'].some((k) => String(novo[k] || '').trim());
  const guardNovo = useUnsavedGuard(novoDirty, { label: novo?.body !== undefined ? 'o aviso novo' : 'o evento novo' });
  const [det, setDet] = useState(null);
  const [thread, setThread] = useState(null);
  const [resposta, setResposta] = useState('');
  const [busy, setBusy] = useState(false);
  const params = { ...(groupId ? { groupId } : {}), ...(linkId ? { linkId } : {}) };

  const load = useCallback(async () => {
    try { setList((await espacosApi.avisos(params)).avisos || []); } catch (e) { setList([]); toast?.(e.message); }
  }, [groupId, linkId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const openDet = async (id) => { try { setDet(await espacosApi.aviso(id)); setThread(null); } catch (e) { toast?.(e.message); } };
  const openThread = async (c) => { try { setThread({ ...c, conversa: (await espacosApi.conversa(det.aviso.id, c.userId)).conversa }); setResposta(''); } catch (e) { toast?.(e.message); } };

  return (
    <article className="es-card">
      <h2>Avisos <button type="button" className="rx-btn tiny" onClick={() => setNovo({ title: '', body: '', allowComments: true, audience: groupId ? 'turma' : linkId ? 'pessoas' : 'turma', groupId: groupId || '', linkIds: linkId ? [linkId] : [] })}><Megaphone size={15} />Novo aviso</button></h2>
      {list === null ? <p className="es-sub">Carregando…</p> : list.length === 0 ? <div className="es-empty"><p>Nenhum aviso ainda. Um aviso chega às pessoas como pendência; comentários são privados.</p></div> : list.map((a) => (
        <div className="es-row" key={a.id}>
          <div className="grow"><b>{a.title}</b><small>{fmtUntil(a.createdAt)}, {a.recipients} {a.recipients === 1 ? 'destinatário' : 'destinatários'}{a.conversas ? `, ${a.conversas} ${a.conversas === 1 ? 'conversa' : 'conversas'}` : ''}{a.allowComments ? '' : ', sem comentários'}</small></div>
          <button type="button" className="rx-btn ghost tiny" onClick={() => openDet(a.id)}>Abrir</button>
        </div>
      ))}
      <p className="es-sub" style={{ marginTop: 8 }}>Cada pessoa vê só a própria conversa com você.</p>

      {novo && (
        <div className="rx-overlay" onClick={() => guardNovo.confirm(() => setNovo(null))}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="av-n" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="av-n">Novo aviso</h2>
            <p>Chega como pendência para quem receber.</p>
            <div className="es-field"><label htmlFor="av-t">Título</label><input id="av-t" className="es-input" maxLength={120} value={novo.title} onChange={(e) => setNovo({ ...novo, title: e.target.value })} /></div>
            <div className="es-field"><label htmlFor="av-b">Texto</label><textarea id="av-b" className="es-input" style={{ height: 110, paddingTop: 10 }} maxLength={2000} value={novo.body} onChange={(e) => setNovo({ ...novo, body: e.target.value })} /></div>
            <Destinatarios value={novo} onChange={setNovo} fixed={fixedLabel} />
            <label className="es-check"><input type="checkbox" checked={novo.allowComments} onChange={(e) => setNovo({ ...novo, allowComments: e.target.checked })} /><span>Permitir comentários privados</span></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => guardNovo.confirm(() => setNovo(null))}>Cancelar</button>
              <button type="button" className="rx-btn" disabled={busy || !novo.title.trim() || !novo.body.trim()} onClick={async () => {
                setBusy(true);
                try { const r = await espacosApi.criarAviso(novo); toast?.(`Aviso publicado para ${r.destinatarios} ${r.destinatarios === 1 ? 'pessoa' : 'pessoas'}.`); setNovo(null); load(); } catch (e) { toast?.(e.message); } finally { setBusy(false); }
              }}>Publicar aviso</button>
            </div>
          </div>
        </div>
      )}

      {det && (
        <div className="rx-overlay" onClick={() => setDet(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="av-d" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            {!thread ? (
              <>
                <h2 id="av-d">{det.aviso.title}</h2>
                <p style={{ whiteSpace: 'pre-line' }}>{det.aviso.body}</p>
                <h3 style={{ margin: '10px 0 4px' }}>Conversas privadas</h3>
                {det.conversas.map((c) => (
                  <div className="es-row" key={c.userId}><span className="es-avatar">{initialsOf(c.name)}</span><div className="grow"><b>{c.name}</b><small>{c.comments ? `${c.comments} ${c.comments === 1 ? 'mensagem' : 'mensagens'}` : 'sem mensagens'}{c.read ? ', leu' : ''}</small></div>
                    <button type="button" className="rx-btn ghost tiny" onClick={() => openThread(c)}><MessageSquare size={14} />Conversa</button></div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  {det.aviso.status === 'publicado' && <button type="button" className="rx-btn ghost" onClick={async () => { try { await espacosApi.arquivarAviso(det.aviso.id); toast?.('Aviso arquivado.'); setDet(null); load(); } catch (e) { toast?.(e.message); } }}>Arquivar</button>}
                  <button type="button" className="rx-btn" onClick={() => setDet(null)}>Fechar</button>
                </div>
              </>
            ) : (
              <>
                <h2 id="av-d">Conversa com {thread.name}</h2>
                <p>Só vocês dois veem esta conversa.</p>
                {thread.conversa.length === 0 ? <p className="es-sub">Nenhuma mensagem ainda.</p> : thread.conversa.map((c) => (
                  <div key={c.id} className="es-note" style={{ marginBottom: 8, background: c.mine ? 'var(--rx-violet-wash)' : undefined }}><span><b>{c.mine ? 'Você' : thread.name}</b>, {fmtUntil(c.createdAt)}<br />{c.body}</span></div>
                ))}
                {det.aviso.allowComments && (
                  <div className="es-field" style={{ marginTop: 8 }}><label htmlFor="av-r">Responder</label><textarea id="av-r" className="es-input" style={{ height: 70, paddingTop: 10 }} maxLength={1000} value={resposta} onChange={(e) => setResposta(e.target.value)} /></div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="rx-btn ghost" onClick={() => setThread(null)}>Voltar</button>
                  {det.aviso.allowComments && <button type="button" className="rx-btn" disabled={!resposta.trim()} onClick={async () => { try { await espacosApi.responderConversa(det.aviso.id, thread.userId, resposta); toast?.('Resposta enviada.'); openThread(thread); } catch (e) { toast?.(e.message); } }}>Enviar</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** Página "Agenda e avisos" do espaço. */
export function ProAgendaPage({ toast, pro }) {
  return (
    <div className="es">
      <div className="es-head"><div><h1>Agenda e avisos</h1><p>{pro?.model === 'clinica' ? 'A organização cuida de agenda, convites, avisos e pendências administrativas. Sem prontuário nem dados clínicos.' : 'Eventos com confirmação e avisos para o espaço, uma turma ou pessoas.'}</p></div></div>
      <div className="es-stack">
        <EventosPanel toast={toast} title="Eventos" />
        <AvisosPanel toast={toast} />
      </div>
    </div>
  );
}
