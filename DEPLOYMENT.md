# IronLog — Deployment Guide

## Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- [Vercel](https://vercel.com) account (optional, for web hosting)
- Apple Developer + Google Play accounts (for Capacitor store builds)

## 1. Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor** and run `supabase/schema.sql`, then migrations in `supabase/migrations/`.
3. Enable **Realtime** for: `workout_sessions`, `bodyweight_logs`, `goals`, `ai_chat_history`.
4. Under **Authentication → URL Configuration**, add:
   - Local: `http://localhost:5173`
   - Production web: `https://your-app.vercel.app`
   - Capacitor: `capacitor://localhost`, `https://localhost`
5. Copy **Project URL** and **anon public key** from Settings → API.

## 2. Environment variables

```bash
cp .env.example .env
cp PRIVATE.env.example PRIVATE.env
```

**Frontend (`.env` — safe for Vite, no secrets):**

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_ATHLETYX_API_URL=https://api.yourdomain.com/api/coach
VITE_SENTRY_DSN=          # optional
```

**Backend (`PRIVATE.env` — never commit):**

```
OPENAI_API_KEY=
SERPAPI_API_KEY=
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
REQUIRE_AUTH=true
CORS_ORIGINS=http://localhost:5173,capacitor://localhost,https://localhost,https://your-app.vercel.app
```

Restart dev servers after changing env files.

## 3. Local development

```bash
npm install
npm run dev          # IronLog on :5173
npm run dev:api      # Athletyx API on :8000 (loads PRIVATE.env)
```

Without `VITE_SUPABASE_*`, the app runs **local-only** (no login gate).

## 4. Deploy web (Vercel)

1. Push to GitHub; import in Vercel.
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ATHLETYX_API_URL`.
3. Deploy and add the URL to Supabase Auth allowlist.

## 5. Deploy Coach API

See [`docs/production-deploy.md`](docs/production-deploy.md) and `athletyx/railway.toml`.

Health check: `GET /health`. Production requires `REQUIRE_AUTH=true` and Supabase JWT on `POST /api/coach`.

## 6. Capacitor mobile builds

```bash
npm run build:mobile
npx cap open ios       # macOS + Xcode → TestFlight
npx cap open android   # Android Studio → Internal testing
```

`vite.config.js` uses `base: './'` for Capacitor asset loading.

## 7. Data migration & sync

On first login, existing `localStorage` workouts, bodyweight, goals, and profile upload to Supabase. Duplicates are prevented via `client_id` unique constraints. Offline changes queue in IndexedDB and sync on reconnect / app foreground.

## 8. Security

- Row Level Security (RLS) ensures users only access their own rows.
- Never commit `.env`, `PRIVATE.env`, or the Supabase **service role** key.
- OpenAI and SerpAPI keys stay in `PRIVATE.env` on the **server only** — not in `VITE_*`.

## 9. CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs `npm run lint`, `npm run build`, and `pytest` on push/PR.
