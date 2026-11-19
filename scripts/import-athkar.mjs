// Builds data/athkar.json: the morning and evening remembrances from
// Hisn al-Muslim (Fortress of the Muslim) by Sa'id ibn Ali ibn Wahf al-Qahtani,
// chapter 27, with the English translation and hadith references from the
// @kazishariar/morning-evening-adhkar-data package (CC BY 4.0).
// The Arabic and English are copied unchanged. This script only adds when each
// dhikr is said (morning, evening, or both) and how many times, as in the book.
// Run: node scripts/import-athkar.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

const require = createRequire(import.meta.url)
const { data } = JSON.parse(readFileSync(require.resolve("@kazishariar/morning-evening-adhkar-data/data"), "utf8"))

// id -> [when, count, note]
const PLAN = {
  1: ["both", 1],
  2: ["both", 1, "Ayat al-Kursi (al-Baqarah 2:255)"],
  3: ["evening", 1, "The last two ayahs of al-Baqarah (2:285–286)"],
  4: ["both", 3, "Surah al-Ikhlas"],
  5: ["both", 3, "Surah al-Falaq"],
  6: ["both", 3, "Surah an-Nas"],
  7: ["morning", 1],
  8: ["evening", 1],
  9: ["morning", 1],
  10: ["evening", 1],
  11: ["both", 1, "Sayyid al-Istighfar, the master supplication for forgiveness"],
  12: ["morning", 4],
  13: ["evening", 4],
  14: ["morning", 1],
  15: ["evening", 1],
  16: ["both", 3],
  17: ["both", 7],
  18: ["both", 1],
  19: ["both", 1],
  20: ["both", 3],
  21: ["both", 3],
  22: ["both", 1],
  23: ["morning", 1],
  24: ["evening", 1],
  25: ["morning", 1],
  26: ["evening", 1],
  27: ["morning", 1],
  28: ["both", 10, "Or once when you are short of energy"],
  29: ["both", 10],
  30: ["evening", 3],
  31: ["morning", 3],
  32: ["morning", 100],
  33: ["both", 100, "One hundred times through the day"],
  34: ["both", 100],
}

const out = data.map((item) => {
  const id = Number(item.id.replace("adhkar_", ""))
  const plan = PLAN[id]
  if (!plan) throw new Error(`No plan for ${item.id}`)
  const [when, count, note] = plan
  return { id, when, count, note: note ?? null, arabic: item.arabic, english: item.english, reference: item.source }
})
if (out.length !== Object.keys(PLAN).length) throw new Error("Athkar count changed")
writeFileSync(join(process.cwd(), "data", "athkar.json"), JSON.stringify(out, null, 1) + "\n")
console.log(`Wrote ${out.length} athkar`)
