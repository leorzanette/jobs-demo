# jobs-demo

Public portfolio demo for the job tracker UI, with mock data and simulated Gmail flows.

No Cloudflare Access, D1, or Google OAuth is required in this repo.

## Run locally

```bash
npm install
npm run dev
```

Demo state is saved in `sessionStorage` for the current tab.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Cloudflare Pages

This repo includes a manual GitHub Actions workflow:

- `.github/workflows/deploy-demo.yml`

One-time setup:

1. Create a Pages project named `jobs-demo`
2. Add custom domain `jobs-demo.leorza.net`
3. Keep it public (no Cloudflare Access policy)

Then run the workflow from GitHub Actions, or deploy manually:

```bash
npx wrangler pages deploy dist --project-name=jobs-demo
```
