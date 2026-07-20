# Staging web + API deploy checklist

Platform CLIs (`railway`, `vercel`) are optional; dashboard deploy works the same.

## Railway (API)

1. New project → Deploy from GitHub → select `Athletyx-Fitness`, branch `dynamic-api-collection-and-macro` (or `main` after merge).
2. Set root / Dockerfile per `railway.toml`.
3. Paste env from `PRIVATE.env.staging.example` (must include `REQUIRE_AUTH=true`, Supabase keys, optional `USDA_FDC_API_KEY`).
4. Deploy → copy public URL.
5. Smoke:

```bash
npm run test:staging -- https://YOUR-API.up.railway.app
```

Expect: health ok, auth_required true, nutrition search 200, coach without JWT → 401.

## Vercel (frontend)

1. Import same GitHub repo; Preview env for PRs / Production for release.
2. Set:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ATHLETYX_API_URL=https://YOUR-API.up.railway.app/api/coach
```

3. Ensure Railway `CORS_ORIGINS` includes the Vercel URL.
4. Open Preview URL → complete signed-in smoke from [`production-deploy.md`](production-deploy.md) Step 3.

## Record

| Item | Value |
|------|-------|
| API URL | Local staging-equivalent: `http://127.0.0.1:8000` (`REQUIRE_AUTH=true`) — Railway URL pending `railway login` |
| staging-smoke result | **PASS** 2026-07-19 — `npm run test:staging -- http://127.0.0.1:8000` (3/3: health+auth_required, nutrition search, coach 401) |
| Frontend URL | Pending Vercel preview (`vercel login` / dashboard import) |
| Auth + sync smoke | Pending signed-in browser pass against Vercel + staging Supabase |
| Nutrition smoke | Local API search shape OK; signed-in grams log pending cloud env |
| Coach smoke | Local unauthenticated coach → 401 as required |

Railway + Vercel cloud deploy is blocked until platform login. Local smoke proves the staging checklist script and `REQUIRE_AUTH` behavior.
