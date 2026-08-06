# Personalization Guide

Athletyx coaches must account for each user's **personal factors** before recommending
training, searching documents, or citing external research.

## Required profile fields

| Field | Purpose |
|-------|---------|
| `age` | Scale volume, recovery, and joint stress |
| `max_effort_level` | conservative (RPE 6–7), moderate (7–8), aggressive (8–9) |
| `injury_history` | Past injuries that may flare with certain patterns |
| `movement_restrictions` | Movements to avoid or modify |
| `recovery_capacity` | slow / average / fast between hard sessions |
| `medical_clearance` | Whether user confirmed physician OK for exercise |
| `notes` | Free-text context (e.g. "upper body only this week") |

## Agent workflow

1. Call `get_personalization_context` or `get_goal_contract` before coaching.
2. Use `search_documents_with_context` for in-app policies, exercise catalog, safety rails.
3. Use `search_web_duckduckgo` for external research (SerpAPI + DuckDuckGo).
4. Never prescribe restricted movements. Downgrade intensity when `max_effort_level` is conservative.
5. For users without `medical_clearance`, recommend physician consult before intense work.

## Injury-safe defaults

- Beginners and users 50+: start conservative regardless of stated goal.
- Active injury history: substitute aggravating lifts; prefer machines and controlled ROM.
- Knee issues: limit deep flexion; prefer box squats, leg press, RDL over heavy back squat.
- Shoulder issues: limit overhead pressing; prefer landmine press, neutral-grip rows.

## Search personalization

Document and web searches append the user's goal, age, injuries, and restrictions
so results favor safe, relevant guidance for that individual.
