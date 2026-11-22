import React, { useEffect, useState } from 'react';
import '../../../styles/foco.css';
import { ESPECIES, especiePorId, estagioPara } from './especies';
import { urlDoAsset } from './assets';
import { Planta } from './Planta';
import { criarSessao, progresso, pausar, retomar, pausada } from './sessaoFoco';

// Card da aba Teste do administrador: mostra a planta do Foco com os mesmos módulos da aba Foco
// (tempo por horários, estágios por progresso, desenho com entrada e balanço). Não grava nada.
const DURACOES = [{ s: 10, nome: '10 s' }, { s: 30, nome: '30 s' }, { s: 60, nome: '1 min' }];
const R = 120; const C = 2 * Math.PI * R;

const botao = (ativo = false) => ({
  padding: '8px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  color: ativo ? '#0C1020' : '#FFFFFF',
  background: ativo ? 'linear-gradient(135deg, #A78BFA, #60A5FA)' : 'rgba(255, 255, 255, 0.06)',
  border: ativo ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.14)'
});
const rotulo = { fontSize: '12px', fontWeight: 700, color: '#8F99BA', margin: '0 0 8px' };

export function PlantaLaboratorio() {
  const [especieId, setEspecieId] = useState(ESPECIES[0].id);
  const especie = especiePorId(especieId);
  const [manual, setManual] = useState(0); // progresso escolhido na barra (0 a 1)
  const [sim, setSim] = useState(null); // sessão simulada (mesma fonte de verdade da aba Foco)
  const [duracao, setDuracao] = useState(30);
  const [agora, setAgora] = useState(() => Date.now());
  const [murcha, setMurcha] = useState(false);
  const [balancoLigado, setBalancoLigado] = useState(true);

  const rodando = sim && !pausada(sim) && progresso(sim, agora) < 1;
  useEffect(() => {
    if (!rodando) return undefined;
    const t = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(t);
  }, [rodando]);

  const prog = sim ? progresso(sim, agora) : manual;
  const estagio = estagioPara(especie, prog, murcha ? 'murcha' : 'ativa');
  const balanco = !balancoLigado ? 'off' : sim && pausada(sim) ? 'pause' : 'on';

  const simular = () => { const n = Date.now(); setMurcha(false); setAgora(n); setSim(criarSessao({ minutos: duracao / 60, agora: n })); };
  const pausarOuContinuar = () => { const n = Date.now(); setAgora(n); setSim((s) => (pausada(s) ? retomar(s, n) : pausar(s, n))); };
  const escolher = (p) => { setSim(null); setMurcha(false); setManual(p); };
  const reiniciar = () => { setSim(null); setMurcha(false); setManual(0); };

  return (
    <div data-testid="planta-lab" style={{
      backgroundColor: 'rgba(22, 22, 26, 0.85)', border: '1px solid rgba(124, 92, 255, 0.25)', borderRadius: '24px',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)', padding: '28px', maxWidth: '780px', margin: '24px auto 0', color: '#FFFFFF'
    }}>
      <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Planta do Foco</h2>
      <p style={{ fontSize: '13px', color: '#8F99BA', margin: '6px 0 20px' }}>
        A mesma planta da aba Foco. Escolha o progresso ou simule uma sessão curta. Nada aqui é gravado.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
        {/* .rf: respeita o 'reduzir movimento' do sistema, como na aba Foco */}
        <div className="rf" style={{ position: 'relative', width: '260px', maxWidth: '100%', aspectRatio: '1', margin: '0 auto' }}>
          <svg viewBox="0 0 280 280" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            <defs><linearGradient id="plabRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#60A5FA" /></linearGradient></defs>
            <circle cx="140" cy="140" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle cx="140" cy="140" r={R} fill="none" stroke="url(#plabRing)" strokeWidth="8" strokeLinecap="round" transform="rotate(-90 140 140)"
              style={{ strokeDasharray: C, strokeDashoffset: C * (1 - prog) }} />
          </svg>
          <Planta especie={especie} estagio={estagio} balanco={balanco} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: '17%', textAlign: 'center' }}>
            <div style={{ fontSize: '30px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(prog * 100)}%</div>
            <div data-testid="planta-lab-estagio" style={{ fontSize: '13px', color: '#C4B5FD' }}>{estagio.nome}</div>
          </div>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ESPECIES.length > 1 && (
            <label style={{ display: 'block' }}>
              <p style={rotulo}>Espécie</p>
              <select value={especieId} onChange={(e) => { setEspecieId(e.target.value); reiniciar(); }}
                style={{ padding: '8px 12px', borderRadius: '12px', background: '#0C1020', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.14)' }}>
                {ESPECIES.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </label>
          )}
          <label style={{ display: 'block' }}>
            <p style={rotulo}>Progresso da sessão</p>
            <input type="range" min="0" max="100" step="1" value={Math.round(prog * 100)} aria-label="Progresso da sessão"
              onChange={(e) => escolher(Number(e.target.value) / 100)} style={{ width: '100%', accentColor: '#A78BFA' }} />
          </label>
          <div>
            <p style={rotulo}>Simular sessão</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DURACOES.map((d) => <button key={d.s} type="button" style={botao(duracao === d.s)} aria-pressed={duracao === d.s} onClick={() => setDuracao(d.s)}>{d.nome}</button>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              <button type="button" style={botao(true)} onClick={simular}>{sim ? 'Recomeçar simulação' : 'Simular sessão'}</button>
              {sim && progresso(sim, agora) < 1 && <button type="button" style={botao()} onClick={pausarOuContinuar}>{pausada(sim) ? 'Continuar' : 'Pausar'}</button>}
              <button type="button" style={botao()} onClick={() => setMurcha(true)} disabled={murcha}>Murchar</button>
              <button type="button" style={botao()} onClick={reiniciar}>Reiniciar</button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB', cursor: 'pointer' }}>
            <input type="checkbox" checked={balancoLigado} onChange={(e) => setBalancoLigado(e.target.checked)} style={{ accentColor: '#A78BFA' }} />
            Balanço contínuo
          </label>
        </div>
      </div>

      <p style={{ ...rotulo, marginTop: '24px' }}>Estágios de {especie.nome}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: '10px' }}>
        {[...especie.estagios, especie.murcha].map((e) => {
          const ativo = e.stageId === estagio.stageId;
          return (
            <button key={e.stageId} type="button" aria-label={`Ver estágio ${e.nome}`} aria-pressed={ativo}
              onClick={() => (e === especie.murcha ? (setSim(null), setMurcha(true)) : escolher(e.minProgress))}
              style={{ padding: '10px 6px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center', color: '#FFFFFF',
                background: ativo ? 'rgba(167, 139, 250, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                border: ativo ? '1px solid rgba(196, 181, 253, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)' }}>
              <img src={urlDoAsset(especie.id, e.assetKey) || ''} alt="" style={{ width: '72px', height: '60px', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
              <b style={{ display: 'block', fontSize: '13px' }}>{e.nome}</b>
              <span style={{ display: 'block', fontSize: '11.5px', color: '#8F99BA' }}>{e === especie.murcha ? 'ao descartar' : `a partir de ${Math.round(e.minProgress * 100)}%`}</span>
              <code style={{ display: 'block', fontSize: '10.5px', color: '#6B7280', marginTop: '2px' }}>{e.assetKey}</code>
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: '12px', color: '#6B7280', margin: '12px 0 0' }}>
        Para trocar a arte, substitua o arquivo com o mesmo nome em src/assets/plantas/{especie.id}/ (svg, png ou webp).
      </p>
    </div>
  );
}
