# Athletyx

Premium fitness assistant — **minimal inputs, rich outputs**. Sibling to IronLog in this monorepo.

## Structure

```
athletyx/
├── tools/           # LLM-callable tools + schemas
├── backend/         # FastAPI + simulated tool router
└── frontend/        # Next.js chat UI
```

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend

```bash
cd athletyx
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Health check: http://127.0.0.1:8000/health

### Example API calls

```bash
curl -X POST http://127.0.0.1:8000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"hit bench 225 for 8, 8, 6\"}"

curl -X POST http://127.0.0.1:8000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\": \"hypertrophy push workout\"}"
```

## Frontend

```bash
cd athletyx/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

## Production build

```bash
cd athletyx/frontend
npm run build
```

Deploy frontend (Vercel) and backend (Railway, Fly.io, etc.) separately. Set `NEXT_PUBLIC_API_URL` to your API origin.

## Tools registry

- `generate_workout_routine(fitness_goal, target_split)` — markdown programs
- `parse_raw_workout_log(raw_text)` — structured log confirmation

Schemas are exported in `tools/__init__.py` as `ALL_ATHLETYX_TOOLS` for future LLM function calling.
