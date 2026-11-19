// Hadith collections, browsable by book (kitab) and searchable.
// The texts come from the fawazahmed0/hadith-api dataset (released into the
// public domain under the Unlicense), which gathers the Arabic and the
// published translations; the gradings are those listed in the dataset.
// scripts/fetch-library.mjs writes, for each collection:
//   /library/hadith/<id>/index.json        the books with their hadith ranges
//   /library/hadith/<id>/<book>.json       the hadiths of one book
//   /library/hadith/<id>/search-<lang>.json  [number, plain text, book] rows for search
export type HadithCollection = {
  id: string
  /** The dataset's name for the collection. */
  key: string
  english: string
  arabic: string
  author: string
  /** Translations besides English, by interface language. */
  extra: string[]
}

export const HADITH_COLLECTIONS: HadithCollection[] = [
  { id: "bukhari", key: "bukhari", english: "Sahih al-Bukhari", arabic: "صحيح البخاري", author: "Imam al-Bukhari (d. 256 AH)", extra: ["tr"] },
  { id: "muslim", key: "muslim", english: "Sahih Muslim", arabic: "صحيح مسلم", author: "Imam Muslim (d. 261 AH)", extra: ["tr"] },
  { id: "nawawi", key: "nawawi", english: "The Forty Hadith of an-Nawawi", arabic: "الأربعون النووية", author: "Imam an-Nawawi (d. 676 AH)", extra: ["tr"] },
  { id: "qudsi", key: "qudsi", english: "Forty Hadith Qudsi", arabic: "الأحاديث القدسية الأربعون", author: "", extra: [] },
  { id: "abudawud", key: "abudawud", english: "Sunan Abi Dawud", arabic: "سنن أبي داود", author: "Imam Abu Dawud (d. 275 AH)", extra: ["tr"] },
  { id: "tirmidhi", key: "tirmidhi", english: "Jami‘ at-Tirmidhi", arabic: "جامع الترمذي", author: "Imam at-Tirmidhi (d. 279 AH)", extra: ["tr"] },
  { id: "nasai", key: "nasai", english: "Sunan an-Nasa’i", arabic: "سنن النسائي", author: "Imam an-Nasa’i (d. 303 AH)", extra: ["tr"] },
  { id: "ibnmajah", key: "ibnmajah", english: "Sunan Ibn Majah", arabic: "سنن ابن ماجه", author: "Imam Ibn Majah (d. 273 AH)", extra: ["tr"] },
  { id: "malik", key: "malik", english: "Muwatta Malik", arabic: "موطأ مالك", author: "Imam Malik (d. 179 AH)", extra: ["tr"] },
]

export function collectionById(id: string): HadithCollection | undefined {
  return HADITH_COLLECTIONS.find((c) => c.id === id)
}

export type HadithBook = { n: number; name: string; first: number; last: number; count: number }
export type HadithIndex = {
  name: string
  total: number
  books: HadithBook[]
  /** [first number, last number, book]: runs of consecutive hadiths in one book. */
  runs: [number, number, number][]
}
export type Hadith = {
  /** Number in the collection. */
  n: number
  ar: string
  en: string
  tr?: string
  /** Gradings: [scholar, grade]. */
  g?: [string, string][]
}
/** [number, plain text, book]. */
export type SearchRow = [number, string, number]

/** Lower case, without Arabic diacritics, tatweel or alif and ya variants, for matching. */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

export function searchLanguage(query: string): "ar" | "en" {
  return /[؀-ۿ]/.test(query) ? "ar" : "en"
}

/** Rows whose text contains every word of the query, best first. */
export function searchRows(rows: SearchRow[], query: string, limit = 50): SearchRow[] {
  const words = normalizeForSearch(query).split(" ").filter(Boolean)
  if (words.length === 0) return []
  const phrase = words.join(" ")
  const hits: { row: SearchRow; score: number }[] = []
  for (const row of rows) {
    if (!words.every((w) => row[1].includes(w))) continue
    hits.push({ row, score: row[1].includes(phrase) ? 0 : 1 })
  }
  hits.sort((a, b) => a.score - b.score || a.row[0] - b.row[0])
  return hits.slice(0, limit).map((h) => h.row)
}

/** The book that holds a hadith number. */
export function bookOf(index: HadithIndex, n: number): HadithBook | undefined {
  const run = index.runs.find(([first, last]) => n >= first && n <= last)
  return run ? index.books.find((b) => b.n === run[2]) : undefined
}
