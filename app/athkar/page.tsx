import type { Metadata } from "next"
import { Frieze } from "@/components/ornament"
import { AthkarReader } from "@/components/athkar/athkar-reader"
import { athkarFor } from "@/lib/athkar"
import { T } from "@/lib/i18n"
import { ArabicTitle } from "@/components/arabic-title"

export const metadata: Metadata = {
  title: "Athkar, daily duas and ruqya",
  description:
    "The morning and evening remembrances, everyday duas for each occasion, and the Quranic ruqya, from Hisn al-Muslim and the Quran, in Arabic with English meaning and sources.",
  alternates: { canonical: "/athkar/" },
}

export default function AthkarPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>الأذكار والأدعية</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove"><T k="Athkar" /></h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="The morning and evening remembrances, everyday duas and ruqya. Tap an athkar card each time you say it." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <AthkarReader morning={athkarFor("morning")} evening={athkarFor("evening")} />
      <footer className="mt-12 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
        <p>
          From <em>Hisn al-Muslim</em> (Fortress of the Muslim) by Sa‘id ibn ‘Ali ibn Wahf al-Qahtani, the chapter on morning and
          evening remembrance. Arabic, English meaning and hadith references from the{" "}
          <a className="underline underline-offset-2" href="https://www.npmjs.com/package/@kazishariar/morning-evening-adhkar-data" rel="noopener">
            morning-evening-adhkar-data
          </a>{" "}
          dataset (CC BY 4.0). The morning athkar are said between Fajr and sunrise, and the evening athkar between Asr and Maghrib.
        </p>
        <p className="mt-3">
          The daily duas and the prophetic ruqya follow <em>Hisn al-Muslim</em>, with the hadith collection and number under each
          one. The Quranic duas and ruqya verses are taken word for word from the KFGQPC Uthmani mushaf text used in the Quran
          reader, with meanings after Saheeh International.
        </p>
      </footer>
    </main>
  )
}
