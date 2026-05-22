export default function Navbar({ streak }) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6 md:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/90 to-cyan-500/70 shadow-lg shadow-emerald-500/20 ring-1 ring-white/15">
            <svg
              className="h-7 w-7 text-zinc-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 14l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 4h16" strokeLinecap="round" />
              <path d="M7 21h10" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400/85">
              Strength · Hypertrophy
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              IronLog
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              Log every set, chase progressive overload, and keep PRs vivid — all stored locally on this device.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 self-start sm:self-auto">
          <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-400/15 via-emerald-500/5 to-transparent px-4 py-3 shadow-inner shadow-black/40">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/90">
              Current streak
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-white">{streak}</p>
            <p className="text-xs text-emerald-200/70">training days · rolling</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById('log-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-xs font-semibold text-zinc-100 shadow-xl transition-all duration-300 hover:border-emerald-500/55 hover:bg-zinc-800/75 hover:shadow-emerald-500/10 lg:inline-flex"
          >
            Log set
          </button>
        </div>
      </div>
    </header>
  )
}
