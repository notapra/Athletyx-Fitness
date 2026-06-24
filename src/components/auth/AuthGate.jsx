import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import LoginPage from '../../pages/Login.jsx'
import SignUpPage from '../../pages/SignUp.jsx'
import ComplianceOnboarding from '../compliance/ComplianceOnboarding.jsx'

const ONBOARDING_KEY = 'ironlog_compliance_accepted_v1'

export default function AuthGate({ children }) {
  const { isConfigured, isAuthenticated, loading, migrating } = useAuth()
  const [mode, setMode] = useState('login')
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem(ONBOARDING_KEY) === 'true'
  )

  if (!isConfigured) return children

  if (loading || migrating) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-400">
        {migrating ? 'Syncing your workouts to the cloud…' : 'Loading…'}
      </div>
    )
  }

  if (!isAuthenticated) {
    return mode === 'login' ? (
      <LoginPage onSwitchToSignUp={() => setMode('signup')} />
    ) : (
      <SignUpPage onSwitchToLogin={() => setMode('login')} />
    )
  }

  if (!onboardingDone) {
    return (
      <ComplianceOnboarding
        onComplete={() => {
          localStorage.setItem(ONBOARDING_KEY, 'true')
          setOnboardingDone(true)
        }}
      />
    )
  }

  return children
}
