import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, X, Timer } from 'lucide-react'

export default function RestTimer({ timer }) {
  const {
    PRESETS,
    secondsLeft,
    isRunning,
    isVisible,
    progress,
    start,
    pause,
    resume,
    dismiss,
  } = timer

  const circumference = 2 * Math.PI * 28
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm"
        >
          <div className="glass-card flex items-center gap-4 rounded-3xl p-4 shadow-2xl ring-1 ring-emerald-500/20">
            <div className="relative h-16 w-16 shrink-0">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgb(39 39 42)" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="url(#restGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />
                <defs>
                  <linearGradient id="restGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-white">
                {secondsLeft}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-emerald-400" />
                <p className="text-sm font-semibold text-white">Rest timer</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => start(sec)}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition active:scale-95 hover:border-emerald-500/40"
                  >
                    {sec < 120 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={isRunning ? pause : resume}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300"
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-700 text-zinc-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
