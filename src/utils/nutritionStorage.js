const FOODS_KEY = 'gymtracker_food_catalog_v1'
const LOGS_KEY = 'gymtracker_nutrition_logs_v1'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    console.warn(`GymTracker: could not persist ${key}`)
  }
}

export function loadFoodCatalog() {
  const data = read(FOODS_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveFoodCatalog(foods) {
  write(FOODS_KEY, foods)
}

export function loadNutritionLogs() {
  const data = read(LOGS_KEY, [])
  return Array.isArray(data) ? data : []
}

export function saveNutritionLogs(logs) {
  write(LOGS_KEY, logs)
}

export function clearNutritionStorage() {
  localStorage.removeItem(FOODS_KEY)
  localStorage.removeItem(LOGS_KEY)
}
