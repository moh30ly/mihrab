"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { StarBadge } from "@/components/ornament"
import { Input } from "@/components/ui/input"
import { chapterTitle, type HisnTitle } from "@/lib/hisn"
import { normalizeForSearch } from "@/lib/hadith"
import { useT } from "@/lib/i18n"

export function HisnIndex({ chapters }: { chapters: HisnTitle[] }) {
  const { t, locale } = useT()
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = normalizeForSearch(query)
    if (!q) return chapters
    return chapters.filter(
      (c) => String(c.id) === q || [c.ar, c.en, c.tr].some((title) => normalizeForSearch(title).includes(q)),
    )
  }, [chapters, query])

  return (
    <div className="mt-6">
      <label className="relative block">
        <span className="sr-only">{t("Search chapters")}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search the chapters, e.g. travel, rain, sleep")}
          className="h-12 rounded-full bg-card ps-10 text-base"
        />
      </label>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">
        {filtered.map((c) => (
          <li key={c.id} className="min-w-0">
            <Link href={`/athkar/hisn/${c.id}/`} className="andalus-card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent">
              <StarBadge>{c.id}</StarBadge>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug font-medium text-ink">{chapterTitle(c, locale)}</span>
                {locale !== "ar" ? (
                  <span lang="ar" dir="rtl" className="mt-0.5 block font-arabic text-base leading-snug text-brass">
                    {c.ar}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("No chapter matches “{query}”.", { query })}</p>
      ) : null}
    </div>
  )
}
