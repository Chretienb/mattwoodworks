import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { adminMeRequest, loginRequest, type AdminMeResponse } from '../api/auth'

const STORAGE_KEY = 'matt_admin_token'

type AuthContextValue = {
  hydrated: boolean
  token: string | null
  user: AdminMeResponse | null
  signIn: (password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AdminMeResponse | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (!stored) {
      setHydrated(true)
      return
    }

    setToken(stored)
    adminMeRequest(stored)
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem(STORAGE_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setHydrated(true))
  }, [])

  const signIn = useCallback(async (password: string) => {
    const { token: next } = await loginRequest(password)
    sessionStorage.setItem(STORAGE_KEY, next)
    setToken(next)
    const me = await adminMeRequest(next)
    setUser(me)
  }, [])

  const signOut = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ hydrated, token, user, signIn, signOut }),
    [hydrated, token, user, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
