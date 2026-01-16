import { useEffect, useMemo, useState } from 'react'
import { AuthContext, type AuthContextValue } from '@/auth/AuthContext'
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/auth-token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getAuthToken())

  useEffect(() => {
    function onUnauthorized() {
      clearAuthToken()
      setTokenState(null)
    }

    window.addEventListener('whoisthat:unauthorized', onUnauthorized)
    return () => window.removeEventListener('whoisthat:unauthorized', onUnauthorized)
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      token,
      isAuthenticated: !!token,
      setToken: (t: string) => {
        setAuthToken(t)
        setTokenState(t)
      },
      logout: () => {
        clearAuthToken()
        setTokenState(null)
      },
    }
  }, [token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
