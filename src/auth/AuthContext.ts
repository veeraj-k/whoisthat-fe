import { createContext } from 'react'

type AuthContextValue = {
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export type { AuthContextValue }
