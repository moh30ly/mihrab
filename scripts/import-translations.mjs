// Downloads the Quran translations listed in lib/translations.ts and writes
// public/quran-tr/<code>/<surah>.json as an array with one entry per ayah.
// When a commentary explains several ayahs at once (Tafsir al-Muyassar), the
// repeated text is stored once and the following ayahs hold null.
// Source mirror: https://github.com/fawazahmed0/quran-api (texts unchanged).
// Run: node scripts/import-translations.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const src = readFileSync(join(process.cwd(), "lib", "translations.ts"), "utf8")
const pairs = [...src.matchAll(/code: "(\w+)"[^}]*?edition: "([\w-]+)"/g)].map((m) => [m[1], m[2]])
const counts = JSON.parse(readFileSync(join(process.cwd(), "data", "quran", "surahs.json"), "utf8")).map((s) => s.verses)

for (const [code, edition] of pairs) {
  const url = `https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/${edition}.min.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${edition}: HTTP ${res.status}`)
  const { quran } = await res.json()
  if (quran.length !== 6236) throw new Error(`${edition}: expected 6236 ayahs, found ${quran.length}`)
  const out = join(process.cwd(), "public", "quran-tr", code)
  mkdirSync(out, { recursive: true })
  let i = 0
  for (let surah = 1; surah <= 114; surah++) {
    const verses = []
    let previous = null
    for (let ayah = 1; ayah <= counts[surah - 1]; ayah++, i++) {
      const v = quran[i]
      if (v.chapter !== surah || v.verse !== ayah) throw new Error(`${edition}: misaligned at ${surah}:${ayah}`)
      const text = v.text.trim()
      verses.push(text === previous ? null : text)
      previous = text
    }
    writeFileSync(join(out, `${surah}.json`), JSON.stringify(verses))
  }
  console.log(`${code}: ${edition} ok`)
}
