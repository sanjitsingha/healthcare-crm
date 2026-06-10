'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPref } from '@/lib/prefs'

const EVENTS  = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
const TICK_MS = 30_000   // evaluate every 30 s

export default function InactivityGuard() {
  const router          = useRouter()
  const lastActivityRef = useRef(Date.now())
  const timerRef        = useRef(null)

  useEffect(() => {
    const resetActivity = () => { lastActivityRef.current = Date.now() }

    const checkTimeout = async () => {
      const enabled = getPref('pref_inactivity_enabled', false)
      if (!enabled) return

      const minutes   = getPref('pref_inactivity_duration', 30)
      const timeoutMs = minutes * 60_000
      const idle      = Date.now() - lastActivityRef.current

      if (idle >= timeoutMs) {
        clearInterval(timerRef.current)
        EVENTS.forEach(e => document.removeEventListener(e, resetActivity))
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login?reason=inactivity')
        router.refresh()
      }
    }

    EVENTS.forEach(e => document.addEventListener(e, resetActivity, { passive: true }))

    // Also check the moment the user returns to this tab (catches sleeping/background tabs)
    const onVisible = () => { if (document.visibilityState === 'visible') checkTimeout() }
    document.addEventListener('visibilitychange', onVisible)

    timerRef.current = setInterval(checkTimeout, TICK_MS)

    return () => {
      EVENTS.forEach(e => document.removeEventListener(e, resetActivity))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timerRef.current)
    }
  }, [router])

  return null
}
