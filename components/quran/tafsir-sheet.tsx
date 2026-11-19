"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fetchLibrary } from "@/lib/library"
import { TAFSIRS, defaultTafsir, entryAt, tafsirById, tafsirChunkPath, type TafsirEntry } from "@/lib/tafsir"
import { useT } from "@/lib/i18n"
import { localeInfo } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"

const TAFSIR_PREF_KEY = "mihrab:quran:tafsir"

function savedTafsir(): string | null {
  try {
    return window.localStorage.getItem(TAFSIR_PREF_KEY)
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

export function TafsirSheet({
  surahId,
  ayahCount,
  ayah,
  arabic,
  onAyahChange,
  onClose,
}: {
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
    setChoice(savedTafsir())
  }, [])

  const info = (choice && tafsirById(choice)) || defaultTafsir(locale)
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
      window.localStorage.setItem(TAFSIR_PREF_KEY, id)
    } catch {
      // Storage can be unavailable in private windows; the choice lasts for this visit.
    }
  }

  const current = state?.key === key ? state : null
  const languages = [...new Set(TAFSIRS.map((x) => x.lang))]

  return (
    <Sheet open={ayah !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] w-full max-w-3xl gap-0 rounded-t-[1.5rem] border-gold/50 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border pe-12">
          <SheetTitle className="font-heading text-xl text-grove">
            {t("Tafsir")} · {surahId}:{ayah}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("Commentary on this ayah")}</SheetDescription>
          <div className="mt-2 flex items-center gap-2">
            <select
              aria-label={t("Tafsir")}
              value={info.id}
              onChange={(e) => pick(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-full border border-border bg-card px-3 text-sm text-ink"
            >
              {languages.map((lang) => (
                <optgroup key={lang} label={localeInfo(lang).name}>
                  {TAFSIRS.filter((x) => x.lang === lang).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
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
          {arabic ? (
            <p lang="ar" dir="rtl" className="quran-text text-[1.6rem] text-ink">
              {arabic}
            </p>
          ) : null}
          {!current || current.status === "loading" ? (
            <p className="py-6 text-muted-foreground">{t("Loading…")}</p>
          ) : current.status === "error" ? (
            <p className="py-6 text-muted-foreground">{t("The tafsir could not be loaded. Check your connection and try again.")}</p>
          ) : current.status === "empty" ? (
            <p className="py-6 text-muted-foreground">{t("This tafsir has no commentary on this ayah.")}</p>
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
            {info.english}.{" "}
            <a className="underline underline-offset-2" href={info.sourceUrl} rel="noopener" target="_blank">
              {info.source}
            </a>
            . {t("Tafsir explains the meaning; only the Arabic is the Quran.")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
