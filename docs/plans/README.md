# Athletyx / IronLog — Product plans

Cursor implementation plans for major features in this repo. Each file is a **numbered, human-readable** copy of the original Cursor plan (YAML frontmatter + markdown body).

| # | Plan | Status | What it covers |
|---|------|--------|----------------|
| **01** | [IronLog: Dynamic Island + sub-muscle heat map](./01-ironlog-dynamic-island-sub-muscle-heat-map.plan.md) | Completed | `subMuscles.js`, `exerciseSubMuscleMap.js`, `DynamicIsland.jsx`, `AnatomicalBodyMap.jsx`, Home heat map |
| **02** | [Athletyx monorepo scaffold](./02-athletyx-monorepo-scaffold.plan.md) | Completed | `athletyx/tools/`, FastAPI backend, Next.js chat UI |
| **03** | [Goal Guardian supervisor AI](./03-goal-guardian-supervisor-ai.plan.md) | Completed | Goal contract, drift detection, capped reminders, Supabase tables |

## How to read these files

- **Frontmatter** (`---` block at top): plan name, overview, and todo checklist with `completed` status.
- **Body**: architecture diagrams (mermaid), file lists, verification steps, and out-of-scope notes.

## Source IDs (Cursor)

| Repo file | Original Cursor plan id |
|-----------|-------------------------|
| `01-...plan.md` | `ironlog_muscle_ui_45dcfc8b` |
| `02-...plan.md` | `athletyx_monorepo_scaffold_80489b4c` |
| `03-...plan.md` | `goal_guardian_ai_3865e245` |

Plans live in-repo under **`docs/plans/`** so they are visible on GitHub without opening the local `.cursor/plans` folder.
