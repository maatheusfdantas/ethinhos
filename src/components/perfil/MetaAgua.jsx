import React, { useEffect, useState } from 'react';
import { calculateDailyWaterTarget } from '../../utils/biometricsAndAnalytics';
import { apiFetch } from '../../utils/api';
import { todayLocal } from '../../utils/healthDay';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';

const COPOS = [200, 250, 300, 500];
const numero = (v) => parseFloat(String(v).replace(',', '.'));
const pesoInicial = (user) => {
  if (user?.weight && Number(user.weight) > 0) return String(user.weight);
  try {
    const salvo = localStorage.getItem(`ethos_user_weight_${user?.id || 'default'}`);
    if (salvo && Number(salvo) > 0) return salvo;
  } catch { /* sem armazenamento local */ }
  return '';
};

/**
 * Meta de água com salvar explícito (lote 2, 21/11/2026; T7 da proposta 07).
 * Mesma regra e mesma gravação do ProfileBiometricsCard (peso × 35 ml; perfil + saúde de hoje),
 * mas só grava ao tocar em "Salvar alterações". Sair com alteração pede confirmação.
 */
export function MetaAgua({ user, setUser, health, setHealth, showToast }) {
  const salvoPeso = pesoInicial(user);
  const salvoCopo = Number(health?.glassMl) > 0 ? Number(health.glassMl) : 250;
  const [peso, setPeso] = useState(salvoPeso);
  const [copo, setCopo] = useState(salvoCopo);
  const [estado, setEstado] = useState('idle'); // idle | saving | error

  useEffect(() => { setPeso(pesoInicial(user)); }, [user?.weight]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (Number(health?.glassMl) > 0) setCopo(Number(health.glassMl)); }, [health?.glassMl]);

  const p = numero(peso);
  const valido = Number.isFinite(p) && p > 0 && p <= 350;
  const dirty = String(peso).trim() !== String(salvoPeso).trim() || copo !== salvoCopo;
  const calc = calculateDailyWaterTarget(valido ? p : 0, copo);

  const salvar = async () => {
    if (!valido) return false;
    const meta = Math.max(1, Math.ceil((p * 35) / copo));
    const novoUser = { ...user, weight: p };
    const novaSaude = { ...health, waterGlasses: health?.waterGlasses || 0, waterTarget: meta, glassMl: copo };
    setEstado('saving');
    try {
      localStorage.setItem(`ethos_user_weight_${user?.id || 'default'}`, String(p));
      localStorage.setItem('ethos_current_user', JSON.stringify(novoUser));
      sessionStorage.setItem('ethos_current_user', JSON.stringify(novoUser));
      localStorage.setItem(`ethos_health_${user?.id || 'default'}`, JSON.stringify(novaSaude));
    } catch { /* segue com o servidor */ }
    try {
      if (user?.id) {
        const rs = await Promise.all([
          apiFetch(`/api/user/${user.id}/profile`, { method: 'PUT', body: JSON.stringify({ weight: p }) }),
          apiFetch(`/api/user/${user.id}/health`, { method: 'POST', body: JSON.stringify({ waterGlasses: novaSaude.waterGlasses, waterDate: todayLocal(), waterTarget: meta, glassMl: copo, sleep: novaSaude.sleep }) })
        ]);
        if (rs.some((r) => r && r.ok === false)) throw new Error('falhou');
      }
      setUser?.(novoUser);
      setHealth?.(novaSaude);
      setEstado('idle');
      showToast?.(`Meta salva: ${litros(p * 35)} L por dia (${meta} copos de ${copo} ml).`);
      return true;
    } catch {
      setEstado('error');
      return false;
    }
  };

  useUnsavedGuard(dirty, { label: 'a meta de água', onSave: salvar });

  return (
    <div className="pf-agua" data-testid="meta-agua">
      <div className="pf-agua-row">
        <div className="rx-field">
          <label htmlFor="pf-peso">Peso (kg)</label>
          <input id="pf-peso" inputMode="decimal" value={peso} placeholder="Ex.: 70" aria-invalid={peso !== '' && !valido ? 'true' : undefined} onChange={(e) => { setPeso(e.target.value); setEstado('idle'); }} />
        </div>
        <div className="rx-field">
          <label htmlFor="pf-copo">Copo (ml)</label>
          <select id="pf-copo" className="es-input" value={copo} onChange={(e) => { setCopo(Number(e.target.value)); setEstado('idle'); }}>
            {COPOS.map((c) => <option key={c} value={c}>{c} ml</option>)}
          </select>
        </div>
      </div>
      <p className="rx-sub" style={{ margin: '0 0 12px' }}>
        {valido ? `Meta: ${String(p).replace('.', ',')} × 35 ml = ${calc.dailyLiters} L por dia (${calc.targetGlasses} ${calc.targetGlasses === 1 ? 'copo' : 'copos'}).` : 'Informe o peso para calcular a meta (peso × 35 ml por dia).'}
      </p>
      {estado === 'error' && <p className="rx-field-error" role="alert">Não foi possível salvar. Confira a conexão e tente de novo.</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {dirty && <button type="button" className="rx-btn ghost" onClick={() => { setPeso(salvoPeso); setCopo(salvoCopo); setEstado('idle'); }}>Descartar</button>}
        <button type="button" className="rx-btn" disabled={!dirty || !valido || estado === 'saving'} onClick={salvar}>{estado === 'saving' ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>
    </div>
  );
}

function litros(ml) { return String(Math.round(ml / 10) / 100).replace('.', ','); }
