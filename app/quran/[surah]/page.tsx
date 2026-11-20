import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight, NotebookPen } from "lucide-react"
import { QuranSources } from "@/components/quran/quran-sources"
import { SurahReader } from "@/components/quran/surah-reader"
import { loadSurahVerses } from "@/lib/quran"
import { SURAHS, surahById } from "@/lib/quran-index"
import { T } from "@/lib/i18n"

export const dynamicParams = false

export function generateStaticParams() {
  return SURAHS.map((s) => ({ surah: String(s.id) }))
}

const BISMILLAH = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ"

export async function generateMetadata({ params }: PageProps<"/quran/[surah]">): Promise<Metadata> {
  const { surah } = await params
  const info = surahById(Number(surah))
  if (!info) return {}
  return {
    title: `Surah ${info.transliteration} (${info.name}) — ${info.translation}`,
    description: `Read Surah ${info.transliteration}, ${info.translation}, surah ${info.id} of the Quran with ${info.verses} ayahs, in Arabic with translations in English, Arabic (Tafsir al-Muyassar), German, Italian, Chinese, Japanese, Turkish, Portuguese and Spanish.`,
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
      <div className="flex items-center justify-between gap-3">
        <Link href="/quran/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="All surahs" />
        </Link>
        <Link href="/quran/notes/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-grove">
          <NotebookPen className="size-4" aria-hidden /> <T k="My notes" />
        </Link>
      </div>

      <header className="arch-panel mt-4 px-6 pt-10 pb-7 text-center">
        <p className="text-xs tracking-wide text-brass-bright uppercase">
          <T k="Surah {n}" vars={{ n: info.id }} /> · <T k="{n} ayahs" vars={{ n: info.verses }} /> ·{" "}
          <T k={info.type === "meccan" ? "Makki" : "Madani"} />
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

      <SurahReader surahId={id} surahName={info.name} verses={verses} bismillah={showBismillah ? BISMILLAH : null} />

      <nav aria-label="Surahs" dir="ltr" className="mt-8 flex items-center justify-between gap-3">
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
