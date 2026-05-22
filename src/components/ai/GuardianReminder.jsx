import { motion, AnimatePresence } from 'framer-motion'
import { Shield, X } from 'lucide-react'

export default function GuardianReminder({ reminder, onDismiss }) {
  return (
    <AnimatePresence>
      {reminder ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/20"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
              Goal Guardian
            </p>
            <p className="mt-0.5 text-sm text-zinc-200">{reminder.message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
