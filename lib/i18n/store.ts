// The interface language lives in the browser (localStorage), so the static
// site stays one set of pages. English is rendered first, then the chosen
// language takes over after hydration.
import { isLocale, localeInfo, type Locale } from "@/lib/i18n/locales"

const KEY = "mihrab:locale"
let current: Locale = "en"
let initialized = false
const listeners = new Set<() => void>()

function detect(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY)
    if (isLocale(saved)) return saved
  } catch {
    // Fall through to the browser language.
  }
  for (const lang of navigator.languages ?? [navigator.language]) {
    const base = lang?.slice(0, 2).toLowerCase()
    if (isLocale(base)) return base
  }
  return "en"
}

function apply(locale: Locale) {
  const info = localeInfo(locale)
  document.documentElement.lang = info.code
  document.documentElement.dir = info.dir
}

export function getLocale(): Locale {
  if (!initialized && typeof window !== "undefined") {
    initialized = true
    current = detect()
    apply(current)
  }
  return current
}

export function getServerLocale(): Locale {
  return "en"
}

export function setLocale(locale: Locale) {
  current = locale
  initialized = true
  try {
    window.localStorage.setItem(KEY, locale)
  } catch {
    // The choice still applies for this visit.
  }
  apply(locale)
  for (const l of listeners) l()
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** For formatting helpers outside React: the Intl locale of the current language. */
export function intlLocale() {
  return localeInfo(typeof window === "undefined" ? "en" : getLocale()).intl
}
