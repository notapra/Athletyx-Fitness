import { ChevronLeft } from 'lucide-react'
import { LEGAL_DOCUMENTS } from '../../content/legalDocuments.js'

export default function LegalDocument({ docKey, onBack }) {
  const doc = LEGAL_DOCUMENTS[docKey]
  if (!doc) return null

  return (
    <div className="space-y-4 px-4 pt-6 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 text-zinc-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-white">{doc.title}</h1>
      </header>
      <article className="whitespace-pre-wrap rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm leading-relaxed text-zinc-300">
        {doc.body}
      </article>
    </div>
  )
}
