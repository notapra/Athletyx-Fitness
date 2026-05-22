import { motion } from 'framer-motion'
import { Dumbbell, Loader2 } from 'lucide-react'

export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-xl"
      >
        <Dumbbell className="h-8 w-8 text-zinc-950" />
      </motion.div>
      <Loader2 className="mb-3 h-6 w-6 animate-spin text-emerald-400" />
      <p className="text-sm font-medium text-zinc-300">{message}</p>
    </div>
  )
}
