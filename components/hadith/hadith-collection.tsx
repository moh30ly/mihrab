"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { StarBadge } from "@/components/ornament"
import { Input } from "@/components/ui/input"
import { fetchLibrary } from "@/lib/library"
import {
  bookOf,
  collectionById,
  normalizeForSearch,
  searchLanguage,
  searchRows,
  type Hadith,
  type HadithIndex,
  type SearchRow,
} from "@/lib/hadith"
import { useT } from "@/lib/i18n"

type View = { book: number | null; hadith: number | null }

function parseHash(hash: string): View {
  const m = /^#book-(\d+)(?:-h([\d.]+))?$/.exec(hash)
  return m ? { book: Number(m[1]), hadith: m[2] ? Number(m[2]) : null } : { book: null, hadith: null }
}

function useHashView(): View {
  const [view, setView] = useState<View>({ book: null, hadith: null })
  useEffect(() => {
    const read = () => setView(parseHash(window.location.hash))
    read()
    window.addEventListener("hashchange", read)
    return () => window.removeEventListener("hashchange", read)
  }, [])
  return view
}

function Loading({ failed }: { failed: boolean }) {
  const { t } = useT()
  return (
    <p className="py-8 text-center text-muted-foreground">
      {failed ? t("This collection could not be loaded. Check your connection and try again.") : t("Loading…")}
    </p>
  )
}

export function HadithCollectionView({ collectionId }: { collectionId: string }) {
  const { t } = useT()
  const view = useHashView()
  const [index, setIndex] = useState<HadithIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    fetchLibrary<HadithIndex>(`hadith/${collectionId}/index.json`)
      .then((i) => !cancelled && setIndex(i))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [collectionId])

  if (!index) return <Loading failed={failed} />
  const book = view.book !== null ? index.books.find((b) => b.n === view.book) : undefined

  return (
    <div className="mt-6">
      <label className="relative block">
        <span className="sr-only">{t("Search hadith")}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search in Arabic or English, or type a number")}
          className="h-12 rounded-full bg-card ps-10 text-base"
        />
      </label>

      {query.trim() ? (
        <SearchResults collectionId={collectionId} index={index} query={query.trim()} onOpen={() => setQuery("")} />
      ) : book ? (
        <BookView collectionId={collectionId} index={index} bookNumber={book.n} focus={view.hadith} />
      ) : (
        <>
          <p className="mt-4 px-1 text-sm text-muted-foreground">
            {t("{n} hadiths in {books} books", { n: index.total.toLocaleString(), books: index.books.length })}
          </p>
          <ol className="mt-2 grid gap-2">
            {index.books.map((b) => (
              <li key={b.n}>
                <a href={`#book-${b.n}`} className="andalus-card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent">
                  <StarBadge>{b.n}</StarBadge>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{b.name || t("Book {n}", { n: b.n })}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t("Hadith {from}–{to}", { from: b.first, to: b.last })} · {t("{n} hadiths", { n: b.count })}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function BookView({
  collectionId,
  index,
  bookNumber,
  focus,
}: {
  collectionId: string
  index: HadithIndex
  bookNumber: number
  focus: number | null
}) {
  const { t } = useT()
  const [loaded, setLoaded] = useState<{ key: string; rows: Hadith[] } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const key = `${collectionId}/${bookNumber}`

  useEffect(() => {
    let cancelled = false
    fetchLibrary<Hadith[]>(`hadith/${key}.json`)
      .then((rows) => !cancelled && setLoaded({ key, rows }))
      .catch(() => !cancelled && setFailed(key))
    return () => {
      cancelled = true
    }
  }, [key])

  const rows = loaded?.key === key ? loaded.rows : null
  useEffect(() => {
    if (!rows) return
    const el = focus !== null ? document.getElementById(`hadith-${focus}`) : null
    if (el) el.scrollIntoView({ block: "start" })
    else window.scrollTo({ top: 0 })
  }, [rows, focus])

  const i = index.books.findIndex((b) => b.n === bookNumber)
  const book = index.books[i]
  const prev = index.books[i - 1]
  const next = index.books[i + 1]

  return (
    <section className="mt-6">
      <a href="#" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("All books")}
      </a>
      <h2 className="mt-2 font-heading text-2xl text-grove">
        {t("Book {n}", { n: book.n })}
        {book.name ? <span className="block text-lg text-ink">{book.name}</span> : null}
      </h2>
      {!rows ? (
        <Loading failed={failed === key} />
      ) : (
        <ol className="mt-4 grid gap-3">
          {rows.map((h) => (
            <HadithCard key={h.n} collectionId={collectionId} book={book.n} hadith={h} />
          ))}
        </ol>
      )}
      <nav aria-label={t("Books")} dir="ltr" className="mt-8 flex items-center justify-between gap-3">
        {prev ? (
          <a href={`#book-${prev.n}`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            <ChevronLeft className="size-4" aria-hidden /> {t("Book {n}", { n: prev.n })}
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a href={`#book-${next.n}`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            {t("Book {n}", { n: next.n })} <ChevronRight className="size-4" aria-hidden />
          </a>
        ) : (
          <span />
        )}
      </nav>
    </section>
  )
}

function HadithCard({ collectionId, book, hadith }: { collectionId: string; book: number; hadith: Hadith }) {
  const { t, locale } = useT()
  const name = collectionById(collectionId)?.english ?? ""
  const translation = locale === "tr" && hadith.tr ? { lang: "tr", text: hadith.tr } : { lang: "en", text: hadith.en }
  return (
    <li id={`hadith-${hadith.n}`} className="andalus-card scroll-mt-20 px-4 py-4">
      <a href={`#book-${book}-h${hadith.n}`} className="text-sm font-medium text-brass tabular-nums">
        {name} {hadith.n}
      </a>
      {hadith.ar ? (
        <p lang="ar" dir="rtl" className="mt-2 font-arabic text-xl leading-[2] text-ink">
          {hadith.ar}
        </p>
      ) : null}
      {translation.text ? (
        <p lang={translation.lang} className="mt-3 text-base leading-7 text-muted-foreground">
          {translation.text}
        </p>
      ) : null}
      {hadith.g?.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("Grading")}>
          {hadith.g.map(([scholar, grade]) => (
            <li key={scholar} className="rounded-full border border-gold/50 bg-secondary px-2.5 py-0.5 text-xs text-ink">
              {grade} <span className="text-muted-foreground">· {scholar}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function snippet(text: string, query: string) {
  const first = query.split(" ")[0] ?? ""
  const at = Math.max(0, text.indexOf(first))
  const start = Math.max(0, at - 60)
  return (start > 0 ? "… " : "") + text.slice(start, start + 220) + (start + 220 < text.length ? " …" : "")
}

function SearchResults({
  collectionId,
  index,
  query,
  onOpen,
}: {
  collectionId: string
  index: HadithIndex
  query: string
  onOpen: () => void
}) {
  const { t } = useT()
  const lang = searchLanguage(query)
  const [loaded, setLoaded] = useState<{ key: string; rows: SearchRow[] } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [debounced, setDebounced] = useState(query)
  const key = `${collectionId}/search-${lang}`

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250)
    return () => clearTimeout(id)
  }, [query])

  const byNumber = /^\d+(\.\d+)?$/.test(debounced) ? Number(debounced) : null
  useEffect(() => {
    if (byNumber !== null) return
    let cancelled = false
    fetchLibrary<SearchRow[]>(`hadith/${key}.json`)
      .then((rows) => !cancelled && setLoaded({ key, rows }))
      .catch(() => !cancelled && setFailed(key))
    return () => {
      cancelled = true
    }
  }, [key, byNumber])

  const results = useMemo(() => {
    if (byNumber !== null || loaded?.key !== key) return null
    return searchRows(loaded.rows, debounced)
  }, [loaded, key, debounced, byNumber])

  if (byNumber !== null) {
    const book = bookOf(index, byNumber)
    return (
      <div className="mt-4">
        {book ? (
          <a href={`#book-${book.n}-h${byNumber}`} onClick={onOpen} className="andalus-card block px-4 py-3 hover:bg-accent">
            {t("Open hadith {n}", { n: byNumber })} · {book.name || t("Book {n}", { n: book.n })}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">{t("No hadith has the number {n}.", { n: byNumber })}</p>
        )}
      </div>
    )
  }
  if (!results) return <Loading failed={failed === key} />
  const normalizedQuery = normalizeForSearch(debounced)
  return (
    <div className="mt-4">
      <p className="px-1 text-sm text-muted-foreground">
        {results.length === 0
          ? t("No hadith matches “{query}”.", { query: debounced })
          : results.length >= 50
            ? t("The first {n} matches", { n: results.length })
            : results.length === 1
              ? t("1 match")
              : t("{n} matches", { n: results.length })}
      </p>
      <ol className="mt-2 grid gap-2">
        {results.map(([n, text, bookNumber]) => {
          const book = index.books.find((b) => b.n === bookNumber)
          return (
            <li key={n}>
              <a
                href={`#book-${bookNumber}-h${n}`}
                onClick={onOpen}
                className="andalus-card block px-4 py-3 transition-colors hover:bg-accent"
              >
                <span className="block text-sm font-medium text-brass tabular-nums">
                  {n}
                  {book?.name ? ` · ${book.name}` : ""}
                </span>
                <span lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={lang === "ar" ? "mt-1 block font-arabic text-lg leading-8 text-ink" : "mt-1 block text-sm leading-6 text-ink"}>
                  {snippet(text, normalizedQuery)}
                </span>
              </a>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
