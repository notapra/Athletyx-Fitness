# API keys & secrets (public repo)

**Never commit real API keys.** This repo is public-safe when you follow this layout.

## Your private file (gitignored)

```bash
cp PRIVATE.env.example PRIVATE.env
# Edit PRIVATE.env — only exists on your machine
```

| File | Committed? | Purpose |
|------|------------|---------|
| `PRIVATE.env.example` | Yes | Template with empty placeholders |
| `PRIVATE.env` | **No** | Your real OpenAI + SerpAPI keys |
| `athletyx.mcp/.env` | **No** | MCP server / Postgres (optional duplicate of SerpAPI key) |
| `.env.local` | **No** | Vite public config only (Supabase URL, etc.) |

## What loads secrets

- **IronLog + Athletyx backend** (`athletyx/backend/`) → `PRIVATE.env` at repo root
- **MCP server** (`athletyx.mcp/`) → `athletyx.mcp/.env`

## Browser rule

Only variables prefixed with `VITE_` are visible in the React app. **Do not** put
`OPENAI_API_KEY` or `SERPAPI_API_KEY` in `VITE_*` — keep them in `PRIVATE.env` on the backend.

## If a key leaks

Rotate at [OpenAI](https://platform.openai.com/) / [SerpAPI](https://serpapi.com/) and update `PRIVATE.env` only.
