'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share2, WifiOff, X } from 'lucide-react'

/** Registrasi service worker (hanya production) */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* diamkan */
      })
    }
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])
  return null
}

/** Banner "Anda offline" */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-foreground py-2 text-xs font-bold text-cream pt-safe"
        >
          <WifiOff className="size-3.5" />
          Anda sedang offline — data terbaru butuh koneksi internet
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallPlatform = 'unknown' | 'ios' | 'promptable'

const DISMISS_KEY = 'zen-install-dismissed-at'
const DISMISS_DAYS = 4

/** Undangan install PWA (Android/Chrome) + panduan iOS */
export function InstallPrompt() {
  const [platform, setPlatform] = useState<InstallPlatform>('unknown')
  const [dismissed, setDismissed] = useState(true)
  const deferredRef = useRef<InstallPromptEvent | null>(null)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    // Evaluasi awal lewat timer agar tidak memicu render berantai
    const timer = setTimeout(() => {
      const last = Number(localStorage.getItem(DISMISS_KEY) ?? '0')
      const recentlyDismissed = Date.now() - last <= DISMISS_DAYS * 86400000
      if (standalone || recentlyDismissed) {
        setDismissed(true)
        return
      }
      const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
      setPlatform(isIos ? 'ios' : 'unknown')
      setDismissed(false)
    }, 0)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as InstallPromptEvent
      setPlatform('promptable')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  async function install() {
    const deferred = deferredRef.current
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') setDismissed(true)
      deferredRef.current = null
    }
  }

  if (dismissed) return null
  if (platform === 'unknown') return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="no-print fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-3xl border border-border bg-card p-4 shadow-2xl"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-foreground">Pasang aplikasi ZEN</p>
          {platform === 'ios' ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
              <Share2 className="size-3" /> Tap Share lalu &ldquo;Add to Home Screen&rdquo;
            </p>
          ) : (
            <p className="text-xs text-ink-soft">Lebih cepat & bisa dibuka kapan saja</p>
          )}
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground transition active:scale-95"
        >
          Pasang
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-ink-soft shadow-sm"
        >
          <X className="size-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
