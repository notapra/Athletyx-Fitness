import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import * as authService from '../services/authService.js'
import { loadProfile } from '../utils/storage.js'

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(() => loadProfile())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authService.fetchProfile().then((p) => {
      setProfile(p)
      setLoading(false)
    })
  }, [])

  const updateProfile = useCallback(async (updates) => {
    const updated = await authService.updateProfile(authService.LOCAL_USER_ID, updates)
    setProfile(updated)
    return updated
  }, [])

  const resetLocalData = useCallback(async () => {
    const fresh = await authService.resetAllLocalData()
    setProfile(fresh)
    return fresh
  }, [])

  const value = useMemo(
    () => ({
      user: { id: authService.LOCAL_USER_ID },
      profile,
      loading,
      migrating: false,
      authError: null,
      setAuthError: () => {},
      isAuthenticated: true,
      isConfigured: true,
      userId: authService.LOCAL_USER_ID,
      updateProfile,
      resetLocalData,
      signOut: async () => {},
      signUp: async () => ({}),
      signIn: async () => ({}),
      resetPassword: async () => {},
      refreshProfile: async () => {
        const p = await authService.fetchProfile()
        setProfile(p)
        return p
      },
    }),
    [profile, loading, updateProfile, resetLocalData]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
