# Athletyx

Premium fitness tracking — **minimal inputs, rich outputs**.

IronLog (React + Vite) is the main workout app: sessions, PRs, analytics, Dynamic Island muscle tracking, and AI coaching. The `athletyx/` folder adds a conversational Python + Next.js shell for future natural-language logging and program generation.

## AI architecture 

See **[docs/ai-engineer-interview.md](docs/ai-engineer-interview.md)** — file map for IronCoach, Goal Guardian, LangChain agent, and tools.

**MCP (app-store spec):** **[docs/athletyx-mcp-app-store-spec.md](docs/athletyx-mcp-app-store-spec.md)** — tools, resources, prompts for `athletyx.mcp/`.

## Database (Supabase / PostgreSQL)

- Migrations: [`supabase/migrations/`](supabase/migrations/) — includes `public.users` with immutable `user_id`
- Local MCP (Cursor): [`.cursor/mcp.json`](.cursor/mcp.json) → `athletyx-postgres-storage` on `localhost:54322`

## Product plans (roadmap & architecture)

All major feature plans are checked into the repo for easy browsing on GitHub:

**[docs/plans/README.md](docs/plans/README.md)** — index of numbered plans (IronLog muscle UI, Athletyx scaffold, Goal Guardian AI).

## Quick start (IronLog)

```bash
npm install
cp PRIVATE.env.example PRIVATE.env   # add SerpAPI + OpenAI keys (gitignored)
npm run dev:api                      # terminal 1 — Athletyx RAG + web search API
npm run dev                          # terminal 2 — IronLog UI
```

Open http://localhost:5173 — IronCoach uses Athletyx when the API is running.

**Secrets:** see [SECRETS.md](SECRETS.md). Keys live in `PRIVATE.env` only — never committed.

## Athletyx API + chat UI

See [athletyx/README.md](athletyx/README.md) for backend and frontend setup.

## Stack

- React 19, Vite, Tailwind CSS v4, Framer Motion
- localStorage persistence
- Optional Supabase sync (see [DEPLOYMENT.md](DEPLOYMENT.md))
