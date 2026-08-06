import { useState } from 'react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginPage({ onSwitchToSignUp }) {
  const { signIn, authError, setAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setAuthError(null)
    try {
      await signIn(email.trim(), password)
    } catch {
      /* authError set in context */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to sync IronLog across devices">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <AuthInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-center text-xs text-zinc-500">
          No account?{' '}
          <button type="button" onClick={onSwitchToSignUp} className="text-cyan-400 underline">
            Create one
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}
