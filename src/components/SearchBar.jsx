import { WORKOUT_SPLITS } from '../data/exercises.js'

export default function SearchBar({ query, onQueryChange, split, onSplitChange }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search exercises (e.g. bench, RDL, pull-up)…"
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 py-3 pl-10 pr-4 text-sm text-zinc-100 shadow-inner shadow-black/30 placeholder:text-zinc-600 transition-all duration-300 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
        />
      </div>

      <div className="flex items-center gap-2 md:w-64">
        <label className="sr-only" htmlFor="split-filter">
          Filter by split
        </label>
        <select
          id="split-filter"
          value={split}
          onChange={(e) => onSplitChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900/80 py-3 pl-4 pr-10 text-sm font-medium text-zinc-100 shadow-inner shadow-black/30 transition-all duration-300 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
        >
          <option value="all">All splits</option>
          {WORKOUT_SPLITS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="pointer-events-none relative -ml-9 text-zinc-500">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  )
}
