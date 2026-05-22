import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const ICONS = {
  positive: CheckCircle,
  warning: AlertTriangle,
  caution: Info,
  default: TrendingUp,
}

const STYLES = {
  positive: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-100',
  warning: 'border-amber-500/25 bg-amber-500/8 text-amber-100',
  caution: 'border-cyan-500/25 bg-cyan-500/8 text-cyan-100',
  default: 'border-zinc-700 bg-zinc-900/60 text-zinc-200',
}

export default function InsightCard({ message, severity = 'default', action, delay = 0 }) {
  const Icon = ICONS[severity] ?? ICONS.default
  const style = STYLES[severity] ?? STYLES.default

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.06, duration: 0.35 }}
      className={`rounded-2xl border p-4 ${style}`}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed">{message}</p>
          {action ? (
            <span className="mt-2 inline-block rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
              {action}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
