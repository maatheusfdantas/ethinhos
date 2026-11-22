// Cor de apoio de cada módulo (proposta 12): usada no ícone em quadrado, no destaque e nos gráficos dele.
export const COR_MODULO = {
  dashboard: 'var(--rx-violet)', habits: 'var(--rx-m-habitos)', calendar: 'var(--rx-m-agenda)', workouts: 'var(--rx-m-treino)',
  alimentacao: 'var(--rx-m-alim)', focus: 'var(--rx-m-foco)', bad_habits: 'var(--rx-m-maus)', notes: 'var(--rx-m-notas)',
  telemetry: 'var(--rx-m-analise)', social: 'var(--rx-m-social)', espacos: 'var(--rx-m-espacos)', profile: 'var(--rx-m-perfil)',
  admin: 'var(--rx-alert)'
};
export const corModulo = (id) => COR_MODULO[id] || (String(id).startsWith('pro-') ? 'var(--rx-m-espacos)' : 'var(--rx-m-perfil)');
