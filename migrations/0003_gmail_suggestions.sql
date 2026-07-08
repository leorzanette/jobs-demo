CREATE TABLE IF NOT EXISTS gmail_connections (
  user_email TEXT PRIMARY KEY,
  refresh_token_enc TEXT NOT NULL,
  access_token_enc TEXT,
  access_token_expires_at TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_suggestions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  application_id TEXT NOT NULL,
  gmail_message_id TEXT NOT NULL,
  suggested_status TEXT NOT NULL,
  matched_keyword TEXT NOT NULL,
  email_from TEXT,
  email_subject TEXT,
  email_snippet TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_email, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_email_suggestions_user_status
  ON email_suggestions(user_email, status);
CREATE INDEX IF NOT EXISTS idx_email_suggestions_application
  ON email_suggestions(application_id);
