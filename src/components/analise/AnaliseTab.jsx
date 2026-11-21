import React, { useEffect, useState } from 'react';
import { CheckCircle2, Droplets, Dumbbell, Moon, Settings2 } from 'lucide-react';
import { treinoApi } from '../treino/treinoApi';
import '../../styles/espacos.css';
import '../../styles/telas.css';

const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const litros = (ml) => String(Math.round(ml / 100) / 10).replace('.', ',');

/** Dias treinados e sessões num período, só com sessões que tiveram pelo menos uma série feita. */
export function resumoTreino(sessions = [], dias = 7, hoje = new Date()) {
  const inicio = new Date(hoje); inicio.setHours(0, 0, 0, 0); inicio.setDate(inicio.getDate() - (dias - 1));
  const validas = sessions.filter((s) => s.doneSets > 0 && new Date(s.startedAt) >= inicio);
  return { sessoes: validas.length, dias: new Set(validas.map((s) => localDay(new Date(s.startedAt)))).size };
}

/**
 * Análise de progresso no visual atual do Ethos (lote 2 de 21/11/2026), só com dados reais (Q4):
 * hábitos, água e sono de hoje, treino dos últimos 7 e 28 dias (das sessões salvas) e categorias de hoje.
 * Sequência e comparação entre semanas de hábitos só quando o Ethos guardar o registro de cada dia.
 * Mesmas props do TelemetryTab antigo (que continua no código).
 */
export function AnaliseTab({ habits = [], health = {}, tags = [], onConfigureCategory, user = null }) {
  const [treino, setTreino] = useState(null);
  useEffect(() => {
    if (!user) return undefined;
    let vivo = true;
    treinoApi.historico(100).then((r) => vivo && setTreino(r.sessions || []), () => vivo && setTreino([]));
    return () => { vivo = false; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = habits.length;
  const feitos = habits.filter((h) => h.completed).length;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const copos = health?.waterGlasses ?? 0;
  const meta = health?.waterTarget || 10;
  const ml = health?.glassMl || 250;
  const sono = health?.sleep || {};
  const t7 = treino ? resumoTreino(treino, 7) : null;
  const t28 = treino ? resumoTreino(treino, 28) : null;

  const cats = [...new Set(habits.map((h) => h.category).filter(Boolean))].map((c) => {
    const hs = habits.filter((h) => h.category === c);
    return { name: c, total: hs.length, feitos: hs.filter((h) => h.completed).length, tag: tags.find((t) => t.name === c) };
  }).sort((a, b) => b.feitos / b.total - a.feitos / a.total || b.total - a.total);

  return (
    <div className="es">
      <div className="es-head"><div><h1>Análise de progresso</h1><p>Só com o que você registrou.</p></div></div>
      <div className="es-grid">
        <div className="es-stack">
          <article className="es-card">
            <h2>Hoje</h2>
            <div className="tl-tiles">
              <div className="tl-tile" data-testid="an-habitos"><p><CheckCircle2 size={15} />Hábitos</p><div className="tl-big">{feitos}<small> de {total}</small></div>
                <div className="rx-meter" style={{ marginTop: 10, maxWidth: 'none' }}><div className={`rx-fill ${feitos ? '' : 'zero'}`} style={{ width: `${pct}%` }} /></div></div>
              <div className="tl-tile"><p><Droplets size={15} />Água</p><div className="tl-big">{litros(copos * ml)}<small> de {litros(meta * ml)} L</small></div>
                <p style={{ margin: '8px 0 0' }}>{copos} de {meta} copos</p></div>
              <div className="tl-tile"><p><Moon size={15} />Sono</p>{sono.logged
                  ? <><div className="tl-big">{sono.bedTime || '23:30'}<small> às {sono.wakeTime || '07:00'}</small></div><p style={{ margin: '8px 0 0' }}>Registrado hoje</p></>
                  : <><div className="tl-big">–</div><p style={{ margin: '8px 0 0' }}>Sem registro hoje. Planejado: {sono.bedTime || '23:30'} às {sono.wakeTime || '07:00'}.</p></>}</div>
            </div>
          </article>
          <article className="es-card">
            <h2>Categorias hoje</h2>
            {cats.length === 0 ? <div className="es-empty"><p>Os hábitos de hoje aparecem aqui, agrupados por categoria.</p></div> : cats.map((c) => (
              <div className="tl-cat" key={c.name}>
                <span>{c.tag?.color && <span className="rx-dot" style={{ '--rx-dot': c.tag.color, marginRight: 6 }} aria-hidden="true" />}{c.name}</span>
                <span className="bar"><i style={{ width: `${(c.feitos / c.total) * 100}%` }} /></span>
                <span>{c.feitos}/{c.total}</span>
              </div>
            ))}
            {cats.length > 0 && onConfigureCategory && (
              <div className="es-chips" style={{ marginTop: 10 }}>
                {cats.filter((c) => c.tag).map((c) => <button key={c.name} type="button" className="es-chip" onClick={() => onConfigureCategory(c.tag)}><Settings2 size={14} />{c.name}</button>)}
              </div>
            )}
          </article>
        </div>
        <aside className="rx-rail">
          <section className="summary">
            <h2>Treino</h2>
            {!treino ? <p className="rx-sub">Carregando…</p> : (
              <div className="tl-tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><p className="rx-sub tl-lbl" style={{ margin: 0 }}><Dumbbell size={14} /> 7 dias</p><div className="tl-big" data-testid="an-treino-7">{t7.dias}<small> {t7.dias === 1 ? 'dia' : 'dias'}</small></div><p className="rx-sub" style={{ margin: '6px 0 0' }}>{t7.sessoes} {t7.sessoes === 1 ? 'sessão' : 'sessões'}</p></div>
                <div><p className="rx-sub tl-lbl" style={{ margin: 0 }}><Dumbbell size={14} /> 28 dias</p><div className="tl-big">{t28.dias}<small> {t28.dias === 1 ? 'dia' : 'dias'}</small></div><p className="rx-sub" style={{ margin: '6px 0 0' }}>{t28.sessoes} {t28.sessoes === 1 ? 'sessão' : 'sessões'}</p></div>
              </div>
            )}
            <p className="rx-sub" style={{ marginTop: 10 }}>Conta sessões com pelo menos uma série feita.</p>
          </section>
          <section>
            <h2>Histórico de hábitos</h2>
            <p className="rx-sub">Sequências e comparação entre semanas aparecem quando o Ethos guardar o registro de cada dia. Nada é estimado antes disso.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
