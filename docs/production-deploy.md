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
   - `supabase/migrations/20260709120000_mcp_audit_log.sql`
   - `supabase/migrations/20260717120000_nutrition_tracker.sql`
3. Run `supabase/staging-setup.sql` to verify RLS (all listed tables must show `rls_enabled = true`).
4. Auth → URL config: add `http://localhost:5173` + your Vercel preview URL.
5. Deploy purge function (Step 4) before App Store review.

CLI alternative (linked project):

```bash
supabase login
supabase link --project-ref <staging-ref>
# Paste each migration file into SQL Editor if db push is not configured,
# or use: supabase db push  (when migration history matches)
```

## Step 2 — Athletyx Coach API (Railway staging)

1. Connect repo; use root `railway.toml` (Dockerfile builds from repo root).
2. Copy `PRIVATE.env.staging.example` → Railway env vars:

```
OPENAI_API_KEY=
SERPAPI_API_KEY=
SERPAPI_ENABLED=false
USDA_FDC_API_KEY=

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...

REQUIRE_AUTH=true
CORS_ORIGINS=http://localhost:5173,https://your-staging.vercel.app,capacitor://localhost,https://localhost

COACH_RATE_LIMIT_PER_HOUR=30
COACH_CACHE_ENABLED=true
MCP_RATE_LIMIT_PER_HOUR=120
```

3. Deploy; verify `GET https://<api>/health`:
   - `"status": "ok"`
   - `"auth_required": "true"`
   - `"features"` includes `nutrition` (and `usda_fdc` when USDA key is set)

4. Optional smoke script:

```bash
node scripts/staging-smoke.mjs https://<api>
```

## Step 3 — IronLog frontend (Vercel staging)

Copy `.env.staging.example` into Vercel Preview env (`vercel.json` included for SPA routing):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ATHLETYX_API_URL=https://<staging-api>/api/coach
# Optional
# VITE_SENTRY_DSN=
```

Staging smoke (signed-in user):

- [ ] Forced login on first open
- [ ] Finish workout → appears after refresh / second device
- [ ] Nutrition → import or manual food → log grams → daily totals update
- [ ] IronCoach returns content; repeat question hits cache when enabled
- [ ] Settings → MCP access loads domain config
- [ ] Settings → export JSON / request account deletion
- [ ] Offline → sync bar shows queued ops; reconnect drains queue

## Step 4 — Account deletion (App Store)

Deploy edge function:

```bash
supabase functions deploy purge-deleted-accounts --no-verify-jwt
```

Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Schedule daily POST to the function URL.

## Step 5 — Capacitor mobile

See [`capacitor-mobile.md`](capacitor-mobile.md) and record results in [`mobile-smoke-record.md`](mobile-smoke-record.md).

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

## Step 6 — Release builds (GitHub)

Tag `v*` triggers `.github/workflows/release.yml`:

1. Lint + test + build web `dist/`
2. Upload `ironlog-web-dist` artifact (set repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ATHLETYX_API_URL`, optional `VITE_SENTRY_DSN`)

For native store builds, download the artifact or build locally:

```bash
npm run build:mobile
```

Then archive in Xcode / Android Studio as in Step 5.

## Step 7 — CI required checks (GitHub)

Workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

Required status checks on `main` (Settings → Branches → Branch protection):

| Check job | Covers |
|-----------|--------|
| `frontend` | lint + build |
| `backend` | pytest (API + MCP unit tests) |
| `e2e` | Playwright |

Keep [`.github/workflows/release.yml`](../.github/workflows/release.yml) tag-only so PRs never deploy.

Apply via UI or:

```bash
gh api repos/{owner}/{repo}/branches/main/protection -X PUT --input scripts/branch-protection-main.json
```

## Rollback triggers and procedure

### When to roll back

- Auth broken for >5% of sessions (login loops, 401 storms)
- Data loss or cross-user bleed in sync/nutrition
- API 5xx rate >2% for 15 minutes
- Critical security issue in a release

### Frontend (Vercel)

1. Vercel → Deployments → promote previous healthy Production/Preview deployment.
2. Or redeploy last known-good git SHA: `vercel --prod` from that commit.
3. Confirm `VITE_*` env still points at the intended API.

### API (Railway)

1. Railway → Deployments → redeploy previous successful deployment.
2. Confirm env: `REQUIRE_AUTH=true`, Supabase keys, CORS origins.
3. Hit `/health` and one authenticated `/api/coach` call.

### Database

- Prefer forward-fix migrations; do not drop nutrition/MCP tables without a backup.
- Point-in-time recovery via Supabase dashboard if corruption is confirmed.
- Account purge cron: pause the scheduled invoke if mass-delete misfires.

### Incident capture template

Use [`incident-template.md`](incident-template.md) for every Sev-1/Sev-2 event.
