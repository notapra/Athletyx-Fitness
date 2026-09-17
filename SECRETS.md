# API keys & secrets (public repo)

**Never commit real API keys.** This repo is public-safe when you follow this layout.

## Your private file (gitignored)

```bash
cp PRIVATE.env.example PRIVATE.env
cp .env.example .env
```

| File | Committed? | Purpose |
|------|------------|---------|
| `PRIVATE.env.example` | Yes | Template with empty placeholders |
| `PRIVATE.env` | **No** | OpenAI, SerpAPI, Gemini, Supabase server keys |
| `PRIVATE.SECRETS.md` | **No** | Optional local vault of live keys (gitignored) |
| `.env.example` | Yes | Vite public config template |
| `.env` / `.env.local` | **No** | Supabase anon key, API URL, Sentry DSN |
| `athletyx.mcp/.env` | **No** | MCP Postgres + optional JWT |

## Environment matrix

| Variable | Where | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | Frontend `.env` | Public anon client |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env` | Public anon client |
| `VITE_ATHLETYX_API_URL` | Frontend `.env` | Hosted coach endpoint |
| `VITE_SENTRY_DSN` | Frontend `.env` | Optional error tracking |
| `OPENAI_API_KEY` | `PRIVATE.env` | Athletyx backend only |
| `GEMINI_API_KEY` | `PRIVATE.env` | Live Form Vision + Gemini Live WS (Google AI Studio) |
| `GEMINI_VISION_MODEL` | `PRIVATE.env` | Optional REST model; default `gemini-2.0-flash` |
| `GEMINI_LIVE_MODEL` | `PRIVATE.env` | Optional Live WS model; default `gemini-2.0-flash-live-001` |
| `FORM_VISION_RATE_LIMIT_PER_HOUR` | `PRIVATE.env` | Default 180 (motion gate is primary cost control) |
| `SERPAPI_API_KEY` | `PRIVATE.env` | DuckDuckGo/Google via SerpAPI (Athletyx + MCP) |
| `SERPAPI_ENABLED` | `PRIVATE.env` | Must be `true` to allow coach web search |
| `SUPABASE_URL` | `PRIVATE.env` | JWT validation on API |
| `SUPABASE_ANON_KEY` | `PRIVATE.env` | JWT validation on API |
| `REQUIRE_AUTH` | `PRIVATE.env` | `true` in production |
| `CORS_ORIGINS` | `PRIVATE.env` | Comma-separated allowed origins |
| `COACH_CACHE_MAX_ENTRIES` | `PRIVATE.env` | Default 500 |
| `COACH_CACHE_ENABLED` | `PRIVATE.env` | Set `false` to disable server cache |
| `MCP_REQUIRE_AUTH` | `athletyx.mcp/.env` | Post-v1 MCP JWT gate |
| `ATHLETYX_MCP_JWT` | Agent env | Supabase access token for MCP |

## Local secrets vault

For a personal copy of live keys (never committed), create `PRIVATE.SECRETS.md` next to `PRIVATE.env`.
That filename is gitignored. Prefer putting values in `PRIVATE.env` so the API can load them.

DuckDuckGo coach search: set `SERPAPI_API_KEY` + `SERPAPI_ENABLED=true`, then restart the Athletyx API.

## What loads secrets

- **Athletyx Coach API** (`athletyx/backend/`) → `PRIVATE.env` at repo root
- **MCP server** (`athletyx.mcp/`) → `athletyx.mcp/.env` + optional `ATHLETYX_MCP_JWT`

## Browser rule

Only `VITE_*` variables are visible in the React app. **Do not** put `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `SERPAPI_API_KEY` in `VITE_*`.

## Staging vs production

Use separate Supabase projects and Railway/Vercel environments. GitHub Actions uses placeholder env vars for build-only checks.

## If a key leaks

Rotate at [OpenAI](https://platform.openai.com/) / [Google AI Studio](https://aistudio.google.com/apikey) / [SerpAPI](https://serpapi.com/) / Supabase dashboard and update `PRIVATE.env` only.
