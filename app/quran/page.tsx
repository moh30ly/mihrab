import type { Metadata } from "next"
import { Frieze } from "@/components/ornament"
import { SurahList } from "@/components/quran/surah-list"
import { QuranSources } from "@/components/quran/quran-sources"
import { SURAHS } from "@/lib/quran-index"
import { T } from "@/lib/i18n"
import { ArabicTitle } from "@/components/arabic-title"
import { LibraryTabs } from "@/components/library-tabs"

export const metadata: Metadata = {
  title: "The Holy Quran — read all 114 surahs",
  description:
    "Read the Holy Quran in the Uthmani script of the King Fahd Complex, with the Saheeh International English meaning, on Mihrab.",
  alternates: { canonical: "/quran/" },
}

export default function QuranPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <LibraryTabs className="mb-5" />
      <header className="text-center">
        <ArabicTitle className="font-quran">القرآن الكريم</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove"><T k="The Holy Quran" /></h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="All 114 surahs in Arabic, with the meaning in English and eight more languages." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <SurahList surahs={SURAHS} />
      <QuranSources />
    </main>
  )
}
