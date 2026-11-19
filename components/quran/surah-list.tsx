"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LAST_READ_KEY, type SurahInfo } from "@/lib/quran-index"

type LastRead = { surah: number; ayah: number }

function readLastRead(): string | null {
  try {
    return window.localStorage.getItem(LAST_READ_KEY)
  } catch {
    return null
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ'’`\-\s]/g, "")
}

export function SurahList({ surahs }: { surahs: SurahInfo[] }) {
  const [query, setQuery] = useState("")
  const rawLast = useSyncExternalStore(subscribe, readLastRead, () => null)
  const last = useMemo<LastRead | null>(() => {
    if (!rawLast) return null
    try {
      const v = JSON.parse(rawLast) as LastRead
      return v.surah >= 1 && v.surah <= 114 ? v : null
    } catch {
      return null
    }
  }, [rawLast])

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
          href={`/quran/${lastSurah.id}/#ayah-${last.ayah}`}
          className="arch-panel mb-6 flex items-center justify-between gap-4 px-6 py-5 !rounded-[1.5rem]"
        >
          <span>
            <span className="block text-xs tracking-wide text-brass-bright uppercase">Continue reading</span>
            <span className="font-heading text-2xl">
              {lastSurah.transliteration}, ayah {last.ayah}
            </span>
          </span>
          <span lang="ar" dir="rtl" className="font-quran text-3xl">
            {lastSurah.name}
          </span>
        </Link>
      ) : null}

      <label className="relative block">
        <span className="sr-only">Search surahs</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, meaning, or number"
          className="h-12 rounded-full bg-card pl-10 text-base"
        />
      </label>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <li key={s.id} className="min-w-0">
            <Link
              href={`/quran/${s.id}/`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-brass"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-medium text-grove tabular-nums">
                {s.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{s.transliteration}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {s.translation} · {s.verses} ayahs · {s.type === "meccan" ? "Makki" : "Madani"}
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
        <p className="mt-6 text-sm text-muted-foreground">No surah matches “{query}”.</p>
      ) : null}
    </div>
  )
}
