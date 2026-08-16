// Version guard — clears stale localStorage if the app version changes
// This prevents crashes from old/incompatible persisted state

const APP_VERSION = '2.0.0' // increment when making breaking changes to store shape
const VERSION_KEY = 'crm-app-version'

export function initVersionGuard() {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(VERSION_KEY)
    if (stored !== APP_VERSION) {
      // Version changed — clear all CRM-related storage to prevent crashes
      const keysToClear = [
        'crm-module-store',
        'crm-saved-filters',
      ]
      keysToClear.forEach((key) => {
        try { localStorage.removeItem(key) } catch {}
      })
      localStorage.setItem(VERSION_KEY, APP_VERSION)
      console.info(`[Nexus CRM] Updated to version ${APP_VERSION} — cleared stale cache`)
    }
  } catch {
    // localStorage not available — silent
  }
}
