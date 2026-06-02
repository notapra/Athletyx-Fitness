# Athletyx

Premium fitness tracking — **minimal inputs, rich outputs**.

IronLog (React + Vite) is the main workout app: sessions, PRs, analytics, Dynamic Island muscle tracking, and AI coaching. The `athletyx/` folder adds a conversational Python + Next.js shell for future natural-language logging and program generation.

## Database (Supabase / PostgreSQL)

- Migrations: [`supabase/migrations/`](supabase/migrations/) — includes `public.users` with immutable `user_id`
- Local MCP (Cursor): [`.cursor/mcp.json`](.cursor/mcp.json) → `athletyx-postgres-storage` on `localhost:54322`

## Product plans (roadmap & architecture)

All major feature plans are checked into the repo for easy browsing on GitHub:

**[docs/plans/README.md](docs/plans/README.md)** — index of numbered plans (IronLog muscle UI, Athletyx scaffold, Goal Guardian AI).

## Quick start (IronLog)

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Athletyx API + chat UI

See [athletyx/README.md](athletyx/README.md) for backend and frontend setup.

## Stack

- React 19, Vite, Tailwind CSS v4, Framer Motion
- localStorage persistence
- Optional Supabase sync (see [DEPLOYMENT.md](DEPLOYMENT.md))
