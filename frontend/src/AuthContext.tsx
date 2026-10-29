import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  api,
  clearTokens,
  getCurrentUser,
  getTokens,
  saveTokens,
  saveUsername,
} from './api'
import type { CurrentUser } from './types'

interface AuthContextValue {
  user: CurrentUser | null
  isAuthenticated: boolean
  signIn: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser())

  useEffect(() => {
    const expireSession = () => setUser(null)
    window.addEventListener('moviesrank:session-expired', expireSession)
    return () => window.removeEventListener('moviesrank:session-expired', expireSession)
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    const tokens = await api.login(username, password)
    saveTokens(tokens)
    const signedInUser = getCurrentUser()
    saveUsername(signedInUser?.username ?? username)
    setUser(signedInUser)
  }, [])

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await api.register(username, email, password)
      await signIn(username, password)
    },
    [signIn],
  )

  const signOut = useCallback(async () => {
    const tokens = getTokens()
    try {
      if (tokens) await api.logout(tokens.refresh)
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      register,
      signOut,
    }),
    [user, signIn, register, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
