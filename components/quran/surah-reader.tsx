"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, BookOpenText, Languages, ScrollText } from "lucide-react"
import { BookView, type BookVerse } from "@/components/quran/book-view"
import { TafsirSheet } from "@/components/quran/tafsir-sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LAST_READ_KEY, QURAN_PREFS_KEY } from "@/lib/quran-index"
import { TRANSLATIONS, translationByCode } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Verse = { number: number; arabic: string; english: string }
type Mode = "scroll" | "book"
type Prefs = { translation: boolean; size: number; lang: string; mode: Mode }
const SIZES = ["S", "M", "L", "XL"] as const
const DEFAULT_PREFS: Prefs = { translation: true, size: 1, lang: "en", mode: "scroll" }

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(QURAN_PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const v = JSON.parse(raw) as Partial<Prefs>
    return {
      translation: v.translation !== false,
      size: typeof v.size === "number" && v.size >= 0 && v.size < SIZES.length ? v.size : 1,
      lang: typeof v.lang === "string" && translationByCode(v.lang) ? v.lang : "en",
      mode: v.mode === "book" ? "book" : "scroll",
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

export function SurahReader({
  surahId,
  surahName,
  verses,
  bismillah,
}: {
  surahId: number
  surahName: string
  verses: Verse[]
  bismillah: string | null
}) {
  const { t } = useT()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState<{ key: string; texts: (string | null)[] } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [tafsirAyah, setTafsirAyah] = useState<number | null>(null)
  const [irabAyah, setIrabAyah] = useState<number | null>(null)
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
    // The book view keeps its own place, page by page.
    if (!root || prefs.mode !== "scroll") return
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
  }, [surahId, prefs.mode])

  const info = translationByCode(prefs.lang) ?? TRANSLATIONS[0]
  const texts = prefs.lang === "en" ? null : loaded?.key === key ? loaded.texts : null
  const loading = prefs.lang !== "en" && !texts && failed !== key
  const sharedFrom = (i: number) => {
    let j = i
    while (j > 0 && texts && texts[j] === null) j--
    return j + 1
  }
  const translationOf = (v: Verse, i: number) => {
    const translated = texts ? texts[i] : undefined
    return texts === null || translated === undefined
      ? v.english
      : translated === null
        ? `↑ ${surahId}:${sharedFrom(i)}`
        : translated
  }
  const book = prefs.mode === "book"
  const bookVerses: BookVerse[] = book
    ? verses.map((v, i) => ({
        number: v.number,
        arabic: v.arabic,
        translation: {
          text: translationOf(v, i),
          lang: texts ? info.code : "en",
          dir: texts ? info.dir : "ltr",
          arabicFont: Boolean(texts && info.code === "ar"),
        },
      }))
    : []
  const setMode = (mode: Mode) => {
    if (mode === prefs.mode) return
    update({ ...prefs, mode })
    // Bring the book to the top, so the whole page fits on screen.
    if (mode === "book") setTimeout(() => ref.current?.querySelector(".book-frame")?.scrollIntoView({ block: "start", behavior: "smooth" }), 50)
  }

  return (
    <div ref={ref} data-size={prefs.size} data-translation={prefs.translation ? "on" : "off"} className="quran-reader mt-6">
      <div className={cn("z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[1.5rem] border border-gold/50 bg-card/95 shadow-sm px-4 py-2 backdrop-blur", !book && "sticky top-14")}>
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
        <div role="group" aria-label={t("Reading mode")} className="flex gap-0.5 rounded-full border border-border p-0.5">
          {(
            [
              ["scroll", ScrollText, t("Scroll")],
              ["book", BookOpen, t("Book")],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={prefs.mode === mode}
              onClick={() => setMode(mode)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium",
                prefs.mode === mode ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
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

      {book ? (
        <BookView
          surahId={surahId}
          surahName={surahName}
          verses={bookVerses}
          bismillah={bismillah}
          showTranslation={prefs.translation}
          layoutKey={`${prefs.size}/${prefs.translation}/${texts ? key : "en"}`}
          focusAyah={tafsirAyah ?? irabAyah}
          onTafsir={setTafsirAyah}
          onIrab={setIrabAyah}
        />
      ) : null}
      {!book && bismillah ? (
        <p lang="ar" dir="rtl" className="quran-text py-6 text-center text-grove">
          {bismillah}
        </p>
      ) : null}
      <ol className={cn("divide-y divide-border", book && "hidden")}>
        {verses.map((v, i) => {
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
                {translationOf(v, i)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setTafsirAyah(v.number)}
                  aria-label={t("Tafsir of ayah {n}", { n: `${surahId}:${v.number}` })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-brass hover:bg-secondary"
                >
                  <BookOpenText className="size-4" aria-hidden />
                  {t("Tafsir")}
                </button>
                <button
                  type="button"
                  onClick={() => setIrabAyah(v.number)}
                  aria-label={t("I‘rab of ayah {n}", { n: `${surahId}:${v.number}` })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-sm text-brass hover:bg-secondary"
                >
                  <Languages className="size-4" aria-hidden />
                  {t("I‘rab")}
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <TafsirSheet
        surahId={surahId}
        ayahCount={verses.length}
        ayah={tafsirAyah}
        arabic={tafsirAyah ? verses[tafsirAyah - 1]?.arabic ?? null : null}
        onAyahChange={setTafsirAyah}
        onClose={() => setTafsirAyah(null)}
      />
      <TafsirSheet
        kind="irab"
        surahId={surahId}
        ayahCount={verses.length}
        ayah={irabAyah}
        arabic={irabAyah ? verses[irabAyah - 1]?.arabic ?? null : null}
        onAyahChange={setIrabAyah}
        onClose={() => setIrabAyah(null)}
      />
    </div>
  )
}
