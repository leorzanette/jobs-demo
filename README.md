# Job Application Tracker

Track job applications through a pipeline: Wishlist, Applied, Interview, Offer, Rejected, and Withdrawn.

Data is stored in **Cloudflare D1** and syncs across all your devices. Access is protected by **Cloudflare Access** (Google / email PIN login).

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

Already applied via D1 console? No action needed. Otherwise run `migrations/0001_init.sql` in the D1 SQL console.
