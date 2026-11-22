import React, { useEffect, useState } from 'react';
import '../../../styles/foco.css';
import { ESPECIES, TEMAS_CULTIVO, especiePorId, especiesPorTema, estagioPara } from './especies';
import { urlDoAsset } from './assets';
import { Planta } from './Planta';
import { criarSessao, progresso, pausar, retomar, pausada } from './sessaoFoco';

// Card da aba Teste do administrador: mostra o laboratório de cultivo do Foco
// (Plantas, Mundos e Elementos) com os mesmos módulos da aba Foco
// (tempo por horários, estágios por progresso, desenho com entrada e balanço). Não grava nada.
const DURACOES = [{ s: 10, nome: '10 s' }, { s: 30, nome: '30 s' }, { s: 60, nome: '1 min' }];
const R = 120; const C = 2 * Math.PI * R;

const botao = (ativo = false, c1 = '#A78BFA', c2 = '#60A5FA') => ({
  padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  color: ativo ? '#0C1020' : '#FFFFFF',
  background: ativo ? `linear-gradient(135deg, ${c1}, ${c2})` : 'rgba(255, 255, 255, 0.06)',
  border: ativo ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.14)'
});
const rotulo = { fontSize: '12px', fontWeight: 700, color: '#8F99BA', margin: '0 0 8px' };

export function PlantaLaboratorio() {
  const [temaAtivo, setTemaAtivo] = useState('plantas'); // 'plantas' | 'mundos' | 'elementos' | 'todos'
  const [especieId, setEspecieId] = useState(ESPECIES[0].id);
  const especie = especiePorId(especieId);
  const [manual, setManual] = useState(0); // progresso escolhido na barra (0 a 1)
  const [sim, setSim] = useState(null); // sessão simulada (mesma fonte de verdade da aba Foco)
  const [duracao, setDuracao] = useState(30);
  const [agora, setAgora] = useState(() => Date.now());
  const [murcha, setMurcha] = useState(false);
  const [balancoLigado, setBalancoLigado] = useState(true);
  const [modoGaleria, setModoGaleria] = useState('completo'); // 'completo' (100%) | 'sincronizado' (progresso atual)

  const rodando = sim && !pausada(sim) && progresso(sim, agora) < 1;
  useEffect(() => {
    if (!rodando) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(t);
  }, [rodando]);

  const prog = sim ? progresso(sim, agora) : manual;
  const estagio = estagioPara(especie, prog, murcha ? 'murcha' : 'ativa');
  const balanco = !balancoLigado ? 'off' : sim && pausada(sim) ? 'pause' : 'on';

  const c1 = especie.paleta?.c1 || '#A78BFA';
  const c2 = especie.paleta?.c2 || '#60A5FA';
  const listaTema = especiesPorTema(temaAtivo);

  const simular = () => { const n = Date.now(); setMurcha(false); setAgora(n); setSim(criarSessao({ minutos: duracao / 60, agora: n })); };
  const pausarOuContinuar = () => { const n = Date.now(); setAgora(n); setSim((s) => (pausada(s) ? retomar(s, n) : pausar(s, n))); };
  const escolher = (p) => { setSim(null); setMurcha(false); setManual(p); };
  const reiniciar = () => { setSim(null); setMurcha(false); setManual(0); };

  const selecionarTema = (novoTema) => {
    setTemaAtivo(novoTema);
    const lista = especiesPorTema(novoTema);
    if (lista.length > 0 && !lista.some((e) => e.id === especieId)) {
      setEspecieId(lista[0].id);
    }
  };

  return (
    <div data-testid="planta-lab" style={{
      backgroundColor: 'rgba(22, 22, 26, 0.85)', border: '1px solid rgba(124, 92, 255, 0.25)', borderRadius: '24px',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)', padding: '28px', maxWidth: '1040px', margin: '24px auto 0', color: '#FFFFFF'
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Cultivo do Foco — Plantas, Mundos &amp; Elementos
          </h2>
          <p style={{ fontSize: '13px', color: '#8F99BA', margin: '6px 0 0' }}>
            {ESPECIES.length} variações disponíveis (Lírio-lunar padrão + 20 Plantas, 20 Mundos e 20 Elementos) com progressão em 5 estágios e paletas alternadas.
          </p>
        </div>

        {/* Abas de Tema */}
        <div role="tablist" aria-label="Temas de cultivo" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TEMAS_CULTIVO.map((t) => {
            const count = especiesPorTema(t.id).length;
            const ativo = temaAtivo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={ativo}
                data-testid={`planta-lab-tema-${t.id}`}
                onClick={() => selecionarTema(t.id)}
                style={botao(ativo, c1, c2)}
              >
                {t.icone} {t.nome} ({count})
              </button>
            );
          })}
          <button
            type="button"
            role="tab"
            aria-selected={temaAtivo === 'todos'}
            data-testid="planta-lab-tema-todos"
            onClick={() => selecionarTema('todos')}
            style={botao(temaAtivo === 'todos', c1, c2)}
          >
            Todos ({ESPECIES.length})
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
        {/* .rf: respeita o 'reduzir movimento' do sistema, como na aba Foco */}
        <div className="rf" style={{ position: 'relative', width: '270px', maxWidth: '100%', aspectRatio: '1', margin: '0 auto' }}>
          <svg viewBox="0 0 280 280" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            <defs><linearGradient id="plabRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="url(#plabRing)" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 140 140)"
              style={{ strokeDasharray: C, strokeDashoffset: C * (1 - prog) }} />
          </svg>
          <Planta especie={especie} estagio={estagio} balanco={balanco} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '17%', textAlign: 'center' }}>
            <div style={{ fontSize: '30px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(prog * 100)}%</div>
            <div data-testid="planta-lab-estagio" style={{ fontSize: '13px', color: c1 }}>{estagio.nome}</div>
          </div>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Resumo da espécie ativa + Paleta de cores */}
          <div style={{
            padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${c1}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                {especie.nome}
              </div>
              {especie.subtitulo && (
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                  {especie.subtitulo}
                </div>
              )}
            </div>
            {especie.paleta && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(12, 16, 32, 0.75)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: especie.paleta.c1, display: 'inline-block' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: especie.paleta.c2, display: 'inline-block' }} />
                <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: especie.paleta.c3, display: 'inline-block' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#E5E7EB' }}>{especie.paleta.nome}</span>
              </div>
            )}
          </div>

          <label style={{ display: 'block' }}>
            <p style={rotulo}>Escolher no tema ({listaTema.length} opções)</p>
            <select
              aria-label="Selecionar cultivo"
              value={especieId}
              onChange={(e) => { setEspecieId(e.target.value); }}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '12px', background: '#0C1020', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              {listaTema.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id === 'lirio-lunar' ? '★ Lírio-lunar (Padrão)' : `#${String(e.indiceTema || 1).padStart(2, '0')} · ${e.nome} — Paleta ${e.paleta?.nome || ''}`}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block' }}>
            <p style={rotulo}>Progresso da sessão</p>
            <input type="range" min="0" max="100" step="1" value={Math.round(prog * 100)} aria-label="Progresso da sessão"
              onChange={(e) => escolher(Number(e.target.value) / 100)} style={{ width: '100%', accentColor: c1 }} />
          </label>

          <div>
            <p style={rotulo}>Simular sessão</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DURACOES.map((d) => <button key={d.s} type="button" style={botao(duracao === d.s, c1, c2)} aria-pressed={duracao === d.s} onClick={() => setDuracao(d.s)}>{d.nome}</button>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              <button type="button" style={botao(true, c1, c2)} onClick={simular}>{sim ? 'Recomeçar simulação' : 'Simular sessão'}</button>
              {sim && progresso(sim, agora) < 1 && <button type="button" style={botao(false, c1, c2)} onClick={pausarOuContinuar}>{pausada(sim) ? 'Continuar' : 'Pausar'}</button>}
              <button type="button" style={botao(false, c1, c2)} onClick={() => setMurcha(true)} disabled={murcha}>Murchar</button>
              <button type="button" style={botao(false, c1, c2)} onClick={reiniciar}>Reiniciar</button>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB', cursor: 'pointer' }}>
            <input type="checkbox" checked={balancoLigado} onChange={(e) => setBalancoLigado(e.target.checked)} style={{ accentColor: c1 }} />
            Balanço contínuo
          </label>
        </div>
      </div>

      {/* Estágios de progressão do item ativo */}
      <p style={{ ...rotulo, marginTop: '24px' }}>Estágios de progressão de {especie.nome}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
        {[...especie.estagios, especie.murcha].map((e) => {
          const ativo = e.stageId === estagio.stageId;
          return (
            <button key={e.stageId} type="button" aria-label={`Ver estágio ${e.nome}`} aria-pressed={ativo}
              onClick={() => (e === especie.murcha ? (setSim(null), setMurcha(true)) : escolher(e.minProgress))}
              style={{ padding: '12px 8px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', color: '#FFFFFF',
                background: ativo ? `${c1}26` : 'rgba(255, 255, 255, 0.04)',
                border: ativo ? `1.5px solid ${c1}` : '1px solid rgba(255, 255, 255, 0.08)' }}>
              <img src={urlDoAsset(especie.id, e.assetKey) || ''} alt="" style={{ width: '76px', height: '64px', objectFit: 'contain', display: 'block', margin: '0 auto 6px' }} />
              <b style={{ display: 'block', fontSize: '13px' }}>{e.nome}</b>
              <span style={{ display: 'block', fontSize: '11.5px', color: '#8F99BA' }}>{e === especie.murcha ? 'ao descartar' : `a partir de ${Math.round(e.minProgress * 100)}%`}</span>
            </button>
          );
        })}
      </div>

      {/* Catálogo visual completo do tema selecionado */}
      <div style={{ marginTop: '30px', paddingTop: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} data-testid="planta-lab-catalogo">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Catálogo Visual — {temaAtivo === 'todos' ? 'Todos os Temas' : TEMAS_CULTIVO.find((t) => t.id === temaAtivo)?.nome} ({listaTema.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#8F99BA', margin: '3px 0 0' }}>
              Clique em qualquer card para carregar no simulador acima e testar todos os seus 5 estágios de crescimento.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setModoGaleria('completo')}
              style={botao(modoGaleria === 'completo', c1, c2)}
            >
              Prévia em 100%
            </button>
            <button
              type="button"
              onClick={() => setModoGaleria('sincronizado')}
              style={botao(modoGaleria === 'sincronizado', c1, c2)}
            >
              Sincronizar ({Math.round(prog * 100)}%)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: '12px' }}>
          {listaTema.map((item) => {
            const selecionado = item.id === especie.id;
            const estItem = modoGaleria === 'sincronizado'
              ? estagioPara(item, prog, murcha ? 'murcha' : 'ativa')
              : item.estagios[item.estagios.length - 1];
            const ic1 = item.paleta?.c1 || '#A78BFA';
            const ic2 = item.paleta?.c2 || '#60A5FA';
            const ic3 = item.paleta?.c3 || '#7C5CFF';
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`planta-card-${item.id}`}
                onClick={() => setEspecieId(item.id)}
                style={{
                  padding: '14px 12px',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#FFFFFF',
                  background: selecionado ? `linear-gradient(160deg, ${ic1}24, rgba(16, 18, 32, 0.9))` : 'rgba(255, 255, 255, 0.03)',
                  border: selecionado ? `1.5px solid ${ic1}` : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{
                    fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                    background: item.id === 'lirio-lunar' ? 'rgba(167, 139, 250, 0.25)' : 'rgba(255,255,255,0.07)',
                    color: item.id === 'lirio-lunar' ? '#C4B5FD' : '#9CA3AF'
                  }}>
                    {item.id === 'lirio-lunar' ? '★ Padrão' : `#${String(item.indiceTema || 1).padStart(2, '0')}`}
                  </span>
                  <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }} title={`Paleta: ${item.paleta?.nome || ''}`}>
                    <i style={{ width: '9px', height: '9px', borderRadius: '50%', background: ic1, display: 'inline-block' }} />
                    <i style={{ width: '9px', height: '9px', borderRadius: '50%', background: ic2, display: 'inline-block' }} />
                    <i style={{ width: '9px', height: '9px', borderRadius: '50%', background: ic3, display: 'inline-block' }} />
                  </span>
                </div>

                {/* Miniatura da espécie sobre a sua ilha/base */}
                <div style={{ position: 'relative', width: '100%', height: '96px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <img
                    src={urlDoAsset(item.id, estItem.assetKey) || ''}
                    alt=""
                    style={{ width: '82px', height: '72px', objectFit: 'contain', display: 'block', zIndex: 2, marginBottom: '-6px' }}
                  />
                  <img
                    src={urlDoAsset(item.id, item.chao) || ''}
                    alt=""
                    style={{ width: '86px', height: '24px', objectFit: 'contain', display: 'block', zIndex: 1 }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.25 }}>
                    {item.nome}
                  </div>
                  {item.subtitulo && (
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px', lineHeight: 1.3 }}>
                      {item.subtitulo}
                    </div>
                  )}
                  {item.paleta && (
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: ic1, marginTop: '6px' }}>
                      {item.paleta.nome}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
