CREATE TABLE IF NOT EXISTS gmail_rules (
  user_email TEXT PRIMARY KEY,
  keywords_json TEXT NOT NULL,
  blacklist_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
