/**
 * Nutrition math smoke tests — run: node scripts/test-nutrition.mjs
 */
import {
  scaleNutrients,
  sumNutrients,
  dailyTotals,
  normalizeNutrients,
} from '../src/utils/nutrients.js'

let failed = 0

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`)
    failed += 1
  } else {
    console.log(`✓ ${msg}`)
  }
}

const per100 = normalizeNutrients({
  calories_kcal: 200,
  protein_g: 20,
  carbs_g: 10,
  fat_g: 8,
})

const scaled = scaleNutrients(per100, 150)
assert(scaled.calories_kcal === 300, '150g scales calories to 300')
assert(scaled.protein_g === 30, '150g scales protein to 30g')

const total = sumNutrients([scaled, scaleNutrients(per100, 50)])
assert(total.calories_kcal === 400, 'sum of 150g + 50g = 400 kcal')

const foods = {
  f1: { id: 'f1', nutrients_per_100g: per100 },
}
const logs = [
  { id: '1', food_id: 'f1', grams: 100, date: '2026-07-17' },
  { id: '2', food_id: 'f1', grams: 50, date: '2026-07-17' },
]
const day = dailyTotals(logs, foods, '2026-07-17')
assert(day.calories_kcal === 300, 'daily total 100g + 50g = 300 kcal')

if (failed > 0) {
  process.exit(1)
}
console.log('All nutrition tests passed')
