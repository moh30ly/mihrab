"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { StarBadge } from "@/components/ornament"
import { Input } from "@/components/ui/input"
import { useHifzProgress, useLastSession } from "@/components/hifz/use-hifz"
import { surahSummary } from "@/lib/hifz"
import type { SurahInfo } from "@/lib/quran-index"
import { useT } from "@/lib/i18n"

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ'’`\-\s]/g, "")
}

/** Short surahs first is how most people start, so Juz' Amma is offered at the top. */
const STARTERS = [1, 112, 113, 114, 108, 103, 110, 109, 111, 107]

export function HifzList({ surahs }: { surahs: SurahInfo[] }) {
  const { t } = useT()
  const [query, setQuery] = useState("")
  const { progress } = useHifzProgress()
  const last = useLastSession()

  const summaries = useMemo(() => surahs.map((s) => surahSummary(progress, s.id, s.verses)), [progress, surahs])
  const total = summaries.reduce((a, s) => a + s.memorized, 0)
  const started = surahs.filter((_, i) => summaries[i].memorized + summaries[i].learning > 0)

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

  const lastSurah = last ? surahs[last.surah - 1] : null

  return (
    <div className="mt-6">
      {lastSurah && last ? (
        <Link
          href={`/hifz/${lastSurah.id}/?from=${last.from}&to=${last.to}`}
          className="arch-panel mb-6 flex items-center justify-between gap-4 px-6 py-5 !rounded-[1.5rem]"
        >
          <span>
            <span className="block text-xs tracking-wide text-brass-bright uppercase">{t("Continue memorizing")}</span>
            <span className="font-heading text-2xl">
              {t("{surah}, ayahs {from}–{to}", { surah: lastSurah.transliteration, from: last.from, to: last.to })}
            </span>
          </span>
          <span lang="ar" dir="rtl" className="font-quran text-3xl">
            {lastSurah.name}
          </span>
        </Link>
      ) : null}

      <div className="andalus-card mb-6 grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <p>
          <span className="font-heading text-2xl text-grove">{t("{n} ayahs memorized", { n: total })}</span>
          <span className="block text-muted-foreground">
            {started.length > 0
              ? t("In {n} surahs. An ayah counts once you recite it from memory with at most one slip.", { n: started.length })
              : t("An ayah counts once you recite it from memory with at most one slip.")}
          </span>
        </p>
        {started.length === 0 ? (
          <p className="text-muted-foreground">
            {t("Good places to start:")}{" "}
            {STARTERS.slice(0, 4).map((id, i) => (
              <span key={id}>
                {i > 0 ? " · " : ""}
                <Link className="text-grove underline underline-offset-2" href={`/hifz/${id}/`}>
                  {surahs[id - 1].transliteration}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>

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
        {filtered.map((s) => {
          const sum = summaries[s.id - 1]
          const done = sum.memorized / s.verses
          const touched = sum.memorized + sum.learning > 0
          return (
            <li key={s.id} className="min-w-0">
              <Link href={`/hifz/${s.id}/`} className="andalus-card flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent">
                <StarBadge>{s.id}</StarBadge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.transliteration}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {touched ? t("{done} of {n} ayahs memorized", { done: sum.memorized, n: s.verses }) : t("{n} ayahs", { n: s.verses })}
                  </span>
                  {touched ? (
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                      <span className="block h-full rounded-full bg-teal" style={{ width: `${Math.max(done * 100, 2)}%` }} />
                    </span>
                  ) : null}
                </span>
                <span lang="ar" dir="rtl" className="shrink-0 font-quran text-xl text-grove">
                  {s.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
      {filtered.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{t("No surah matches “{query}”.", { query })}</p> : null}
    </div>
  )
}
