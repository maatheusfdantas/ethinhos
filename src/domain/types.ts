/**
 * Tipos do domínio do núcleo do Ethos: Rotina, Compromissos (hábitos e tarefas),
 * Registros (entries), Categorias e Insights.
 *
 * Regras que estes tipos expressam:
 * - Compromisso é só DEFINIÇÃO. Progresso nunca vive no compromisso.
 * - Progresso vive só em `Entry`. Um registro é um fato imutável (append-only):
 *   cada toque gera um registro; o progresso de um dia é a soma de `value` dos
 *   registros não excluídos daquele compromisso naquela data local.
 * - Desfazer = exclusão lógica (`deletedAt`), para a sincronização propagar.
 * - Ids são gerados no cliente (UUID), o que torna a criação idempotente.
 * - Datas de calendário são datas locais do usuário (`YYYY-MM-DD`), calculadas
 *   com o fuso guardado no usuário. Instantes são ISO 8601 em UTC.
 */

/** Data de calendário local do usuário, formato `YYYY-MM-DD`. */
export type LocalDate = string;

/** Instante em ISO 8601 UTC, ex.: `2026-11-14T15:04:05.000Z`. */
export type IsoInstant = string;

/** Identificador de fuso IANA, ex.: `America/Sao_Paulo`. */
export type TimeZone = string;

/** 0 = domingo ... 6 = sábado (mesma convenção de `Date#getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface UserSettings {
  userId: string;
  timezone: TimeZone;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  /** Cor de destaque (hex ou token do design system). */
  color: string;
  /** Nome do ícone (lucide). */
  icon: string;
  position: number;
  archivedAt: IsoInstant | null;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export type CommitmentKind = 'habit' | 'task';

/**
 * Como o progresso é medido.
 * - `check`: feito/não feito (meta implícita 1).
 * - `count`: contagem (ex.: 8 copos de água).
 * - `duration`: minutos (ex.: 30 min de leitura, 480 min de sono).
 * - `quantity`: quantidade com unidade livre (ex.: 2 L, 5 km).
 */
export type MeasureType = 'check' | 'count' | 'duration' | 'quantity';

export interface Measure {
  type: MeasureType;
  /** Meta por ocorrência (por dia em que o compromisso é devido). */
  target: number;
  /** Unidade exibida (`copos`, `min`, `km`...). `null` para `check`. */
  unit: string | null;
}

/**
 * Recorrência.
 * - `once`: tarefa pontual em uma data.
 * - `daily`: todo dia.
 * - `weekdays`: dias da semana específicos.
 * - `weekly_count`: N vezes por semana, em quaisquer dias.
 */
export type Recurrence =
  | { freq: 'once'; date: LocalDate }
  | { freq: 'daily' }
  | { freq: 'weekdays'; days: Weekday[] }
  | { freq: 'weekly_count'; count: number };

export type CommitmentStatus = 'active' | 'archived';

export interface Commitment {
  id: string;
  userId: string;
  routineId: string;
  kind: CommitmentKind;
  title: string;
  categoryId: string | null;
  measure: Measure;
  recurrence: Recurrence;
  status: CommitmentStatus;
  /** Primeiro dia em que o compromisso passa a valer. */
  startDate: LocalDate;
  position: number;
  createdAt: IsoInstant;
  updatedAt: IsoInstant;
}

export type EntrySource = 'tap' | 'manual' | 'timer' | 'import';

export interface Entry {
  /** Gerado no cliente. Reenviar o mesmo id não duplica (idempotência). */
  id: string;
  userId: string;
  commitmentId: string;
  /** Data local do usuário à qual o registro pertence. */
  date: LocalDate;
  /** Incremento de progresso (1 para `check`, minutos para `duration`...). */
  value: number;
  note: string | null;
  source: EntrySource;
  /** Instante real do registro (base para "melhor horário"). */
  recordedAt: IsoInstant;
  createdAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

export type InsightKind =
  | 'streak'
  | 'streak_broken'
  | 'completion_rate'
  | 'best_day'
  | 'best_time'
  | 'weekly_consistency';

export type InsightTone = 'positive' | 'neutral' | 'attention';

/** Derivado e recalculável a partir de compromissos + registros. */
export interface Insight {
  kind: InsightKind;
  tone: InsightTone;
  title: string;
  message: string;
  /** Compromisso a que se refere; `null` = visão geral da rotina. */
  commitmentId: string | null;
  /** Valor numérico principal (dias de sequência, taxa 0..1, hora 0..23...). */
  value: number | null;
  period: { from: LocalDate; to: LocalDate };
}
