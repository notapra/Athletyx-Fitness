/**
 * IndexedDB offline sync queue — survives Capacitor WebView better than localStorage.
 */

const DB_NAME = 'ironlog_sync_v1'
const STORE = 'queue'
const DB_VERSION = 1

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ironlog:sync-queue-changed'))
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function enqueueSyncOp(op) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).add({
      ...op,
      createdAt: new Date().toISOString(),
    })
    tx.oncomplete = () => {
      notifyQueueChanged()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSyncQueueCount() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => resolve(req.result ?? 0)
    req.onerror = () => reject(req.error)
  })
}

export async function drainSyncQueue(processor) {
  const db = await openDb()
  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })

  for (const item of items) {
    await processor(item)
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(item.id)
      tx.oncomplete = () => {
        notifyQueueChanged()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }
}

export async function clearSyncQueue() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => {
      notifyQueueChanged()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}
