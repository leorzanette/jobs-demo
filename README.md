# Job Application Tracker

Track job applications through a pipeline: Wishlist, Applied, Interview, Offer, Rejected, and Withdrawn.

Data is stored in **Cloudflare D1** and syncs across all your devices. Access is protected by **Cloudflare Access** (Google / email PIN login).

Optional **Gmail suggestions**: connect your inbox, scan for fixed keyword matches (interview / offer / rejected / applied), and confirm status moves in a review queue.

Live at: https://jobs.leorza.net

## Configure wrangler.toml (required)

This Pages project manages **environment variables and D1 bindings through `wrangler.toml`**, not the dashboard (except encrypted Secrets).

Edit `wrangler.toml` and add:

### 1. ACCESS_AUD

1. Zero Trust -> Access controls -> Applications -> Job Tracker -> **Overview**
2. Copy the **Application Audience (AUD) Tag**
3. Uncomment and set in `wrangler.toml`:

```toml
[vars]
ACCESS_TEAM_DOMAIN = "leorzanet.cloudflareaccess.com"
ACCESS_AUD = "paste-your-aud-tag-here"
```

### 2. D1 database binding

1. Cloudflare dashboard -> **D1** -> `job-tracker-db` -> **Overview**
2. Copy **Database ID**
3. Uncomment and set in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "job-tracker-db"
database_id = "your-database-id-here"
```

4. Commit and push — Cloudflare redeploys automatically.

## Local development

```bash
npm install
npm run dev          # UI only (API will fail)
npm run pages:dev    # UI + API + D1 (requires wrangler.toml configured)
```

## Database schema

Already applied via D1 console? No action needed. Otherwise run the SQL under `migrations/` in order (`0001_init.sql`, `0002_add_platform_stages.sql`, `0003_gmail_suggestions.sql`) in the D1 SQL console.

Tables for Gmail are also created automatically on first API request via `ensureSchema`.

## Gmail keyword suggestions (optional)

Connect Gmail from the app toolbar. Sync scans recent mail (last 14 days) with fixed PT/EN keywords, matches **company name** in From/Subject/snippet, and creates **pending suggestions**. You Accept or Dismiss — cards never auto-move.

### 1. Google Cloud OAuth

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Gmail API**
3. Configure OAuth consent screen (External / Testing is fine; add your Gmail as a test user)
4. Create **OAuth client ID** → Application type **Web application**
5. Authorized redirect URIs:
   - `https://jobs.leorza.net/api/gmail/oauth/callback`
   - `http://localhost:8788/api/gmail/oauth/callback` (for `pages:dev`, adjust port if needed)

### 2. Pages secrets

Set these as **encrypted secrets** on the Pages project (not in `wrangler.toml`):

```bash
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name jobs
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name jobs
npx wrangler pages secret put TOKEN_ENCRYPTION_KEY --project-name jobs
npx wrangler pages secret put CRON_SECRET --project-name jobs
```

- `TOKEN_ENCRYPTION_KEY` — long random string used to encrypt Gmail refresh tokens at rest
- `CRON_SECRET` — shared secret for the companion cron Worker

Optional var (defaults to `{origin}/api/gmail/oauth/callback`):

```toml
# in wrangler.toml [vars] if you need an explicit URI
# GMAIL_REDIRECT_URI = "https://jobs.leorza.net/api/gmail/oauth/callback"
```

Local `pages:dev` — pass secrets via `.dev.vars` in the project root:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TOKEN_ENCRYPTION_KEY=...
CRON_SECRET=...
DEV_BYPASS_EMAIL=you@example.com
```

### 3. Cloudflare Access bypass for cron

The cron Worker calls `POST /api/gmail/sync` with `X-Cron-Secret`. Cloudflare Access will block it unless you allow that path:

1. Zero Trust → Access → Applications → Job Tracker → **Policies**
2. Add a **Bypass** policy for path `/api/gmail/sync`  
   (or authenticate the Worker with an Access service token)

The endpoint still requires a matching `CRON_SECRET`; bypass only skips the Access login page.

### 4. Companion cron Worker

Pages Functions cannot schedule themselves. Deploy the Worker under `workers/gmail-cron`:

```bash
cd workers/gmail-cron
npm install
npx wrangler secret put CRON_SECRET   # same value as Pages
npx wrangler deploy
```

It runs every 10 minutes and POSTs `SYNC_URL` (default `https://jobs.leorza.net/api/gmail/sync`). You can still use **Sync Gmail** in the UI at any time.

### Matching rules (fixed)

| Suggested status | Example keywords |
|------------------|------------------|
| Offer | `oferta de emprego`, `job offer`, `proposta` |
| Rejected | `infelizmente`, `unfortunately`, `not moving forward` |
| Interview | `entrevista`, `interview`, `agendar conversa` |
| Applied | `candidatura recebida`, `application received`, `thank you for applying` |

Company name must appear in the message From/Subject/snippet. First keyword hit wins. Duplicate Gmail message IDs are ignored.
