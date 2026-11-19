import type { Metadata } from "next"
import Link from "next/link"
import { ArabicTitle } from "@/components/arabic-title"
import { HadithSources } from "@/components/hadith/hadith-sources"
import { LibraryTabs } from "@/components/library-tabs"
import { Frieze, StarBadge } from "@/components/ornament"
import { HADITH_COLLECTIONS } from "@/lib/hadith"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Hadith collections — Sahih al-Bukhari, Sahih Muslim, the Forty Hadith and more",
  description:
    "Read and search Sahih al-Bukhari, Sahih Muslim, the Forty Hadith of an-Nawawi, Forty Hadith Qudsi and the Sunan, in Arabic with English and Turkish translations.",
  alternates: { canonical: "/hadith/" },
}

export default function HadithPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <LibraryTabs className="mb-5" />
      <header className="text-center">
        <ArabicTitle>الحديث النبوي</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">
          <T k="Hadith" />
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="The sayings of the Prophet ﷺ from the major collections, in Arabic with translation. Browse by book or search." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <ol className="mt-6 grid gap-2 sm:grid-cols-2">
        {HADITH_COLLECTIONS.map((c, i) => (
          <li key={c.id} className="min-w-0">
            <Link href={`/hadith/${c.id}/`} className="andalus-card flex items-center gap-3 px-3 py-3 transition-colors hover:bg-accent">
              <StarBadge>{i + 1}</StarBadge>
              <span className="min-w-0 flex-1">
                <span className="block font-medium leading-snug text-ink">{c.english}</span>
                {c.author ? <span className="block truncate text-xs text-muted-foreground">{c.author}</span> : null}
              </span>
              <span lang="ar" dir="rtl" className="max-w-[45%] shrink-0 text-end font-arabic text-lg leading-snug text-grove">
                {c.arabic}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <HadithSources />
    </main>
  )
}
