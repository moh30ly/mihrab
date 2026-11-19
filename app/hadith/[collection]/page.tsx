import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { HadithCollectionView } from "@/components/hadith/hadith-collection"
import { HadithSources } from "@/components/hadith/hadith-sources"
import { HADITH_COLLECTIONS, collectionById } from "@/lib/hadith"
import { T } from "@/lib/i18n"

export const dynamicParams = false

export function generateStaticParams() {
  return HADITH_COLLECTIONS.map((c) => ({ collection: c.id }))
}

export async function generateMetadata({ params }: PageProps<"/hadith/[collection]">): Promise<Metadata> {
  const { collection } = await params
  const c = collectionById(collection)
  if (!c) return {}
  return {
    title: `${c.english} (${c.arabic}) — read and search`,
    description: `Read and search ${c.english}${c.author ? ` by ${c.author}` : ""} in Arabic with English translation, book by book, on Mihrab.`,
    alternates: { canonical: `/hadith/${c.id}/` },
  }
}

export default async function HadithCollectionPage({ params }: PageProps<"/hadith/[collection]">) {
  const { collection } = await params
  const c = collectionById(collection)
  if (!c) notFound()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <Link href="/hadith/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="All collections" />
      </Link>
      <header className="arch-panel mt-4 px-6 pt-10 pb-7 text-center">
        <h1>
          <span lang="ar" dir="rtl" className="block font-arabic text-4xl leading-snug">
            {c.arabic}
          </span>
          <span className="mt-1 block font-heading text-2xl">{c.english}</span>
        </h1>
        {c.author ? <p className="mt-1 text-sm text-brass-bright">{c.author}</p> : null}
      </header>
      <HadithCollectionView collectionId={c.id} />
      <HadithSources />
    </main>
  )
}
