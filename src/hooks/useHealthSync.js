import { useEffect } from 'react'
import { getHealthSyncPreferences, importWorkoutsFromHealth } from '../services/healthSync.js'

export function useHealthSync() {
  useEffect(() => {
    async function onForeground() {
      const prefs = getHealthSyncPreferences()
      if (!prefs.enabled) return
      try {
        await importWorkoutsFromHealth()
      } catch (e) {
        console.warn('Health import failed', e)
      }
    }

    window.addEventListener('ironlog:foreground', onForeground)
    return () => window.removeEventListener('ironlog:foreground', onForeground)
  }, [])
}
