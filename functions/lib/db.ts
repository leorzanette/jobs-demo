export interface ApplicationRow {
  id: string;
  user_email: string;
  company: string;
  role: string;
  status: string;
  platform: string | null;
  stage_current: number | null;
  stage_total: number | null;
  applied_date: string | null;
  follow_up_date: string | null;
  interview_date: string | null;
  job_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

let schemaReady: Promise<void> | null = null;

const COLUMN_MIGRATIONS = [
  "ALTER TABLE applications ADD COLUMN platform TEXT",
  "ALTER TABLE applications ADD COLUMN stage_current INTEGER",
  "ALTER TABLE applications ADD COLUMN stage_total INTEGER",
];

async function runColumnMigrations(db: D1Database) {
  for (const sql of COLUMN_MIGRATIONS) {
    try {
      await db.prepare(sql).run();
    } catch {
      // column already exists
    }
  }
}

export async function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS applications (
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
        )`),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_email)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS gmail_connections (
          user_email TEXT PRIMARY KEY,
          refresh_token_enc TEXT NOT NULL,
          access_token_enc TEXT,
          access_token_expires_at TEXT,
          last_synced_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS email_suggestions (
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
        )`),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_email_suggestions_user_status ON email_suggestions(user_email, status)",
        ),
        db.prepare(
          "CREATE INDEX IF NOT EXISTS idx_email_suggestions_application ON email_suggestions(application_id)",
        ),
        db.prepare(`CREATE TABLE IF NOT EXISTS gmail_rules (
          user_email TEXT PRIMARY KEY,
          keywords_json TEXT NOT NULL,
          blacklist_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`),
      ]);
      await runColumnMigrations(db);
    })();
  }
  await schemaReady;
}

export interface GmailConnectionRow {
  user_email: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  access_token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSuggestionRow {
  id: string;
  user_email: string;
  application_id: string;
  gmail_message_id: string;
  suggested_status: string;
  matched_keyword: string;
  email_from: string | null;
  email_subject: string | null;
  email_snippet: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function rowToSuggestion(
  row: EmailSuggestionRow,
  application?: { company: string; role: string; status: string } | null,
) {
  return {
    id: row.id,
    applicationId: row.application_id,
    gmailMessageId: row.gmail_message_id,
    suggestedStatus: row.suggested_status,
    matchedKeyword: row.matched_keyword,
    emailFrom: row.email_from ?? undefined,
    emailSubject: row.email_subject ?? undefined,
    emailSnippet: row.email_snippet ?? undefined,
    status: row.status,
    company: application?.company,
    role: application?.role,
    currentStatus: application?.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGmailConnection(db: D1Database, email: string) {
  return db
    .prepare("SELECT * FROM gmail_connections WHERE user_email = ?")
    .bind(email)
    .first<GmailConnectionRow>();
}

export async function listGmailConnections(db: D1Database) {
  const { results } = await db
    .prepare("SELECT * FROM gmail_connections")
    .all<GmailConnectionRow>();
  return results ?? [];
}

export async function upsertGmailConnection(
  db: D1Database,
  email: string,
  data: {
    refreshTokenEnc: string;
    accessTokenEnc?: string | null;
    accessTokenExpiresAt?: string | null;
  },
) {
  const now = new Date().toISOString();
  const existing = await getGmailConnection(db, email);

  if (existing) {
    await db
      .prepare(
        `UPDATE gmail_connections SET
          refresh_token_enc = ?,
          access_token_enc = ?,
          access_token_expires_at = ?,
          updated_at = ?
        WHERE user_email = ?`,
      )
      .bind(
        data.refreshTokenEnc,
        data.accessTokenEnc ?? null,
        data.accessTokenExpiresAt ?? null,
        now,
        email,
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO gmail_connections (
          user_email, refresh_token_enc, access_token_enc,
          access_token_expires_at, last_synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      )
      .bind(
        email,
        data.refreshTokenEnc,
        data.accessTokenEnc ?? null,
        data.accessTokenExpiresAt ?? null,
        now,
        now,
      )
      .run();
  }

  return getGmailConnection(db, email);
}

export async function updateGmailAccessToken(
  db: D1Database,
  email: string,
  accessTokenEnc: string,
  accessTokenExpiresAt: string,
) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE gmail_connections SET
        access_token_enc = ?, access_token_expires_at = ?, updated_at = ?
      WHERE user_email = ?`,
    )
    .bind(accessTokenEnc, accessTokenExpiresAt, now, email)
    .run();
}

export async function markGmailSynced(db: D1Database, email: string) {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE gmail_connections SET last_synced_at = ?, updated_at = ?
      WHERE user_email = ?`,
    )
    .bind(now, now, email)
    .run();
}

export async function deleteGmailConnection(db: D1Database, email: string) {
  const result = await db
    .prepare("DELETE FROM gmail_connections WHERE user_email = ?")
    .bind(email)
    .run();
  return result.meta.changes > 0;
}

export async function countPendingSuggestions(db: D1Database, email: string) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM email_suggestions
       WHERE user_email = ? AND status = 'pending'`,
    )
    .bind(email)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function listPendingSuggestions(db: D1Database, email: string) {
  const { results } = await db
    .prepare(
      `SELECT * FROM email_suggestions
       WHERE user_email = ? AND status = 'pending'
       ORDER BY created_at DESC`,
    )
    .bind(email)
    .all<EmailSuggestionRow>();
  return results ?? [];
}

export async function listSuggestionHistory(
  db: D1Database,
  email: string,
  limit = 100,
) {
  const { results } = await db
    .prepare(
      `SELECT * FROM email_suggestions
       WHERE user_email = ? AND status IN ('accepted', 'dismissed')
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .bind(email, limit)
    .all<EmailSuggestionRow>();
  return results ?? [];
}

export async function getSuggestion(
  db: D1Database,
  email: string,
  id: string,
) {
  return db
    .prepare(
      "SELECT * FROM email_suggestions WHERE id = ? AND user_email = ?",
    )
    .bind(id, email)
    .first<EmailSuggestionRow>();
}

export async function getApplicationById(
  db: D1Database,
  email: string,
  id: string,
) {
  return db
    .prepare("SELECT * FROM applications WHERE id = ? AND user_email = ?")
    .bind(id, email)
    .first<ApplicationRow>();
}

export async function insertSuggestion(
  db: D1Database,
  email: string,
  data: {
    applicationId: string;
    gmailMessageId: string;
    suggestedStatus: string;
    matchedKeyword: string;
    emailFrom?: string;
    emailSubject?: string;
    emailSnippet?: string;
  },
): Promise<EmailSuggestionRow | null> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO email_suggestions (
          id, user_email, application_id, gmail_message_id,
          suggested_status, matched_keyword, email_from, email_subject,
          email_snippet, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(
        id,
        email,
        data.applicationId,
        data.gmailMessageId,
        data.suggestedStatus,
        data.matchedKeyword,
        data.emailFrom ?? null,
        data.emailSubject ?? null,
        data.emailSnippet ?? null,
        now,
        now,
      )
      .run();
  } catch {
    // UNIQUE (user_email, gmail_message_id) — already processed
    return null;
  }

  return getSuggestion(db, email, id);
}

export async function updateSuggestionStatus(
  db: D1Database,
  email: string,
  id: string,
  status: "pending" | "accepted" | "dismissed",
) {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE email_suggestions SET status = ?, updated_at = ?
       WHERE id = ? AND user_email = ?`,
    )
    .bind(status, now, id, email)
    .run();

  if (!result.meta.changes) return null;
  return getSuggestion(db, email, id);
}

export async function updateSuggestionFields(
  db: D1Database,
  email: string,
  id: string,
  fields: {
    suggestedStatus?: string;
    status?: "pending" | "accepted" | "dismissed";
  },
) {
  const existing = await getSuggestion(db, email, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const suggestedStatus = fields.suggestedStatus ?? existing.suggested_status;
  const status = fields.status ?? existing.status;

  const result = await db
    .prepare(
      `UPDATE email_suggestions SET
        suggested_status = ?, status = ?, updated_at = ?
       WHERE id = ? AND user_email = ?`,
    )
    .bind(suggestedStatus, status, now, id, email)
    .run();

  if (!result.meta.changes) return null;
  return getSuggestion(db, email, id);
}

export async function updateApplicationStatus(
  db: D1Database,
  email: string,
  id: string,
  status: string,
) {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE applications SET status = ?, updated_at = ?
       WHERE id = ? AND user_email = ?`,
    )
    .bind(status, now, id, email)
    .run();

  if (!result.meta.changes) return null;

  return db
    .prepare("SELECT * FROM applications WHERE id = ? AND user_email = ?")
    .bind(id, email)
    .first<ApplicationRow>();
}

export interface ApplicationPayload {
  company: string;
  role: string;
  status: string;
  platform?: string;
  stageCurrent?: number;
  stageTotal?: number;
  appliedDate?: string;
  followUpDate?: string;
  interviewDate?: string;
  jobUrl?: string;
  notes?: string;
}

export function rowToApplication(row: ApplicationRow) {
  return {
    id: row.id,
    company: row.company,
    role: row.role,
    status: row.status,
    platform: row.platform ?? undefined,
    stageCurrent: row.stage_current ?? undefined,
    stageTotal: row.stage_total ?? undefined,
    appliedDate: row.applied_date ?? undefined,
    followUpDate: row.follow_up_date ?? undefined,
    interviewDate: row.interview_date ?? undefined,
    jobUrl: row.job_url ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listApplications(db: D1Database, email: string) {
  const { results } = await db
    .prepare(
      "SELECT * FROM applications WHERE user_email = ? ORDER BY updated_at DESC",
    )
    .bind(email)
    .all<ApplicationRow>();
  return results ?? [];
}

export async function createApplication(
  db: D1Database,
  email: string,
  payload: ApplicationPayload,
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO applications (
        id, user_email, company, role, status,
        platform, stage_current, stage_total,
        applied_date, follow_up_date, interview_date, job_url, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      email,
      payload.company,
      payload.role,
      payload.status,
      payload.platform ?? null,
      payload.stageCurrent ?? null,
      payload.stageTotal ?? null,
      payload.appliedDate ?? null,
      payload.followUpDate ?? null,
      payload.interviewDate ?? null,
      payload.jobUrl ?? null,
      payload.notes ?? null,
      now,
      now,
    )
    .run();

  const row = await db
    .prepare("SELECT * FROM applications WHERE id = ? AND user_email = ?")
    .bind(id, email)
    .first<ApplicationRow>();

  if (!row) throw new Error("Failed to create application");
  return row;
}

export async function updateApplication(
  db: D1Database,
  email: string,
  id: string,
  payload: ApplicationPayload,
) {
  const now = new Date().toISOString();

  const result = await db
    .prepare(
      `UPDATE applications SET
        company = ?, role = ?, status = ?,
        platform = ?, stage_current = ?, stage_total = ?,
        applied_date = ?, follow_up_date = ?, interview_date = ?,
        job_url = ?, notes = ?, updated_at = ?
      WHERE id = ? AND user_email = ?`,
    )
    .bind(
      payload.company,
      payload.role,
      payload.status,
      payload.platform ?? null,
      payload.stageCurrent ?? null,
      payload.stageTotal ?? null,
      payload.appliedDate ?? null,
      payload.followUpDate ?? null,
      payload.interviewDate ?? null,
      payload.jobUrl ?? null,
      payload.notes ?? null,
      now,
      id,
      email,
    )
    .run();

  if (!result.meta.changes) return null;

  return db
    .prepare("SELECT * FROM applications WHERE id = ? AND user_email = ?")
    .bind(id, email)
    .first<ApplicationRow>();
}

export async function deleteApplication(
  db: D1Database,
  email: string,
  id: string,
) {
  const result = await db
    .prepare("DELETE FROM applications WHERE id = ? AND user_email = ?")
    .bind(id, email)
    .run();
  return result.meta.changes > 0;
}

export interface GmailRulesRow {
  user_email: string;
  keywords_json: string;
  blacklist_json: string;
  created_at: string;
  updated_at: string;
}

export async function getGmailRulesRow(db: D1Database, email: string) {
  return db
    .prepare("SELECT * FROM gmail_rules WHERE user_email = ?")
    .bind(email)
    .first<GmailRulesRow>();
}

export async function upsertGmailRules(
  db: D1Database,
  email: string,
  keywordsJson: string,
  blacklistJson: string,
) {
  const now = new Date().toISOString();
  const existing = await getGmailRulesRow(db, email);

  if (existing) {
    await db
      .prepare(
        `UPDATE gmail_rules SET
          keywords_json = ?, blacklist_json = ?, updated_at = ?
        WHERE user_email = ?`,
      )
      .bind(keywordsJson, blacklistJson, now, email)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO gmail_rules (
          user_email, keywords_json, blacklist_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(email, keywordsJson, blacklistJson, now, now)
      .run();
  }

  return getGmailRulesRow(db, email);
}
