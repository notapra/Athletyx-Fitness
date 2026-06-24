import { useEffect, useState } from 'react'
import { LOCAL_USER_ID } from '../utils/storage.js'
import { isSupabaseConfigured } from '../services/supabaseClient.js'
import { processSyncQueue, pullFromCloud } from '../services/syncService.js'

export function useNetworkSync(userId) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    async function sync() {
      if (!online || !isSupabaseConfigured || !userId || userId === LOCAL_USER_ID) return
      try {
        await processSyncQueue(userId)
      } catch (e) {
        console.warn('Sync failed', e)
      }
    }

    async function syncPull() {
      if (!online || !isSupabaseConfigured || !userId || userId === LOCAL_USER_ID) return
      try {
        await pullFromCloud(userId)
        window.dispatchEvent(new CustomEvent('ironlog:storage-reload'))
      } catch (e) {
        console.warn('Pull failed', e)
      }
    }

    function onOnline() {
      setOnline(true)
      sync()
    }
    function onOffline() {
      setOnline(false)
    }
    function onForeground() {
      syncPull()
      sync()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('ironlog:foreground', onForeground)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onForeground()
    })
    sync()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('ironlog:foreground', onForeground)
    }
  }, [online, userId])

  return online
}
