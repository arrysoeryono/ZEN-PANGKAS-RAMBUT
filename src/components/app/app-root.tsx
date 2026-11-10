'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider, useSession } from './session-provider'
import { BottomNav, type Tab } from './bottom-nav'
import { SetupScreen } from '@/components/screens/setup-screen'
import { LoginScreen } from '@/components/screens/login-screen'
import { HomeView } from '@/components/screens/home-view'
import { InputView } from '@/components/screens/input-view'
import { HistoryView } from '@/components/screens/history-view'
import { ReportsView } from '@/components/screens/reports-view'
import { SettingsView } from '@/components/screens/settings-view'
import { InstallPrompt, OfflineBanner, RegisterSW } from '@/components/pwa/pwa-components'
import { LogoMark } from '@/components/shared/logo'
import type { TxType } from '@/lib/client-types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
})

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <div className="min-h-dvh bg-zen-texture">
          <AppShell />
        </div>
        <RegisterSW />
        <OfflineBanner />
      </SessionProvider>
    </QueryClientProvider>
  )
}

function AppShell() {
  const { user, loading, needsSetup } = useSession()
  const [tab, setTab] = useState<Tab>('home')
  const [inputMode, setInputMode] = useState<TxType>('INCOME')
  const [inputKey, setInputKey] = useState(0)

  // Scroll ke atas saat pindah tab
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  function openInput(mode: TxType) {
    setInputMode(mode)
    setInputKey((k) => k + 1) // reset form tiap dibuka
    setTab('input')
  }

  if (loading) {
    return <SplashScreen />
  }

  if (!user) {
    return needsSetup ? <SetupScreen /> : <LoginScreen />
  }

  const isOwner = user.role === 'OWNER'

  return (
    <>
      <div className="no-print mx-auto min-h-dvh w-full max-w-md pb-28">
        <AnimatePresence mode="wait">
          <motion.main
            key={tab + (tab === 'input' ? inputKey : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'home' && (
              <HomeView
                onQuickAction={(type) => openInput(type)}
                onSeeAllHistory={() => setTab('history')}
              />
            )}
            {tab === 'input' && <InputView initialMode={inputMode} onDone={() => setTab('home')} />}
            {tab === 'history' && <HistoryView />}
            {tab === 'reports' && isOwner && <ReportsView />}
            {tab === 'settings' && <SettingsView />}
          </motion.main>
        </AnimatePresence>
      </div>

      <BottomNav active={tab} onChange={setTab} role={user.role} />
      <InstallPrompt />
    </>
  )
}

function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zen-texture">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4, duration: 0.7 }}
      >
        <LogoMark size={72} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm font-extrabold uppercase tracking-[0.3em] text-ink-soft"
      >
        Pangkas Rambut
      </motion.p>
    </div>
  )
}
