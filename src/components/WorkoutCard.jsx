  import { formatLongDate } from '../utils/date.js'

const splitStyles = {
  Push: 'from-rose-500/15 to-fuchsia-500/10 text-rose-100 border-rose-500/25',
  Pull: 'from-sky-500/15 to-indigo-500/10 text-sky-100 border-sky-500/25',
  Legs: 'from-amber-500/15 to-orange-500/10 text-amber-100 border-amber-500/25',
  Upper: 'from-emerald-500/15 to-teal-500/10 text-emerald-100 border-emerald-500/25',
  Lower: 'from-lime-500/15 to-emerald-500/10 text-lime-100 border-lime-500/25',
  'Full Body': 'from-violet-500/15 to-cyan-500/10 text-violet-100 border-violet-500/25',
}

function splitClass(split) {
  return splitStyles[split] ?? 'from-zinc-500/10 to-zinc-600/10 text-zinc-200 border-zinc-600/30'
}

export default function WorkoutCard({ workout, onDelete, onEdit, styleDelay = 0 }) {
  const gradient = splitClass(workout.split)

  const volume =
    (Number(workout.weight) || 0) *
    (Number(workout.reps) || 0) *
    (Number(workout.sets) || 0)

  return (
    <article
      style={{ animationDelay: `${styleDelay}ms` }}
      className="animate-fade-up group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/55 shadow-xl shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-zinc-700 hover:shadow-2xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-emerald-500/[0.04]" />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
              {workout.exercise}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border bg-gradient-to-r px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${gradient}`}
            >
              {workout.split}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">{formatLongDate(workout.date)}</p>

          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm sm:max-w-md">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Weight</dt>
              <dd className="mt-1 font-semibold tabular-nums text-white">{workout.weight} lbs</dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Reps</dt>
              <dd className="mt-1 font-semibold tabular-nums text-white">{workout.reps}</dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Sets</dt>
              <dd className="mt-1 font-semibold tabular-nums text-white">{workout.sets}</dd>
            </div>
          </dl>

          <p className="mt-3 text-xs text-zinc-500">
            Session volume:{' '}
            <span className="font-semibold text-zinc-300 tabular-nums">
              {volume.toLocaleString()} lbs
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          <button
            type="button"
            onClick={() => onEdit(workout)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-xs font-semibold text-zinc-100 transition-all duration-300 hover:border-emerald-500/55 hover:bg-zinc-900 sm:flex-none"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(workout.id)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-all duration-300 hover:border-red-400/60 hover:bg-red-500/20 sm:flex-none"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
