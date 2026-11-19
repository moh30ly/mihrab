// Hisn al-Muslim (Fortress of the Muslim) by Sa'id ibn Ali ibn Wahf al-Qahtani:
// all 132 chapters, built by scripts/import-hisn.mjs. Only server components
// import the whole book; each chapter page gets its own chapter.
import book from "@/data/hisn.json"

export type HisnItem = { id: number; ar: string; en: string; tr: string; count: number; ref?: string }
export type HisnChapter = { id: number; ar: string; en: string; tr: string; items: HisnItem[] }
export type HisnTitle = Omit<HisnChapter, "items"> & { size: number }

export const HISN = book as HisnChapter[]

export function hisnChapter(id: number): HisnChapter | undefined {
  return HISN.find((c) => c.id === id)
}

export function hisnTitles(): HisnTitle[] {
  return HISN.map(({ items, ...c }) => ({ ...c, size: items.length }))
}

/** The chapter title in the interface language: Arabic, Turkish, else English. */
export function chapterTitle(c: { ar: string; en: string; tr: string }, locale: string): string {
  return locale === "ar" ? c.ar : locale === "tr" ? c.tr : c.en
}
