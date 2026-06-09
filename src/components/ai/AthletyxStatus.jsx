import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function AthletyxStatus({ label }) {
  if (!label) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex max-w-[88%] items-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
        <span className="text-xs text-cyan-100">{label}</span>
      </div>
    </motion.div>
  )
}
