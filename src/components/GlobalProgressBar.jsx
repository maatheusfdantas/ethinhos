import React from 'react';
import { Target, CheckCircle2, Sparkles, Calendar } from 'lucide-react';
import { isEventForDate } from '../services/storage';

export function GlobalProgressBar({ habits = [], events = [], activeTab, user = null }) {
  // Ocultar na aba Social conforme solicitado
  if (activeTab === 'social') return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayEvents = events.filter(e => isEventForDate(e, todayStr));

  const totalActivities = habits.length + todayEvents.length;
  const completedHabits = habits.filter(h => h.completed).length;
  const completedEvents = todayEvents.filter(e => e.completed).length;
  const totalCompleted = completedHabits + completedEvents;

  // Auto-padronização proporcional (0% a 100%)
  const percentage = totalActivities > 0 
    ? Math.round((totalCompleted / totalActivities) * 100) 
    : 0;

  const isFull = percentage >= 100;

  // Formatação de data em português
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayName = dayNames[now.getDay()];
  const dayNumber = now.getDate();
  const monthName = monthNames[now.getMonth()];
  const formattedDate = `${dayName}, ${dayNumber} de ${monthName}`;

  // Saudação de acordo com o horário
  const hour = now.getHours();
  let greeting = 'Bom dia';
  if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
  else if (hour >= 18 || hour < 5) greeting = 'Boa noite';

  const userName = user?.name ? user.name.split(' ')[0] : 'Usuário';

  // Na aba Dashboard, atua como HUD Executivo de Boas-Vindas sem duplicar a barra de progresso
  if (activeTab === 'dashboard') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {formattedDate}
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-0.5">
            {greeting}, {userName}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-full bg-[#0B0F17]/80 border border-white/[0.08] backdrop-blur-xl flex items-center gap-2 text-xs shadow-sm">
            <span className={`w-2 h-2 rounded-full ${isFull ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'}`} />
            <span className="text-slate-300 font-medium">
              {totalCompleted} de {totalActivities} concluídas
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-white font-semibold tabular-nums">{percentage}%</span>
          </div>
        </div>
      </div>
    );
  }

  // Nas demais abas (Workouts, Focus, Calendar, Telemetry, Admin), exibe o Card de Ritmo Global
  return (
    <div className="bento-card p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
            isFull 
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
              : 'bg-blue-500/15 border-blue-400/30 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.25)]'
          }`}>
            {isFull ? <CheckCircle2 size={22} strokeWidth={1.75} /> : <Target size={22} strokeWidth={1.75} />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-white">
                Ritmo & Produtividade Diária
              </h2>
              <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isFull 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' 
                  : 'bg-blue-500/10 text-blue-300 border-blue-400/20'
              }`}>
                {isFull ? 'Concluído' : percentage > 50 ? 'Alto Ritmo' : 'Em Execução'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {totalActivities === 0 
                ? 'Nenhuma tarefa ou compromisso agendado para hoje' 
                : `${totalCompleted} de ${totalActivities} atividades concluídas hoje`}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 self-end sm:self-auto">
          <span className="text-4xl font-semibold tracking-tight text-white tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
            {percentage}%
          </span>
          <span className="text-xs text-slate-400 font-medium">completo</span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-900/80 border border-white/[0.06] p-0.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isFull 
              ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
              : 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(96,165,250,0.5)]'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}
