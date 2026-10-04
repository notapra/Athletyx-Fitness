import { BookOpen, ExternalLink } from 'lucide-react'

export default function AthletyxCitations({ citations = [] }) {
  if (!citations.length) return null

  const docs = citations.filter((c) => c.type === 'document')
  const web = citations.filter((c) => c.type === 'web')

  return (
    <div className="mt-2 max-w-[88%] space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/90">
        Athletyx sources
      </p>
      {docs.length > 0 ? (
        <ul className="space-y-1.5">
          {docs.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-[11px] text-zinc-300"
            >
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-cyan-100">{c.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-zinc-400">{c.snippet}</p>
                  <p className="mt-1 text-[9px] text-zinc-500">{c.source ?? 'Athletyx RAG'}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {web.length > 0 ? (
        <ul className="space-y-1.5">
          {web.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2 text-[11px] text-zinc-300"
            >
              <div className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                <div className="min-w-0">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-violet-200 underline decoration-violet-500/40 underline-offset-2 hover:text-white"
                    >
                      {c.title}
                    </a>
                  ) : (
                    <p className="font-semibold text-violet-200">{c.title}</p>
                  )}
                  {c.snippet ? (
                    <p className="mt-0.5 line-clamp-2 text-zinc-400">{c.snippet}</p>
                  ) : null}
                  <p className="mt-1 text-[9px] text-zinc-500">{c.source ?? 'DuckDuckGo'}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
