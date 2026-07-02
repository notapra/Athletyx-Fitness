
# Production & staging deployment

## Environments

| Env | Frontend | Coach API | Supabase |
|-----|----------|-----------|----------|
| dev | localhost:5173 | localhost:8000 | dev project |
| staging | Vercel preview | Railway staging | staging project |
| prod | Capacitor + Vercel | Railway prod | prod project |

## Step 1 — Supabase (staging)

1. Create a **staging** Supabase project.
2. SQL Editor → run in order:
   - `supabase/schema.sql`
   - `supabase/migrations/20260609120000_profile_age_and_consents.sql`
   - `supabase/migrations/20260613120000_coach_query_cache.sql`
3. Run `supabase/staging-setup.sql` to verify RLS.
4. Auth → URL config: add `http://localhost:5173` + your Vercel preview URL.

## Step 2 — Athletyx Coach API (Railway staging)

1. Connect repo; use root `railway.toml` (Dockerfile builds from repo root).
2. Copy `PRIVATE.env.staging.example` → Railway env vars:

```
OPENAI_API_KEY=
SERPAPI_API_KEY=
SERPAPI_ENABLED=false

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

REQUIRE_AUTH=true
CORS_ORIGINS=http://localhost:5173,https://your-staging.vercel.app,capacitor://localhost,https://localhost

COACH_RATE_LIMIT_PER_HOUR=30
COACH_CACHE_ENABLED=true
```

3. Deploy; verify `GET https://<api>/health`:
   - `"web_search_available": false`
   - `"auth_required": "true"`

## Step 3 — IronLog frontend (Vercel staging)

Copy `.env.staging.example` into Vercel Preview env (`vercel.json` included for SPA routing):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ATHLETYX_API_URL=https://<staging-api>/api/coach
```

## Step 4 — Account deletion (App Store)

Deploy edge function:

```bash
supabase functions deploy purge-deleted-accounts --no-verify-jwt
```

Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Schedule daily POST to the function URL.

## Step 5 — Capacitor mobile

See [`capacitor-mobile.md`](capacitor-mobile.md).

```bash
npm run build:mobile
npx cap open android
npx cap open ios
```

## Coach answer caching (API efficiency)

Answers are stored at three layers (all implemented in code):

| Layer | Storage | When |
|-------|---------|------|
| Client | IndexedDB (`coachCache.js`) | Every coach response |
| Server | `athletyx/backend/.cache/` | Every `/api/coach` response |
| Cloud | `coach_query_cache` table | Signed-in users |

Repeat questions skip OpenAI/SerpAPI calls when cache hits.
