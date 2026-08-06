import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import * as authService from '../services/authService.js'
import { loadProfile } from '../utils/storage.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(() => loadProfile())
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [authError, setAuthError] = useState(null)

  const isConfigured = authService.isSupabaseConfigured
  const userId = user?.id ?? authService.LOCAL_USER_ID
  const isAuthenticated = isConfigured ? Boolean(user) : true

  useEffect(() => {
    if (!isConfigured) {
      authService.fetchProfile().then((p) => {
        setProfile(p)
        setLoading(false)
      })
      return undefined
    }

    let mounted = true

    authService.getSession().then(async (session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        setMigrating(true)
        try {
          const p = await authService.onAuthSession(session.user)
          if (mounted) setProfile(p)
        } finally {
          if (mounted) setMigrating(false)
        }
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      if (session?.user) {
        setMigrating(true)
        try {
          const p = await authService.onAuthSession(session.user)
          if (mounted) setProfile(p)
        } finally {
          if (mounted) setMigrating(false)
        }
      } else {
        setProfile(loadProfile())
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [isConfigured])

  const updateProfile = useCallback(
    async (updates) => {
      const updated = await authService.updateProfile(userId, updates)
      setProfile(updated)
      return updated
    },
    [userId]
  )

  const resetLocalData = useCallback(async () => {
    const fresh = await authService.resetAllLocalData()
    setProfile(fresh)
    return fresh
  }, [])

  const signIn = useCallback(async (email, password) => {
    setAuthError(null)
    try {
      const data = await authService.signIn(email, password)
      return data
    } catch (e) {
      setAuthError(e.message)
      throw e
    }
  }, [])

  const signUp = useCallback(async (email, password, username) => {
    setAuthError(null)
    try {
      const data = await authService.signUp(email, password, username)
      return data
    } catch (e) {
      setAuthError(e.message)
      throw e
    }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    setUser(null)
    setProfile(loadProfile())
  }, [])

  const resetPassword = useCallback(async (email) => {
    setAuthError(null)
    await authService.resetPassword(email)
  }, [])

  const refreshProfile = useCallback(async () => {
    const p = await authService.fetchProfile(userId)
    setProfile(p)
    return p
  }, [userId])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      migrating,
      authError,
      setAuthError,
      isAuthenticated,
      isConfigured,
      userId,
      updateProfile,
      resetLocalData,
      signOut,
      signUp,
      signIn,
      resetPassword,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      migrating,
      authError,
      isAuthenticated,
      isConfigured,
      userId,
      updateProfile,
      resetLocalData,
      signOut,
      signUp,
      signIn,
      resetPassword,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
