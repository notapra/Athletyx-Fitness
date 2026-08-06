import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { useApp } from '../../hooks/useApp.js'
import { useSyncStatus } from '../../hooks/useSyncStatus.js'

export default function SyncStatusBar() {
  const { online, cloudEnabled } = useApp()
  const { pendingCount, syncing, showBar } = useSyncStatus(online, cloudEnabled)

  if (!showBar) return null

  const offline = !online
  const label = offline
    ? pendingCount > 0
      ? `Offline · ${pendingCount} change${pendingCount === 1 ? '' : 's'} queued`
      : 'Offline — changes saved locally'
    : syncing
      ? 'Syncing…'
      : `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending`

  return (
    <div
      role="status"
      className={`safe-top fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-semibold ${
        offline
          ? 'bg-amber-500/15 text-amber-200'
          : 'bg-emerald-500/10 text-emerald-200'
      }`}
    >
      {offline ? (
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : syncing ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Cloud className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span>{label}</span>
    </div>
  )
}
