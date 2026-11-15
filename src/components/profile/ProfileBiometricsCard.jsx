import React, { useState, useEffect, useRef } from 'react';
import { Droplets, Scale, CheckCircle2, Sparkles, GlassWater } from 'lucide-react';
import { calculateDailyWaterTarget } from '../../utils/biometricsAndAnalytics';
import { apiFetch } from '../../utils/api';

/**
 * ProfileBiometricsCard
 * Componente dedicado de biometria e cálculo automático de hidratação diária
 * Fórmula Oficial da OMS / Medicina Esportiva: Peso (em kg) × 35 ml = quantidade diária de água
 */
export default function ProfileBiometricsCard({
  user,
  setUser,
  health,
  setHealth,
  showToast,
  hideConsumption = false
}) {
  const [weightInput, setWeightInput] = useState(() => {
    if (user?.weight && Number(user.weight) > 0) return String(user.weight);
    try {
      const savedW = localStorage.getItem(`ethos_user_weight_${user?.id || 'default'}`);
      if (savedW && Number(savedW) > 0) return savedW;
    } catch (_e) {}
    return '';
  });

  const [glassSizeMl, setGlassSizeMl] = useState(() => {
    if (health?.glassMl && Number(health.glassMl) > 0) return Number(health.glassMl);
    return 250;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const debounceTimerRef = useRef(null);

  // Sincroniza se o usuário mudar externamente
  useEffect(() => {
    if (user?.weight && Number(user.weight) > 0) {
      setWeightInput(String(user.weight));
    }
  }, [user?.weight]);

  useEffect(() => {
    if (health?.glassMl && Number(health.glassMl) > 0) {
      setGlassSizeMl(Number(health.glassMl));
    }
  }, [health?.glassMl]);

  // Cálculo biométrico puro
  const waterCalc = calculateDailyWaterTarget(weightInput, glassSizeMl);
  const numericWeight = waterCalc.weightKg;
  const idealDailyWaterMl = waterCalc.dailyMl;
  const idealDailyWaterLiters = waterCalc.dailyLiters;
  const recommendedGlasses = numericWeight > 0 ? waterCalc.targetGlasses : (health?.waterTarget || 10);
  const consumedGlasses = health?.waterGlasses || 0;
  const progressPercent = Math.min(100, Math.round((consumedGlasses / Math.max(1, recommendedGlasses)) * 100));

  // Função interna para persistência
  const persistBiometrics = async (wKg, gMl, showFeedback = false) => {
    if (wKg <= 0) return;

    const targetGlasses = Math.max(1, Math.ceil((wKg * 35) / (gMl || 250)));
    const updatedUser = { ...user, weight: wKg };
    setUser?.(updatedUser);

    const updatedHealth = {
      ...health,
      waterGlasses: health?.waterGlasses || 0,
      waterTarget: targetGlasses,
      glassMl: gMl || 250
    };
    setHealth?.(updatedHealth);

    try {
      localStorage.setItem(`ethos_user_weight_${user?.id || 'default'}`, String(wKg));
      localStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('ethos_current_user', JSON.stringify(updatedUser));
      localStorage.setItem(`ethos_health_${user?.id || 'default'}`, JSON.stringify(updatedHealth));

      if (user?.id) {
        setIsSaving(true);
        await Promise.all([
          apiFetch(`/api/user/${user.id}/profile`, {
            method: 'PUT',
            body: JSON.stringify({ weight: wKg })
          }),
          apiFetch(`/api/user/${user.id}/health`, {
            method: 'POST',
            body: JSON.stringify({
              waterGlasses: updatedHealth.waterGlasses,
              waterTarget: targetGlasses,
              glassMl: gMl || 250,
              sleep: updatedHealth.sleep
            })
          })
        ]);
        setIsSaving(false);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2200);

        if (showFeedback) {
          showToast?.(`Meta salva: ${(wKg * 35).toLocaleString('pt-BR')} ml (${targetGlasses} copos de ${gMl} ml)!`);
        }
      }
    } catch (_err) {
      setIsSaving(false);
      if (showFeedback) {
        showToast?.('Meta biométrica salva localmente.');
      }
    }
  };

  // Auto-debounce ao digitar o peso (450ms)
  const handleWeightChange = (val) => {
    setWeightInput(val);
    const parsed = parseFloat(val.replace(',', '.'));

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!isNaN(parsed) && parsed > 0 && parsed <= 350) {
      debounceTimerRef.current = setTimeout(() => {
        persistBiometrics(parsed, glassSizeMl, false);
      }, 450);
    }
  };

  const handleGlassChange = (val) => {
    const size = Number(val) || 250;
    setGlassSizeMl(size);
    if (numericWeight > 0) {
      persistBiometrics(numericWeight, size, false);
    }
  };

  const handleManualSave = (e) => {
    e?.preventDefault?.();
    if (numericWeight <= 0) {
      showToast?.('Informe seu peso em kg para calcular a meta ideal de água.');
      return;
    }
    persistBiometrics(numericWeight, glassSizeMl, true);
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        border: '1.5px solid #E0F2FE',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decoração sutil de fundo em gradiente aquático */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }}
      />

      {/* Cabeçalho do Card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px rgba(2, 132, 199, 0.28)'
            }}
          >
            <Droplets size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
              Calculadora Biométrica de Hidratação Diária
            </h3>
            <span style={{ fontSize: '12px', color: '#0284C7', fontWeight: 600 }}>
              Fórmula Oficial: Peso (em kg) × 35 ml = quantidade diária de água
            </span>
          </div>
        </div>

        {/* Badge da fórmula ao vivo */}
        <div
          style={{
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            border: '1px solid rgba(2, 132, 199, 0.25)',
            borderRadius: '999px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 800,
            color: '#0369A1',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Sparkles size={13} />
          <span>
            {numericWeight > 0
              ? `${numericWeight} kg × 35 ml = ${idealDailyWaterMl.toLocaleString('pt-BR')} ml (${idealDailyWaterLiters} L/dia)`
              : 'Informe seu peso para sugestão automática'}
          </span>
        </div>
      </div>

      {/* Grid de Inputs & Sugestão Instantânea */}
      <form onSubmit={handleManualSave}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            alignItems: 'end',
            marginBottom: '16px'
          }}
        >
          {/* Campo de Peso (com trigger de cálculo automático) */}
          <div>
            <label
              htmlFor="ethos-user-weight-input"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              <Scale size={14} color="#0284C7" />
              <span>Seu Peso Atual (kg)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="ethos-user-weight-input"
                type="number"
                step="0.1"
                min="20"
                max="350"
                placeholder="Ex: 70"
                value={weightInput}
                onChange={(e) => handleWeightChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 14px',
                  borderRadius: '14px',
                  border: '1.5px solid #BAE6FD',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '15px',
                  fontWeight: 800,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#64748B'
                }}
              >
                kg
              </span>
            </div>
          </div>

          {/* Tamanho do Copo */}
          <div>
            <label
              htmlFor="ethos-glass-size-select"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              <GlassWater size={14} color="#0284C7" />
              <span>Tamanho do Copo / Garrafa</span>
            </label>
            <select
              id="ethos-glass-size-select"
              value={glassSizeMl}
              onChange={(e) => handleGlassChange(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '14px',
                border: '1.5px solid #BAE6FD',
                backgroundColor: '#F8FAFC',
                color: '#0F172A',
                fontSize: '13.5px',
                fontWeight: 700,
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <option value={200}>Copo Americano (200 ml)</option>
              <option value={250}>Copo Padrão (250 ml)</option>
              <option value={300}>Caneca / Copo Grande (300 ml)</option>
              <option value={500}>Garrafa Squeeze (500 ml)</option>
            </select>
          </div>

          {/* Resultado da Sugestão Automática */}
          <div
            style={{
              backgroundColor: '#F0F9FF',
              border: '1.5px solid #BAE6FD',
              borderRadius: '14px',
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Meta Diária Sugerida
            </span>
            <div style={{ fontSize: '17px', fontWeight: 900, color: '#0284C7', marginTop: '2px' }}>
              {numericWeight > 0
                ? `${idealDailyWaterMl.toLocaleString('pt-BR')} ml (${recommendedGlasses} copos)`
                : 'Aguardando peso...'}
            </div>
            {!hideConsumption && <span style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
              Consumo hoje: <strong>{consumedGlasses} / {recommendedGlasses} copos</strong> ({progressPercent}%)
            </span>}
          </div>

          {/* Botão de Ação / Feedback de Salvamento */}
          <div>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '14px',
                border: 'none',
                background: justSaved
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                cursor: isSaving ? 'wait' : 'pointer',
                boxShadow: justSaved
                  ? '0 6px 16px rgba(16, 185, 129, 0.35)'
                  : '0 6px 16px rgba(2, 132, 199, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.25s ease'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{justSaved ? '✓ Atualizado!' : isSaving ? 'Salvando...' : 'Salvar Peso & Meta de Água'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Barra de Progresso de Hidratação do Dia (oculta no Perfil: já aparece no Painel) */}
      {!hideConsumption && <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #E0F2FE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
            Progresso Diário com Base na Meta Biométrica
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7' }}>
            {Math.round(consumedGlasses * glassSizeMl)} / {idealDailyWaterMl > 0 ? idealDailyWaterMl : recommendedGlasses * glassSizeMl} ml
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#E0F2FE',
            borderRadius: '999px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #38BDF8 0%, #0284C7 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </div>
      </div>}
    </div>
  );
}
