# AI engineer interview — code map

Quick index of AI-related files (each has header comments explaining architecture).

## Two coaching stacks

| Stack | Where | Pattern |
|-------|--------|---------|
| **IronLog IronCoach** | `src/services/aiService.js` | Offline feature store → prompt → keyword or OpenAI → Guardian judge |
| **Athletyx agent** | `athletyx/frontend/services/langchainService.ts` | LangChain ReAct + `query_science_database` tool + gpt-4o-mini |
| **Athletyx router (Phase 1)** | `athletyx/backend/agent.py` | Rule-based tool routing (no LLM) |

## IronLog pipeline (read in order)

1. `src/utils/aiAnalysis.js` — `runFullAnalysis()` feature assembly  
2. `src/utils/goalContract.js` — structured user intent  
3. `src/utils/aiPrompts.js` — system prompt / context engineering  
4. `src/services/aiService.js` — generation + optional API  
5. `src/utils/guardianAnalysis.js` — drift scoring heuristics  
6. `src/services/guardianService.js` — post-response guardrails + reminders  
7. `src/components/ai/AITrainerChat.jsx` — UI integration  

## Athletyx pipeline

1. `athletyx/tools/__init__.py` — tool schemas + mapper  
2. `athletyx/tools/log_parser.py` / `workout_generator.py` — tool implementations  
3. `athletyx/backend/agent.py` — router (swap for LLM later)  
4. `athletyx/frontend/services/langchainService.ts` — ReAct agent + RAG placeholder  
5. `athletyx/frontend/app/api/agent/route.ts` — secure API boundary  

## Data / ops

- `supabase/migrations/20260529120000_create_users_table.sql` — identity for future chat/embeddings  
- `.cursor/mcp.json` — Postgres MCP for schema inspection  

## 60-second pitch

"We use **deterministic analytics** as context for coaching, **prompt contracts** for alignment, **heuristic supervisors** for cheap guardrails, and a **LangChain ReAct agent** with a retrieval tool for science-backed answers. Tool schemas are ready for full LLM function-calling on the Python side."
