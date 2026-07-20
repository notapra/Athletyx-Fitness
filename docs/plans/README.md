# Athletyx / IronLog — Product plans

Shipped feature plans (completed work) live here in git. **Future / backlog planning stays local** in [`future/`](./future/) — that folder is **gitignored** and never pushed.

| # | Plan | Status | What it covers |
|---|------|--------|----------------|
| **01** | [IronLog: Dynamic Island + sub-muscle heat map](./01-ironlog-dynamic-island-sub-muscle-heat-map.plan.md) | Completed | `subMuscles.js`, `exerciseSubMuscleMap.js`, `DynamicIsland.jsx`, `AnatomicalBodyMap.jsx`, Home heat map |
| **02** | [Athletyx monorepo scaffold](./02-athletyx-monorepo-scaffold.plan.md) | Completed | `athletyx/tools/`, FastAPI backend, Next.js chat UI |
| **03** | [Goal Guardian supervisor AI](./03-goal-guardian-supervisor-ai.plan.md) | Completed | Goal contract, drift detection, capped reminders, Supabase tables |
| **04** | [Production launch and operations](./04-production-launch-and-operations.plan.md) | In progress | PR workflow, staging deploy, CI gates, mobile smoke checks, rollback readiness |
| **05** | [Macro & micronutrient tracker](./05-macro-micronutrient-tracker.plan.md) | Completed | Gram-based logging, USDA API + saved catalog, macros/micros, Supabase sync |
| **06** | [MCP Phase 2 app-store tools](./06-mcp-phase2-app-store-tools.plan.md) | Completed | Analytics, Guardian, chat, account export/deletion, HealthKit stubs |

## Future notes (local only)

Add new ideas under **`docs/plans/future/`** — e.g. computer vision form coaching (exercise detection, T-bar row chest rise, bench arch cues). Cursor plans in **`.cursor/plans/`** are also gitignored.

These files are for personal roadmap / agent context on your machine, not the public repo.

## How to read these files

- **Frontmatter** (`---` block at top): plan name, overview, and todo checklist with `completed` status.
- **Body**: architecture diagrams (mermaid), file lists, verification steps, and out-of-scope notes.

## Source IDs (Cursor)

| Repo file | Original Cursor plan id |
|-----------|-------------------------|
| `01-...plan.md` | `ironlog_muscle_ui_45dcfc8b` |
| `02-...plan.md` | `athletyx_monorepo_scaffold_80489b4c` |
| `03-...plan.md` | `goal_guardian_ai_3865e245` |
| `04-...plan.md` | `production_launch_and_ops_stage_04` |
| `05-...plan.md` | `macro_micronutrient_tracker_stage_05` |
| `06-...plan.md` | `mcp_phase2_app_store_tools` |

Plans (**01–06**) stay in **`docs/plans/`** on GitHub (completed or active stage plans). Future/backlog planning uses the gitignored folders above.
