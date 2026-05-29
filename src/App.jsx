import { useCallback, useState } from 'react'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { useApp } from './hooks/useApp.js'
import AppShell from './components/layout/AppShell.jsx'
import ActiveWorkout from './components/workout/ActiveWorkout.jsx'
import DynamicIsland from './components/workout/DynamicIsland.jsx'
import SessionSummaryModal from './components/workout/SessionSummaryModal.jsx'
import { useRestTimer } from './hooks/useRestTimer.js'
import { getSessionSummary } from './utils/insights.js'
import { sessionHasValidSets } from './utils/session.js'
import Home from './pages/Home.jsx'
import Workouts from './pages/Workouts.jsx'
import Analytics from './pages/Analytics.jsx'
import AITrainer from './pages/AITrainer.jsx'
import Profile from './pages/Profile.jsx'

function AppContent() {
  const {
    activeTab,
    setActiveTab,
    workoutMode,
    activeSession,
    setActiveSession,
    startWorkout,
    finishWorkout,
    cancelWorkout,
    sessions,
    setSessionSummary,
    sessionSummary,
    sessionGuardianNote,
    setSessionGuardianNote,
  } = useApp()

  const restTimer = useRestTimer()
  const [showSummary, setShowSummary] = useState(false)

  const handleStartWorkout = useCallback(() => {
    startWorkout('Upper')
  }, [startWorkout])

  const handleFinish = useCallback(
    (session) => {
      if (!sessionHasValidSets(session)) return
      const ok = finishWorkout(session)
      if (ok) {
        const summary = getSessionSummary(session, [...sessions, session])
        setSessionSummary(summary)
        setShowSummary(true)
      }
    },
    [finishWorkout, sessions, setSessionSummary]
  )

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onStartWorkout={handleStartWorkout} />
      case 'workouts':
        return <Workouts onStartWorkout={handleStartWorkout} />
      case 'analytics':
        return <Analytics />
      case 'ai-trainer':
        return <AITrainer />
      case 'profile':
        return <Profile />
      default:
        return <Home onStartWorkout={handleStartWorkout} />
    }
  }

  if (workoutMode && activeSession) {
    return (
      <>
        <DynamicIsland />
        <ActiveWorkout
          session={activeSession}
          onUpdate={setActiveSession}
          onFinish={handleFinish}
          onCancel={cancelWorkout}
          restTimer={restTimer}
        />
        <SessionSummaryModal
          open={showSummary}
          summary={sessionSummary}
          guardianNote={sessionGuardianNote}
          onClose={() => {
            setShowSummary(false)
            setSessionSummary(null)
            setSessionGuardianNote(null)
            setActiveTab('home')
          }}
        />
      </>
    )
  }

  return (
    <>
      <AppShell activeTab={activeTab} onTabChange={setActiveTab} showIsland>
        {renderPage()}
      </AppShell>
      <SessionSummaryModal
        open={showSummary && !workoutMode}
        summary={sessionSummary}
        guardianNote={sessionGuardianNote}
        onClose={() => {
          setShowSummary(false)
          setSessionSummary(null)
          setSessionGuardianNote(null)
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  )
}
