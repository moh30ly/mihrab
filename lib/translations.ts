// Quran translations shown under each ayah. English is built into the pages;
// the others are static JSON files in public/quran-tr/<code>/<surah>.json,
// written by scripts/import-translations.mjs from the fawazahmed0/quran-api mirror.
export type TranslationInfo = {
  code: string
  language: string
  nativeName: string
  title: string
  source: string
  sourceUrl: string
  dir: "ltr" | "rtl"
  edition?: string
}

export const TRANSLATIONS: TranslationInfo[] = [
  {
    code: "en",
    language: "English",
    nativeName: "English",
    title: "Saheeh International",
    source: "Tanzil.net",
    sourceUrl: "https://tanzil.net/trans/en.sahih",
    dir: "ltr",
  },
  {
    code: "ar",
    language: "Arabic",
    nativeName: "العربية",
    title: "التفسير الميسر (مجمع الملك فهد)",
    source: "King Fahd Glorious Qur’an Printing Complex, via Tanzil.net",
    sourceUrl: "https://tanzil.net/trans/ar.muyassar",
    dir: "rtl",
    edition: "ara-kingfahadquranc",
  },
  {
    code: "de",
    language: "German",
    nativeName: "Deutsch",
    title: "Frank Bubenheim & Nadeem Elyas",
    source: "The Noble Qur’an Encyclopedia (quranenc.com)",
    sourceUrl: "https://quranenc.com/en/browse/german_bubenheim",
    dir: "ltr",
    edition: "deu-frankbubenheima",
  },
  {
    code: "it",
    language: "Italian",
    nativeName: "Italiano",
    title: "Hamza Roberto Piccardo",
    source: "Tanzil.net",
    sourceUrl: "https://tanzil.net/trans/it.piccardo",
    dir: "ltr",
    edition: "ita-hamzarobertopic",
  },
  {
    code: "zh",
    language: "Chinese",
    nativeName: "中文",
    title: "Muhammad Makin (马坚)",
    source: "The Noble Qur’an Encyclopedia (quranenc.com)",
    sourceUrl: "https://quranenc.com/en/browse/chinese_makin",
    dir: "ltr",
    edition: "zho-muhammadmakin",
  },
  {
    code: "ja",
    language: "Japanese",
    nativeName: "日本語",
    title: "Ryoichi Mita (三田了一)",
    source: "The Noble Qur’an Encyclopedia (quranenc.com)",
    sourceUrl: "https://quranenc.com/en/browse/japanese_meta",
    dir: "ltr",
    edition: "jpn-ryoichimita",
  },
  {
    code: "tr",
    language: "Turkish",
    nativeName: "Türkçe",
    title: "Shaban Britch",
    source: "The Noble Qur’an Encyclopedia (quranenc.com)",
    sourceUrl: "https://quranenc.com/en/browse/turkish_shaban",
    dir: "ltr",
    edition: "tur-shabanbritch",
  },
  {
    code: "pt",
    language: "Portuguese",
    nativeName: "Português",
    title: "Helmi Nasr",
    source: "The Noble Qur’an Encyclopedia (quranenc.com)",
    sourceUrl: "https://quranenc.com/en/browse/portuguese_nasr",
    dir: "ltr",
    edition: "por-helminasr",
  },
  {
    code: "es",
    language: "Spanish",
    nativeName: "Español",
    title: "Muhammad Isa García",
    source: "Tanzil.net",
    sourceUrl: "https://tanzil.net/trans/es.garcia",
    dir: "ltr",
    edition: "spa-muhammadisagarc",
  },
]

export function translationByCode(code: string) {
  return TRANSLATIONS.find((t) => t.code === code)
}
