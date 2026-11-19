"use client"

import { useEffect, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LAST_READ_KEY, QURAN_PREFS_KEY } from "@/lib/quran-index"
import { TRANSLATIONS, translationByCode } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Verse = { number: number; arabic: string; english: string }
type Prefs = { translation: boolean; size: number; lang: string }
const SIZES = ["S", "M", "L", "XL"] as const
const DEFAULT_PREFS: Prefs = { translation: true, size: 1, lang: "en" }

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(QURAN_PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const v = JSON.parse(raw) as Partial<Prefs>
    return {
      translation: v.translation !== false,
      size: typeof v.size === "number" && v.size >= 0 && v.size < SIZES.length ? v.size : 1,
      lang: typeof v.lang === "string" && translationByCode(v.lang) ? v.lang : "en",
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private windows; reading still works.
  }
}

function arabicNumber(n: number) {
  return n.toLocaleString("ar-EG", { useGrouping: false })
}

export function SurahReader({ surahId, verses, bismillah }: { surahId: number; verses: Verse[]; bismillah: string | null }) {
  const { t } = useT()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState<{ key: string; texts: (string | null)[] } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Preferences live in localStorage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs())
  }, [])

  const key = `${prefs.lang}/${surahId}`
  useEffect(() => {
    if (prefs.lang === "en" || !prefs.translation) return
    let cancelled = false
    fetch(`/quran-tr/${key}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<(string | null)[]>
      })
      .then((texts) => {
        if (!cancelled) setLoaded({ key, texts })
      })
      .catch(() => {
        if (!cancelled) setFailed(key)
      })
    return () => {
      cancelled = true
    }
  }, [key, prefs.lang, prefs.translation])

  const update = (next: Prefs) => {
    setPrefs(next)
    save(QURAN_PREFS_KEY, next)
  }

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-ayah]"))
    const visible = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.ayah)
          if (e.isIntersecting) visible.add(n)
          else visible.delete(n)
        }
        if (visible.size > 0) save(LAST_READ_KEY, { surah: surahId, ayah: Math.min(...visible) })
      },
      { rootMargin: "-80px 0px -40% 0px" },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [surahId])

  const info = translationByCode(prefs.lang) ?? TRANSLATIONS[0]
  const texts = prefs.lang === "en" ? null : loaded?.key === key ? loaded.texts : null
  const loading = prefs.lang !== "en" && !texts && failed !== key
  const sharedFrom = (i: number) => {
    let j = i
    while (j > 0 && texts && texts[j] === null) j--
    return j + 1
  }

  return (
    <div ref={ref} data-size={prefs.size} data-translation={prefs.translation ? "on" : "off"} className="quran-reader mt-6">
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[1.5rem] border border-border bg-card/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Switch
            id="show-translation"
            checked={prefs.translation}
            onCheckedChange={(checked) => update({ ...prefs, translation: checked })}
          />
          <Label htmlFor="show-translation" className="sr-only">
            {t("Show translation")}
          </Label>
          <select
            aria-label={t("Translation language")}
            value={prefs.lang}
            onChange={(e) => update({ ...prefs, lang: e.target.value, translation: true })}
            className="h-9 max-w-40 rounded-full border border-border bg-card px-3 text-sm text-ink"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.nativeName}
              </option>
            ))}
          </select>
        </div>
        <div role="group" aria-label={t("Arabic text size")} className="flex gap-1">
          {SIZES.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={prefs.size === i}
              onClick={() => update({ ...prefs, size: i })}
              className={cn(
                "h-9 min-w-9 rounded-full px-2 text-sm font-medium",
                prefs.size === i ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {prefs.translation ? (
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          {t(info.language)}: {info.title}.{" "}
          <a className="underline underline-offset-2" href={info.sourceUrl} rel="noopener">
            {info.source}
          </a>
          {failed === key ? ` · ${t("This translation could not be loaded. Showing English.")}` : loading ? ` · ${t("Loading…")}` : ""}
        </p>
      ) : null}

      {bismillah ? (
        <p lang="ar" dir="rtl" className="quran-text py-6 text-center text-grove">
          {bismillah}
        </p>
      ) : null}
      <ol className="divide-y divide-border">
        {verses.map((v, i) => {
          const translated = texts ? texts[i] : undefined
          return (
            <li key={v.number} id={`ayah-${v.number}`} data-ayah={v.number} className="scroll-mt-28 py-5">
              <p lang="ar" dir="rtl" className="quran-text text-ink">
                {v.arabic}
                <span className="ayah-mark text-brass" aria-label={t("Ayah {n}", { n: v.number })}>
                  {"۝"}
                  {arabicNumber(v.number)}
                </span>
              </p>
              <p
                lang={texts ? info.code : "en"}
                dir={texts ? info.dir : "ltr"}
                className={cn(
                  "quran-translation mt-3 text-base leading-7 text-muted-foreground",
                  texts && info.code === "ar" && "font-arabic text-lg leading-8",
                )}
              >
                <a href={`#ayah-${v.number}`} className="me-2 font-medium text-brass tabular-nums" dir="ltr">
                  {surahId}:{v.number}
                </a>
                {texts === null || translated === undefined
                  ? v.english
                  : translated === null
                    ? `↑ ${surahId}:${sharedFrom(i)}`
                    : translated}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
