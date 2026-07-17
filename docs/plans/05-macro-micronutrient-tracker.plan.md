---
name: Macro and Micronutrient Tracker
overview: Accurate gram-based nutrition logging with USDA API first lookup, local catalog reuse, and Supabase sync for macros and micronutrients.
todos:
  - id: schema-sync
    content: food_items + nutrition_log_entries schema, localStorage, Supabase sync
    status: completed
  - id: usda-api
    content: USDA FDC backend search/detail normalized per 100g
    status: completed
  - id: nutrition-ui
    content: Nutrition tab with search, manual entry, gram logging, daily totals
    status: completed
  - id: proof-tests
    content: pytest nutrition_service + node nutrition math tests + API smoke
    status: completed
isProject: false
---

# Stage 05 — Macro & micronutrient tracker

## Accuracy model

- **Catalog values are per 100 g** (USDA standard).
- **Logged amount** = `nutrient_per_100g × (grams / 100)`.
- Stored floats are full precision; UI rounds for display only.

## Data flow

1. **First time**: search USDA → import → save to `food_catalog` (local + Supabase).
2. **Future**: pick from saved catalog — no API call needed.
3. **Log entry**: user enters **grams** → entry saved → cloud sync when online.

## Tables

| Table | Purpose |
|-------|---------|
| `food_items` | User food catalog (`nutrients_per_100g` JSONB) |
| `nutrition_log_entries` | Daily logs (`grams`, `meal`, `log_date`) |

## API

- `GET /api/nutrition/search?q=`
- `GET /api/nutrition/food/{fdc_id}`

Set `USDA_FDC_API_KEY` in `PRIVATE.env` (free at https://fdc.nal.usda.gov/api-key-form.html).

## Verification

```bash
npm run test          # pytest + nutrition math
npm run test:api      # smoke incl. nutrition routes (API on :8000)
npm run lint && npm run build
```

Apply migration: `supabase/migrations/20260717120000_nutrition_tracker.sql`
