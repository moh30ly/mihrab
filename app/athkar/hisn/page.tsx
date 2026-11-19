import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { ArabicTitle } from "@/components/arabic-title"
import { HisnIndex } from "@/components/hisn/hisn-index"
import { HisnSources } from "@/components/hisn/hisn-sources"
import { Frieze } from "@/components/ornament"
import { hisnTitles } from "@/lib/hisn"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Hisn al-Muslim (Fortress of the Muslim) — all 132 chapters",
  description:
    "The complete Hisn al-Muslim by Sa‘id al-Qahtani: every supplication of all 132 chapters in Arabic, with English and Turkish meanings, repeat counts and hadith sources.",
  alternates: { canonical: "/athkar/hisn/" },
}

export default function HisnPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <Link href="/athkar/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="Athkar" />
      </Link>
      <header className="mt-2 text-center">
        <ArabicTitle>حصن المسلم</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">
          <T k="Hisn al-Muslim" />
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="The complete Fortress of the Muslim: the supplications of the Quran and the Sunnah for every occasion, in 132 chapters." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <HisnIndex chapters={hisnTitles()} />
      <HisnSources />
    </main>
  )
}
