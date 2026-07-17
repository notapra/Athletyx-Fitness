/**
 * Nutrition API client — USDA lookup (first time) + local catalog reuse.
 */

import { getAthletyxBaseUrl } from './athletyxService.js'
import { normalizeNutrients } from '../utils/nutrients.js'
import { createId } from '../utils/session.js'

function apiBase() {
  return getAthletyxBaseUrl().replace(/\/$/, '')
}

export async function searchFoodsApi(query) {
  const res = await fetch(`${apiBase()}/nutrition/search?q=${encodeURIComponent(query)}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Search failed (${res.status})`)
  }
  return res.json()
}

export async function fetchFoodFromApi(fdcId) {
  const res = await fetch(`${apiBase()}/nutrition/food/${fdcId}`)
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
    fdc_id: data.fdc_id ?? null,
    name: data.name || 'Unknown food',
    brand: data.brand || '',
    source: data.source || 'usda',
    nutrients_per_100g: normalizeNutrients(data.nutrients_per_100g),
    created_at: data.created_at || new Date().toISOString(),
  }
}

export function createManualFood({ name, brand = '', nutrients_per_100g }) {
  return {
    id: createId(),
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
