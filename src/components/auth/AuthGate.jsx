import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import LoginPage from '../../pages/Login.jsx'
import SignUpPage from '../../pages/SignUp.jsx'
import ComplianceOnboarding from '../compliance/ComplianceOnboarding.jsx'

const ONBOARDING_KEY_PREFIX = 'ironlog_compliance_accepted_v1:'

export default function AuthGate({ children }) {
  const { isConfigured, isAuthenticated, loading, migrating, userId } = useAuth()
  const onboardingKey = `${ONBOARDING_KEY_PREFIX}${userId ?? 'anonymous'}`
  const [mode, setMode] = useState('login')
  const [, bumpOnboardingRefresh] = useState(0)
  const onboardingDone = localStorage.getItem(onboardingKey) === 'true'

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
          localStorage.setItem(onboardingKey, 'true')
          bumpOnboardingRefresh((v) => v + 1)
        }}
      />
    )
  }

  return children
}
