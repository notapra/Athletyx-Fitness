import { useState } from 'react'
import AuthLayout from '../components/auth/AuthLayout.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'
import { useAuth } from '../hooks/useAuth.js'

export default function SignUpPage({ onSwitchToLogin }) {
  const { signUp, authError, setAuthError } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setAuthError(null)
    try {
      await signUp(email.trim(), password, username.trim())
      setDone(true)
    } catch {
      /* authError set in context */
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle="Confirm your account, then sign in">
        <p className="text-sm text-zinc-300">
          We sent a confirmation link to <strong>{email}</strong>. Your local workouts will upload
          on first sign-in.
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="mt-4 w-full rounded-2xl bg-emerald-500/20 py-3 text-sm font-semibold text-emerald-300"
        >
          Back to sign in
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create account" subtitle="Powered by Athletyx · cloud sync included">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput label="Display name" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
        <AuthInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <AuthInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {authError ? <p className="text-sm text-red-400">{authError}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3 text-sm font-bold text-zinc-950 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="text-cyan-400 underline">
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}
