export default function EmptyState({ onAction }) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/60 p-10 text-center shadow-inner shadow-black/40 sm:p-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%)]" />

      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/30 to-cyan-500/20 text-emerald-200 ring-1 ring-white/10">
          <svg
            className="h-9 w-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden
          >
            <path d="M12 3v4M12 17v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M3 12h4M17 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Your training log is a blank barbell
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Log your first working set. Small, consistent entries compound into massive strength — and this
          dashboard will surface PRs, volume, and history automatically.
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-emerald-500/35 active:scale-[0.99]"
        >
          Start logging
        </button>
      </div>
    </div>
  )
}
