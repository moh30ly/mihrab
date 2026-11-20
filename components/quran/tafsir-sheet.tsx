"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fetchLibrary } from "@/lib/library"
import { DownloadHint } from "@/components/offline/download-hint"
import { booksOf, defaultIrab, defaultTafsir, entryAt, tafsirById, tafsirChunkPath, type BookKind, type TafsirEntry } from "@/lib/tafsir"
import { useT } from "@/lib/i18n"
import { localeInfo } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"

const PREF_KEYS: Record<BookKind, string> = { tafsir: "mihrab:quran:tafsir", irab: "mihrab:quran:irab" }

function savedBook(kind: BookKind): string | null {
  try {
    return window.localStorage.getItem(PREF_KEYS[kind])
  } catch {
    return null
  }
}

type State =
  | { status: "loading"; key: string }
  | { status: "ready"; key: string; text: string; from: number | null }
  | { status: "empty"; key: string }
  | { status: "error"; key: string }

/** Loads the commentary on one ayah, following a pointer to the ayah that explains it. */
async function loadTafsir(id: string, surah: number, ayah: number): Promise<{ text: string; from: number | null } | null> {
  let target = ayah
  for (let hops = 0; hops < 3; hops++) {
    const chunk = await fetchLibrary<TafsirEntry[]>(tafsirChunkPath(id, surah, target))
    const entry = entryAt(chunk, target)
    if (typeof entry === "string") return { text: entry, from: target === ayah ? null : target }
    if (!entry) return null
    target = entry
  }
  return null
}

/** Shows a tafsir or an i‘rab (grammatical analysis) of one ayah, with a choice of book. */
export function TafsirSheet({
  kind = "tafsir",
  surahId,
  ayahCount,
  ayah,
  arabic,
  onAyahChange,
  onClose,
}: {
  kind?: BookKind
  surahId: number
  ayahCount: number
  ayah: number | null
  arabic: string | null
  onAyahChange: (ayah: number) => void
  onClose: () => void
}) {
  const { t, locale } = useT()
  const [choice, setChoice] = useState<string | null>(null)
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    // The saved choice lives in localStorage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(savedBook(kind))
  }, [kind])

  const irab = kind === "irab"
  const books = booksOf(kind)
  const info = (choice && tafsirById(choice, kind)) || (irab ? defaultIrab() : defaultTafsir(locale))
  const title = irab ? t("I‘rab") : t("Tafsir")
  const key = `${info.id}/${surahId}/${ayah}`

  useEffect(() => {
    if (ayah === null) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading", key })
    loadTafsir(info.id, surahId, ayah)
      .then((r) => {
        if (!cancelled) setState(r ? { status: "ready", key, ...r } : { status: "empty", key })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", key })
      })
    return () => {
      cancelled = true
    }
  }, [info.id, surahId, ayah, key])

  const pick = (id: string) => {
    setChoice(id)
    try {
      window.localStorage.setItem(PREF_KEYS[kind], id)
    } catch {
      // Storage can be unavailable in private windows; the choice lasts for this visit.
    }
  }

  const current = state?.key === key ? state : null
  const languages = [...new Set(books.map((x) => x.lang))]
  const options = (lang: string) =>
    books
      .filter((x) => x.lang === lang)
      .map((x) => (
        <option key={x.id} value={x.id}>
          {x.name}
        </option>
      ))

  return (
    <Sheet open={ayah !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] w-full max-w-3xl gap-0 rounded-t-[1.5rem] border-gold/50 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border pr-12 pl-4">
          <SheetTitle className="font-heading text-xl text-grove">
            {title} · {surahId}:{ayah}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {irab ? t("Grammatical analysis of this ayah") : t("Commentary on this ayah")}
          </SheetDescription>
          <div className="mt-2 flex items-center gap-2">
            <select
              aria-label={title}
              value={info.id}
              onChange={(e) => pick(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-sm text-ink"
            >
              {languages.length === 1
                ? options(languages[0])
                : languages.map((lang) => (
                    <optgroup key={lang} label={localeInfo(lang).name}>
                      {options(lang)}
                    </optgroup>
                  ))}
            </select>
            <div dir="ltr" className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label={t("Previous ayah")}
                disabled={!ayah || ayah <= 1}
                onClick={() => ayah && onAyahChange(ayah - 1)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t("Next ayah")}
                disabled={!ayah || ayah >= ayahCount}
                onClick={() => ayah && onAyahChange(ayah + 1)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto px-5 py-4">
          {irab && locale !== "ar" ? (
            <p className="mb-3 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
              {t("I‘rab explains the grammar of each Arabic word, so it is written in Arabic.")}
            </p>
          ) : null}
          {arabic ? (
            <p lang="ar" dir="rtl" className="quran-text text-[1.6rem] text-ink">
              {arabic}
            </p>
          ) : null}
          {!current || current.status === "loading" ? (
            <p className="py-6 text-muted-foreground">{t("Loading…")}</p>
          ) : current.status === "error" ? (
            <div className="py-6 text-muted-foreground">
              <p>
                {irab
                  ? t("The i‘rab could not be loaded. Check your connection and try again.")
                  : t("The tafsir could not be loaded. Check your connection and try again.")}
              </p>
              <DownloadHint />
            </div>
          ) : current.status === "empty" ? (
            <p className="py-6 text-muted-foreground">
              {irab ? t("This book has no i‘rab of this ayah.") : t("This tafsir has no commentary on this ayah.")}
            </p>
          ) : (
            <>
              {current.from ? (
                <p className="mt-3 text-sm text-brass">{t("Explained together with ayah {n}.", { n: `${surahId}:${current.from}` })}</p>
              ) : null}
              <div
                lang={info.lang}
                dir={info.dir === "rtl" ? "rtl" : "ltr"}
                className={cn(
                  "mt-1 text-ink",
                  info.dir === "rtl" ? "font-arabic text-xl leading-[2]" : "text-base leading-7",
                )}
              >
                {current.text.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className="mt-3 whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </>
          )}
          <p className="mt-6 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
            {locale === info.lang ? info.name : info.english}.{" "}
            <a className="underline underline-offset-2" href={info.sourceUrl} rel="noopener" target="_blank">
              {info.source}
            </a>
            .{" "}
            {irab
              ? t("I‘rab explains the grammar of the words; only the Arabic is the Quran.")
              : t("Tafsir explains the meaning; only the Arabic is the Quran.")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
