import type { Metadata } from "next"
import { SurahList } from "@/components/quran/surah-list"
import { QuranSources } from "@/components/quran/quran-sources"
import { SURAHS } from "@/lib/quran-index"

export const metadata: Metadata = {
  title: "The Holy Quran — read all 114 surahs",
  description:
    "Read the Holy Quran in the Uthmani script of the King Fahd Complex, with the Saheeh International English meaning, on Mihrab.",
  alternates: { canonical: "/quran/" },
}

export default function QuranPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl tracking-tight text-grove sm:text-5xl">The Holy Quran</h1>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            All 114 surahs in Arabic, with an English meaning beneath each ayah.
          </p>
        </div>
        <p lang="ar" dir="rtl" className="shrink-0 font-quran text-2xl whitespace-nowrap text-grove sm:text-4xl">
          القرآن الكريم
        </p>
      </header>
      <SurahList surahs={SURAHS} />
      <QuranSources />
    </main>
  )
}
