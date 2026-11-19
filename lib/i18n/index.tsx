"use client"

import { useSyncExternalStore } from "react"
import { localeInfo, type Locale } from "@/lib/i18n/locales"
import { getLocale, getServerLocale, subscribeLocale } from "@/lib/i18n/store"
import { translate, type Vars } from "@/lib/i18n/translate"

export { translate, tNow, type Vars } from "@/lib/i18n/translate"

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getServerLocale)
}

export function useT() {
  const locale = useLocale()
  const t = (key: string, vars?: Vars) => translate(locale, key, vars)
  return { t, locale, dir: localeInfo(locale).dir }
}

/** For server components: renders English on the server and the chosen language in the browser. */
export function T({ k, vars }: { k: string; vars?: Vars }) {
  const { t } = useT()
  return <>{t(k, vars)}</>
}
