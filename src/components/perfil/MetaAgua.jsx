import React, { useEffect, useState } from 'react';
import { Droplets, Check, Sparkles } from 'lucide-react';

const COPOS_EXEMPLO = [200, 250, 300, 350, 500, 750];

const pesoDaSaude = (user) => {
  const uid = user?.id || 'default';
  const v = Number(user?.weight || localStorage.getItem(`ethos_weight_${uid}`));
  return Number.isFinite(v) && v >= 20 && v <= 400 ? v : 70;
};

const copoSalvo = (user, health) => {
  const uid = user?.id || 'default';
  const saved = Number(health?.glassMl || localStorage.getItem(`ethos_glass_ml_${uid}`));
  return Number.isFinite(saved) && saved >= 50 && saved <= 3000 ? Math.round(saved) : 250;
};

const metaMlSalva = (user, health, peso, copo) => {
  const uid = user?.id || 'default';
  const sugg = Math.round(peso * 35);
  const fromStorage = Number(localStorage.getItem(`ethos_water_target_ml_${uid}`));
  if (Number.isFinite(fromStorage) && fromStorage >= 500 && fromStorage <= 10000) return Math.round(fromStorage);
  if (Number.isFinite(Number(health?.waterTargetMl)) && Number(health.waterTargetMl) >= 500) {
    return Math.round(Number(health.waterTargetMl));
  }
  if (Number.isFinite(Number(health?.waterTarget)) && Number(health.waterTarget) > 0) {
    return Math.round(Number(health.waterTarget) * copo);
  }
  return sugg;
};

/**
 * Seção específica de Água:
 * - Capacidade dos copos personalizável em ml (exemplos rápidos + valor editável)
 * - Meta de ingestão diária em ml e copos
 * - Sugestão diária clara com base no peso informado em Saúde (35 ml por kg de peso corporal)
 * - Sem duplicar os campos de Peso e Altura da seção de Saúde
 */
export function MetaAgua({ user, health = {}, setHealth, showToast }) {
  const peso = pesoDaSaude(user);
  const sugestaoMl = Math.round(peso * 35);

  const salvoCopo = copoSalvo(user, health);
  const salvoMetaMl = metaMlSalva(user, health, peso, salvoCopo);

  const [copo, setCopo] = useState(salvoCopo);
  const [metaMl, setMetaMl] = useState(salvoMetaMl);
  const [usarSugestaoAutomatica, setUsarSugestaoAutomatica] = useState(() => salvoMetaMl === sugestaoMl);

  useEffect(() => {
    const novoCopo = copoSalvo(user, health);
    setCopo(novoCopo);
    const novaSugestao = Math.round(pesoDaSaude(user) * 35);
    if (usarSugestaoAutomatica) {
      setMetaMl(novaSugestao);
    } else {
      setMetaMl(metaMlSalva(user, health, pesoDaSaude(user), novoCopo));
    }
  }, [user?.id, user?.weight, health?.glassMl, health?.waterTarget, health?.waterTargetMl, usarSugestaoAutomatica]);

  const copoValido = Number.isFinite(Number(copo)) && Number(copo) >= 50 && Number(copo) <= 3000 ? Math.round(Number(copo)) : 250;
  const metaEfetivaMl = usarSugestaoAutomatica
    ? sugestaoMl
    : (Number.isFinite(Number(metaMl)) && Number(metaMl) >= 500 && Number(metaMl) <= 10000 ? Math.round(Number(metaMl)) : sugestaoMl);

  const coposMeta = Math.max(1, Math.ceil(metaEfetivaMl / copoValido));
  const coposSugeridos = Math.max(1, Math.ceil(sugestaoMl / copoValido));
  const litrosSugestao = (sugestaoMl / 1000).toFixed(2).replace('.', ',');
  const litrosMeta = (metaEfetivaMl / 1000).toFixed(2).replace('.', ',');

  const salvoCopos = Number(health?.waterTarget) || Math.max(1, Math.ceil(salvoMetaMl / salvoCopo));
  const mudou = copoValido !== salvoCopo || metaEfetivaMl !== salvoMetaMl || coposMeta !== salvoCopos;

  const irParaSaude = () => {
    const el = document.getElementById('ps-saude');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const input = document.getElementById('psWeightKg');
    input?.focus();
  };

  const salvar = () => {
    const uid = user?.id || 'default';
    localStorage.setItem(`ethos_glass_ml_${uid}`, String(copoValido));
    localStorage.setItem(`ethos_water_target_ml_${uid}`, String(metaEfetivaMl));

    const next = {
      ...health,
      waterTarget: coposMeta,
      waterTargetMl: metaEfetivaMl,
      glassMl: copoValido
    };
    setHealth?.(next);
    if (user?.id) {
      fetch(`/api/user/${user.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      }).catch(() => {});
    }
    showToast?.(`Configurações de água salvas: ${litrosMeta} L/dia (${coposMeta} copos de ${copoValido} ml).`);
  };

  return (
    <section className="pf-card rx-glass-card" style={{ '--pf-acc': 'var(--rx-m-agua)' }} data-testid="meta-agua">
      <div className="pf-head">
        <h2><span className="rx-tile sm"><Droplets size={17} /></span>Água e Hidratação Diária</h2>
        <span className="ps-lock">{litrosMeta} L / dia • {coposMeta} copos</span>
      </div>

      {/* SUGESTÃO CALCULADA COM BASE NO PESO (35 ML / KG) */}
      <div
        className="agw-sugg"
        data-testid="agua-sugestao-box"
        style={{ marginBottom: 12 }}
      >
        <div className="agw-sugg-top">
          <span className="agw-sugg-tag">
            <Sparkles size={13} /> Sugestão diária recomendada: {sugestaoMl} ml ({litrosSugestao} L por dia)
          </span>
          <button
            type="button"
            className="rx-btn ghost tiny"
            onClick={irParaSaude}
          >
            Editar peso em Saúde
          </button>
        </div>
        <p>
          Fórmula padrão: <b>35 ml por kg</b> × <b>{peso} kg</b> (peso em Saúde) = <b>{sugestaoMl} ml</b> ({coposSugeridos} copos de {copoValido} ml)
        </p>
      </div>

      <div className="agw-section" style={{ marginBottom: 12 }}>
        <div className="agw-section-title">
          <span>Capacidade dos copos (ml)</span>
          <small>Escolha uma sugestão ou informe o tamanho do seu copo</small>
        </div>
        <div className="agw-chips" role="group" aria-label="Exemplos de capacidade do copo">
          {COPOS_EXEMPLO.map((ml) => (
            <button
              key={ml}
              type="button"
              className="agw-chip"
              aria-pressed={copoValido === ml}
              onClick={() => setCopo(ml)}
            >
              {ml} ml
            </button>
          ))}
        </div>

        <div className="agw-custom-row">
          <label className="tl-field">
            <span style={{ fontSize: 12.5 }}>Personalizar capacidade do copo (ml)</span>
            <div className="agw-input-unit">
              <input
                className="tl-in"
                type="number"
                min="50"
                max="3000"
                step="10"
                aria-label="Capacidade do copo (ml)"
                value={copo}
                onChange={(e) => setCopo(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="unit">ml</span>
            </div>
          </label>

          {/* META DE INGESTÃO DIÁRIA */}
          <div className="tl-field">
            <span>Meta de ingestão diária (ml)</span>
            <div className="agw-input-unit">
              <input
                className="tl-in"
                type="number"
                min="500"
                max="10000"
                step="50"
                aria-label="Meta de ingestão diária (ml)"
                value={metaEfetivaMl}
                onChange={(e) => {
                  setUsarSugestaoAutomatica(false);
                  setMetaMl(e.target.value === '' ? '' : Number(e.target.value));
                }}
              />
              <span className="unit">ml</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <small className="rx-sub">
            Equivale a <b>{litrosMeta} L por dia ({coposMeta} copos de {copoValido} ml)</b>
          </small>
          {!usarSugestaoAutomatica && (
            <button
              type="button"
              className="rx-link"
              style={{ fontSize: 12.5 }}
              onClick={() => {
                setUsarSugestaoAutomatica(true);
                setMetaMl(sugestaoMl);
              }}
            >
              Usar sugestão ({sugestaoMl} ml)
            </button>
          )}
        </div>
      </div>

      <div className="agw-summary" style={{ marginBottom: 12 }}>
        <div>
          <span>Copos por dia</span>
          <b className="accent">{coposMeta} {coposMeta === 1 ? 'copo' : 'copos'}</b>
        </div>
        <div>
          <span>Seu copo</span>
          <b>{copoValido} ml</b>
        </div>
        <div>
          <span>Meta diária</span>
          <b>{litrosMeta} L</b>
        </div>
      </div>

      <div className="pf-agua-foot">
        <p className="pf-note">
          Meta ativa: <b>{litrosMeta} L por dia ({coposMeta} copos)</b> • Copo configurado: <b>{copoValido} ml</b>
        </p>
        <button type="button" className="rx-btn tiny" onClick={salvar} disabled={!mudou}>
          <Check size={16} />Salvar alterações
        </button>
      </div>
    </section>
  );
}

export default MetaAgua;
