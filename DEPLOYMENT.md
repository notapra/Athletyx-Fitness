# IronLog — Deployment Guide

## Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- [Vercel](https://vercel.com) account (optional, for hosting)

## 1. Supabase setup

1. Create a new Supabase project.
2. Open **SQL Editor** and run the entire contents of `supabase/schema.sql`.
3. Enable **Realtime** for these tables (Database → Replication):
   - `workout_sessions`
   - `bodyweight_logs`
   - `goals`
   - `ai_chat_history`
4. Under **Authentication → URL Configuration**, add your site URL:
   - Local: `http://localhost:5173`
   - Production: `https://your-app.vercel.app`
5. Copy **Project URL** and **anon public key** from Settings → API.

## 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

Restart the dev server after changing `.env`.

## 3. Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 4. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

Set the same URLs in Supabase Auth redirect allowlist.

## 5. Data migration

On first login, the app automatically uploads existing `localStorage` workouts, bodyweight, and goals to Supabase. Duplicates are prevented via `client_id` unique constraints.

## 6. Security

- Row Level Security (RLS) ensures users only access their own rows.
- Never commit `.env` or expose the **service role** key in the frontend.
- Only the **anon** key belongs in `VITE_SUPABASE_ANON_KEY`.

## 7. Optional: OpenAI

To connect live LLM responses, set `VITE_OPENAI_API_KEY` and pass `useApi: true` in `sendChatMessage()` inside `src/services/aiService.js`.
