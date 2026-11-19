import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { HisnChapterView } from "@/components/hisn/hisn-chapter"
import { HisnSources } from "@/components/hisn/hisn-sources"
import { HISN, hisnChapter } from "@/lib/hisn"
import { T } from "@/lib/i18n"

export const dynamicParams = false

export function generateStaticParams() {
  return HISN.map((c) => ({ chapter: String(c.id) }))
}

export async function generateMetadata({ params }: PageProps<"/athkar/hisn/[chapter]">): Promise<Metadata> {
  const { chapter } = await params
  const c = hisnChapter(Number(chapter))
  if (!c) return {}
  return {
    title: `${c.en} (${c.ar}) — Hisn al-Muslim ${c.id}`,
    description: `${c.en}: chapter ${c.id} of Hisn al-Muslim, in Arabic with English meaning, how many times to say it and the hadith source.`,
    alternates: { canonical: `/athkar/hisn/${c.id}/` },
  }
}

export default async function HisnChapterPage({ params }: PageProps<"/athkar/hisn/[chapter]">) {
  const { chapter } = await params
  const c = hisnChapter(Number(chapter))
  if (!c) notFound()
  const prev = hisnChapter(c.id - 1)
  const next = hisnChapter(c.id + 1)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <Link href="/athkar/hisn/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="Hisn al-Muslim" /> · <T k="Chapter {n}" vars={{ n: c.id }} />
      </Link>
      <HisnChapterView chapter={c} />
      <nav aria-label="Chapters" dir="ltr" className="mt-8 flex items-center justify-between gap-3">
        {prev ? (
          <Link href={`/athkar/hisn/${prev.id}/`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            <ChevronLeft className="size-4" aria-hidden /> {prev.id}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/athkar/hisn/${next.id}/`} className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm">
            {next.id} <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
      <HisnSources />
    </main>
  )
}
