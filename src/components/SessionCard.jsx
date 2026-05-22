import { motion } from 'framer-motion'
import { ChevronRight, Trash2 } from 'lucide-react'
import { formatLongDate } from '../utils/date.js'
import { getSessionVolume, getSessionSetCount, getSessionExerciseCount } from '../utils/session.js'

const splitStyles = {
  Push: 'bg-rose-500/15 text-rose-200 ring-rose-500/30',
  Pull: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
  Legs: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  Upper: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
  Lower: 'bg-lime-500/15 text-lime-200 ring-lime-500/30',
  'Full Body': 'bg-violet-500/15 text-violet-200 ring-violet-500/30',
}

export default function SessionCard({ session, onDelete, onClick, delay = 0 }) {
  const volume = getSessionVolume(session)
  const sets = getSessionSetCount(session)
  const exercises = getSessionExerciseCount(session)
  const splitClass = splitStyles[session.split] ?? 'bg-zinc-800 text-zinc-200 ring-zinc-700'
  const topExercises = (session.exercises ?? [])
    .slice(0, 3)
    .map((e) => e.exercise)
    .filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.04 }}
      className="group rounded-3xl border border-zinc-800 bg-zinc-900/60 shadow-xl transition hover:border-zinc-700"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${splitClass}`}>
              {session.split}
            </span>
            <span className="text-xs text-zinc-500">{formatLongDate(session.date)}</span>
          </div>
          <p className="mt-2 truncate text-base font-semibold text-white">
            {topExercises.length ? topExercises.join(' · ') : 'Workout session'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {exercises} exercises · {sets} sets · {volume.toLocaleString()} lbs
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
      </button>
      {onDelete ? (
        <div className="border-t border-zinc-800/80 px-4 pb-3">
          <button
            type="button"
            onClick={() => onDelete(session.id)}
            className="flex items-center gap-1 text-xs font-semibold text-red-400/80 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ) : null}
    </motion.div>
  )
}
