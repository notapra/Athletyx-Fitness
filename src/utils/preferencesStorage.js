/**
 * Capacitor Preferences with localStorage fallback for web dev.
 */

let Preferences = null

async function getPreferencesModule() {
  if (Preferences !== undefined) return Preferences
  try {
    const mod = await import('@capacitor/preferences')
    Preferences = mod.Preferences
  } catch {
    Preferences = null
  }
  return Preferences
}

export async function prefGet(key) {
  const P = await getPreferencesModule()
  if (P) {
    const { value } = await P.get({ key })
    return value
  }
  return localStorage.getItem(key)
}

export async function prefSet(key, value) {
  const P = await getPreferencesModule()
  if (P) {
    await P.set({ key, value })
    return
  }
  localStorage.setItem(key, value)
}

export async function prefRemove(key) {
  const P = await getPreferencesModule()
  if (P) {
    await P.remove({ key })
    return
  }
  localStorage.removeItem(key)
}
