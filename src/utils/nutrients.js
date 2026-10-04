/**
 * Macro + micronutrient model — all catalog values are per 100 g for accuracy.
 * Logged amounts scale linearly: nutrient * (grams / 100).
 */

export const NUTRIENT_KEYS = [
  'calories_kcal',
  'protein_g',
  'carbs_g',
  'fat_g',
  'fiber_g',
  'sugar_g',
  'saturated_fat_g',
  'sodium_mg',
  'potassium_mg',
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'zinc_mg',
  'vitamin_a_mcg',
  'vitamin_c_mg',
  'vitamin_d_mcg',
  'vitamin_b12_mcg',
  'folate_mcg',
  'cholesterol_mg',
]

export const NUTRIENT_LABELS = {
  calories_kcal: 'Calories',
  protein_g: 'Protein',
  carbs_g: 'Carbs',
  fat_g: 'Fat',
  fiber_g: 'Fiber',
  sugar_g: 'Sugar',
  saturated_fat_g: 'Saturated fat',
  sodium_mg: 'Sodium',
  potassium_mg: 'Potassium',
  calcium_mg: 'Calcium',
  iron_mg: 'Iron',
  magnesium_mg: 'Magnesium',
  zinc_mg: 'Zinc',
  vitamin_a_mcg: 'Vitamin A',
  vitamin_c_mg: 'Vitamin C',
  vitamin_d_mcg: 'Vitamin D',
  vitamin_b12_mcg: 'Vitamin B12',
  folate_mcg: 'Folate',
  cholesterol_mg: 'Cholesterol',
}

export const MACRO_KEYS = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g']
export const MICRO_KEYS = NUTRIENT_KEYS.filter((k) => !MACRO_KEYS.includes(k))

export function createEmptyNutrients() {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0]))
}

export function normalizeNutrients(raw = {}) {
  const base = createEmptyNutrients()
  for (const key of NUTRIENT_KEYS) {
    const v = Number(raw[key])
    if (Number.isFinite(v) && v >= 0) base[key] = v
  }
  return base
}

/** Scale per-100g nutrients to an actual portion in grams. */
export function scaleNutrients(nutrientsPer100g, grams) {
  const g = Number(grams)
  if (!Number.isFinite(g) || g <= 0) return createEmptyNutrients()
  const factor = g / 100
  const src = normalizeNutrients(nutrientsPer100g)
  const out = createEmptyNutrients()
  for (const key of NUTRIENT_KEYS) {
    out[key] = src[key] * factor
  }
  return out
}

export function sumNutrients(list) {
  const total = createEmptyNutrients()
  for (const item of list) {
    const n = normalizeNutrients(item)
    for (const key of NUTRIENT_KEYS) {
      total[key] += n[key]
    }
  }
  return total
}

/** Display rounding — keeps stored values precise, UI uses these. */
export function formatNutrient(key, value) {
  const v = Number(value)
  if (!Number.isFinite(v)) return '0'
  if (key === 'calories_kcal') return String(Math.round(v))
  if (key.endsWith('_mg') || key.endsWith('_mcg')) return v < 10 ? v.toFixed(1) : String(Math.round(v))
  return v.toFixed(1)
}

export function nutrientsForLogEntry(food, grams) {
  if (!food?.nutrients_per_100g) return createEmptyNutrients()
  return scaleNutrients(food.nutrients_per_100g, grams)
}

export function dailyTotals(logs, foodsById, dateKey) {
  const scaled = logs
    .filter((e) => e.date === dateKey)
    .map((e) => nutrientsForLogEntry(foodsById[e.food_id], e.grams))
  return sumNutrients(scaled)
}

export function toDateKey(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
