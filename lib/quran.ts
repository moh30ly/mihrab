import { readFileSync } from "node:fs"
import { join } from "node:path"

export type Verse = { number: number; arabic: string; english: string }

export function loadSurahVerses(id: number): Verse[] {
  const file = join(process.cwd(), "data", "quran", `${id}.json`)
  const raw = JSON.parse(readFileSync(file, "utf8")) as { id: number; verses: [string, string][] }
  return raw.verses.map(([arabic, english], i) => ({ number: i + 1, arabic, english }))
}
