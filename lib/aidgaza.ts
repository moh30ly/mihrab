import type { Locale } from "./i18n/locales"

// Mihrab was made by Mohammed Hamada, founder of Aid Gaza. Mihrab never handles money:
// the Donate page only links to Aid Gaza's own donation page, which opens in the browser.

export const AIDGAZA_SITE = "https://www.aidgaza.org"

/** Aid Gaza's site is in English, Arabic and Turkish; other languages get the English page. */
function aidgazaLang(locale: Locale): "en" | "ar" | "tr" {
  return locale === "ar" || locale === "tr" ? locale : "en"
}

export function aidgazaDonateUrl(locale: Locale): string {
  return `https://aidgaza.org/${aidgazaLang(locale)}/donate`
}

export function aidgazaHistoryUrl(locale: Locale): string {
  return `https://aidgaza.org/${aidgazaLang(locale)}/donations-history`
}

export function aidgazaTeamUrl(locale: Locale): string {
  return `https://aidgaza.org/${aidgazaLang(locale)}/team`
}
