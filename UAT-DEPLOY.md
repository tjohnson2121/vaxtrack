# Shareable link for pharmacist UAT

The app uses **SQLite** (`data/vaxtrack.db`). Use a host with a **persistent disk** or a **tunnel** to your machine — not plain Vercel serverless (no durable SQLite).

## Option A — Railway (recommended)

1. Push this repo to GitHub.
2. [Railway](https://railway.app/) → **New project** → **GitHub repo** → select it.
3. Set **Root directory** to **`vaxtrack`** (monorepo case).
4. Railway should build from the **`Dockerfile`**. Deploy once.
5. **Volumes** → Add volume → mount path **`/app/data`** (must match this path).
6. **Variables** (optional):
   - Omit **`ADMIN_TOKEN`** for UAT so APIs stay open, or set a secret if you want admin-only APIs.
   - **`ANTHROPIC_API_KEY`** only if you use server-side rule extraction on that host.
7. **Settings → Networking → Generate domain** → share that **HTTPS** URL with the pharmacist.

**First run:** The Docker entrypoint copies `vaxtrack.seed.db` (schema only) into the volume if `vaxtrack.db` is missing.

## Option B — Same-day link (your laptop)

Good for a quick session without deploying.

```bash
cd vaxtrack
npm run build && npm start
```

In another terminal (install [ngrok](https://ngrok.com/) or use [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)):

```bash
ngrok http 3000
```

Share the **https://….ngrok-free.app** URL. Keep your machine awake and the server running.

## After schema changes

Regenerate the seed database and commit it so new deploys get the right tables:

```bash
cd vaxtrack
npm run db:push
cp data/vaxtrack.db data/vaxtrack.seed.db
```

## Coverage check for UAT

The **Coverage check** route is public (no admin token). **`/sources`** redirects home in this build; APIs still exist if you need them with a token.
