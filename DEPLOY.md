# HustleOS — Deploy to Vercel

## What changed
- SQLite (local file) → **Turso** (hosted SQLite, free tier)
- Express server → **Vercel API Routes** (serverless functions in `/api/`)
- `npm run dev` now runs Vite only (frontend); API routes are handled by Vercel locally via `vercel dev`

---

## Step 1 — Create a Turso database (free, 2 mins)

1. Go to **https://turso.tech** and sign up (free)
2. Install the Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
3. Log in and create your database:
   ```bash
   turso auth login
   turso db create hustleos
   turso db show hustleos          # copy the URL
   turso db tokens create hustleos # copy the token
   ```
4. You now have:
   - `TURSO_DATABASE_URL` = something like `libsql://hustleos-yourname.turso.io`
   - `TURSO_AUTH_TOKEN`   = a long JWT string

---

## Step 2 — Push to GitHub

```bash
cd hustleos
git init
git add .
git commit -m "initial commit"
```

Create a new repo on https://github.com/new (name it `hustleos`, keep it private or public).

```bash
git remote add origin https://github.com/YOUR_USERNAME/hustleos.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Deploy to Vercel

1. Go to **https://vercel.com** → **Add New Project**
2. Import your `hustleos` GitHub repo
3. Vercel will auto-detect the settings from `vercel.json`:
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
4. Before clicking Deploy, go to **Environment Variables** and add:
   ```
   TURSO_DATABASE_URL    =  libsql://hustleos-yourname.turso.io
   TURSO_AUTH_TOKEN      =  your-token-here
   ```
5. Click **Deploy** — done! 🎉

---

## Step 4 — Local development with Vercel Dev (optional)

To run both frontend + API locally (closest to production):

```bash
npm install -g vercel
vercel link          # link to your Vercel project
vercel env pull      # pulls env vars into .env.local
vercel dev           # runs everything on http://localhost:3000
```

Or just run `npm run dev` for frontend-only development (API calls will fail without a backend, but UI work is fine).

---

## File structure

```
hustleos/
├── api/                    ← Vercel serverless functions
│   ├── profile.ts
│   ├── gigs/
│   │   ├── index.ts        ← GET list, POST create
│   │   └── [id].ts         ← GET one, PUT update
│   ├── hired.ts
│   ├── tags.ts
│   ├── analytics.ts
│   ├── contracts/
│   │   └── index.ts        ← all contract operations
│   ├── reviews/
│   │   └── [gigId].ts
│   ├── notifications/
│   │   └── index.ts
│   └── export/
│       └── [type].ts
├── lib/
│   └── db.ts               ← Turso client + schema
├── src/                    ← React frontend (unchanged)
├── vercel.json             ← routing config
└── package.json
```

---

## Turso free tier limits

- 500 databases
- 9GB storage
- 1 billion row reads/month
- More than enough for HustleOS
