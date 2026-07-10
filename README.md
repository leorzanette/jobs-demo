# jobs-demo

Public portfolio demo for the job tracker UI, with mock data and simulated Gmail flows.

No Cloudflare Access, D1, or Google OAuth is required for the **demo** deployment.

## Run locally

```bash
npm install
npm run dev
```

Demo state is saved in `sessionStorage` for the current tab.

To exercise Pages Functions locally (requires D1 + `.dev.vars`):

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars, then:
npm run pages:dev
```

## Build

```bash
npm run build        # demo bundle (default for Pages)
npm run build:prod   # live API client (calls /api/*)
npm run preview
```

---

## Deploy to Cloudflare Pages

This app is a **Vite + React** static site. The `functions/` directory adds optional API routes for a full production deployment.

### Option A — Git integration (recommended)

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository (`leorzanette/jobs-demo`).
3. Use these build settings:

| Setting | Demo (portfolio) | Production (live API) |
|---------|------------------|------------------------|
| **Production branch** | `master` | `master` |
| **Build command** | `npm run build` | `npm run build:prod` |
| **Build output directory** | `dist` | `dist` |
| **Root directory** | `/` | `/` |
| **Node.js version** | `20` (or use `.node-version`) |

4. Click **Save and Deploy**.

5. *(Optional)* Add a custom domain under **Custom domains** (e.g. `jobs-demo.leorza.net`).

**Demo deploy** needs no environment variables — the UI uses in-browser mock data.

**Production deploy** also requires the steps in [Production API setup](#production-api-setup) below.

### Option B — Wrangler CLI

```bash
npm install
npx wrangler login

# Demo
npm run pages:deploy

# Production frontend (still needs D1 + secrets for /api to work)
npm run pages:deploy:prod
```

### Option C — GitHub Actions

The repo includes `.github/workflows/deploy-demo.yml` (manual trigger).

One-time secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → **Edit Cloudflare Workers** template (Pages + Workers permissions) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar |

Then run **Actions → Deploy jobs-demo.leorza.net → Run workflow**.

---

## Production API setup

Only needed if you deploy with `build:prod` and want real `/api/*` routes (D1, Gmail, Access).

### 1. Create and bind D1

```bash
npx wrangler d1 create jobs-demo
```

Copy the `database_id` into `wrangler.toml` (uncomment the `[[d1_databases]]` block), then apply migrations:

```bash
npm run d1:migrate
```

### 2. Set Pages secrets

```bash
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=jobs-demo
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=jobs-demo
npx wrangler pages secret put TOKEN_ENCRYPTION_KEY --project-name=jobs-demo
npx wrangler pages secret put CRON_SECRET --project-name=jobs-demo
# Optional Cloudflare Access
npx wrangler pages secret put ACCESS_AUD --project-name=jobs-demo
```

Set `GMAIL_REDIRECT_URI` as a plain variable in the Pages dashboard, e.g. `https://your-domain.example/api/gmail/oauth/callback`.

See `.dev.vars.example` for the full list.

### 3. Deploy the Gmail cron worker (optional)

```bash
cd workers/gmail-cron
npm install
npx wrangler deploy
```

Update `SYNC_URL` in `workers/gmail-cron/wrangler.toml` to your Pages domain.

---

## Project layout

| Path | Purpose |
|------|---------|
| `src/` | React UI |
| `functions/` | Pages Functions (`/api/*`) |
| `migrations/` | D1 SQL migrations |
| `workers/gmail-cron/` | Scheduled Gmail sync worker |
| `wrangler.toml` | Pages build output + D1 bindings |
| `dist/` | Build output (generated) |
