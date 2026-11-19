// Builds data/quran/ from the quran-json package (https://github.com/risan/quran-json).
// Arabic: Uthmani text of the King Fahd Glorious Qur'an Printing Complex, via The Noble Qur'an Encyclopedia (quranenc.com).
// English: Saheeh International, via Tanzil.net. The text is copied verbatim and never altered.
// Run: node scripts/import-quran.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const require = createRequire(import.meta.url)
const root = dirname(require.resolve("quran-json/package.json"))
const out = join(process.cwd(), "data", "quran")
mkdirSync(out, { recursive: true })

const index = []
let verses = 0
for (let id = 1; id <= 114; id++) {
  const c = JSON.parse(readFileSync(join(root, "dist", "chapters", "en", `${id}.json`), "utf8"))
  if (c.id !== id || c.verses.length !== c.total_verses) throw new Error(`Surah ${id} is incomplete`)
  index.push({
    id,
    name: c.name,
    transliteration: c.transliteration,
    translation: c.translation,
    type: c.type,
    verses: c.total_verses,
  })
  verses += c.verses.length
  writeFileSync(
    join(out, `${id}.json`),
    JSON.stringify({ id, verses: c.verses.map((v) => [v.text, v.translation]) }),
  )
}
if (verses !== 6236) throw new Error(`Expected 6236 verses, found ${verses}`)
writeFileSync(join(out, "surahs.json"), JSON.stringify(index, null, 1) + "\n")
console.log(`Wrote 114 surahs and ${verses} verses to data/quran`)
