'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api-client'
import type { SessionUser } from '@/lib/client-types'

interface SessionContextValue {
  user: SessionUser | null
  loading: boolean
  /** true = belum ada akun owner sama sekali (tampilkan Setup) */
  needsSetup: boolean
  login: (userId: string, pin: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: SessionUser | null }>('/api/auth/me')
      setUser(data.user)
      if (!data.user) {
        const status = await api<{ needsSetup: boolean }>('/api/status')
        setNeedsSetup(status.needsSetup)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (userId: string, pin: string) => {
    const data = await api<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, pin }),
    })
    setUser(data.user)
    setNeedsSetup(false)
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, needsSetup, login, logout, refresh }),
    [user, loading, needsSetup, login, logout, refresh],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession harus dipakai di dalam SessionProvider')
  return ctx
}
