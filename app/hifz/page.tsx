import type { Metadata } from "next"
import { ArabicTitle } from "@/components/arabic-title"
import { HifzList } from "@/components/hifz/hifz-list"
import { LibraryTabs } from "@/components/library-tabs"
import { Frieze } from "@/components/ornament"
import { SURAHS } from "@/lib/quran-index"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Memorize the Quran (hifz) with a recitation checker",
  description:
    "Memorize any surah ayah by ayah: hide words step by step, listen and repeat, then recite aloud and Mihrab checks your recitation word by word and marks missed or wrong words. Progress is kept on your device.",
  alternates: { canonical: "/hifz/" },
}

export default function HifzPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <LibraryTabs className="mb-5" />
      <header className="text-center">
        <ArabicTitle className="font-quran">حفظ القرآن</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">
          <T k="Memorize the Quran" />
        </h1>
        <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
          <T k="Pick a surah and a few ayahs. Read, listen, hide the words little by little, then recite from memory and the checker marks any word you missed or got wrong." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <HifzList surahs={SURAHS} />
    </main>
  )
}
