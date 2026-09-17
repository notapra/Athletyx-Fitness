# iPhone staging checklist (Live Vision)

Code is on GitHub branch **LIVE_VISION** (`1baa8aa`). Complete these in the browser (CLI login timed out).

## 1. Railway — Athletyx API

1. Go to https://railway.app → login → **New Project** → **Deploy from GitHub**
2. Select `notapra/Athletyx-Fitness`, branch **`LIVE_VISION`**
3. Root `railway.toml` uses `athletyx/Dockerfile` — leave as-is
4. **Variables** (Settings → Variables):

```
GEMINI_API_KEY=<paste from your local PRIVATE.env>
FORM_VISION_RATE_LIMIT_PER_HOUR=180
REQUIRE_AUTH=false
CORS_ORIGINS=https://*.vercel.app,capacitor://localhost,https://localhost
```

5. **Settings → Networking → Generate Domain** (public HTTPS)
6. Open `https://<your-railway-host>/health`  
   Confirm: `"gemini_available": true` and `"live_form_vision"` in features

## 2. Vercel — IronLog web

1. Go to https://vercel.com → **Add New Project** → import `notapra/Athletyx-Fitness`
2. Branch: **`LIVE_VISION`**
3. Framework: Vite · Build: `npm run build` · Output: `dist`
4. Environment variables:

```
VITE_ATHLETYX_API_URL=https://<your-railway-host>/api/coach
```

(Optional later: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)

5. Deploy → copy the `https://….vercel.app` URL
6. Back on Railway: set `CORS_ORIGINS` to include that **exact** Vercel URL (not only `*.vercel.app` if your Railway plan needs exact origins), then redeploy API

## 3. iPhone Safari test

1. Open the Vercel URL in Safari
2. **Settings** → Form Vision ON → Live Vision ON → **Cloud analysis consent** ON
3. Start workout → expand exercise → **Form** → **Live Vision** → Allow Camera
4. Prop phone ~6–8 ft, side view, full body in frame

## After you have URLs

Reply with your Railway API URL and Vercel URL (no secrets). I can verify `/health` and CORS and help finish the smoke check.
