import { prefGet, prefSet } from './preferencesStorage.js'

const STORAGE_KEY = 'ironlog_island_position_v1'

export function getDefaultIslandPosition() {
  if (typeof window === 'undefined') return { x: 16, y: 12 }
  const width = Math.min(512, window.innerWidth - 32)
  return {
    x: Math.max(16, (window.innerWidth - width) / 2),
    y: 12,
  }
}

export async function loadIslandPosition() {
  try {
    const raw = await prefGet(STORAGE_KEY)
    if (!raw) return getDefaultIslandPosition()
    const parsed = JSON.parse(raw)
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    /* ignore */
  }
  return getDefaultIslandPosition()
}

export function loadIslandPositionSync() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultIslandPosition()
    const parsed = JSON.parse(raw)
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    /* ignore */
  }
  return getDefaultIslandPosition()
}

export async function saveIslandPosition(pos) {
  try {
    const json = JSON.stringify(pos)
    await prefSet(STORAGE_KEY, json)
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    /* storage full */
  }
}
