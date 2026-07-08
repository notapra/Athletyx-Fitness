# Athletyx / IronLog — Product plans

Shipped feature plans (completed work) live here in git. **Future / backlog planning stays local** in [`future/`](./future/) — that folder is **gitignored** and never pushed.

| # | Plan | Status | What it covers |
|---|------|--------|----------------|
| **01** | [IronLog: Dynamic Island + sub-muscle heat map](./01-ironlog-dynamic-island-sub-muscle-heat-map.plan.md) | Completed | `subMuscles.js`, `exerciseSubMuscleMap.js`, `DynamicIsland.jsx`, `AnatomicalBodyMap.jsx`, Home heat map |
| **02** | [Athletyx monorepo scaffold](./02-athletyx-monorepo-scaffold.plan.md) | Completed | `athletyx/tools/`, FastAPI backend, Next.js chat UI |
| **03** | [Goal Guardian supervisor AI](./03-goal-guardian-supervisor-ai.plan.md) | Completed | Goal contract, drift detection, capped reminders, Supabase tables |

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

Completed plans (**01–03**) stay in **`docs/plans/`** on GitHub. Future planning uses the gitignored folders above.
