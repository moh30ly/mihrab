import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { QuranSources } from "@/components/quran/quran-sources"
import { SurahReader } from "@/components/quran/surah-reader"
import { loadSurahVerses } from "@/lib/quran"
import { SURAHS, surahById } from "@/lib/quran-index"

export const dynamicParams = false

export function generateStaticParams() {
  return SURAHS.map((s) => ({ surah: String(s.id) }))
}

const BISMILLAH = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"

function arabicNumber(n: number) {
  return n.toLocaleString("ar-EG", { useGrouping: false })
}

export async function generateMetadata({ params }: PageProps<"/quran/[surah]">): Promise<Metadata> {
  const { surah } = await params
  const info = surahById(Number(surah))
  if (!info) return {}
  return {
    title: `Surah ${info.transliteration} (${info.name}) — ${info.translation}`,
    description: `Read Surah ${info.transliteration}, ${info.translation}, surah ${info.id} of the Quran with ${info.verses} ayahs, in Arabic with the Saheeh International English meaning.`,
    alternates: { canonical: `/quran/${info.id}/` },
  }
}

export default async function SurahPage({ params }: PageProps<"/quran/[surah]">) {
  const { surah } = await params
  const id = Number(surah)
  const info = surahById(id)
  if (!info) notFound()
  const verses = loadSurahVerses(id)
  const prev = surahById(id - 1)
  const next = surahById(id + 1)
  const showBismillah = id !== 1 && id !== 9

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <Link href="/quran/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4" aria-hidden /> All surahs
      </Link>

      <header className="arch-panel mt-4 px-6 pt-10 pb-7 text-center">
        <p className="text-xs tracking-wide text-brass-bright uppercase">
          Surah {info.id} · {info.verses} ayahs · {info.type === "meccan" ? "Makki" : "Madani"}
        </p>
        <h1 className="mt-2">
          <span lang="ar" dir="rtl" className="block font-quran text-5xl leading-snug">
            {info.name}
          </span>
          <span className="mt-1 block font-heading text-2xl">
            {info.transliteration}
            <span className="text-brass-bright"> · {info.translation}</span>
          </span>
        </h1>
      </header>

      <SurahReader surahId={id}>
        {showBismillah ? (
          <p lang="ar" dir="rtl" className="quran-text py-6 text-center text-grove">
            {BISMILLAH}
          </p>
        ) : null}
        <ol className="divide-y divide-border">
          {verses.map((v) => (
            <li key={v.number} id={`ayah-${v.number}`} data-ayah={v.number} className="scroll-mt-20 py-5">
              <p lang="ar" dir="rtl" className="quran-text text-ink">
                {v.arabic}
                <span className="ayah-mark text-brass" aria-label={`Ayah ${v.number}`}>
                  {"۝"}
                  {arabicNumber(v.number)}
                </span>
              </p>
              <p className="quran-translation mt-3 text-base leading-7 text-muted-foreground">
                <a href={`#ayah-${v.number}`} className="mr-2 font-medium text-brass tabular-nums">
                  {info.id}:{v.number}
                </a>
                {v.english}
              </p>
            </li>
          ))}
        </ol>
      </SurahReader>

      <nav aria-label="Surahs" className="mt-8 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`/quran/${prev.id}/`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            <ChevronLeft className="size-4" aria-hidden /> {prev.transliteration}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/quran/${next.id}/`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            {next.transliteration} <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <QuranSources />
    </main>
  )
}
