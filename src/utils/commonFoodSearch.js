/**
 * Local built-in food catalog search — no API calls.
 */

import catalog from '../../data/common-foods.json' with { type: 'json' }
import { normalizeNutrients } from './nutrients.js'

const FOODS = catalog.map((item) => ({
  ...item,
  nutrients_per_100g: normalizeNutrients(item.nutrients_per_100g),
}))

const BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]))

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function scoreFood(food, queryTokens) {
  const haystack = [food.name, ...(food.aliases ?? []), food.category]
    .join(' ')
    .toLowerCase()
  const words = tokenize(haystack)
  let score = 0
  for (const token of queryTokens) {
    if (haystack === token) score += 100
    if (haystack.startsWith(token)) score += 40
    if (words.some((w) => w === token)) score += 30
    if (haystack.includes(token)) score += 15
  }
  return score
}

/** @param {string} query */
export function searchCommonFoods(query, limit = 12) {
  const q = query.trim()
  if (!q) return []
  const tokens = tokenize(q)
  return FOODS.map((food) => ({ food, score: scoreFood(food, tokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((row) => row.food)
}

/** @param {'protein'|'carb'|'fat'} category */
export function listCommonFoodsByCategory(category) {
  return FOODS.filter((f) => f.category === category)
}

export function getCommonFoodById(id) {
  return BY_ID[id] ?? null
}

export function getCommonFoodCatalog() {
  return FOODS
}
