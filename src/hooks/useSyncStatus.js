import { useCallback, useEffect, useState } from 'react'
import { getSyncQueueCount } from '../services/offlineQueue.js'

export function useSyncStatus(online, cloudEnabled) {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    if (!cloudEnabled) {
      setPendingCount(0)
      return
    }
    try {
      setPendingCount(await getSyncQueueCount())
    } catch {
      setPendingCount(0)
    }
  }, [cloudEnabled])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!cloudEnabled) {
        if (!cancelled) setPendingCount(0)
        return
      }
      try {
        const count = await getSyncQueueCount()
        if (!cancelled) setPendingCount(count)
      } catch {
        if (!cancelled) setPendingCount(0)
      }
    }

    function onQueueChange() {
      refresh()
    }
    function onSyncStart() {
      setSyncing(true)
    }
    function onSyncEnd() {
      setSyncing(false)
      refresh()
    }

    load()
    window.addEventListener('ironlog:sync-queue-changed', onQueueChange)
    window.addEventListener('ironlog:sync-start', onSyncStart)
    window.addEventListener('ironlog:sync-end', onSyncEnd)
    return () => {
      cancelled = true
      window.removeEventListener('ironlog:sync-queue-changed', onQueueChange)
      window.removeEventListener('ironlog:sync-start', onSyncStart)
      window.removeEventListener('ironlog:sync-end', onSyncEnd)
    }
  }, [cloudEnabled, refresh])

  return {
    online,
    pendingCount,
    syncing,
    showBar: cloudEnabled && (!online || pendingCount > 0 || syncing),
  }
}
