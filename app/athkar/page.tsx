import type { Metadata } from "next"
import { AthkarReader } from "@/components/athkar/athkar-reader"
import { athkarFor } from "@/lib/athkar"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Morning and evening athkar (Adhkar al-Sabah wal-Masa)",
  description:
    "The morning and evening remembrances from Hisn al-Muslim, in Arabic with English meaning, how many times to say each, and a tap counter.",
  alternates: { canonical: "/athkar/" },
}

export default function AthkarPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl tracking-tight text-grove sm:text-5xl"><T k="Athkar" /></h1>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            <T k="The morning and evening remembrances. Tap a card each time you say it." />
          </p>
        </div>
        <p lang="ar" dir="rtl" className="shrink-0 font-arabic text-2xl whitespace-nowrap text-grove sm:text-4xl">
          أذكار الصباح والمساء
        </p>
      </header>
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
      </footer>
    </main>
  )
}
