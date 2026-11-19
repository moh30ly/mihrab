import type { Locale } from "@/lib/i18n/locales"
import { MESSAGES } from "@/lib/i18n/messages"
import { getLocale } from "@/lib/i18n/store"

export type Vars = Record<string, string | number>

export function translate(locale: Locale, key: string, vars?: Vars) {
  const template = (locale !== "en" && MESSAGES[locale]?.[key]) || key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_: string, name: string) => (name in vars ? String(vars[name]) : `{${name}}`))
}

/** Translate outside React (formatting helpers, notification text) with the current language. */
export function tNow(key: string, vars?: Vars) {
  return translate(typeof window === "undefined" ? "en" : getLocale(), key, vars)
}
