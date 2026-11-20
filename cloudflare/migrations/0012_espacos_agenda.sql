-- Espaços, lote C (docs/11): eventos com convite, avisos com comentários privados e pendências.
-- Só acrescenta tabelas e índices; não altera nem apaga dados existentes.

-- Evento do espaço. Os convidados são fixados na criação (quem entra depois não é convidado sozinho).
-- version sobe quando data ou horário mudam: quem tinha aceitado volta a "pendente".
CREATE TABLE IF NOT EXISTS space_events (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  tz TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  audience TEXT NOT NULL CHECK (audience IN ('turma', 'pessoas', 'espaco')),
  group_id TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_space_events_space ON space_events (space_id, starts_at);

-- Convite: pendente até aceitar ou recusar. Pendente de evento que já começou = "sem resposta" (calculado).
-- Presença é separada da resposta.
CREATE TABLE IF NOT EXISTS space_event_invites (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  answered_version INTEGER,
  answered_at TEXT,
  attendance TEXT CHECK (attendance IN ('presente', 'faltou')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_invites_user ON space_event_invites (user_id, status);
CREATE INDEX IF NOT EXISTS idx_event_invites_event ON space_event_invites (event_id);

-- Aviso: destinatários fixados na publicação. Sem confirmação de leitura obrigatória.
CREATE TABLE IF NOT EXISTS space_posts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('turma', 'pessoas', 'espaco')),
  group_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  allow_comments INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'arquivado')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_space_posts_space ON space_posts (space_id, created_at);

CREATE TABLE IF NOT EXISTS space_post_recipients (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  read_at TEXT,
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_recipients_user ON space_post_recipients (user_id);

-- Comentário privado: a conversa é de UM participante com o profissional (participant_id).
-- Nenhum colega lê a conversa de outro.
CREATE TABLE IF NOT EXISTS space_post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_post_comments_thread ON space_post_comments (post_id, participant_id, created_at);

-- Pendências dentro do app (sem push nem e-mail). dedupe_key impede repetir a mesma pendência.
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  space_id TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  read_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at);
