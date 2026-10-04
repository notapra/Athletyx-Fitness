import { useState } from 'react'
import { Shield, Sparkles, FileText } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { updateConsents } from '../../services/syncService.js'

export default function ComplianceOnboarding({ onComplete }) {
  const { userId } = useAuth()
  const [acceptedHealth, setAcceptedHealth] = useState(false)
  const [acceptedAi, setAcceptedAi] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleContinue() {
    setSubmitting(true)
    try {
      if (userId) {
        await updateConsents(userId, {
          ai_coaching: acceptedAi,
          analytics: false,
          notifications: false,
        })
      }
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh bg-zinc-950 px-4 py-8 safe-top safe-bottom">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Before you train</h1>
          <p className="mt-2 text-sm text-zinc-400">IronLog + Athletyx — required disclosures</p>
        </div>

        <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-200">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Health disclaimer</h2>
          </div>
          <p className="text-xs leading-relaxed text-zinc-300">
            IronLog is not a medical device and does not provide medical advice, diagnosis, or
            treatment. Consult a physician before starting or changing an exercise program. Stop
            exercising if you feel pain, dizziness, or shortness of breath.
          </p>
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-200">
            <input
              type="checkbox"
              checked={acceptedHealth}
              onChange={(e) => setAcceptedHealth(e.target.checked)}
              className="rounded accent-amber-500"
            />
            I understand this is general fitness information, not medical advice
          </label>
        </section>

        <section className="rounded-3xl border border-violet-500/25 bg-violet-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-violet-200">
            <Sparkles className="h-4 w-4" />
            <h2 className="text-sm font-semibold">AI coaching (Athletyx)</h2>
          </div>
          <p className="text-xs leading-relaxed text-zinc-300">
            IronCoach uses Athletyx AI with your workout data, personal factors (age, injuries),
            and optional web research (DuckDuckGo via SerpAPI). AI outputs may be inaccurate. You
            can disable AI coaching in Settings.
          </p>
          <label className="mt-3 flex items-center gap-2 text-xs text-zinc-200">
            <input
              type="checkbox"
              checked={acceptedAi}
              onChange={(e) => setAcceptedAi(e.target.checked)}
              className="rounded accent-violet-500"
            />
            I consent to AI coaching with my fitness data
          </label>
        </section>

        <section className="rounded-2xl border border-zinc-800 p-4 text-xs text-zinc-500">
          <FileText className="mb-2 h-4 w-4 text-zinc-400" />
          <p>
            Privacy policy:{' '}
            <a
              href="https://athletyx.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline"
            >
              athletyx.com/privacy
            </a>
            . Terms:{' '}
            <a
              href="https://athletyx.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline"
            >
              athletyx.com/terms
            </a>
            .
          </p>
        </section>

        <button
          type="button"
          disabled={!acceptedHealth || !acceptedAi || submitting}
          onClick={handleContinue}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-zinc-950 disabled:opacity-40"
        >
          {submitting ? 'Saving…' : 'Continue to IronLog'}
        </button>
      </div>
    </div>
  )
}
