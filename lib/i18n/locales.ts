export const LOCALES = [
  { code: "en", name: "English", dir: "ltr", intl: "en-US" },
  { code: "ar", name: "العربية", dir: "rtl", intl: "ar-SA-u-nu-latn" },
  { code: "de", name: "Deutsch", dir: "ltr", intl: "de-DE" },
  { code: "it", name: "Italiano", dir: "ltr", intl: "it-IT" },
  { code: "zh", name: "中文", dir: "ltr", intl: "zh-CN" },
  { code: "ja", name: "日本語", dir: "ltr", intl: "ja-JP" },
  { code: "tr", name: "Türkçe", dir: "ltr", intl: "tr-TR" },
  { code: "pt", name: "Português", dir: "ltr", intl: "pt-BR" },
  { code: "es", name: "Español", dir: "ltr", intl: "es-ES" },
] as const

export type Locale = (typeof LOCALES)[number]["code"]

export function localeInfo(code: string) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0]
}

export function isLocale(code: unknown): code is Locale {
  return typeof code === "string" && LOCALES.some((l) => l.code === code)
}
