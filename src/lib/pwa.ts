import { create } from 'zustand'
import { registerSW } from 'virtual:pwa-register'

// Service worker registration and the "new version available" state.
// The worker installs new versions in the background but waits for the user to say when to switch.

const CHECK_EVERY_MS = 60 * 60 * 1000

type CheckResult = 'idle' | 'checking' | 'up-to-date' | 'update-ready' | 'unavailable'

interface PwaState {
  needRefresh: boolean
  offlineReady: boolean
  lastCheck: CheckResult
  dismissed: boolean
  dismiss: () => void
  checkNow: () => Promise<void>
  applyUpdate: () => void
}

let registration: ServiceWorkerRegistration | undefined
let updateSW: ((reload?: boolean) => Promise<void>) | undefined

export const usePwa = create<PwaState>()((set, get) => ({
  needRefresh: false,
  offlineReady: false,
  lastCheck: 'idle',
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
  checkNow: async () => {
    if (!registration) return set({ lastCheck: 'unavailable' })
    set({ lastCheck: 'checking', dismissed: false })
    try {
      await registration.update()
      // A found update moves to "installed" a moment later; give it a short grace period.
      await new Promise((r) => setTimeout(r, 1500))
      set({ lastCheck: get().needRefresh || registration.waiting ? 'update-ready' : 'up-to-date' })
      if (registration.waiting) set({ needRefresh: true })
    } catch {
      set({ lastCheck: 'unavailable' })
    }
  },
  applyUpdate: () => {
    // Reload once the new worker takes control. The plugin only reloads for updates it found
    // itself, not ones found by a later check, so handle it here for every case.
    let reloaded = false
    const reload = () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    const waiting = registration?.waiting
    if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' })
    else void updateSW?.(true)
    // If control already switched (or the message was missed), reload anyway.
    setTimeout(reload, 3000)
  },
}))

export function startPwa() {
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    onNeedRefresh: () => usePwa.setState({ needRefresh: true, dismissed: false }),
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
    onRegisteredSW: (_url, r) => {
      registration = r
      if (!r) return
      // Look for a new version now and then while the app stays open.
      setInterval(() => {
        if (navigator.onLine) void r.update()
      }, CHECK_EVERY_MS)
    },
  })
}
