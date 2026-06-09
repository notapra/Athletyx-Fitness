# Secrets & API keys

**Never commit real API keys to the public repo.**

## Local setup

**IronLog + Athletyx backend (recommended):**

```bash
cp PRIVATE.env.example PRIVATE.env
# Edit PRIVATE.env at repo root — SerpAPI + OpenAI keys
```

**MCP server only:**

```bash
cd athletyx.mcp
cp .env.example .env
```

Both `PRIVATE.env` and `athletyx.mcp/.env` are gitignored. Only `*.example` files are tracked.

## SerpAPI

- Endpoint: `https://serpapi.com/search.json`
- Env var: `SERPAPI_API_KEY`
- Optional: `SERPAPI_LOCATION`, `SERPAPI_HL`, `SERPAPI_GL` (for `engine=google`)

Get a key at https://serpapi.com/

## MCP clients (Claude Desktop, Cursor)

Prefer loading from `athletyx.mcp/.env` (the server loads it automatically).

If you must set env in `claude_desktop_config.json`, that file lives **outside** the repo
(`%APPDATA%` or `%LOCALAPPDATA%\Packages\...`) and is not pushed to GitHub.

**Do not** put keys in:

- `claude_desktop_config.example.json`
- `.cursor/mcp.json` if that file is committed
- docs, tests, or upload JSON files

## If a key was exposed

Rotate it immediately in the SerpAPI dashboard and update your local `.env` only.
