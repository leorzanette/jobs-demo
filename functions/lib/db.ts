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
      ]);
      await runColumnMigrations(db);
    })();
  }
  await schemaReady;
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
