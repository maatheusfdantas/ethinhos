import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Download } from 'lucide-react';
import '../styles/foco.css';
import {
  LEVELS, FOCO, CYCLE, LONG_AFTER, THEMES, BADGES, MISSIONS,
  loadState, saveState, levelIndex, missionsFor, recordSession, addNote, recordPause,
  markMission, hideMission, setGoal, toggleRest, report, localDate
} from './rx/focoStore';
import {
  criarSessao, restanteMs, progresso, minutosFeitos, pausaUsadaMs, pausar, retomar, pausada,
  carregarSessao, salvarSessao
} from './foco/planta/sessaoFoco';
import { especiePorId, especiesPorTema, estagioPara, ESPECIE_PADRAO, TEMAS_CULTIVO } from './foco/planta/especies';
import { urlDoAsset } from './foco/planta/assets';
import { Planta } from './foco/planta/Planta';

const INTENSITY = [
  { id: 'sprint', name: 'Sprint', mins: 10 },
  { id: 'leve', name: 'Leve', mins: 15 },
  { id: 'normal', name: 'Normal', mins: 25 },
  { id: 'profunda', name: 'Profunda', mins: 50 }
];
const BREAK_ACTS = [
  { id: 'longe', name: 'Longe da tela', d: 'Olhe pela janela ou caminhe um pouco' },
  { id: 'agua', name: 'Beber água', d: 'Um copo inteiro' },
  { id: 'alongar', name: 'Alongar', d: 'Pescoço, ombros e costas' },
  { id: 'respirar', name: 'Respirar', d: 'Quatro respirações lentas' }
];
// Regra existente mantida: até 2 min de pausa acumulada sem alerta no certificado.
const MAX_PAUSE_SECONDS = 120;
const R = 126; const C = 2 * Math.PI * R;
const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}` : `${m} min`);
const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let toastSeq = 0;

const STARS = Array.from({ length: 120 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453; const b = Math.sin(i * 78.233) * 12345.678;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 100, o: 0.25 + ((i * 37) % 60) / 100, s: i % 9 === 0 ? 3 : 2 };
});

function Emblem({ glyph, on, uid }) {
  const ink = on ? '#0C1020' : '#9A96B5';
  const g = {
    spark: <path d="M29 18 L32 29 L43 32 L32 35 L29 46 L26 35 L15 32 L26 29 Z" />,
    cycle: <>{[0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return <circle key={i} cx={29 + Math.cos(a) * 10} cy={32 + Math.sin(a) * 10} r="3.2" />; })}</>,
    const: <><polyline points="17,40 24,26 34,33 42,22" fill="none" strokeWidth="2" /><circle cx="17" cy="40" r="2.6" /><circle cx="24" cy="26" r="2.6" /><circle cx="34" cy="33" r="2.6" /><circle cx="42" cy="22" r="2.6" /></>,
    return: <><path d="M38 24 A11 11 0 1 0 40 36" fill="none" strokeWidth="2.4" /><path d="M34 19 L40 24 L33 27 Z" /></>,
    journal: <><rect x="19" y="20" width="20" height="24" rx="3" fill="none" strokeWidth="2" /><line x1="23" y1="27" x2="35" y2="27" strokeWidth="2" /><line x1="23" y1="32" x2="35" y2="32" strokeWidth="2" /><line x1="23" y1="37" x2="30" y2="37" strokeWidth="2" /></>,
    moon: <path d="M35 20 A12 12 0 1 0 40 40 A9.5 9.5 0 1 1 35 20 Z" />
  }[glyph];
  return (
    <svg viewBox="0 0 58 64" aria-hidden="true">
      <defs><linearGradient id={`rfb-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#60A5FA" /></linearGradient></defs>
      <polygon points="29,3 54,17 54,47 29,61 4,47 4,17" fill={on ? `url(#rfb-${uid})` : 'none'} stroke={on ? 'none' : 'rgba(196,181,253,.3)'} strokeWidth="1.5" strokeDasharray={on ? undefined : '4 4'} />
      <g fill={ink} stroke={ink}>{g}</g>
    </svg>
  );
}

export function FocusTab({
  user,
  tags = [],
  syncedFocusRequest,
  onLogSubclassEffort,
  onFocusComplete
}) {
  const userId = user?.id || 'anon';
  // Sessão em andamento guardada no navegador: volta igual depois de trocar de tela ou recarregar.
  const [restaurada] = useState(() => carregarSessao(userId));
  const sessRef = useRef(restaurada);
  const meta0 = restaurada?.tipo === 'focus' ? restaurada.meta : null;

  /* ---------- Categoria e subclasse (comportamento existente) ---------- */
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    if (meta0?.categoryId) return meta0.categoryId;
    if (syncedFocusRequest?.category) {
      const match = tags.find((t) => t.name.toLowerCase() === syncedFocusRequest.category.toLowerCase() || t.id === syncedFocusRequest.category);
      if (match) return match.id;
    }
    const studyCat = tags.find((t) => t.has_subclasses || t.name.toLowerCase().includes('facul') || t.name.toLowerCase().includes('estudo'));
    return studyCat?.id || tags[0]?.id || 'tag_facul';
  });
  const [selectedSubclassName, setSelectedSubclassName] = useState(() => meta0?.subclass ?? (syncedFocusRequest?.subclass || ''));
  const currentCategory = tags.find((t) => t.id === selectedCategoryId || t.name === selectedCategoryId) || tags[0] || {
    id: 'tag_default', name: 'Estudos', color: '#818cf8', icon: 'BookOpen', has_subclasses: false, subclasses: []
  };
  const subclasses = Array.isArray(currentCategory.subclasses) ? currentCategory.subclasses : [];
  useEffect(() => {
    if (sessRef.current?.tipo === 'focus') return; // não troca a categoria de uma sessão em andamento
    if (syncedFocusRequest?.category) {
      const match = tags.find((t) => t.name.toLowerCase() === syncedFocusRequest.category.toLowerCase() || t.id === syncedFocusRequest.category);
      if (match) {
        setSelectedCategoryId(match.id);
        if (syncedFocusRequest.subclass) setSelectedSubclassName(syncedFocusRequest.subclass);
      }
    }
  }, [syncedFocusRequest, tags]);
  const subject = selectedSubclassName ? `${currentCategory.name} • ${selectedSubclassName}` : currentCategory.name;

  /* ---------- Configuração da sessão ---------- */
  const [mins, setMins] = useState(() => meta0?.mins || 25);
  const [intensity, setIntensity] = useState(() => meta0?.intensity || 'normal');

  /* ---------- Gamificação (só no navegador, por usuário) ---------- */
  const [g, setG] = useState(() => loadState(userId));
  const loadedFor = useRef(userId);
  useEffect(() => { if (loadedFor.current !== userId) { loadedFor.current = userId; setG(loadState(userId)); } }, [userId]);
  useEffect(() => { saveState(userId, g); }, [userId, g]);
  const reduce = g.reduce || prefersReduced();
  const simple = g.simple;

  /* ---------- Avisos ---------- */
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((events) => {
    if (simple || !events.length) return;
    const lines = events.map((e) => ({
      foco: `+${e.n} de Foco · ${e.why}`,
      theme: `Tema ${e.name} liberado para o anel. Use se quiser.`,
      badge: `Novo emblema: ${e.name}`,
      met: 'Meta mínima de hoje cumprida. Mais uma estrela na constelação.',
      level: `Você chegou ao nível ${e.name}. O céu ficou um pouco mais denso.`,
      cycle: `Ciclo de ${CYCLE} sessões fechado. As cinco luas acenderam.`
    }[e.type])).filter(Boolean);
    const badge = events.find((e) => e.type === 'badge');
    const id = `t${++toastSeq}`;
    setToasts((t) => [...t.slice(-1), { id, lines, glyph: badge ? BADGES.find((b) => b.id === badge.id).glyph : null }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, [simple]);
  const apply = useCallback((r) => { setG(r.state); notify(r.events); return r; }, [notify]);

  /* ---------- Cronômetro ---------- */
  // idle | focus | paused | done | break
  const [phase, setPhase] = useState(() => (!restaurada ? 'idle' : restaurada.tipo === 'break' ? 'break' : pausada(restaurada) ? 'paused' : 'focus'));
  // Fonte de verdade do tempo: horários da sessão (ver foco/planta/sessaoFoco.js). "agora" só faz a tela andar.
  const [sess, setSess] = useState(restaurada);
  const [agora, setAgora] = useState(() => Date.now());
  const gravar = (nova, guardar = true) => {
    sessRef.current = nova; setSess(nova);
    salvarSessao(userId, guardar ? nova : null);
  };
  // Outra conta no mesmo navegador: carrega a sessão dela (cada conta tem a sua).
  const sessaoDe = useRef(userId);
  useEffect(() => {
    if (sessaoDe.current === userId) return;
    sessaoDe.current = userId;
    const outra = carregarSessao(userId); sessRef.current = outra; setSess(outra);
    setPhase(!outra ? 'idle' : outra.tipo === 'break' ? 'break' : pausada(outra) ? 'paused' : 'focus');
  }, [userId]);
  const total = sess ? sess.duracaoMs / 1000 : mins * 60;
  const left = sess ? restanteMs(sess, agora) / 1000 : mins * 60;
  const pauseLeft = sess ? Math.max(0, MAX_PAUSE_SECONDS - pausaUsadaMs(sess, agora) / 1000) : MAX_PAUSE_SECONDS;
  const [murcha, setMurcha] = useState(false);
  const [breakInfo, setBreakInfo] = useState(() => ({ long: restaurada?.tipo === 'break' ? !!restaurada.meta?.long : false, act: '' }));
  const [last, setLast] = useState(null);
  const [note, setNote] = useState('');
  const [stopAsk, setStopAsk] = useState(null);
  const [showCert, setShowCert] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [catTema, setCatTema] = useState('plantas');
  const [catBusca, setCatBusca] = useState('');
  const [glow, setGlow] = useState(0);


  /* ---------- Poeira: início, conclusão e fim do ciclo ---------- */
  const cardRef = useRef(null); const orbitRef = useRef(null); const canvasRef = useRef(null);
  const parts = useRef([]); const raf = useRef(0);
  const burst = useCallback((kind) => {
    if (reduce || simple || !canvasRef.current || !cardRef.current || !orbitRef.current) return;
    const cv = canvasRef.current; const ctx = cv.getContext('2d'); if (!ctx) return;
    const box = cardRef.current.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = box.width * dpr; cv.height = box.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const o = orbitRef.current.getBoundingClientRect();
    const cx = o.left - box.left + o.width / 2; const cy = o.top - box.top + o.height / 2;
    const n = { start: 18, done: 34, cycle: 70 }[kind]; const spd = { start: 0.5, done: 0.9, cycle: 1.4 }[kind];
    const cols = ['#C4B5FD', '#A78BFA', '#60A5FA', '#FFFFFF'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2; const r = o.width * (0.3 + Math.random() * 0.1); const v = (0.3 + Math.random()) * spd;
      parts.current.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.15, life: 0, max: 90 + Math.random() * 80, s: 0.8 + Math.random() * 1.8, c: cols[i % 4] });
    }
    const step = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.current = parts.current.filter((p) => p.life < p.max);
      parts.current.forEach((p) => {
        p.life++; p.x += p.vx; p.y += p.vy; p.vx *= 0.985; p.vy *= 0.985;
        ctx.globalAlpha = Math.sin((Math.PI * p.life) / p.max) * 0.9; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      raf.current = parts.current.length ? requestAnimationFrame(step) : 0;
    };
    if (!raf.current) raf.current = requestAnimationFrame(step);
  }, [reduce, simple]);
  useEffect(() => {
    if ((reduce || simple) && canvasRef.current) {
      parts.current = []; cancelAnimationFrame(raf.current); raf.current = 0;
      const ctx = canvasRef.current.getContext('2d'); ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [reduce, simple]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* ---------- Planta ---------- */
  const especie = especiePorId(g.especie || ESPECIE_PADRAO);
  const plantaOn = !!g.planta && !simple;
  const plantaDe = (s, n) => ({ especie: especie.id, estagio: estagioPara(especie, progresso(s, n)).stageId });

  /* ---------- Conclusão: regras existentes (horas na subclasse, onFocusComplete) + camada nova ---------- */
  const finishFocus = (n = Date.now()) => {
    const atual = sessRef.current;
    const categoryName = currentCategory?.name || 'Estudos';
    const subclassName = selectedSubclassName || null;
    if (subclassName && onLogSubclassEffort) {
      onLogSubclassEffort(currentCategory.id || currentCategory.name, subclassName, Number((mins / 60).toFixed(2)));
    }
    const sessionInfo = {
      subject, category: categoryName, subclass: subclassName, durationMins: mins,
      date: new Date().toLocaleDateString('pt-BR'), userName: user?.name || 'Você',
      fraudProtected: atual ? pausaUsadaMs(atual, n) < MAX_PAUSE_SECONDS * 1000 : true
    };
    onFocusComplete?.(sessionInfo);
    const plant = atual ? plantaDe(atual, n) : null;
    const r = apply(recordSession(g, { subject, mins, plant }));
    setLast({ ...sessionInfo, id: r.state.sessions[0].id, full: true, plant });
    if (atual) gravar(pausar(atual, n), false); // congela em 00:00; não fica guardada
    setAgora(n); setNote(''); setPhase('done'); setGlow((x) => x + 1);
    burst(r.cycleClosed ? 'cycle' : 'done');
  };
  const finishBreak = (early) => {
    const act = breakInfo.act || (early ? '' : 'tempo');
    apply(recordPause(g, { action: act, long: breakInfo.long }));
    gravar(null); setPhase('idle');
  };
  const finishRef = useRef(finishFocus);
  const finishBreakRef = useRef(finishBreak);
  useEffect(() => { finishRef.current = finishFocus; finishBreakRef.current = finishBreak; });

  // O relógio só atualiza a tela; o tempo vem dos horários. Ao voltar para a aba, recalcula na hora.
  useEffect(() => {
    if (phase !== 'focus' && phase !== 'break' && phase !== 'paused') return undefined;
    let fechou = false;
    const tick = () => {
      if (fechou) return;
      const n = Date.now(); const atual = sessRef.current;
      setAgora(n);
      if (phase === 'paused' || !atual || restanteMs(atual, n) > 0) return;
      fechou = true;
      if (phase === 'focus') finishRef.current(n); else finishBreakRef.current(false);
    };
    tick();
    const t = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => { fechou = true; clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [phase]);

  const start = () => {
    const n = Date.now();
    gravar(criarSessao({ minutos: mins, agora: n, meta: { mins, categoryId: currentCategory.id || currentCategory.name, subclass: selectedSubclassName, intensity } }));
    setAgora(n); setMurcha(false); setPhase('focus'); burst('start');
  };
  const pause = () => { gravar(pausar(sess, Date.now())); setPhase('paused'); };
  const resume = () => { gravar(retomar(sessRef.current, Date.now())); setPhase('focus'); };
  const askStop = () => {
    const was = phase; const n = Date.now();
    gravar(pausar(sess, n)); setAgora(n); setPhase('paused');
    setStopAsk({ was, done: minutosFeitos(sess, n) });
  };
  const stopKeep = () => {
    const done = stopAsk.done; setStopAsk(null);
    const atual = sessRef.current; const plant = atual ? plantaDe(atual, atual.pausadoEm ?? Date.now()) : null;
    const r = apply(recordSession(g, { subject, mins: done, full: false, plant }));
    setLast({ subject, durationMins: done, id: r.state.sessions[0].id, full: false, plant });
    if (atual) gravar(atual, false); // fica congelada onde parou (a planta também)
    setNote(''); setPhase('done');
  };
  const stopDrop = () => {
    const atual = sessRef.current;
    // Descartar faz a planta murchar, se ela já tinha passado da semente. Nenhum ponto é tirado.
    const cresceu = atual && estagioPara(especie, progresso(atual, atual.pausadoEm ?? Date.now())) !== especie.estagios[0];
    setStopAsk(null); setG((st) => ({ ...st, interrupted: true }));
    gravar(null); setMurcha(!!cresceu); setPhase('idle');
  };
  const stopBack = () => { const was = stopAsk.was; setStopAsk(null); if (was === 'focus') resume(); };
  const startBreak = (long) => {
    const m = long ? 20 : 5; const n = Date.now(); setBreakInfo({ long, act: '' });
    gravar(criarSessao({ minutos: m, tipo: 'break', agora: n, meta: { long } })); setAgora(n); setPhase('break');
  };
  const skipBreak = () => { gravar(null); setPhase('idle'); };

  /* ---------- Certificado (existente, no visual novo) ---------- */
  const certRef = useRef(null);
  useEffect(() => {
    if (!showCert || !last || !certRef.current) return;
    const cv = certRef.current; const ctx = cv.getContext('2d'); if (!ctx) return;
    const w = cv.width; const h = cv.height; const font = '"Bricolage Grotesque", sans-serif';
    const bg = ctx.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#0C1020'); bg.addColorStop(0.5, '#211D3B'); bg.addColorStop(1, '#15132B');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(167,139,250,.5)'; ctx.lineWidth = 2; ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C4B5FD'; ctx.font = `bold 22px ${font}`; ctx.fillText('Certificado de foco Ethos', w / 2, 70);
    const grad = ctx.createLinearGradient(w / 2 - 60, 0, w / 2 + 60, 0); grad.addColorStop(0, '#A78BFA'); grad.addColorStop(1, '#60A5FA');
    ctx.strokeStyle = grad; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w / 2, 175, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#F1F0FA'; ctx.font = `bold 44px ${font}`; ctx.fillText(String(last.durationMins), w / 2, 188);
    ctx.fillStyle = '#B8B5CE'; ctx.font = `13px ${font}`; ctx.fillText('minutos de foco', w / 2, 210);
    ctx.fillStyle = '#F1F0FA'; ctx.font = `bold 18px ${font}`; ctx.fillText(last.subject, w / 2, 280);
    ctx.fillStyle = '#C4B5FD'; ctx.font = `600 15px ${font}`; ctx.fillText(`Conquistado por ${last.userName}`, w / 2, 315);
    ctx.fillStyle = '#9A96B5'; ctx.font = `13px ${font}`; ctx.fillText(`Concluído em ${last.date}`, w / 2, 342);
    ctx.fillStyle = last.fraudProtected ? '#A78BFA' : '#F5B971'; ctx.font = `600 12px ${font}`;
    ctx.fillText(last.fraudProtected ? 'Pausas dentro do limite de 2 minutos' : 'Pausas acima do limite de 2 minutos', w / 2, 376);
  }, [showCert, last]);
  const downloadCert = () => {
    if (!certRef.current) return;
    const a = document.createElement('a'); a.download = `ethos-foco-${last.durationMins}min-${Date.now()}.png`;
    a.href = certRef.current.toDataURL('image/png'); a.click();
  };

  /* ---------- Derivados ---------- */
  const today = localDate();
  const li = levelIndex(g); const next = LEVELS[li + 1];
  const theme = THEMES.find((t) => t.id === g.theme) || THEMES[0];
  const rep = useMemo(() => report(g), [g]);
  const week = rep.week; const todayN = (g.days[today]?.n) || 0;
  const missions = missionsFor(g, today);
  const shownTotal = phase === 'idle' ? mins * 60 : total;
  const shownLeft = phase === 'idle' ? mins * 60 : left;
  const pct = shownTotal ? 1 - shownLeft / shownTotal : 0;
  const moonsOn = phase === 'done' && last?.full && g.cycle === 0 ? CYCLE : g.cycle;
  const running = phase === 'focus' || phase === 'paused';
  const planetA = -Math.PI / 2 + pct * 2 * Math.PI;
  // Na pausa entre sessões, mostra a planta da última sessão; parada, sem balanço.
  const estagio = phase === 'break'
    ? (especie.estagios.find((e) => e.stageId === last?.plant?.estagio) || especie.estagios[0])
    : estagioPara(especie, pct, phase === 'idle' && murcha ? 'murcha' : 'ativa');
  const balanco = phase === 'focus' ? 'on' : phase === 'paused' ? 'pause' : 'off';
  const longNext = g.blocks >= LONG_AFTER;
  const lastNote = last ? g.sessions.find((x) => x.id === last.id)?.note : '';
  const phaseLabel = { idle: 'Pronto para começar', focus: 'Focando', paused: 'Pausado', done: last?.full ? 'Concluída' : 'Registrado', break: breakInfo.long ? 'Pausa longa' : 'Pausa' }[phase];
  const set = (patch) => setG((s) => ({ ...s, ...patch }));
  const pickIntensity = (it) => {
    setIntensity(it.id);
    setMins(it.mins);
  };
  const pts = [[24, 58], [64, 26], [106, 50], [148, 18], [190, 46], [232, 24], [274, 54]];
  const maxMin = Math.max(60, ...week.map((d) => d.min));
  const plural = (n, a, b) => (n === 1 ? a : b);

  return (
    <div className="rf" data-level={simple ? 0 : li} data-reduce={reduce ? 'true' : 'false'}>
      <div className="rf-sky" aria-hidden="true">
        {STARS.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, opacity: i < [30, 48, 70, 94, 120][simple ? 0 : li] ? s.o : 0 }} />)}
      </div>

      <div className="rf-head">
        <div>
          <h2>Foco</h2>
          <p>{simple ? 'Cronômetro de foco, sem extras.' : `Nível ${LEVELS[li].name} · ${g.foco} de Foco · hoje ${todayN} de ${g.minGoal} ${plural(g.minGoal, 'sessão', 'sessões')}`}</p>
        </div>
        <div className="rf-tools">
          {!simple && <button type="button" className="rf-switch" role="switch" aria-checked={!!g.planta} onClick={() => set({ planta: !g.planta })}><span className="knob" />Planta</button>}
          <button type="button" className="rf-switch" role="switch" aria-checked={simple} onClick={() => set({ simple: !simple })}><span className="knob" />Modo simples</button>
          <button type="button" className="rf-switch" role="switch" aria-checked={!!g.reduce} onClick={() => set({ reduce: !g.reduce })}><span className="knob" />Reduzir movimento</button>
        </div>
      </div>

      <div className={`rf-grid${simple ? ' one' : ''}`}>
        <div className="rf-col">
          <section className="rf-card rf-session" ref={cardRef} aria-label="Sessão de foco">
            <canvas className="rf-burst" ref={canvasRef} aria-hidden="true" />
            <div className={`rf-orbit${phase === 'break' ? ' break' : ''}`} ref={orbitRef}>
              <svg viewBox="0 0 340 340" aria-hidden="true">
                <defs>
                  <linearGradient id="rfRing" x1="0" y1="0" x2="1" y2="1">
                    {(simple ? THEMES[0] : theme).stops.map((c, i, a) => <stop key={c} offset={i / (a.length - 1)} stopColor={c} />)}
                  </linearGradient>
                  <linearGradient id="rfBreak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#60A5FA" /><stop offset="1" stopColor="#C4B5FD" /></linearGradient>
                </defs>
                <circle className="path" cx="170" cy="170" r="158" />
                {!simple && Array.from({ length: CYCLE }, (_, i) => {
                  const a = -Math.PI / 2 + (i * 2 * Math.PI) / CYCLE;
                  return <circle key={i} className={`moon${i < moonsOn ? ' on' : ''}${i === moonsOn && moonsOn < CYCLE ? ' next' : ''}`} r="8" cx={170 + Math.cos(a) * 158} cy={170 + Math.sin(a) * 158} />;
                })}
                <circle className="track" cx="170" cy="170" r={R} />
                <circle key={glow} className={`prog${glow ? ' glow' : ''}`} cx="170" cy="170" r={R} transform="rotate(-90 170 170)"
                  style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct), stroke: phase === 'break' ? 'url(#rfBreak)' : 'url(#rfRing)' }} />
                <circle className="planet" r="6" cx={170 + Math.cos(planetA) * R} cy={170 + Math.sin(planetA) * R} style={{ opacity: pct > 0 && pct < 1 ? 1 : 0 }} />
              </svg>
              {plantaOn && <Planta especie={especie} estagio={estagio} balanco={balanco} />}
              <div className={`center${plantaOn ? ' planta' : ''}`}>
                <div className="time" role="timer" aria-label={`Tempo restante ${fmt(shownLeft)}`}>{fmt(shownLeft)}</div>
                <div className="phase" aria-live="polite">{phaseLabel}</div>
                {!simple && <div className="cyc">Ciclo: {moonsOn} de {CYCLE}</div>}
              </div>
            </div>

            <div className="rf-panel">
              {phase === 'idle' && (
                <>
                  <div className="rf-field">
                    <span className="lbl">No que vai focar?</span>
                    <div className="rf-chips">
                      {tags.length === 0 && <button type="button" className="rf-chip" aria-pressed="true"><i style={{ background: '#A78BFA' }} />{currentCategory.name}</button>}
                      {tags.map((cat) => (
                        <button type="button" key={cat.id || cat.name} className="rf-chip" aria-pressed={cat.id === currentCategory.id || cat.name === currentCategory.name}
                          onClick={() => { setSelectedCategoryId(cat.id || cat.name); setSelectedSubclassName(''); }}>
                          <i style={{ background: cat.color || '#A78BFA' }} />{cat.name}
                        </button>
                      ))}
                    </div>
                    {tags.length === 0 && <p className="rf-hint">Crie categorias em “Nova categoria”, no menu, para separar seus focos.</p>}
                    {subclasses.length > 0 && (
                      <div className="rf-chips sub">
                        <button type="button" className="rf-chip" aria-pressed={selectedSubclassName === ''} onClick={() => setSelectedSubclassName('')}>Geral</button>
                        {subclasses.map((sub) => (
                          <button type="button" key={sub.id || sub.name} className="rf-chip" aria-pressed={selectedSubclassName === sub.name} onClick={() => setSelectedSubclassName(sub.name)}>{sub.name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rf-field">
                    <span className="lbl">Intensidade</span>
                    <div className="rf-chips">
                      {INTENSITY.map((it) => (
                        <button type="button" key={it.id} className="rf-chip" aria-pressed={intensity === it.id && mins === it.mins} onClick={() => pickIntensity(it)}>
                          {it.name} · {it.mins} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rf-field">
                    <div className="rf-range-head">
                      <label htmlFor="rfTimerRange" className="lbl" style={{ margin: 0 }}>Temporizador</label>
                      <output htmlFor="rfTimerRange" className="rf-range-val">{mins} min</output>
                    </div>
                    <input
                      id="rfTimerRange"
                      type="range"
                      className="rf-range"
                      min="5"
                      max="120"
                      step="1"
                      aria-label="Temporizador de 5 a 120 minutos"
                      value={mins}
                      onChange={(e) => {
                        const v = Math.max(5, Math.min(120, Math.round(Number(e.target.value)) || 25));
                        setMins(v);
                        const match = INTENSITY.find((i) => i.mins === v);
                        setIntensity(match ? match.id : '');
                      }}
                    />
                    <div className="rf-range-marks" aria-hidden="true">
                      <span>5 min</span>
                      <span>25 min</span>
                      <span>60 min</span>
                      <span>90 min</span>
                      <span>120 min</span>
                    </div>
                  </div>
                  {plantaOn && (
                    <div className="rf-field" data-testid="rf-cultivo-selector">
                      <span className="lbl">Cultivar nesta sessão</span>
                      <div className="rf-chips">
                        {TEMAS_CULTIVO.map((t) => {
                          const temaAtual = especie.tema || 'plantas';
                          const ativo = temaAtual === t.id;
                          return (
                            <button
                              type="button"
                              key={t.id}
                              className="rf-chip"
                              aria-pressed={ativo}
                              onClick={() => {
                                const lista = especiesPorTema(t.id);
                                if (lista[0]) set({ especie: lista[0].id });
                                setCatTema(t.id);
                              }}
                            >
                              <i style={{ background: ativo ? (especie.paleta?.c1 || '#A78BFA') : '#64748B' }} />
                              {t.icone} {t.nome} ({especiesPorTema(t.id).length})
                            </button>
                          );
                        })}
                      </div>

                      {/* Cartão visual da escolha atual + botão para abrir o Catálogo Visual */}
                      <div className="rf-cultivo-box">
                        <div className="rf-cultivo-prev">
                          <div className="rf-cultivo-thumb" aria-hidden="true">
                            <img className="sp" src={urlDoAsset(especie.id, especie.estagios[especie.estagios.length - 1].assetKey) || ''} alt="" />
                            <img className="ch" src={urlDoAsset(especie.id, especie.chao) || ''} alt="" />
                          </div>
                          <div className="rf-cultivo-meta">
                            <b>{especie.nome}</b>
                            {especie.subtitulo && <small>{especie.subtitulo}</small>}
                            {especie.paleta && (
                              <span className="rf-pal-pill">
                                <i style={{ background: especie.paleta.c1 }} />
                                <i style={{ background: especie.paleta.c2 }} />
                                <i style={{ background: especie.paleta.c3 }} />
                                <span>{especie.paleta.nome}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rf-btn ghost"
                          data-testid="rf-open-catalogo"
                          onClick={() => {
                            setCatTema(especie.tema || 'plantas');
                            setCatBusca('');
                            setShowCatalogo(true);
                          }}
                        >
                          Escolher no catálogo
                        </button>
                      </div>

                      <select
                        className="rf-input"
                        aria-label="Escolher planta, mundo ou elemento para cultivar"
                        value={especie.id}
                        onChange={(e) => set({ especie: e.target.value })}
                        style={{ marginTop: 8 }}
                      >
                        {especiesPorTema(especie.tema || 'plantas').map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.id === 'lirio-lunar'
                              ? '★ Lírio-lunar (Padrão)'
                              : `#${String(item.indiceTema || 1).padStart(2, '0')} · ${item.nome} — ${item.paleta?.nome || ''}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="rf-btns"><button type="button" className="rf-btn" onClick={start}>Começar sessão</button></div>
                  {plantaOn && (
                    <p className="rf-hint">{murcha
                      ? 'A planta murchou porque a sessão foi descartada. Na próxima ela recomeça da semente.'
                      : `Uma semente de ${especie.nome} cresce enquanto você foca e floresce se a sessão chegar ao fim.`}</p>
                  )}
                </>
              )}

              {running && (
                <>
                  <div className="rf-now"><b>{subject}</b><span>{`${mins} minutos${intensity && INTENSITY.find((i) => i.id === intensity) ? ' · ' + INTENSITY.find((i) => i.id === intensity).name.toLowerCase() : ''}`}</span></div>
                  <p className="rf-text">{phase === 'paused' ? 'Pausado. Continue quando puder.' : 'Celular longe, uma coisa de cada vez.'}</p>
                  <div className="rf-btns">
                    {phase === 'paused' ? <button type="button" className="rf-btn" onClick={resume}>Continuar</button> : <button type="button" className="rf-btn ghost" onClick={pause}>Pausar</button>}
                    <button type="button" className="rf-btn ghost" onClick={askStop}>Parar sessão</button>
                  </div>
                  <p className="rf-hint">{phase === 'paused' ? `Pausa sem aviso no certificado: ${fmt(pauseLeft)}.` : 'Precisou parar? O tempo focado fica no seu histórico.'}</p>
                </>
              )}

              {phase === 'done' && last && (
                <>
                  <div>
                    <h3 className="rf-done-title">{last.full ? 'Sessão concluída' : 'Tempo guardado'}</h3>
                    <p className="rf-text">{last.durationMins} min em {last.subject}{last.full ? (!simple && <span className="rf-reward"> · +{FOCO.session} de Foco</span>) : '. Volte quando der.'}</p>
                  </div>
                  {!simple && (
                    <div className="rf-field">
                      <label htmlFor="rfNote" className="lbl">O que avançou? <span className="opt">(opcional)</span></label>
                      <div className="rf-row">
                        <input id="rfNote" className="rf-input" maxLength={120} placeholder="Ex.: resolvi 6 de 10 exercícios" value={lastNote || note} onChange={(e) => setNote(e.target.value)} disabled={!!lastNote} />
                        <button type="button" className="rf-btn ghost" disabled={!note.trim() || !!lastNote} onClick={() => apply(addNote(g, last.id, note))}>{lastNote ? 'Salvo' : 'Salvar'}</button>
                      </div>
                    </div>
                  )}
                  <div className="rf-btns">
                    {longNext ? (
                      <><button type="button" className="rf-btn" onClick={() => startBreak(true)}>Pausa longa · 20 min</button><button type="button" className="rf-btn ghost" onClick={() => startBreak(false)}>Pausa curta · 5 min</button></>
                    ) : <button type="button" className="rf-btn" onClick={() => startBreak(false)}>Pausa de 5 min</button>}
                    <button type="button" className="rf-btn ghost" onClick={skipBreak}>Pular pausa</button>
                    {last.full && <button type="button" className="rf-btn link" onClick={() => setShowCert(true)}>Ver certificado</button>}
                  </div>
                  {plantaOn && last.plant && (
                    <p className="rf-hint">{last.full ? `O ${especie.nome} floresceu.` : `A planta ficou no estágio ${(especie.estagios.find((e) => e.stageId === last.plant.estagio)?.nome || 'Semente').toLowerCase()}.`}</p>
                  )}
                  {longNext && <p className="rf-hint">Você fez {g.blocks} blocos seguidos. Uma pausa longa ajuda a manter o ritmo.</p>}
                </>
              )}

              {phase === 'break' && (
                <>
                  <div className="rf-now"><b>{breakInfo.long ? 'Pausa longa' : 'Pausa curta'}</b><span>{breakInfo.long ? 'Levante e mexa o corpo.' : 'Cinco minutos para o corpo, não para o celular.'}</span></div>
                  <div className="rf-acts">
                    {BREAK_ACTS.map((a) => (
                      <button type="button" key={a.id} className="rf-act" aria-pressed={breakInfo.act === a.id}
                        onClick={() => setBreakInfo((b) => ({ ...b, act: b.act === a.id ? '' : a.id }))}><b>{a.name}</b>{a.d}</button>
                    ))}
                  </div>
                  <div className="rf-btns">
                    <button type="button" className="rf-btn" disabled={!breakInfo.act} onClick={() => finishBreak(true)}>Fiz a pausa</button>
                    <button type="button" className="rf-btn ghost" onClick={() => finishBreak(true)}>Encerrar pausa</button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="rf-card" aria-labelledby="rfRep">
            <div className="rf-card-head"><div><h3 id="rfRep">Sua semana de foco</h3><p className="rf-sub">Segunda a domingo. Pausas planejadas não contam como falta.</p></div></div>
            <div className="rf-stats">
              <div><b>{rep.sessions}</b><span>{plural(rep.sessions, 'sessão concluída', 'sessões concluídas')}</span></div>
              <div><b>{fmtMin(rep.minutes)}</b><span>de foco</span></div>
              {!simple && <div><b>{rep.metDays} {plural(rep.metDays, 'dia', 'dias')}</b><span>com a meta mínima</span></div>}
              <div><b>{rep.subjects.length}</b><span>{plural(rep.subjects.length, 'frente avançada', 'frentes avançadas')}</span></div>
            </div>
            <div className="rf-report">
              <div>
                <h4>Minutos por dia</h4>
                <div className="rf-bars" role="img" aria-label={`Minutos de foco por dia: ${week.map((d) => `${d.name} ${d.st === 'rest' ? 'pausa' : d.min + ' min'}`).join(', ')}`}>
                  {week.map((d) => (
                    <div key={d.iso} className={`bar${d.isToday ? ' today' : ''}`} title={`${d.name}: ${d.st === 'rest' ? 'pausa planejada' : fmtMin(d.min)}`}>
                      <span className="v">{d.st === 'rest' ? 'pausa' : d.min || ''}</span>
                      <i className={d.st === 'rest' ? 'rest' : ''} style={{ height: d.st === 'rest' ? 2 : Math.round((d.min / maxMin) * 110) }} />
                      <span>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4>O que avançou</h4>
                {rep.subjects.length ? <ul className="rf-list">{rep.subjects.map(([k, v]) => <li key={k}>{k}<span>{fmtMin(v)}</span></li>)}</ul>
                  : <p className="rf-hint">Quando você concluir sessões nesta semana, elas aparecem aqui.</p>}
                {!simple && rep.patterns.length > 0 && (<><h4>Padrões</h4>{rep.patterns.map((p) => <p key={p} className="rf-pattern">{p}</p>)}</>)}
              </div>
            </div>
            <h4 className="rf-gap">Sessões de hoje</h4>
            {rep.today.length ? (
              <ul className="rf-log">{rep.today.map((l) => (
                <li key={l.id}><span>{l.at}</span><b>{l.subject}</b><span>{l.mins} min{l.full ? '' : ' · parcial'}</span>{(l.goal || l.note) && <em>{[l.goal, l.note].filter(Boolean).join(' → ')}</em>}</li>
              ))}</ul>
            ) : <p className="rf-hint">Nenhuma sessão hoje ainda. Quando concluir, ela aparece aqui.</p>}
          </section>
        </div>

        {!simple && (
          <div className="rf-col">
            <section className="rf-card" aria-label="Cristal de foco e nível">
              <div className="rf-crystal">
                <svg viewBox="0 0 84 100" aria-hidden="true">
                  <defs><linearGradient id="rfCrystal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C4B5FD" /><stop offset=".55" stopColor="#A78BFA" /><stop offset="1" stopColor="#60A5FA" /></linearGradient></defs>
                  <polygon points="42,4 74,30 64,90 20,90 10,30" fill="url(#rfCrystal)" opacity=".92" />
                  <polygon points="42,4 74,30 42,40 10,30" fill="#fff" opacity=".28" />
                  <path d="M42,40 L42,96" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
                  <polygon points="42,40 64,90 42,96 20,90" fill="#0C1020" opacity=".12" />
                </svg>
                <div>
                  <div className="n">{g.foco}<small>de Foco</small></div>
                  <p className="rf-sub">Cada sessão concluída carrega o cristal. Foco não expira.</p>
                </div>
              </div>
              <div className="rf-lvl">
                <div className="rf-lvl-row"><b>{LEVELS[li].name}</b><span>{next ? `${next.min - g.metDates.length} ${plural(next.min - g.metDates.length, 'dia constante', 'dias constantes')} até ${next.name}` : 'Nível máximo'}</span></div>
                <div className="rf-ladder" role="img" aria-label={`Nível ${li + 1} de ${LEVELS.length}`}>{LEVELS.map((l, i) => <i key={l.name} className={i <= li ? 'on' : ''} />)}</div>
                <p className="rf-hint">{LEVELS.map((l, i) => <React.Fragment key={l.name}>{i > 0 && ' › '}{i === li ? <b>{l.name}</b> : l.name}</React.Fragment>)}</p>
                <p className="rf-hint">O nível sobe com dias em que você bate sua meta mínima. Ele nunca desce.</p>
              </div>
              <div className="rf-lvl">
                <div className="rf-lvl-row"><b className="small">Tema do anel</b><span>opcional</span></div>
                <div className="rf-themes">
                  {THEMES.map((t) => {
                    const ok = g.foco >= t.need;
                    return (
                      <button type="button" key={t.id} className="rf-theme" aria-pressed={g.theme === t.id} disabled={!ok} onClick={() => set({ theme: t.id })}>
                        <i style={{ background: `linear-gradient(135deg, ${t.stops.join(', ')})` }} />{t.name}{!ok && ` · ${t.need}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {g.missionsHidden ? (
              <section className="rf-card"><div className="rf-lvl-row"><span>Sugestões ocultas.</span><button type="button" className="rf-btn link" onClick={() => set({ missionsHidden: false })}>Mostrar</button></div></section>
            ) : (
              <section className="rf-card" aria-labelledby="rfMis">
                <div className="rf-card-head">
                  <div><h3 id="rfMis">Sugestões de hoje</h3><p className="rf-sub">Opcionais. Nada acontece se você pular.</p></div>
                  <button type="button" className="rf-btn link" onClick={() => set({ missionsHidden: true })}>Ocultar</button>
                </div>
                <ul className="rf-missions">
                  {MISSIONS.filter((m) => !missions.hidden.includes(m.id)).map((m) => {
                    const done = missions.done.includes(m.id);
                    return (
                      <li key={m.id} className={done ? 'done' : ''}>
                        {m.manual && !done
                          ? <button type="button" className="dot" aria-label={`Marcar como feito: ${m.text}`} onClick={() => apply(markMission(g, m.id))} />
                          : <span className="dot" aria-hidden="true" />}
                        <span className="txt">{m.text}<small>{done ? 'Feito' : m.manual ? `Marque quando fizer · +${FOCO.mission} de Foco` : `+${FOCO.mission} de Foco`}</small></span>
                        <button type="button" className="x" aria-label={`Tirar sugestão: ${m.text}`} onClick={() => setG(hideMission(g, m.id))}><X size={16} /></button>
                      </li>
                    );
                  })}
                  {MISSIONS.every((m) => missions.hidden.includes(m.id)) && <li className="rf-hint">Nenhuma sugestão para hoje.</li>}
                </ul>
              </section>
            )}

            <section className="rf-card rf-constel" aria-labelledby="rfCon">
              <div className="rf-card-head"><div><h3 id="rfCon">Constância da semana</h3>
                <p className="rf-sub">{rep.metDays} de {week.filter((d) => d.st === 'met' || d.st === 'below' || d.st === 'today').length} {plural(week.filter((d) => d.st === 'met' || d.st === 'below' || d.st === 'today').length, 'dia', 'dias')} até hoje com a meta mínima de {g.minGoal} {plural(g.minGoal, 'sessão', 'sessões')}. Hoje: {todayN} de {g.minGoal}.</p></div></div>
              <svg viewBox="0 0 300 120" role="img" aria-label={`Constância da semana: ${rep.metDays} dias com a meta mínima`}>
                <defs><linearGradient id="rfLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#60A5FA" /></linearGradient></defs>
                {week.slice(0, 6).map((d, i) => {
                  const a = d.st; const b = week[i + 1].st;
                  const ok = (x) => x === 'met' || x === 'rest';
                  return ok(a) && ok(b) && (a === 'met' || b === 'met')
                    ? <line key={d.iso} className="ln" x1={pts[i][0]} y1={pts[i][1]} x2={pts[i + 1][0]} y2={pts[i + 1][1]} /> : null;
                })}
                {week.map((d, i) => {
                  const [x, y] = pts[i];
                  const label = { met: 'meta cumprida', below: 'abaixo da meta', rest: 'pausa planejada', future: 'ainda não chegou', today: 'hoje, em andamento' }[d.st];
                  const toggle = () => setG(toggleRest(g, d.iso));
                  return (
                    <g key={d.iso}>
                      <title>{`${d.name}: ${label}${d.n ? `, ${d.n} sessões` : ''}`}</title>
                      <circle className={d.st === 'today' ? 'star-today' : `star-${d.st}`} cx={x} cy={y} r={d.st === 'below' ? 3.5 : 6} />
                      {d.iso > today && <circle className="hit" cx={x} cy={y} r="16" tabIndex={0} role="button" aria-label={`${d.name}: ${d.st === 'rest' ? 'desfazer pausa planejada' : 'planejar pausa'}`}
                        onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }} />}
                      <text x={x} y="108" textAnchor="middle" className={d.isToday ? 'today' : ''}>{d.name}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="rf-legend">
                <span><i className="l-met" />Meta mínima</span><span><i className="l-below" />Abaixo da meta</span><span><i className="l-rest" />Pausa planejada</span>
              </div>
              <p className="rf-hint">Toque num dia futuro para planejar uma pausa.</p>
              <div className="rf-goal">
                <span>Minha meta mínima por dia</span>
                <span className="rf-stepper">
                  <button type="button" aria-label="Diminuir meta" onClick={() => apply(setGoal(g, g.minGoal - 1))}>−</button>
                  <b>{g.minGoal}</b>
                  <button type="button" aria-label="Aumentar meta" onClick={() => apply(setGoal(g, g.minGoal + 1))}>+</button>
                </span>
              </div>
            </section>

            <section className="rf-card" aria-labelledby="rfBad">
              <div className="rf-card-head"><div><h3 id="rfBad">Emblemas</h3><p className="rf-sub">Só você vê. Sem ranking.</p></div></div>
              <div className="rf-badges">
                {BADGES.map((b) => (
                  <div key={b.id} className={`badge${g.badges[b.id] ? ' on' : ''}`}>
                    <Emblem glyph={b.glyph} on={!!g.badges[b.id]} uid={b.id} />
                    <b>{b.name}</b>{g.badges[b.id] ? 'Conquistado' : b.how}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {stopAsk && (
        <div className="rx-overlay" onClick={stopBack}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="rfStop" onClick={(e) => e.stopPropagation()}>
            <h2 id="rfStop">Parar a sessão?</h2>
            <p>{stopAsk.done > 0 ? `Você focou ${stopAsk.done} min. Esse tempo fica no seu histórico e você não perde nada do que já conquistou.` : 'Ainda não deu um minuto. Nada é perdido se você parar.'}</p>
            <div className="rf-btns col">
              {stopAsk.done > 0 && <button type="button" className="rf-btn" onClick={stopKeep}>Guardar {stopAsk.done} min e parar</button>}
              <button type="button" className="rf-btn ghost" onClick={stopDrop}>{stopAsk.done > 0 ? 'Parar sem guardar' : 'Parar'}</button>
              <button type="button" className="rf-btn ghost" autoFocus onClick={stopBack}>Continuar focando</button>
              {plantaOn && estagio !== especie.estagios[0] && <p className="rf-hint">Guardar deixa a planta onde chegou. Parar sem guardar faz ela murchar.</p>}
            </div>
          </div>
        </div>
      )}

      {showCatalogo && (
        <div className="rx-overlay" onClick={() => setShowCatalogo(false)}>
          <div
            className="rx-dialog rf-cat-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rfCatTitle"
            data-testid="rf-catalogo-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rf-card-head">
              <div>
                <h2 id="rfCatTitle">Escolher o que cultivar no Foco</h2>
                <p className="rf-sub">
                  21 Plantas, 20 Mundos e 20 Elementos com progressão em 5 estágios e paletas de cores alternadas.
                </p>
              </div>
              <button type="button" className="x" aria-label="Fechar catálogo" onClick={() => setShowCatalogo(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Prévia dos 5 estágios do item selecionado */}
            <div className="rf-cat-stages" aria-label={`Progressão de ${especie.nome}`}>
              {especie.estagios.map((st) => (
                <div key={st.stageId} className="rf-cat-stage">
                  <img src={urlDoAsset(especie.id, st.assetKey) || ''} alt="" />
                  <b>{st.nome}</b>
                  <span>{Math.round(st.minProgress * 100)}%</span>
                </div>
              ))}
            </div>

            {/* Filtros de Tema e Busca */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="rf-chips">
                {TEMAS_CULTIVO.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className="rf-chip"
                    aria-pressed={catTema === t.id}
                    data-testid={`rf-cat-tab-${t.id}`}
                    onClick={() => setCatTema(t.id)}
                  >
                    <i style={{ background: catTema === t.id ? (especie.paleta?.c1 || '#A78BFA') : '#64748B' }} />
                    {t.icone} {t.nome} ({especiesPorTema(t.id).length})
                  </button>
                ))}
                <button
                  type="button"
                  className="rf-chip"
                  aria-pressed={catTema === 'todos'}
                  data-testid="rf-cat-tab-todos"
                  onClick={() => setCatTema('todos')}
                >
                  Todos (61)
                </button>
              </div>
              <input
                type="search"
                className="rf-input"
                aria-label="Buscar no catálogo de cultivo"
                placeholder="Buscar nome ou paleta..."
                value={catBusca}
                onChange={(e) => setCatBusca(e.target.value)}
                style={{ maxWidth: 230 }}
              />
            </div>

            {/* Grade visual de cartões */}
            <div className="rf-cat-grid">
              {especiesPorTema(catTema)
                .filter((item) => {
                  const q = catBusca.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    item.nome.toLowerCase().includes(q) ||
                    (item.subtitulo || '').toLowerCase().includes(q) ||
                    (item.paleta?.nome || '').toLowerCase().includes(q)
                  );
                })
                .map((item) => {
                  const selecionado = item.id === especie.id;
                  const finalStage = item.estagios[item.estagios.length - 1];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className="rf-cat-card"
                      aria-pressed={selecionado}
                      data-testid={`rf-cat-item-${item.id}`}
                      onClick={() => set({ especie: item.id })}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--rx-ink-3)' }}>
                          {item.id === 'lirio-lunar' ? '★ Padrão' : `#${String(item.indiceTema || 1).padStart(2, '0')}`}
                        </span>
                        {item.paleta && (
                          <span style={{ display: 'inline-flex', gap: 4 }}>
                            <i style={{ width: 8, height: 8, borderRadius: '50%', background: item.paleta.c1, display: 'inline-block' }} />
                            <i style={{ width: 8, height: 8, borderRadius: '50%', background: item.paleta.c2, display: 'inline-block' }} />
                            <i style={{ width: 8, height: 8, borderRadius: '50%', background: item.paleta.c3, display: 'inline-block' }} />
                          </span>
                        )}
                      </div>
                      <div className="rf-cat-art" aria-hidden="true">
                        <img className="sp" src={urlDoAsset(item.id, finalStage.assetKey) || ''} alt="" />
                        <img className="ch" src={urlDoAsset(item.id, item.chao) || ''} alt="" />
                      </div>
                      <div>
                        <b style={{ display: 'block', fontSize: 13.5 }}>{item.nome}</b>
                        {item.subtitulo && (
                          <small style={{ display: 'block', fontSize: 11, color: 'var(--rx-ink-3)', marginTop: 2 }}>
                            {item.subtitulo}
                          </small>
                        )}
                        {item.paleta && (
                          <span style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: item.paleta.c1, marginTop: 4 }}>
                            {item.paleta.nome}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="rf-btns" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="rf-btn" onClick={() => setShowCatalogo(false)}>
                Cultivar {especie.nome}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCert && last && (
        <div className="rx-overlay" onClick={() => setShowCert(false)}>
          <div className="rx-dialog rf-cert" role="dialog" aria-modal="true" aria-labelledby="rfCert" onClick={(e) => e.stopPropagation()}>
            <div className="rf-card-head"><h2 id="rfCert">Certificado da sessão</h2>
              <button type="button" className="x" aria-label="Fechar" onClick={() => setShowCert(false)}><X size={18} /></button></div>
            <canvas ref={certRef} width="500" height="400" />
            <div className="rf-btns"><button type="button" className="rf-btn" onClick={downloadCert}><Download size={16} />Baixar imagem</button></div>
          </div>
        </div>
      )}

      <div className="rf-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="rf-toast">
            {t.glyph && <Emblem glyph={t.glyph} on uid={t.id} />}
            <div>{t.lines.map((l) => <div key={l}>{l}</div>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
