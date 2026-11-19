import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Metadata } from "next"
import { SadaqahPage } from "@/components/sadaqah-page"
import { loadSurahVerses } from "@/lib/quran"
import { TRANSLATIONS } from "@/lib/translations"

export const metadata: Metadata = {
  title: "Sadaqah and zakat — a simple zakat calculator",
  description:
    "Work out the zakat due on your savings, gold and silver against the nisab, and set reminders for weekly sadaqah and your yearly zakat.",
  alternates: { canonical: "/sadaqah/" },
}

// Al-Baqarah 2:261, the parable of the grain that grows seven ears.
const SURAH = 2
const AYAH = 261

function verse() {
  const v = loadSurahVerses(SURAH)[AYAH - 1]
  const meanings: Record<string, string> = { en: v.english }
  for (const tr of TRANSLATIONS) {
    if (tr.code === "en" || tr.code === "ar") continue
    try {
      const list = JSON.parse(readFileSync(join(process.cwd(), "public", "quran-tr", tr.code, `${SURAH}.json`), "utf8")) as string[]
      if (list[AYAH - 1]) meanings[tr.code] = list[AYAH - 1]
    } catch {
      // That language falls back to English.
    }
  }
  return { surah: SURAH, ayah: AYAH, arabic: v.arabic, meanings }
}

export default function Page() {
  return <SadaqahPage verse={verse()} />
}
