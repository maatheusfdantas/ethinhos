import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, CheckCircle2, Clock, Dumbbell, History, Info, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { TreinoAtivo, TreinoResumo, resolveExerciseWithMuscles } from './TreinoAtivo';
import { DoSeuPersonal } from './DoSeuPersonal';
import { Biblioteca } from './Biblioteca';
import { CorpoExercicio, MapaCorporal } from './MapaCorporal';
import { loadBiblioteca } from './bibliotecaApi';
import { MUSCLES, MUSCLE_KEYS, matchesExercise } from './musculos';
import { fmtKg, newSessionId, treinoApi } from './treinoApi';
import '../../styles/treino.css';

export const WORKOUT_THEMES = [
  { id: 'orange', label: 'Laranja Energia', accent: '#F97316' },
  { id: 'blue', label: 'Azul Intenso', accent: '#3B82F6' },
  { id: 'green', label: 'Verde Foco', accent: '#10B981' },
  { id: 'purple', label: 'Roxo Força', accent: '#8B5CF6' },
  { id: 'rose', label: 'Rosa Potência', accent: '#F43F5E' }
];

// Base anatômica local caso o servidor ainda esteja carregando ou offline (mesmo formato da Biblioteca nova)
const FALLBACK_EXERCISES = [
  { id: 'fe_bench_press', name: 'Supino Reto com Barra', aliases: ['Barbell Bench Press'], group: 'Peito', primary: ['peitoral'], secondary: ['triceps', 'deltoide_anterior'], equipment: 'Barra', level: 'Intermediário', sets: 4, reps: 10, weightKg: 40, restSec: 90, instructions: ['Deite no banco plano, pés firmes no chão e desça a barra até o meio do peito.'] },
  { id: 'fe_incline_db_press', name: 'Supino Inclinado com Halteres', aliases: ['Incline Dumbbell Press'], group: 'Peito', primary: ['peitoral', 'deltoide_anterior'], secondary: ['triceps'], equipment: 'Halteres', level: 'Intermediário', sets: 4, reps: 10, weightKg: 18, restSec: 75, instructions: ['Banco a 30°–45°, desça os halteres controlando as escápulas.'] },
  { id: 'fe_cable_crossover', name: 'Crucifixo no Crossover', aliases: ['Cable Crossover'], group: 'Peito', primary: ['peitoral'], secondary: ['deltoide_anterior'], equipment: 'Polia', level: 'Iniciante', sets: 3, reps: 12, weightKg: 15, restSec: 60, instructions: ['Incline levemente o tronco e una as mãos à frente do peito.'] },
  { id: 'fe_lat_pulldown', name: 'Puxada Frontal na Polia', aliases: ['Lat Pulldown'], group: 'Costas', primary: ['dorsal'], secondary: ['biceps', 'dorso_medio'], equipment: 'Polia', level: 'Iniciante', sets: 4, reps: 10, weightKg: 45, restSec: 75, instructions: ['Traga a barra em direção à parte superior do peito mantendo o peito aberto.'] },
  { id: 'fe_barbell_row', name: 'Remada Curvada com Barra', aliases: ['Barbell Bent Over Row'], group: 'Costas', primary: ['dorso_medio', 'dorsal'], secondary: ['biceps', 'lombar', 'trapezio'], equipment: 'Barra', level: 'Intermediário', sets: 4, reps: 10, weightKg: 40, restSec: 90, instructions: ['Tronco inclinado a 45°, puxe a barra na direção do abdômen.'] },
  { id: 'fe_deadlift', name: 'Levantamento Terra', aliases: ['Deadlift'], group: 'Costas', primary: ['lombar', 'posteriores', 'gluteos'], secondary: ['trapezio', 'dorsal', 'antebraco'], equipment: 'Barra', level: 'Avançado', sets: 4, reps: 6, weightKg: 70, restSec: 120, instructions: ['Coluna neutra, empurre o chão com os pés mantendo a barra próxima às pernas.'] },
  { id: 'fe_barbell_squat', name: 'Agachamento Livre com Barra', aliases: ['Barbell Squat'], group: 'Pernas', primary: ['quadriceps', 'gluteos'], secondary: ['posteriores', 'lombar'], equipment: 'Barra', level: 'Intermediário', sets: 4, reps: 8, weightKg: 50, restSec: 120, instructions: ['Desça controlando os joelhos na direção das pontas dos pés.'] },
  { id: 'fe_leg_press', name: 'Leg Press 45°', aliases: ['Leg Press'], group: 'Pernas', primary: ['quadriceps'], secondary: ['gluteos', 'posteriores'], equipment: 'Máquina', level: 'Iniciante', sets: 4, reps: 12, weightKg: 120, restSec: 90, instructions: ['Apoie a lombar no encosto e desça a plataforma sem tirar o quadril do banco.'] },
  { id: 'fe_romanian_deadlift', name: 'Stiff / Terra Romeno', aliases: ['Romanian Deadlift'], group: 'Pernas', primary: ['posteriores', 'gluteos'], secondary: ['lombar'], equipment: 'Barra', level: 'Intermediário', sets: 4, reps: 10, weightKg: 40, restSec: 90, instructions: ['Empurre o quadril para trás mantendo leve flexão nos joelhos.'] },
  { id: 'fe_calf_raise', name: 'Panturrilha em Pé', aliases: ['Standing Calf Raise'], group: 'Pernas', primary: ['panturrilhas'], secondary: ['tibial'], equipment: 'Máquina', level: 'Iniciante', sets: 4, reps: 15, weightKg: 50, restSec: 45, instructions: ['Amplitude máxima na subida e descida controlada.'] },
  { id: 'fe_shoulder_press', name: 'Desenvolvimento com Halteres', aliases: ['Dumbbell Shoulder Press'], group: 'Ombros', primary: ['deltoide_anterior', 'deltoide_lateral'], secondary: ['triceps', 'trapezio'], equipment: 'Halteres', level: 'Intermediário', sets: 4, reps: 10, weightKg: 14, restSec: 75, instructions: ['Empurre os halteres acima da cabeça sem arquear a lombar.'] },
  { id: 'fe_lateral_raise', name: 'Elevação Lateral', aliases: ['Lateral Raise'], group: 'Ombros', primary: ['deltoide_lateral'], secondary: ['trapezio'], equipment: 'Halteres', level: 'Iniciante', sets: 4, reps: 12, weightKg: 8, restSec: 60, instructions: ['Eleve os braços até a linha dos ombros com leve flexão nos cotovelos.'] },
  { id: 'fe_barbell_curl', name: 'Rosca Direta com Barra', aliases: ['Barbell Curl'], group: 'Braços', primary: ['biceps'], secondary: ['antebraco'], equipment: 'Barra', level: 'Iniciante', sets: 3, reps: 10, weightKg: 20, restSec: 60, instructions: ['Mantenha os cotovelos fixos ao lado do tronco durante a subida.'] },
  { id: 'fe_triceps_pushdown', name: 'Tríceps Pulley na Corda', aliases: ['Triceps Pushdown'], group: 'Braços', primary: ['triceps'], secondary: ['antebraco'], equipment: 'Polia', level: 'Iniciante', sets: 3, reps: 12, weightKg: 20, restSec: 60, instructions: ['Estenda completamente os cotovelos abrindo a corda no final.'] },
  { id: 'fe_plank', name: 'Prancha Abdominal Isométrica', aliases: ['Plank'], group: 'Core', primary: ['abdomen', 'obliquos'], secondary: ['lombar'], equipment: 'Peso corporal', level: 'Iniciante', metric: 'tempo', sets: 3, reps: 45, weightKg: 0, restSec: 45, instructions: ['Mantenha o corpo alinhado e o abdômen contraído.'] }
];

const DAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const accentOf = (w) => (WORKOUT_THEMES.find((t) => t.id === w?.theme) || WORKOUT_THEMES[0]).accent;
const daysText = (w) => {
  const d = WEEK_ORDER.filter((i) => (w.scheduledDays || []).includes(i)).map((i) => DAY_SHORT[i]);
  return d.length ? `${d.join(', ')} às ${w.scheduledTime || '18:30'}` : 'Sem dia na agenda';
};
const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const blankExercise = () => ({ id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name: '', primary: [], secondary: [], muscle: '', sets: 3, reps: 10, weightKg: 0, restSec: 60, showWeight: true, showRestTimer: true });
const newWorkout = () => ({ id: `wo_${Date.now()}`, name: '', subtitle: 'Foco em força e hipertrofia progressiva', theme: 'orange', scheduledDays: [1], scheduledTime: '18:30', exercises: [] });

/**
 * Treino unificado com a Biblioteca nova e Mapa Corporal (músculos principais e secundários em todas as telas).
 */
export function TreinoTab({ workouts = [], setWorkouts, onCompleteWorkout, showToast, user }) {
  const [view, setView] = useState('home');
  const [draft, setDraft] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [libGroup, setLibGroup] = useState('all');
  const [libQuery, setLibQuery] = useState('');
  const [libTarget, setLibTarget] = useState('');
  const [custom, setCustom] = useState(null);
  const [libModalOpen, setLibModalOpen] = useState(false);
  const [libData, setLibData] = useState(null);
  const [selectedLibEx, setSelectedLibEx] = useState(null);
  const [history, setHistory] = useState({ sessions: [], exercises: [], loaded: false, error: '' });
  const [open, setOpen] = useState(null);
  const [active, setActive] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [finished, setFinished] = useState(null);
  const [progressKey, setProgressKey] = useState('');
  const [progress, setProgress] = useState([]);
  const [starting, setStarting] = useState(false);
  const [atribuidos, setAtribuidos] = useState([]);
  const toast = (m) => (showToast ? showToast(m) : undefined);
  const userId = user?.id;

  useEffect(() => {
    loadBiblioteca().then(
      (res) => setLibData(res),
      () => setLibData({ exercicios: [], personalizados: [] })
    );
  }, [view, libModalOpen]);

  const unifiedCatalog = useMemo(() => {
    const serverList = [...(libData?.personalizados || []), ...(libData?.exercicios || [])];
    if (serverList.length === 0) return FALLBACK_EXERCISES;
    // Garante que todos os itens do fallback também estejam acessíveis caso não estejam na seed local
    const existingNames = new Set(serverList.map((e) => e.name.toLowerCase()));
    const extras = FALLBACK_EXERCISES.filter((e) => !existingNames.has(e.name.toLowerCase()));
    return [...serverList, ...extras];
  }, [libData]);

  const unifiedGroups = useMemo(() => {
    const groups = [...new Set(unifiedCatalog.map((e) => e.group).filter(Boolean))];
    return [{ id: 'all', label: 'Todos' }, ...groups.map((g) => ({ id: g, label: g }))];
  }, [unifiedCatalog]);

  const loadServer = useCallback(async () => {
    try {
      const [h, o] = await Promise.all([treinoApi.historico(60), treinoApi.aberta()]);
      setHistory({ sessions: h.sessions || [], exercises: h.exercises || [], loaded: true, error: '' });
      setOpen(o.session || null);
      treinoApi.atribuidos().then((r) => setAtribuidos(r.atribuidos || []), () => setAtribuidos([]));
    } catch (e) {
      setHistory({ sessions: [], exercises: [], loaded: true, error: e?.code === 'treino_indisponivel' ? 'O histórico de treinos ainda não está disponível.' : 'Não foi possível carregar o histórico agora.' });
    }
  }, []);

  useEffect(() => {
    if (userId) loadServer();
  }, [userId, loadServer]);

  useEffect(() => {
    if (!progressKey) return;
    let alive = true;
    treinoApi.progresso(progressKey).then((r) => alive && setProgress(r.weeks || []), () => alive && setProgress([]));
    return () => { alive = false; };
  }, [progressKey]);

  const own = workouts;
  const today = new Date();
  const dow = today.getDay();

  const go = (v) => {
    setView(v);
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo(0, 0);
  };

  const loadSuggestions = async (exercises) => {
    try {
      const keys = exercises.map((e) => e.id).filter(Boolean);
      if (keys.length) setSuggestions((await treinoApi.ultimas(keys)).last || {});
    } catch {
      setSuggestions({});
    }
  };

  const startAssignment = async (a) => {
    if (starting) return;
    setStarting(true);
    try {
      const r = await treinoApi.iniciar({ id: newSessionId(), assignmentId: a.id });
      if (r.resumed && r.session?.assignmentId !== a.id) toast(r.message || 'Você já tem um treino em andamento. Ele foi retomado.');
      await loadSuggestions(r.session.content.exercises || []);
      setActive(r.session);
      setOpen(r.session);
      go('ativo');
    } catch (e) {
      toast(e?.message || 'Não foi possível iniciar o treino. Confira a conexão.');
    } finally {
      setStarting(false);
    }
  };

  const copyAssignment = (a) => {
    const copy = { id: `wo_${Date.now()}`, name: `${a.name} (cópia)`, subtitle: `Copiada da ficha de ${a.proName}`, theme: 'blue', scheduledDays: [], scheduledTime: '18:30', exercises: a.content.exercises.map((e) => ({ ...e, id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })) };
    setWorkouts((prev) => [...prev, copy]);
    toast(`${a.name} foi copiada para as suas fichas. A ficha do profissional continua igual.`);
  };

  const startWorkout = async (w) => {
    if (starting) return;
    if (!w.exercises?.length) {
      toast('Adicione pelo menos um exercício à ficha antes de começar.');
      return;
    }
    setStarting(true);
    try {
      const content = {
        exercises: w.exercises.map((e) => {
          const resolved = resolveExerciseWithMuscles(e, { exercicios: unifiedCatalog, personalizados: [] });
          return {
            id: e.id,
            libraryId: e.libraryId || resolved.id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weightKg: e.weightKg,
            restSec: e.restSec,
            showWeight: e.showWeight,
            showRestTimer: e.showRestTimer,
            muscle: e.muscle || (resolved.primary?.[0] ? MUSCLES[resolved.primary[0]] : ''),
            primary: resolved.primary || [],
            secondary: resolved.secondary || []
          };
        })
      };
      const r = await treinoApi.iniciar({ id: newSessionId(), name: w.name, workoutRef: w.id, content });
      if (r.resumed && r.session?.workoutRef !== w.id) toast(r.message || 'Você já tem um treino em andamento. Ele foi retomado.');
      await loadSuggestions(r.session.content.exercises || []);
      setActive(r.session);
      setOpen(r.session);
      go('ativo');
    } catch (e) {
      toast(e?.code === 'treino_indisponivel' ? 'O treino ativo ainda não está disponível. Tente mais tarde.' : 'Não foi possível iniciar o treino. Confira a conexão.');
    } finally {
      setStarting(false);
    }
  };

  const resume = async () => {
    if (!open) return;
    await loadSuggestions(open.content?.exercises || []);
    setActive(open);
    go('ativo');
  };

  const stats = useMemo(() => {
    const closed = history.sessions.filter((s) => s.status !== 'em_andamento');
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((dow + 6) % 7));
    const weekDates = WEEK_ORDER.map((d, i) => {
      const dt = new Date(monday);
      dt.setDate(monday.getDate() + i);
      return { idx: d, date: localDate(dt) };
    });
    const trainedDates = new Set(closed.filter((s) => s.doneSets > 0).map((s) => localDate(new Date(s.startedAt))));
    const week = weekDates.map(({ idx, date }) => ({
      idx, date,
      names: own.filter((w) => (w.scheduledDays || []).includes(idx)).map((w) => w.name),
      done: trainedDates.has(date),
      today: date === localDate(today)
    }));
    const scheduledDays = week.filter((d) => d.names.length).length;
    const trainedThisWeek = week.filter((d) => d.done).length;
    const month = closed.filter((s) => { const d = new Date(s.startedAt); return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(); });
    const full = closed.filter((s) => s.status === 'concluida');
    const avg = full.length ? Math.round(full.reduce((a, s) => a + (s.elapsedMs || 0), 0) / full.length / 60000) : null;
    let next = null;
    for (let k = 0; k < 7 && !next; k++) {
      const d = (dow + k) % 7;
      const nowHm = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
      const cands = own.filter((w) => (w.scheduledDays || []).includes(d) && (k > 0 || (w.scheduledTime || '23:59') >= nowHm)).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
      if (cands[0]) next = { w: cands[0], when: k === 0 ? `Hoje, ${cands[0].scheduledTime}` : `${DAY_SHORT[d]}, ${cands[0].scheduledTime}` };
    }
    return { week, scheduledDays, trainedThisWeek, month: month.length, monthIncomplete: month.filter((s) => s.status === 'incompleta').length, avg, next };
  }, [history.sessions, own, dow]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditor = (w) => {
    setDraft(JSON.parse(JSON.stringify(w || newWorkout())));
    go('editor');
  };
  const saveDraft = (andThen) => {
    const name = (draft?.name || '').trim();
    if (!name) {
      toast('Dê um nome para a ficha.');
      return null;
    }
    const clean = {
      ...draft,
      name,
      subtitle: (draft.subtitle || '').trim(),
      exercises: (draft.exercises || [])
        .filter((e) => (e.name || '').trim())
        .map((e) => {
          const resolved = resolveExerciseWithMuscles(e, { exercicios: unifiedCatalog, personalizados: [] });
          return {
            ...e,
            name: e.name.trim(),
            primary: e.primary?.length ? e.primary : (resolved.primary || []),
            secondary: e.secondary?.length ? e.secondary : (resolved.secondary || []),
            muscle: e.muscle || (resolved.primary?.[0] ? MUSCLES[resolved.primary[0]] : ''),
            sets: Math.max(1, Number(e.sets) || 1),
            reps: Math.max(0, Number(e.reps) || 0),
            weightKg: Math.max(0, Number(String(e.weightKg).replace(',', '.')) || 0),
            restSec: Math.max(0, Number(e.restSec) || 0)
          };
        })
    };
    setWorkouts((prev) => (prev.some((w) => w.id === clean.id) ? prev.map((w) => (w.id === clean.id ? clean : w)) : [...prev, clean]));
    if (andThen) andThen(clean);
    else {
      toast('Ficha salva.');
      go('home');
    }
    return clean;
  };
  const deleteWorkout = (id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    setConfirm(null);
    toast('Ficha excluída. As sessões já feitas continuam no histórico.');
    go('home');
  };
  const setEx = (i, patch) => setDraft((d) => ({ ...d, exercises: d.exercises.map((e, k) => (k === i ? { ...e, ...patch } : e)) }));

  const addFromLibrary = (card, targetId) => {
    const target = own.find((w) => w.id === targetId);
    if (!target) {
      toast('Crie uma ficha primeiro.');
      return;
    }
    const primaryNames = (card.primary || []).map((k) => MUSCLES[k]).filter(Boolean);
    const ex = {
      id: `ex_lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      libraryId: card.id,
      name: card.name,
      primary: card.primary || [],
      secondary: card.secondary || [],
      muscle: primaryNames[0] || card.muscle || card.group || '',
      sets: card.sets || 4,
      reps: card.metric === 'tempo' ? 30 : (card.reps || 10),
      weightKg: card.weightKg || 0,
      restSec: card.restSec || 60,
      showWeight: (card.weightKg || 0) > 0 || card.metric !== 'tempo',
      showRestTimer: true
    };
    setWorkouts((prev) => prev.map((w) => (w.id === targetId ? { ...w, exercises: [...(w.exercises || []), ex] } : w)));
    toast(`${card.name} entrou em ${target.name}.`);
  };

  const target = libTarget || own[0]?.id || '';

  let body;
  if (view === 'ativo' && active) {
    body = (
      <TreinoAtivo
        session={active}
        suggestions={suggestions}
        showToast={toast}
        onChange={(s) => { setActive(s); setOpen(s); }}
        onFinished={(s) => { setFinished(s); setActive(null); setOpen(null); onCompleteWorkout?.(s.name); loadServer(); go('resumo'); }}
        onDiscarded={() => { setActive(null); setOpen(null); toast('Sessão reiniciada.'); go('home'); }}
      />
    );
  } else if (view === 'resumo' && finished) {
    body = <TreinoResumo session={finished} onBack={() => go('home')} />;
  } else if (view === 'editor' && draft) {
    const isNew = !own.some((w) => w.id === draft.id);
    const resolvedDraftExs = (draft.exercises || []).map((e) => resolveExerciseWithMuscles(e, { exercicios: unifiedCatalog, personalizados: [] }));
    const semMusculosCount = resolvedDraftExs.filter((r) => !r.primary?.length).length;
    const draftCounts = (draft.exercises || []).reduce((m, e) => { if (e.libraryId) m[e.libraryId] = (m[e.libraryId] || 0) + 1; return m; }, {});

    body = (
      <>
        <div className="tr-head">
          <div><h1>{isNew ? 'Nova ficha' : 'Editar ficha'}</h1><p>Dias na agenda, horário, estilo do card, séries, carga, descanso e mapa muscular.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar para as fichas</button><button type="button" className="rx-btn" onClick={() => saveDraft()}>Salvar ficha</button></div>
        </div>
        <div className="tr-grid">
          <article className="tr-panel">
            <div className="tr-field"><label htmlFor="tr-fn">Nome da ficha</label><input id="tr-fn" className="tr-input" value={draft.name} placeholder="Ex.: Treino A, pernas" onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="tr-field"><label htmlFor="tr-fs">Descrição do foco</label><input id="tr-fs" className="tr-input" value={draft.subtitle || ''} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} /></div>
            <h3 style={{ margin: '18px 0 4px' }}>Exercícios</h3>
            {(draft.exercises || []).length === 0 && <p className="tr-sub">Nenhum exercício ainda. Adicione da biblioteca ou crie um personalizado.</p>}
            {(draft.exercises || []).map((e, i) => {
              const res = resolvedDraftExs[i];
              const muscNames = (res?.primary || []).map((k) => MUSCLES[k]).filter(Boolean);
              return (
                <div className="tr-edit-ex-wrap" key={e.id}>
                  <div className="tr-edit-ex">
                    <label>Exercício<input className="tr-input" value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value })} /></label>
                    <label>Séries<input className="tr-input" inputMode="numeric" value={e.sets} onChange={(ev) => setEx(i, { sets: ev.target.value })} /></label>
                    <label>Repetições<input className="tr-input" inputMode="numeric" value={e.reps} onChange={(ev) => setEx(i, { reps: ev.target.value })} /></label>
                    <label>Carga (kg)<input className="tr-input" inputMode="decimal" value={e.weightKg} onChange={(ev) => setEx(i, { weightKg: ev.target.value })} /></label>
                    <label>Descanso (s)<input className="tr-input" inputMode="numeric" value={e.restSec} onChange={(ev) => setEx(i, { restSec: ev.target.value })} /></label>
                    <label className="chk"><input type="checkbox" checked={e.showWeight !== false} onChange={(ev) => setEx(i, { showWeight: ev.target.checked })} />Exibir carga</label>
                    <button type="button" className="tr-x" aria-label={`Tirar ${e.name || 'exercício'}`} onClick={() => setDraft((d) => ({ ...d, exercises: d.exercises.filter((_, k) => k !== i) }))}><X size={16} /></button>
                  </div>
                  <div className="tr-edit-muscle-row">
                    <span className="bl-tag p">Músculo trabalhado</span>
                    <span className="tr-sub">{muscNames.length ? muscNames.join(', ') : (e.muscle || 'Escolha um músculo ao lado ou pelo nome do exercício')}</span>
                    <select
                      className="tr-muscle-select"
                      aria-label={`Músculo principal de ${e.name || `exercício ${i + 1}`}`}
                      value={res?.primary?.[0] || ''}
                      onChange={(ev) => {
                        const k = ev.target.value;
                        setEx(i, { primary: k ? [k] : [], muscle: k ? MUSCLES[k] : '' });
                      }}
                    >
                      <option value="">Músculo principal (automático)</option>
                      {MUSCLE_KEYS.map((k) => <option key={k} value={k}>{MUSCLES[k]}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className="rx-btn ghost tiny" onClick={() => setLibModalOpen(true)}><BookOpen size={15} />Adicionar da biblioteca</button>
              <button type="button" className="rx-btn ghost tiny" onClick={() => setDraft((d) => ({ ...d, exercises: [...(d.exercises || []), blankExercise()] }))}><Plus size={15} />Exercício personalizado</button>
            </div>
          </article>
          <aside className="tr-stack">
            <MapaCorporal
              exercises={resolvedDraftExs.filter((x) => x.primary?.length).map((x) => ({ id: x.id, name: x.name, primary: x.primary, secondary: x.secondary }))}
              semMusculos={semMusculosCount}
            />
            <section className="tr-panel">
              <h2>Agenda</h2>
              <div className="tr-field" style={{ marginTop: 12 }}>
                <span className="lbl">Dias na agenda semanal</span>
                <div className="tr-chips">
                  {WEEK_ORDER.map((d) => (
                    <button key={d} type="button" className="tr-chip" aria-pressed={(draft.scheduledDays || []).includes(d)} onClick={() => setDraft((x) => ({ ...x, scheduledDays: (x.scheduledDays || []).includes(d) ? x.scheduledDays.filter((k) => k !== d) : [...(x.scheduledDays || []), d] }))}>{DAY_SHORT[d]}</button>
                  ))}
                </div>
              </div>
              <div className="tr-field"><label htmlFor="tr-ft">Horário sugerido na agenda</label><input id="tr-ft" type="time" className="tr-input" value={draft.scheduledTime || '18:30'} onChange={(e) => setDraft({ ...draft, scheduledTime: e.target.value })} /></div>
            </section>
            <section className="tr-panel">
              <h2>Estilo visual do card</h2>
              <div className="tr-swatches" style={{ marginTop: 12 }}>
                {WORKOUT_THEMES.map((t) => (
                  <button key={t.id} type="button" className="tr-swatch" style={{ '--acc': t.accent }} aria-pressed={(draft.theme || 'orange') === t.id} onClick={() => setDraft({ ...draft, theme: t.id })}><i />{t.label}</button>
                ))}
              </div>
            </section>
            {!isNew && <button type="button" className="tr-btn-danger" onClick={() => setConfirm({ type: 'delete', id: draft.id, name: draft.name })}><Trash2 size={15} />Excluir ficha</button>}
          </aside>
        </div>
        {libModalOpen && (
          <Biblioteca
            fichaName={draft.name || 'a ficha'}
            counts={draftCounts}
            escopo="pessoa"
            toast={toast}
            onAdd={(x) => setDraft((d) => ({
              ...d,
              exercises: [
                ...(d.exercises || []),
                {
                  id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  libraryId: x.id,
                  name: x.name,
                  primary: x.primary || [],
                  secondary: x.secondary || [],
                  muscle: x.primary?.[0] ? MUSCLES[x.primary[0]] : '',
                  sets: 3,
                  reps: x.metric === 'tempo' ? 30 : 10,
                  weightKg: 0,
                  restSec: 60,
                  showWeight: x.metric !== 'tempo',
                  showRestTimer: true
                }
              ]
            }))}
            onRemoveLast={(libId) => setDraft((d) => {
              const idx = (d.exercises || []).map((e) => e.libraryId).lastIndexOf(libId);
              return idx >= 0 ? { ...d, exercises: d.exercises.filter((_, k) => k !== idx) } : d;
            })}
            onClose={() => setLibModalOpen(false)}
          />
        )}
      </>
    );
  } else if (view === 'biblioteca') {
    const items = unifiedCatalog.filter((e) => (libGroup === 'all' || e.group === libGroup) && matchesExercise(e, libQuery));
    body = (
      <>
        <div className="tr-head">
          <div><h1>Biblioteca de exercícios</h1><p>{unifiedCatalog.length} exercícios com mapa anatômico de músculos principais e secundários. Busque em português ou inglês e coloque direto numa ficha.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar</button><button type="button" className="rx-btn" onClick={() => (own.length ? setCustom({ name: '', primary: ['peitoral'], secondary: [], sets: 3, reps: 10, weightKg: 0, restSec: 60, target }) : toast('Crie uma ficha primeiro.'))}><Plus size={16} />Criar exercício personalizado</button></div>
        </div>
        <div className="tr-field" style={{ maxWidth: 520 }}><label htmlFor="tr-q">Buscar exercício ou músculo</label><input id="tr-q" className="tr-input" value={libQuery} placeholder="Ex.: glúteo, supino, squat, quadríceps…" autoComplete="off" onChange={(e) => setLibQuery(e.target.value)} /></div>
        <div className="tr-chips" style={{ marginBottom: 18 }}>
          {unifiedGroups.map((g) => <button key={g.id} type="button" className="tr-chip" aria-pressed={libGroup === g.id} onClick={() => setLibGroup(g.id)}>{g.label}</button>)}
        </div>
        {items.length ? (
          <div className="tr-lib">
            {items.slice(0, 120).map((e) => {
              const primNames = (e.primary || []).map((k) => MUSCLES[k]).filter(Boolean);
              const secNames = (e.secondary || []).map((k) => MUSCLES[k]).filter(Boolean);
              return (
                <article className="tr-libcard" key={e.id} data-testid="tr-libcard">
                  <div className="tr-libcard-top">
                    <span className="bl-thumb" onClick={() => setSelectedLibEx(e)} title="Ver mapa anatômico completo" style={{ cursor: 'pointer' }}>
                      <CorpoExercicio exercise={e} thumb />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b>{e.name}</b>
                      <div className="row" style={{ marginTop: 4 }}>
                        {e.group && <span className="rx-pill">{e.group}</span>}
                        {e.equipment && <span className="rx-pill">{e.equipment}</span>}
                        {e.level && <span className="rx-pill">{e.level}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="tr-libcard-muscles">
                    <p className="bl-ms"><span className="bl-tag p">Principal</span>{primNames.length ? primNames.join(', ') : (e.muscle || 'Geral')}</p>
                    {secNames.length > 0 && <p className="bl-ms"><span className="bl-tag">Secundário</span>{secNames.join(', ')}</p>}
                  </div>
                  {(e.instructions?.[0] || e.desc) && <p>{e.instructions?.[0] || e.desc}</p>}
                  {own.length ? (
                    <div className="go">
                      <select aria-label={`Ficha para ${e.name}`} value={target} onChange={(ev) => setLibTarget(ev.target.value)}>{own.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
                      <button type="button" className="rx-btn tiny" onClick={() => addFromLibrary(e, target)}>Colocar na ficha</button>
                    </div>
                  ) : <button type="button" className="rx-btn ghost tiny" onClick={() => openEditor()}>Criar uma ficha</button>}
                </article>
              );
            })}
          </div>
        ) : <div className="tr-empty"><h3>Nada encontrado</h3><p>Tente outro nome ou músculo, ou crie um exercício personalizado.</p></div>}

        {selectedLibEx && (
          <div className="rx-overlay" onClick={() => setSelectedLibEx(null)}>
            <div className="rx-dialog" role="dialog" aria-modal="true" aria-label={`Músculos de ${selectedLibEx.name}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>{selectedLibEx.name}</h2>
                <button type="button" className="tr-x" onClick={() => setSelectedLibEx(null)} aria-label="Fechar"><X size={16} /></button>
              </div>
              <CorpoExercicio exercise={selectedLibEx} />
              <p className="bl-ms"><span className="bl-tag p">Principais</span>{(selectedLibEx.primary || []).map((k) => MUSCLES[k]).join(', ') || 'não definidos'}</p>
              <p className="bl-ms"><span className="bl-tag">Secundários</span>{(selectedLibEx.secondary || []).map((k) => MUSCLES[k]).join(', ') || 'nenhum'}</p>
              {selectedLibEx.instructions?.length > 0 && <ol className="bl-how">{selectedLibEx.instructions.map((t, i) => <li key={i}>{t}</li>)}</ol>}
            </div>
          </div>
        )}
      </>
    );
  } else if (view === 'historico') {
    const sessions = history.sessions;
    const max = Math.max(1, ...progress.map((p) => Number(p.maxKg) || 0));
    body = (
      <>
        <div className="tr-head">
          <div><h1>Histórico de treinos</h1><p>Cada sessão fica salva com as séries que você fez. Sessão parada no meio aparece como incompleta.</p></div>
          <div className="acts"><button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('home')}>Voltar</button></div>
        </div>
        <div className="tr-grid">
          <article className="tr-panel">
            {history.error ? <p className="tr-sub">{history.error}</p> : sessions.length === 0 ? (
              <div className="tr-empty"><h3>Nenhuma sessão ainda</h3><p>Quando você terminar um treino, ele aparece aqui com o tempo e as séries feitas.</p></div>
            ) : (
              <table className="tr-table resp">
                <thead><tr><th>Quando</th><th>Ficha</th><th>Situação</th><th>Tempo</th><th>Séries</th></tr></thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="wide">{new Date(s.startedAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td data-l="Ficha">{s.name}</td>
                      <td><span className={`rx-pill ${s.status === 'concluida' ? 'now' : ''}`}>{s.status === 'concluida' ? 'Concluída' : 'Incompleta'}</span></td>
                      <td className="tr-num" data-l="Tempo">{Math.round((s.elapsedMs || 0) / 60000)} min</td>
                      <td className="tr-num" data-l="Séries">{s.doneSets} de {s.plannedSets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>
          <aside className="tr-stack">
            <section className="tr-panel">
              <h2>Carga por semana</h2>
              <p className="tr-sub">Maior carga feita em cada semana, no mesmo exercício.</p>
              {history.exercises.length === 0 ? <p className="tr-sub" style={{ marginTop: 10 }}>Aparece depois do primeiro treino com carga registrada.</p> : (
                <>
                  <select className="tr-input" style={{ marginTop: 12, height: 42 }} aria-label="Exercício" value={progressKey} onChange={(e) => setProgressKey(e.target.value)}>
                    <option value="">Escolha um exercício</option>
                    {history.exercises.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}
                  </select>
                  <div style={{ marginTop: 12 }}>
                    {progress.map((p, i) => (
                      <div className="tr-prog" key={p.week}><span>Semana {i + 1}</span><div className="rx-meter" style={{ maxWidth: 'none', height: 8 }}><div className="rx-fill zero" style={{ width: `${(Number(p.maxKg) / max) * 100}%` }} /></div><span>{fmtKg(p.maxKg)} kg</span></div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </aside>
        </div>
      </>
    );
  } else {
    if (own.length === 0 && atribuidos.length === 0) {
      body = (
        <>
          <div className="tr-head"><div><h1>Treino</h1><p>Monte fichas com os exercícios da biblioteca e registre cada sessão.</p></div></div>
          <section className="tr-panel" style={{ maxWidth: 640 }}>
            <div className="tr-empty">
              <h3>Crie sua primeira ficha</h3>
              <p>Escolha os exercícios na biblioteca ({unifiedCatalog.length} prontos com mapa muscular) ou crie os seus. Você define séries, repetições, carga e descanso, e em quais dias ela aparece na agenda.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="rx-btn" onClick={() => openEditor()}><Plus size={16} />Criar primeira ficha</button>
                <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('biblioteca')}><BookOpen size={16} />Ver a biblioteca</button>
              </div>
            </div>
          </section>
        </>
      );
    } else {
      const s = stats;
      body = (
        <>
          <div className="tr-head">
            <div><h1>Treino</h1><p>{s.next ? `Próximo: ${s.next.w.name}, ${s.next.when.toLowerCase().startsWith('hoje') ? s.next.when.toLowerCase() : s.next.when}.` : 'Nenhuma ficha com dia na agenda.'}</p></div>
            <div className="acts">
              <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('biblioteca')}><BookOpen size={16} />Biblioteca ({unifiedCatalog.length})</button>
              <button type="button" className="rx-btn ghost" style={{ height: 42 }} onClick={() => go('historico')}><History size={16} />Histórico</button>
              <button type="button" className="rx-btn" onClick={() => openEditor()}><Plus size={16} />Nova ficha</button>
            </div>
          </div>
          {open && (
            <div className="tr-banner" role="status">
              <Play size={18} /><span className="grow"><b>{open.name}</b> em andamento desde {new Date(open.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. As séries feitas estão salvas.</span>
              <button type="button" className="rx-btn tiny" onClick={resume}>Retomar treino</button>
            </div>
          )}
          <div className="rx-strip" style={{ marginTop: 0 }}>
            <div className="rx-seg"><h3><Calendar size={16} />Esta semana</h3><div className="v">{s.trainedThisWeek} <small>de {s.scheduledDays} dias agendados</small></div><div className="rx-ticks">{Array.from({ length: Math.max(1, s.scheduledDays) }, (_, i) => <i key={i} className={i < s.trainedThisWeek ? 'on' : ''} />)}</div></div>
            <div className="rx-seg"><h3><Play size={16} />Próximo</h3><div className="v" style={{ fontSize: 24 }}>{s.next ? s.next.w.name : '—'}</div><p>{s.next ? s.next.when : 'Defina dias na ficha.'}</p></div>
            <div className="rx-seg"><h3><Dumbbell size={16} />Sessões no mês</h3><div className="v">{history.loaded && !history.error ? s.month : '—'}</div><p>{s.monthIncomplete ? `${s.monthIncomplete} ficou incompleta.` : 'Concluídas e incompletas.'}</p></div>
            <div className="rx-seg"><h3><Clock size={16} />Tempo médio</h3><div className="v">{s.avg ?? '—'} {s.avg !== null && <small>min</small>}</div><p>Só sessões concluídas, sem pausas.</p></div>
          </div>
          <div className="tr-grid" style={{ marginTop: 28 }}>
            <section>
              <DoSeuPersonal atribuidos={atribuidos} onStart={startAssignment} onCopy={copyAssignment} onChanged={loadServer} toast={toast} starting={starting} />
              <h2 className="tr-section-title" style={{ marginTop: atribuidos.length ? 28 : 0 }}>Suas fichas</h2>
              {own.length === 0 && <p className="tr-sub" style={{ marginBottom: 12 }}>Você ainda não tem fichas próprias. Crie uma ou copie uma ficha do seu personal.</p>}
              <div className="tr-cards">
                {own.map((w) => {
                  const fichaMuscles = [...new Set(
                    (w.exercises || []).flatMap((e) => {
                      const res = resolveExerciseWithMuscles(e, { exercicios: unifiedCatalog, personalizados: [] });
                      return (res.primary || []).map((k) => MUSCLES[k]).filter(Boolean);
                    })
                  )];
                  return (
                    <article className="tr-card" key={w.id} style={{ '--acc': accentOf(w) }}>
                      <h3><i className="dot" />{w.name}</h3>
                      {w.subtitle && <p>{w.subtitle}</p>}
                      <div className="meta">
                        <span className="rx-pill">{(w.exercises || []).length} exercícios</span>
                        <span className="rx-pill">{daysText(w)}</span>
                        {fichaMuscles.slice(0, 3).map((m) => <span key={m} className="rx-pill">{m}</span>)}
                      </div>
                      <ul className="tr-exlist">
                        {(w.exercises || []).slice(0, 3).map((e) => {
                          const res = resolveExerciseWithMuscles(e, { exercicios: unifiedCatalog, personalizados: [] });
                          const mLabel = (res.primary || []).map((k) => MUSCLES[k])[0] || e.muscle || '';
                          return (
                            <li key={e.id}>
                              <span>{e.name}{mLabel ? <small style={{ color: 'var(--rx-ink-3)', marginLeft: 6 }}>({mLabel})</small> : null}</span>
                              <span>{e.sets} × {e.reps}{e.showWeight !== false && Number(e.weightKg) > 0 ? `, ${fmtKg(e.weightKg)} kg` : ''}</span>
                            </li>
                          );
                        })}
                        {(w.exercises || []).length > 3 && <li><span style={{ color: 'var(--rx-ink-3)' }}>e mais {(w.exercises || []).length - 3}</span><span /></li>}
                      </ul>
                      <div className="acts">
                        <button type="button" className="rx-btn tiny" disabled={starting} onClick={() => (open ? resume() : startWorkout(w))}><Play size={15} />{open && open.workoutRef === w.id ? 'Retomar treino' : 'Iniciar treino'}</button>
                        <button type="button" className="rx-btn ghost tiny" onClick={() => openEditor(w)}><Pencil size={15} />Editar</button>
                        <span className="grow" />
                        <button type="button" className="tr-x" title="Excluir ficha de treino" aria-label={`Excluir ${w.name}`} onClick={() => setConfirm({ type: 'delete', id: w.id, name: w.name })}><Trash2 size={16} /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            <aside className="rx-rail">
              <section className="summary">
                <h2>Semana</h2>
                <div className="tr-week">
                  {s.week.map((d) => <div key={d.idx} className={`tr-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}`}><b>{DAY_SHORT[d.idx]}</b><i /><small>{d.names[0] || 'livre'}</small></div>)}
                </div>
                <p className="rx-sub" style={{ marginTop: 10 }}>Marcado: dia com pelo menos uma série feita.</p>
              </section>
              <section>
                <h2>Últimas sessões <button type="button" className="rx-link" onClick={() => go('historico')}>Ver histórico</button></h2>
                {history.error ? <p className="rx-sub">{history.error}</p> : history.sessions.length === 0 ? <p className="rx-sub">Nenhuma sessão ainda. Comece por uma ficha.</p> : (
                  <ul className="rx-list">
                    {history.sessions.slice(0, 3).map((x) => (
                      <li key={x.id}><span className="ic violet"><CheckCircle2 size={16} /></span><div><b>{x.name}</b><p>{new Date(x.startedAt).toLocaleDateString('pt-BR', { weekday: 'long' })}, {Math.round((x.elapsedMs || 0) / 60000)} min, {x.doneSets} de {x.plannedSets} séries</p></div></li>
                    ))}
                  </ul>
                )}
              </section>
            </aside>
          </div>
        </>
      );
    }
  }

  return (
    <div className="tr">
      {body}
      {confirm?.type === 'delete' && (
        <div className="rx-overlay" onClick={() => setConfirm(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-del-t" onClick={(e) => e.stopPropagation()}>
            <h2 id="tr-del-t">Excluir “{confirm.name}”?</h2>
            <p>A ficha sai da lista e da agenda. As sessões já feitas continuam no histórico.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setConfirm(null)}>Cancelar</button>
              <button type="button" className="tr-btn-danger" onClick={() => deleteWorkout(confirm.id)}>Excluir ficha</button>
            </div>
          </div>
        </div>
      )}
      {custom && (
        <div className="rx-overlay" onClick={() => setCustom(null)}>
          <div className="rx-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-cus-t" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 id="tr-cus-t">Exercício personalizado</h2>
            <p>Escolha o nome e os músculos trabalhados para entrar na ficha com mapa anatômico.</p>
            <div className="tr-field"><label htmlFor="tr-cn">Nome do exercício</label><input id="tr-cn" className="tr-input" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></div>
            <div className="tr-field">
              <span className="lbl">Músculo principal trabalhado</span>
              <div className="tr-chips">
                {MUSCLE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="tr-chip"
                    aria-pressed={(custom.primary || []).includes(k)}
                    onClick={() => setCustom((c) => ({
                      ...c,
                      primary: (c.primary || []).includes(k) ? c.primary.filter((x) => x !== k) : [...(c.primary || []), k]
                    }))}
                  >
                    {MUSCLES[k]}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[['sets', 'Séries'], ['reps', 'Repetições'], ['weightKg', 'Carga (kg)'], ['restSec', 'Descanso (s)']].map(([k, l]) => (
                <div className="tr-field" key={k}><label htmlFor={`tr-c-${k}`}>{l}</label><input id={`tr-c-${k}`} className="tr-input" inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div className="tr-field"><label htmlFor="tr-ct">Colocar na ficha</label><select id="tr-ct" className="tr-input" value={custom.target} onChange={(e) => setCustom({ ...custom, target: e.target.value })}>{own.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="rx-btn ghost" onClick={() => setCustom(null)}>Cancelar</button>
              <button type="button" className="rx-btn" onClick={() => {
                if (!custom.name.trim()) { toast('Dê um nome ao exercício.'); return; }
                const kg = Math.max(0, Number(String(custom.weightKg).replace(',', '.')) || 0);
                const prim = custom.primary?.length ? custom.primary : ['peitoral'];
                addFromLibrary({ name: custom.name.trim(), primary: prim, secondary: custom.secondary || [], muscle: MUSCLES[prim[0]] || 'Personalizado', sets: Math.max(1, Number(custom.sets) || 1), reps: Math.max(0, Number(custom.reps) || 0), weightKg: kg, restSec: Math.max(0, Number(custom.restSec) || 0) }, custom.target);
                setCustom(null);
              }}>Adicionar exercício</button>
            </div>
          </div>
        </div>
      )}
      {view === 'home' && own.length > 0 && !history.loaded && <p className="tr-sub" style={{ marginTop: 16 }}><Info size={14} /> Carregando o histórico…</p>}
    </div>
  );
}
