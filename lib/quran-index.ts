import surahs from "@/data/quran/surahs.json"

export type SurahInfo = {
  id: number
  name: string
  transliteration: string
  translation: string
  type: "meccan" | "medinan"
  verses: number
}

export const SURAHS = surahs as SurahInfo[]

export function surahById(id: number): SurahInfo | undefined {
  return SURAHS[id - 1]?.id === id ? SURAHS[id - 1] : undefined
}

export const LAST_READ_KEY = "mihrab:quran:last-read"
export const QURAN_PREFS_KEY = "mihrab:quran:prefs"

export const QURAN_SOURCES = {
  arabic:
    "Arabic text: the Uthmani script of the King Fahd Glorious Qur’an Printing Complex (Madinah), as published by The Noble Qur’an Encyclopedia (quranenc.com).",
  translation: "English meaning: Saheeh International, as distributed by Tanzil.net.",
  dataset: "Compiled in the quran-json dataset by Risan Bagja Pradana (CC BY-SA 4.0).",
}
