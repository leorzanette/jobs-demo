# Job Application Tracker

Track job applications through a pipeline: Wishlist, Applied, Interview, Offer, Rejected, and Withdrawn.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to jobs.leorza.net (Cloudflare Pages)

### 1. Push to GitHub

Create a **private** repo on GitHub, then:

```bash
git add .
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Initial job application tracker"
git remote add origin https://github.com/YOUR_USERNAME/job-application-tracker.git
git push -u origin main
```

### 2. Connect Cloudflare Pages

1. Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git
2. Select your repo
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
4. Deploy and verify the `*.pages.dev` URL

### 3. Custom domain

1. Pages project -> Custom domains -> Set up a custom domain
2. Enter `jobs.leorza.net`
3. Cloudflare creates the DNS record automatically (leorza.net is already on Cloudflare)

### 4. Cloudflare Access (login gate)

1. Cloudflare Zero Trust -> Access -> Applications -> Add application -> Self-hosted
2. Application domain: `jobs.leorza.net`
3. Add a policy: Allow your email address
4. Set up an identity provider (email OTP, Google, or GitHub)

## Data storage

Applications are stored in your browser localStorage. Data is per browser/device and does not sync across devices.
