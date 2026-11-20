"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpenText, Bookmark, ChevronLeft, ChevronRight, Languages, NotebookPen, Play, X } from "lucide-react"
import { surahById } from "@/lib/quran-index"
import { saveLastRead } from "@/lib/quran-notes"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type BookVerse = {
  number: number
  arabic: string
  translation: { text: string; lang: string; dir: "ltr" | "rtl"; arabicFont: boolean }
}

/** Opening a surah at this hash shows its last page, so turning back from the next surah reads on. */
export const LAST_PAGE_HASH = "#page-last"
const GAP = 48
const SWIPE = 50

function arabicNumber(n: number) {
  return n.toLocaleString("ar-EG", { useGrouping: false })
}

/**
 * Reads a surah like a printed mushaf: the text flows into pages that turn right to left.
 * The pages are CSS columns as wide as the frame; turning a page slides the next column in.
 */
export function BookView({
  surahId,
  surahName,
  verses,
  bismillah,
  showTranslation,
  layoutKey,
  focusAyah,
  leftOff,
  tracking,
  onRead,
  notedAyahs,
  onTafsir,
  onIrab,
  onNote,
  recitingAyah = null,
  onListen,
}: {
  surahId: number
  surahName: string
  verses: BookVerse[]
  bismillah: string | null
  showTranslation: boolean
  /** Changes whenever text size or translation changes, so the pages are measured again. */
  layoutKey: string
  /** An ayah opened elsewhere (the tafsir sheet's next and previous); its page is shown. */
  focusAyah: number | null
  /** The ayah the reader stopped at last time, tagged with a bookmark. */
  leftOff: number | null
  /** Whether turning to a page saves it as the place to continue from. */
  tracking: boolean
  /** Called when the reader turns a page themselves. */
  onRead: () => void
  notedAyahs: Set<number>
  onTafsir: (ayah: number) => void
  onIrab: (ayah: number) => void
  onNote: (ayah: number) => void
  /** The ayah being recited (0 is the basmala); its page is shown as the recitation moves on. */
  recitingAyah?: number | null
  onListen?: (ayah: number) => void
}) {
  const { t } = useT()
  const router = useRouter()
  const frameRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [page, setPage] = useState(0)
  const [count, setCount] = useState(1)
  const [drag, setDrag] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [jump, setJump] = useState(0)
  const anchor = useRef<number | "last" | null>(null)
  const pointer = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null)
  const step = width + GAP

  /** The page that holds a point of the text, from how far it sits from the first page's right edge. */
  const pageOfRect = useCallback(
    (rect: DOMRect) => {
      const box = pagesRef.current?.getBoundingClientRect()
      if (!box || step <= 0) return 0
      return Math.max(0, Math.floor((box.right - rect.right + 1) / step))
    },
    [step],
  )

  const pageOfAyah = useCallback(
    (n: number) => {
      const el = pagesRef.current?.querySelector<HTMLElement>(`[data-ayah="${n}"]`)
      const first = el?.getClientRects()[0]
      return first ? pageOfRect(first) : 0
    },
    [pageOfRect],
  )

  /** The first ayah that starts on a page, or the one running onto it from before. */
  const firstAyahOn = useCallback(
    (p: number) => {
      let found = verses[0]?.number ?? 1
      for (const el of pagesRef.current?.querySelectorAll<HTMLElement>("[data-ayah]") ?? []) {
        const first = el.getClientRects()[0]
        if (!first) continue
        const at = pageOfRect(first)
        if (at > p) break
        found = Number(el.dataset.ayah)
        if (at === p) break
      }
      return found
    },
    [pageOfRect, verses],
  )

  // Where to open: an ayah in the link, the last page when turning back from the next surah.
  useEffect(() => {
    const apply = (initial: boolean) => {
      const hash = window.location.hash
      const m = /^#ayah-(\d+)$/.exec(hash)
      if (m) {
        anchor.current = Number(m[1])
        setSelected(Number(m[1]))
      } else if (hash === LAST_PAGE_HASH) anchor.current = "last"
      else return
      if (!initial) setJump((j) => j + 1)
      // Opened at a place in the surah: show the book rather than the surah's title.
      frameRef.current?.closest(".book-frame")?.scrollIntoView({ block: "start" })
    }
    apply(true)
    const onHash = () => apply(false)
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => setWidth(Math.floor(frame.clientWidth))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  // Measure the pages after every layout change, keeping the reader on the ayah they were reading.
  useLayoutEffect(() => {
    const pages = pagesRef.current
    if (!pages || width <= 0) return
    const paginate = () => {
      const end = pages.querySelector<HTMLElement>("[data-end]")
      const total = end ? pageOfRect(end.getBoundingClientRect()) + 1 : 1
      setCount(total)
      const a = anchor.current
      const target = a === "last" ? total - 1 : typeof a === "number" ? pageOfAyah(a) : 0
      setPage(Math.min(Math.max(0, target), total - 1))
    }
    paginate()
    let live = true
    document.fonts?.ready.then(() => live && paginate())
    return () => {
      live = false
    }
  }, [width, layoutKey, jump, pageOfAyah, pageOfRect])

  // Remember the ayah this page starts with, for resizing and for "continue reading".
  useEffect(() => {
    if (width <= 0 || !tracking) return
    saveLastRead(surahId, firstAyahOn(page))
  }, [page, width, count, firstAyahOn, surahId, tracking])

  useEffect(() => {
    if (focusAyah == null || width <= 0) return
    anchor.current = focusAyah
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(focusAyah)
    // An ayah that runs over two pages is already in view when any part of it is on this one.
    const el = pagesRef.current?.querySelector<HTMLElement>(`[data-ayah="${focusAyah}"]`)
    const shown = Array.from(el?.getClientRects() ?? []).some((r) => pageOfRect(r) === page)
    if (!shown) setPage(pageOfAyah(focusAyah))
    // Only a new ayah moves the page, not the page turning under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusAyah, width, pageOfAyah, pageOfRect])

  // Follow the recitation from page to page.
  useEffect(() => {
    if (recitingAyah == null || width <= 0) return
    const n = Math.max(1, recitingAyah)
    const el = pagesRef.current?.querySelector<HTMLElement>(`[data-ayah="${n}"]`)
    const shown = Array.from(el?.getClientRects() ?? []).some((r) => pageOfRect(r) === page)
    if (shown) return
    anchor.current = n
    setPage(pageOfAyah(n))
    // Only a new ayah moves the page, so the reader can still turn pages while listening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recitingAyah, width, pageOfAyah, pageOfRect])

  const prevSurah = surahById(surahId - 1)
  const nextSurah = surahById(surahId + 1)

  const turn = useCallback(
    (dir: 1 | -1) => {
      const next = page + dir
      onRead()
      if (next >= count) {
        if (nextSurah) router.push(`/quran/${nextSurah.id}/`)
        return
      }
      if (next < 0) {
        if (prevSurah) router.push(`/quran/${prevSurah.id}/${LAST_PAGE_HASH}`)
        return
      }
      anchor.current = firstAyahOn(next)
      setSelected(null)
      setPage(next)
    },
    [page, count, nextSurah, prevSurah, router, firstAyahOn, onRead],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest("input, select, textarea, [role=dialog]")) return
      // An Arabic book turns forward to the left.
      if (e.key === "ArrowLeft" || e.key === "PageDown") turn(1)
      else if (e.key === "ArrowRight" || e.key === "PageUp") turn(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [turn])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    pointer.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointer.current
    if (!p || p.id !== e.pointerId) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (!p.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      p.moved = true
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (p.moved) {
      // Resist at the first and last page, where there is no page to pull in.
      const edge = (dx < 0 && page === 0) || (dx > 0 && page === count - 1)
      setDrag(edge ? dx / 3 : dx)
    }
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    const p = pointer.current
    if (!p || p.id !== e.pointerId) return
    pointer.current = null
    const dx = e.clientX - p.x
    setDrag(0)
    if (!p.moved) return
    // Dragging the page to the right brings the next (left-hand) page in.
    if (dx > SWIPE) turn(1)
    else if (dx < -SWIPE) turn(-1)
  }
  const onClickCapture = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-ayah]")
    if (!el) return setSelected(null)
    const n = Number(el.dataset.ayah)
    setSelected((s) => (s === n ? null : n))
  }

  const offset = page * step + drag
  const pageLabel = t("Page {n} of {total}", { n: page + 1, total: count })

  return (
    <div className="mt-4">
      <div
        className="book-frame relative scroll-mt-16 rounded-[1.25rem] border-2 border-gold/70 bg-card p-1.5 shadow-sm"
        aria-roledescription={t("Book")}
      >
        <div className="rounded-[0.95rem] border border-gold/50 px-4 pt-2 pb-3 sm:px-6">
          <p dir="rtl" className="flex items-center justify-between border-b border-gold/40 pb-1.5 text-xs text-brass">
            <span lang="ar" className="font-quran text-sm">
              {surahName}
            </span>
            <span lang="ar" className="tabular-nums" aria-hidden>
              {arabicNumber(page + 1)}
            </span>
          </p>
          <div
            ref={frameRef}
            className="book-viewport relative mt-2 overflow-hidden"
            style={{ touchAction: "pan-y" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClickCapture={onClickCapture}
            aria-live="polite"
            aria-label={pageLabel}
          >
            <div
              ref={pagesRef}
              dir="rtl"
              className={cn("book-pages h-full", drag === 0 && "book-turning")}
              style={{
                columnWidth: width > 0 ? `${width}px` : undefined,
                columnGap: `${GAP}px`,
                transform: `translateX(${offset}px)`,
              }}
            >
              {bismillah ? (
                <p lang="ar" className={cn("quran-text book-bismillah text-center text-grove", recitingAyah === 0 && "is-reciting")}>
                  {bismillah}
                </p>
              ) : null}
              {showTranslation ? (
                verses.map((v) => (
                  <div key={v.number} data-ayah={v.number} className={cn("book-ayah", selected === v.number && "is-selected", recitingAyah === v.number && "is-reciting")}>
                    {leftOff === v.number ? <LeftOffMark label={t("You left off here")} block /> : null}
                    <p lang="ar" className="quran-text text-ink">
                      {v.arabic}
                      <span className="ayah-mark text-brass" aria-label={t("Ayah {n}", { n: v.number })}>
                        {"۝"}
                        {arabicNumber(v.number)}
                      </span>
                      {notedAyahs.has(v.number) ? <NoteMark label={t("Your note")} /> : null}
                    </p>
                    <p
                      lang={v.translation.lang}
                      dir={v.translation.dir}
                      className={cn(
                        "quran-translation mb-4 text-base leading-7 text-muted-foreground",
                        v.translation.arabicFont && "font-arabic text-lg leading-8",
                      )}
                    >
                      <span className="me-2 font-medium text-brass tabular-nums" dir="ltr">
                        {surahId}:{v.number}
                      </span>
                      {v.translation.text}
                    </p>
                  </div>
                ))
              ) : (
                <p lang="ar" className="quran-text book-flow text-ink">
                  {verses.map((v) => (
                    <span key={v.number} data-ayah={v.number} className={cn("book-ayah", selected === v.number && "is-selected", recitingAyah === v.number && "is-reciting")}>
                      {leftOff === v.number ? <LeftOffMark label={t("You left off here")} /> : null}
                      {v.arabic}
                      <span className="ayah-mark text-brass" aria-label={t("Ayah {n}", { n: v.number })}>
                        {"۝"}
                        {arabicNumber(v.number)}
                      </span>
                      {notedAyahs.has(v.number) ? <NoteMark label={t("Your note")} /> : null}{" "}
                    </span>
                  ))}
                </p>
              )}
              <span data-end aria-hidden className="block h-px" />
            </div>
          </div>
        </div>

        {selected != null ? (
          <div
            dir="ltr"
            className="absolute inset-x-3 bottom-3 z-10 flex items-center gap-1 rounded-full border border-gold/60 bg-card/95 px-2 py-1 shadow-md backdrop-blur"
          >
            <span className="px-2 text-sm font-medium text-brass tabular-nums">
              {surahId}:{selected}
            </span>
            <span className="flex-1" />
            {onListen ? (
              <button
                type="button"
                onClick={() => {
                  onListen(selected)
                  setSelected(null)
                }}
                aria-label={t("Listen to ayah {n}", { n: `${surahId}:${selected}` })}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-brass hover:bg-secondary"
              >
                <Play className="size-4" aria-hidden />
                <span className="hidden min-[400px]:inline">{t("Listen")}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onTafsir(selected)}
              aria-label={t("Tafsir of ayah {n}", { n: `${surahId}:${selected}` })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-brass hover:bg-secondary"
            >
              <BookOpenText className="size-4" aria-hidden />
              {t("Tafsir")}
            </button>
            <button
              type="button"
              onClick={() => onIrab(selected)}
              aria-label={t("I‘rab of ayah {n}", { n: `${surahId}:${selected}` })}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-brass hover:bg-secondary"
            >
              <Languages className="size-4" aria-hidden />
              {t("I‘rab")}
            </button>
            <button
              type="button"
              onClick={() => onNote(selected)}
              aria-label={
                notedAyahs.has(selected)
                  ? t("Edit note on ayah {n}", { n: `${surahId}:${selected}` })
                  : t("Add a note to ayah {n}", { n: `${surahId}:${selected}` })
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm text-brass hover:bg-secondary"
            >
              <NotebookPen className="size-4" aria-hidden />
              {t("Note")}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t("Close")}
              className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      {/* Laid out right to left like the book: the next page is on the left. */}
      <div dir="rtl" className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => turn(-1)}
          disabled={page === 0 && !prevSurah}
          aria-label={page === 0 && prevSurah ? prevSurah.transliteration : t("Previous page")}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border bg-card px-3 text-sm disabled:opacity-40"
        >
          <ChevronRight className="size-5" aria-hidden />
          {page === 0 && prevSurah ? <span className="hidden sm:inline">{prevSurah.transliteration}</span> : null}
        </button>
        <span className="text-sm text-muted-foreground tabular-nums" dir="auto">
          {pageLabel}
        </span>
        <button
          type="button"
          onClick={() => turn(1)}
          disabled={page >= count - 1 && !nextSurah}
          aria-label={page >= count - 1 && nextSurah ? nextSurah.transliteration : t("Next page")}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border bg-card px-3 text-sm disabled:opacity-40"
        >
          {page >= count - 1 && nextSurah ? <span className="hidden sm:inline">{nextSurah.transliteration}</span> : null}
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">{t("Swipe or use the arrows to turn the page. Tap an ayah to listen to it, or for its tafsir, i‘rab or your note.")}</p>
    </div>
  )
}

function LeftOffMark({ label, block = false }: { label: string; block?: boolean }) {
  return (
    <span
      dir="auto"
      className={cn(
        "items-center gap-1 rounded-full border border-gold/60 bg-gold/15 px-2 py-0.5 align-middle font-sans text-xs font-medium text-brass",
        block ? "mb-1 inline-flex" : "me-1 inline-flex",
      )}
    >
      <Bookmark className="size-3.5 fill-gold/50" aria-hidden />
      {label}
    </span>
  )
}

function NoteMark({ label }: { label: string }) {
  return (
    <span role="img" aria-label={label} className="ms-1 inline-flex align-middle text-brass">
      <NotebookPen className="size-4" aria-hidden />
    </span>
  )
}
