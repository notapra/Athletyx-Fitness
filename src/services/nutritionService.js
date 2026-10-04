/**
 * Nutrition — built-in catalog (offline) + optional USDA fallback.
 */

import { getAthletyxApiPath } from './athletyxService.js'
import { getCommonFoodById, searchCommonFoods } from '../utils/commonFoodSearch.js'
import { normalizeNutrients } from '../utils/nutrients.js'
import { createId } from '../utils/session.js'

/** Search local built-in foods — instant, no network. */
export function searchFoodsLocal(query, limit = 12) {
  const results = searchCommonFoods(query, limit)
  return {
    results: results.map((food) => ({
      catalog_id: food.id,
      name: food.name,
      category: food.category,
      source: 'builtin',
      nutrients_per_100g: food.nutrients_per_100g,
    })),
    source: 'builtin',
  }
}

/** Optional remote search (built-in on server first, then USDA if configured). */
export async function searchFoodsApi(query) {
  const local = searchFoodsLocal(query)
  if (local.results.length > 0) return local

  const res = await fetch(`${getAthletyxApiPath('nutrition/search')}?q=${encodeURIComponent(query)}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Search failed (${res.status})`)
  }
  return res.json()
}

export function foodFromBuiltinCatalog(catalogId) {
  const entry = getCommonFoodById(catalogId)
  if (!entry) throw new Error('Food not found in built-in catalog')
  return {
    id: `common-${entry.id}`,
    catalog_id: entry.id,
    fdc_id: null,
    name: entry.name,
    brand: '',
    category: entry.category,
    source: 'builtin',
    nutrients_per_100g: normalizeNutrients(entry.nutrients_per_100g),
    created_at: new Date().toISOString(),
  }
}

export async function fetchFoodFromApi(fdcId) {
  const res = await fetch(getAthletyxApiPath(`nutrition/food/${fdcId}`))
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Food lookup failed (${res.status})`)
  }
  const data = await res.json()
  return normalizeFoodFromApi(data)
}

export function normalizeFoodFromApi(data, clientId = null) {
  return {
    id: clientId || createId(),
    catalog_id: data.catalog_id ?? null,
    fdc_id: data.fdc_id ?? null,
    name: data.name || 'Unknown food',
    brand: data.brand || '',
    category: data.category ?? '',
    source: data.source || 'usda',
    nutrients_per_100g: normalizeNutrients(data.nutrients_per_100g),
    created_at: data.created_at || new Date().toISOString(),
  }
}

export function createManualFood({ name, brand = '', nutrients_per_100g }) {
  return {
    id: createId(),
    catalog_id: null,
    fdc_id: null,
    name: name.trim(),
    brand: brand.trim(),
    source: 'manual',
    nutrients_per_100g: normalizeNutrients(nutrients_per_100g),
    created_at: new Date().toISOString(),
  }
}

export function createLogEntry({ foodId, grams, meal = 'snack', date }) {
  const g = Number(grams)
  if (!Number.isFinite(g) || g <= 0) {
    throw new Error('Grams must be a positive number')
  }
  const loggedAt = new Date()
  const dateKey = date || loggedAt.toISOString().slice(0, 10)
  return {
    id: createId(),
    food_id: foodId,
    grams: g,
    meal,
    date: dateKey,
    logged_at: loggedAt.toISOString(),
  }
}
