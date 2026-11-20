"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { StarBadge } from "@/components/ornament"
import { NotebookPen, Search } from "lucide-react"
import { ContinueReading } from "@/components/quran/continue-reading"
import { Input } from "@/components/ui/input"
import { type SurahInfo } from "@/lib/quran-index"
import { useNotes } from "@/lib/quran-notes"
import { useT } from "@/lib/i18n"

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ'’`\-\s]/g, "")
}

export function SurahList({ surahs }: { surahs: SurahInfo[] }) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  const noteCount = Object.keys(useNotes()).length

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return surahs
    return surahs.filter(
      (s) =>
        String(s.id) === q ||
        normalize(s.transliteration).includes(q) ||
        normalize(s.translation).includes(q) ||
        s.name.includes(query.trim()),
    )
  }, [query, surahs])

  return (
    <div className="mt-6">
      <ContinueReading className="mb-4" />
      <Link
        href="/quran/notes/"
        className="andalus-card mb-6 flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
      >
        <NotebookPen className="size-5 shrink-0 text-brass" aria-hidden />
        <span className="flex-1 font-medium text-ink">{t("My notes")}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {noteCount === 0 ? t("No notes yet") : noteCount === 1 ? t("1 note") : t("{n} notes", { n: noteCount })}
        </span>
      </Link>

      <label className="relative block">
        <span className="sr-only">{t("Search surahs")}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search by name, meaning, or number")}
          className="h-12 rounded-full bg-card ps-10 text-base"
        />
      </label>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <li key={s.id} className="min-w-0">
            <Link
              href={`/quran/${s.id}/`}
              className="andalus-card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
            >
              <StarBadge>{s.id}</StarBadge>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{s.transliteration}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.translation} · {t("{n} ayahs", { n: s.verses })} · {s.type === "meccan" ? t("Makki") : t("Madani")}
                </span>
              </span>
              <span lang="ar" dir="rtl" className="shrink-0 font-quran text-xl text-grove">
                {s.name}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("No surah matches “{query}”.", { query })}</p>
      ) : null}
    </div>
  )
}
