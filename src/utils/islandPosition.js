const STORAGE_KEY = 'ironlog_island_position_v1'

export function getDefaultIslandPosition() {
  if (typeof window === 'undefined') return { x: 16, y: 12 }
  const width = Math.min(512, window.innerWidth - 32)
  return {
    x: Math.max(16, (window.innerWidth - width) / 2),
    y: 12,
  }
}

export function loadIslandPosition() {
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

export function saveIslandPosition(pos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch {
    /* storage full */
  }
}
