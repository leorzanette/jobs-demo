# Job Application Tracker

Track job applications through a pipeline: Wishlist, Applied, Interview, Offer, Rejected, and Withdrawn.

Data is stored in **Cloudflare D1** and syncs across all your devices. Access is protected by **Cloudflare Access** (Google / email PIN login).

Live at: https://jobs.leorza.net

## Local development (UI only)

```bash
npm install
npm run dev
```

API calls will fail locally unless you use the full stack command below.

## Local development (UI + API + D1)

1. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.toml` with your D1 database ID (Cloudflare dashboard -> D1 -> job-tracker-db -> Database ID).
2. Optionally set `DEV_BYPASS_EMAIL` in `wrangler.toml` for local auth bypass.
3. Run:

```bash
npm run pages:dev
```

## Cloudflare Pages environment variables

In your Pages project -> Settings -> Environment variables (Production):

| Variable | Value |
|----------|--------|
| `NODE_VERSION` | `20` |
| `ACCESS_TEAM_DOMAIN` | `leorzanet.cloudflareaccess.com` |
| `ACCESS_AUD` | Your Access Application AUD tag (Zero Trust -> Access -> Applications -> Job Tracker -> Overview) |

Also bind D1: Settings -> Bindings -> D1 -> variable name `DB` -> database `job-tracker-db`.

## Deploy

Push to GitHub — Cloudflare Pages auto-deploys:

```bash
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Add D1 cloud sync"
git push
```

After deploy, the build log should show functions detected at `/functions`.

## Database

Schema is in `migrations/0001_init.sql`. If you already ran it in the D1 console, no further action needed.