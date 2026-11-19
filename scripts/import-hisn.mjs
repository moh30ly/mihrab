// Builds data/hisn.json: the whole of Hisn al-Muslim (Fortress of the Muslim)
// by Sa'id ibn Ali ibn Wahf al-Qahtani, chapter by chapter.
//
// - Arabic, English and Turkish, chapter titles and repeat counts: the
//   Islamic-Pro-azkar-API dataset (MIT), which follows the 132 chapters and
//   267 supplications of the book as published on hisnmuslim.com.
// - Hadith sources: the HisnElMuslim dataset by Abdellah Sellam (MIT), typed
//   from the printed book and checked against an online copy. Its items are
//   split a little differently, so each supplication is matched to it by its
//   Arabic words, and only a close match gives a source.
//
// The texts are copied unchanged, apart from trimming spaces and capitalising
// the first letter of the English chapter titles.
// Run: node scripts/import-hisn.mjs
import { writeFileSync } from "node:fs"
import { join } from "node:path"

const BOOK = "https://raw.githubusercontent.com/YousefAsalya/Islamic-Pro-azkar-API/main/data"
const REFS = "https://raw.githubusercontent.com/asellam/HisnElMuslim/main/hisn.json"

async function get(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}

/** Arabic words without diacritics or letter variants, for matching. */
function words(text) {
  return text
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي ]+/g, " ")
    .split(" ")
    .filter(Boolean)
}

const [ar, en, tr, refs] = await Promise.all([get(`${BOOK}/ar.json`), get(`${BOOK}/en.json`), get(`${BOOK}/tr.json`), get(REFS)])
const byId = (list) => new Map(list.map((c) => [c.id, c]))
const enById = byId(en)
const trById = byId(tr)

const pool = Object.values(refs).flatMap((chapter, index) =>
  chapter.Adhkar.map((d) => ({ chapter: index + 1, words: new Set(words(d.Text)), ref: String(d.Reference ?? "").trim() })),
)

/** The source of the closest supplication; the same text in two chapters goes to the nearer chapter. */
function sourceFor(arabic, chapterId) {
  const mine = new Set(words(arabic))
  let best = null
  let bestScore = 0
  const nearer = (p) => !best || Math.abs(p.chapter - chapterId) < Math.abs(best.chapter - chapterId)
  for (const p of pool) {
    let common = 0
    for (const w of mine) if (p.words.has(w)) common++
    const jaccard = common / (mine.size + p.words.size - common || 1)
    const contained = common / (Math.min(mine.size, p.words.size) || 1)
    const score = Math.max(jaccard, contained >= 0.9 && Math.min(mine.size, p.words.size) >= 3 ? 0.6 : 0)
    if (score > bestScore + 0.02 || (score >= bestScore - 0.02 && score > 0 && nearer(p))) {
      bestScore = Math.max(bestScore, score)
      best = p
    }
  }
  return bestScore >= 0.6 && best.ref ? best.ref : null
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1)
let matched = 0
let total = 0
const chapters = [...ar]
  .sort((a, b) => a.id - b.id)
  .map((c) => {
    const e = enById.get(c.id)
    const t = trById.get(c.id)
    if (!e || !t || e.array.length !== c.array.length || t.array.length !== c.array.length) {
      throw new Error(`Chapter ${c.id} does not line up across languages`)
    }
    return {
      id: c.id,
      ar: c.category.trim(),
      en: capitalise(e.category.trim()),
      tr: t.category.trim(),
      items: c.array.map((d, i) => {
        if (e.array[i].id !== d.id || t.array[i].id !== d.id) throw new Error(`Chapter ${c.id}: item ${d.id} does not line up`)
        const ref = sourceFor(d.text, c.id)
        total++
        if (ref) matched++
        return {
          id: d.id,
          ar: d.text.trim(),
          en: e.array[i].text.trim(),
          tr: t.array[i].text.trim(),
          count: d.count > 0 ? d.count : 1,
          ...(ref ? { ref } : {}),
        }
      }),
    }
  })

if (chapters.length !== 132 || total !== 267) throw new Error(`Expected 132 chapters and 267 items, found ${chapters.length} and ${total}`)
writeFileSync(join(process.cwd(), "data", "hisn.json"), JSON.stringify(chapters, null, 1) + "\n")
console.log(`data/hisn.json: ${chapters.length} chapters, ${total} supplications, ${matched} with a source`)
