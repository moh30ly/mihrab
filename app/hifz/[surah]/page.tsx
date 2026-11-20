import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { HifzSession } from "@/components/hifz/hifz-session"
import { loadSurahVerses } from "@/lib/quran"
import { SURAHS, surahById } from "@/lib/quran-index"
import { T } from "@/lib/i18n"

export const dynamicParams = false

export function generateStaticParams() {
  return SURAHS.map((s) => ({ surah: String(s.id) }))
}

export async function generateMetadata({ params }: PageProps<"/hifz/[surah]">): Promise<Metadata> {
  const { surah } = await params
  const info = surahById(Number(surah))
  if (!info) return {}
  return {
    title: `Memorize Surah ${info.transliteration} (${info.name})`,
    description: `Memorize Surah ${info.transliteration} (${info.translation}) ayah by ayah: hide words step by step, repeat, and recite aloud to have your recitation checked word by word.`,
    alternates: { canonical: `/hifz/${info.id}/` },
  }
}

export default async function HifzSurahPage({ params }: PageProps<"/hifz/[surah]">) {
  const { surah } = await params
  const id = Number(surah)
  const info = surahById(id)
  if (!info) notFound()
  const verses = loadSurahVerses(id)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/hifz/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-grove">
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="Memorize" />
        </Link>
        <Link href={`/quran/${id}/`} className="text-muted-foreground underline-offset-2 hover:text-grove hover:underline">
          <T k="Read this surah" />
        </Link>
      </div>

      <header className="arch-panel mt-4 px-6 pt-8 pb-6 text-center">
        <p className="text-xs tracking-wide text-brass-bright uppercase">
          <T k="Memorize" /> · <T k="Surah {n}" vars={{ n: info.id }} /> · <T k="{n} ayahs" vars={{ n: info.verses }} />
        </p>
        <h1 className="mt-2">
          <span lang="ar" dir="rtl" className="block font-quran text-4xl leading-snug">
            {info.name}
          </span>
          <span className="mt-1 block font-heading text-2xl">
            {info.transliteration}
            <span className="text-brass-bright"> · {info.translation}</span>
          </span>
        </h1>
      </header>

      <HifzSession surahId={id} verses={verses} />
    </main>
  )
}
