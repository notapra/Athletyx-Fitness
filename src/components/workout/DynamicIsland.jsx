import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Sparkles, X } from 'lucide-react'
import { useMuscleAnalytics } from '../../hooks/useMuscleAnalytics.js'

const spring = { type: 'spring', stiffness: 380, damping: 32 }

export default function DynamicIsland() {
  const [expanded, setExpanded] = useState(false)
  const { islandSummary, coachInsight, regionGrid, imbalances } = useMuscleAnalytics({
    days: 30,
  })

  const close = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!expanded) return undefined
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded, close])

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.button
            type="button"
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            aria-label="Close muscle dashboard"
            onClick={close}
          />
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <motion.div
          layout
          transition={spring}
          className="pointer-events-auto w-full max-w-lg"
        >
          <motion.div
            layout
            transition={spring}
            className={`overflow-hidden border border-zinc-800/80 bg-zinc-950/92 shadow-2xl shadow-black/50 backdrop-blur-xl ${
              expanded ? 'rounded-3xl' : 'rounded-full'
            }`}
          >
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
              aria-expanded={expanded}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-xs font-semibold text-zinc-100">
                  {islandSummary.label}
                </span>
                <div className="flex flex-wrap gap-1">
                  {islandSummary.dots.map((d) => (
                    <span
                      key={d.group}
                      title={d.group}
                      className="h-2 w-2 rounded-full ring-1 ring-white/10"
                      style={{ backgroundColor: d.color }}
                    />
                  ))}
                </div>
              </div>
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={spring}
                className="shrink-0 text-zinc-500"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="border-t border-zinc-800/80"
                >
                  <div className="max-h-[min(70vh,520px)] overflow-y-auto px-4 pb-4">
                    <div className="flex items-start justify-between gap-2 pt-3">
                      <div className="flex items-center gap-2 text-emerald-400/90">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest">
                          AI Trainer
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={close}
                        className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                        aria-label="Minimize"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{coachInsight}</p>

                    {imbalances.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {imbalances.map((w) => (
                          <li
                            key={w.id}
                            className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90"
                          >
                            {w.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-4 space-y-4">
                      {regionGrid.map(({ region, items }) => (
                        <div key={region}>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                            {region}
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {items.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-2.5 py-2"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="truncate text-[11px] font-medium text-zinc-200">
                                    {m.label}
                                  </p>
                                  <p className="text-[9px] text-zinc-500">
                                    {m.sets} sets · {m.volume > 0 ? `${Math.round(m.volume).toLocaleString()} lbs` : '—'}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                                  style={{
                                    backgroundColor: `${m.color}22`,
                                    color: m.color,
                                    border: `1px solid ${m.color}44`,
                                  }}
                                >
                                  {m.tierLabel}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={close}
                      className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-200 hover:border-zinc-600"
                    >
                      Minimize
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
