import { motion } from 'framer-motion'
import { Shield, Target } from 'lucide-react'

export default function GoalGuardianCard({ status, contract }) {
  const score = status?.alignmentScore ?? 0
  const circumference = 2 * Math.PI * 36
  const offset = circumference * (1 - score / 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-950 p-4 ring-1 ring-amber-500/15"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgb(39 39 42)" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="url(#guardGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700"
            />
            <defs>
              <linearGradient id="guardGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <Shield className="absolute inset-0 m-auto h-7 w-7 text-amber-300/90" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Goal Guardian</p>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
              {score}% aligned
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">{status?.summary}</p>
          {contract?.primaryGoal ? (
            <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300/80">
              <Target className="h-3 w-3 shrink-0" />
              <span className="truncate">{contract.primaryGoal}</span>
            </p>
          ) : null}
          {status?.driftWarnings > 0 ? (
            <p className="mt-2 text-[10px] text-amber-200/80">
              {status.driftWarnings} drift warning{status.driftWarnings > 1 ? 's' : ''} this session — use
              Refocus in chat
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
