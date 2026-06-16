CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  applied_date TEXT,
  follow_up_date TEXT,
  interview_date TEXT,
  job_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_email);