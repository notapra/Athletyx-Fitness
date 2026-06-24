
# Production deployment guide

## Environments

| Env | Frontend | Coach API | Supabase |
|-----|----------|-----------|----------|
| dev | localhost:5173 | localhost:8000 | dev project |
| staging | Vercel preview | Railway staging | staging project |
| prod | Capacitor + Vercel | Railway prod | prod project |

## Athletyx Coach API (Railway example)

1. Connect repo, set root to `athletyx/` or run from repo root with `uvicorn athletyx.backend.main:app`.
2. Set environment variables (never commit):

```
OPENAI_API_KEY=
SERPAPI_API_KEY=
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
REQUIRE_AUTH=true
CORS_ORIGINS=https://your-app.vercel.app,capacitor://localhost,https://localhost
COACH_RATE_LIMIT_PER_HOUR=30
```

3. Health: `GET /health`

## IronLog frontend (Vercel)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ATHLETYX_API_URL=https://your-api.railway.app/api/coach
```

## Capacitor builds

```bash
npm run build
npx cap sync
npx cap open ios   # macOS + Xcode
npx cap open android
```

## Supabase migrations

Run all files in `supabase/migrations/` in SQL Editor or via Supabase CLI.
