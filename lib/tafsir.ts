// Tafsir (commentary) shown for each ayah in the Quran reader.
// The texts come from the spa5k/tafsir_api dataset (MIT), which republishes
// them unchanged from the Quranic Universal Library (Tarteel) and quran.com.
// scripts/fetch-library.mjs writes /library/tafsir/<id>/<surah>/<chunk>.json:
// each chunk holds the commentary on ten ayahs. An entry is the text, or the
// number of the ayah whose commentary also explains this one.
export type TafsirInfo = {
  id: string
  /** Language code of the text. */
  lang: string
  dir: "ltr" | "rtl"
  /** Name in the language of the text. */
  name: string
  /** Name and author in English, for the sources list. */
  english: string
  slug: string
  source: string
  sourceUrl: string
}

export const TAFSIR_CHUNK = 10

const QUL = "Quranic Universal Library (Tarteel)"
const qul = (n: number) => `https://qul.tarteel.ai/resources/tafsir/${n}`
const mukhtasar = (lang: string, name: string, slug: string, qulId: number): TafsirInfo => ({
  id: `mukhtasar-${lang}`,
  lang,
  dir: "ltr",
  name,
  english: "Al-Mukhtasar fi Tafsir al-Quran by the Tafsir Center for Quranic Studies",
  slug,
  source: QUL,
  sourceUrl: qul(qulId),
})

export const TAFSIRS: TafsirInfo[] = [
  {
    id: "mukhtasar-ar",
    lang: "ar",
    dir: "rtl",
    name: "المختصر في تفسير القرآن الكريم",
    english: "Al-Mukhtasar fi Tafsir al-Quran (Tafsir Center for Quranic Studies)",
    slug: "ar-tafsir-al-mukhtasar",
    source: QUL,
    sourceUrl: qul(251),
  },
  {
    id: "saadi",
    lang: "ar",
    dir: "rtl",
    name: "تيسير الكريم الرحمن (تفسير السعدي)",
    english: "Taysir al-Karim al-Rahman by Abd al-Rahman al-Sa‘di (d. 1376 AH)",
    slug: "ar-tafsir-as-saadi",
    source: QUL,
    sourceUrl: qul(308),
  },
  {
    id: "ibn-kathir",
    lang: "ar",
    dir: "rtl",
    name: "تفسير القرآن العظيم (ابن كثير)",
    english: "Tafsir al-Quran al-‘Azim by Ibn Kathir (d. 774 AH)",
    slug: "ar-tafsir-ibn-kathir",
    source: QUL,
    sourceUrl: qul(22),
  },
  {
    id: "jalalayn",
    lang: "ar",
    dir: "rtl",
    name: "تفسير الجلالين",
    english: "Tafsir al-Jalalayn by al-Mahalli and al-Suyuti",
    slug: "ar-tafsir-al-jalalayn",
    source: QUL,
    sourceUrl: qul(523),
  },
  {
    id: "baghawi",
    lang: "ar",
    dir: "rtl",
    name: "معالم التنزيل (تفسير البغوي)",
    english: "Ma‘alim al-Tanzil by al-Baghawi (d. 516 AH)",
    slug: "ar-tafsir-al-baghawi",
    source: QUL,
    sourceUrl: qul(27),
  },
  mukhtasar("en", "The Abridged Explanation of the Quran", "en-tafsir-al-mukhtasar", 266),
  mukhtasar("it", "Al-Mukhtasar nell’interpretazione del Nobile Corano", "italian-mokhtasar", 253),
  mukhtasar("es", "Explicación abreviada del Noble Corán", "spanish-mokhtasar", 268),
  mukhtasar("tr", "Kur’an-ı Kerim’in Muhtasar Tefsiri", "turkish-mokhtasar", 258),
  mukhtasar("zh", "古兰经简明注释", "chinese-mokhtasar", 264),
  mukhtasar("ja", "クルアーン簡潔注釈", "japanese-mokhtasar", 265),
]

// I‘rab (grammatical analysis) books, shown from their own button in the reader.
// They come from the same dataset and use the same file layout as the tafsirs.
// All are in Arabic, since i‘rab explains the grammar of the Arabic words.
export const IRABS: TafsirInfo[] = [
  {
    id: "irab-muyassar",
    lang: "ar",
    dir: "rtl",
    name: "الإعراب الميسر",
    english: "Al-I‘rab al-Muyassar (concise word-by-word i‘rab)",
    slug: "al-i-rab-al-muyassar",
    source: QUL,
    sourceUrl: qul(504),
  },
  {
    id: "irab-jadwal",
    lang: "ar",
    dir: "rtl",
    name: "الجدول في إعراب القرآن الكريم (محمود صافي)",
    english: "Al-Jadwal fi I‘rab al-Quran by Mahmud Safi (d. 1376 AH)",
    slug: "al-jadwal-fi-i-rab-al-quran",
    source: QUL,
    sourceUrl: qul(520),
  },
  {
    id: "irab-darwish",
    lang: "ar",
    dir: "rtl",
    name: "إعراب القرآن وبيانه (محيي الدين درويش)",
    english: "I‘rab al-Quran wa Bayanuh by Muhyi al-Din Darwish (d. 1403 AH)",
    slug: "i-rab-al-quran-li-al-darwish",
    source: QUL,
    sourceUrl: qul(506),
  },
  {
    id: "irab-daas",
    lang: "ar",
    dir: "rtl",
    name: "إعراب القرآن الكريم (الدعاس)",
    english: "I‘rab al-Quran al-Karim by Ahmad ‘Ubayd al-Da‘‘as and co-authors",
    slug: "alrab-al-quran-li-da-as",
    source: QUL,
    sourceUrl: qul(515),
  },
  {
    id: "irab-samin",
    lang: "ar",
    dir: "rtl",
    name: "الدر المصون في علوم الكتاب المكنون (السمين الحلبي)",
    english: "Al-Durr al-Masun by al-Samin al-Halabi (d. 756 AH)",
    slug: "al-dur-al-masun-lil-samin-al-halabi",
    source: QUL,
    sourceUrl: qul(505),
  },
]

export type BookKind = "tafsir" | "irab"

export function booksOf(kind: BookKind): TafsirInfo[] {
  return kind === "irab" ? IRABS : TAFSIRS
}

export function tafsirById(id: string, kind: BookKind = "tafsir"): TafsirInfo | undefined {
  return booksOf(kind).find((t) => t.id === id)
}

/** The i‘rab to open first: the concise one. */
export function defaultIrab(): TafsirInfo {
  return IRABS[0]
}

/** The commentary to open first: one in the reader's language, else English. */
export function defaultTafsir(locale: string): TafsirInfo {
  return TAFSIRS.find((t) => t.lang === locale) ?? tafsirById("mukhtasar-en")!
}

export type TafsirEntry = string | number

export function tafsirChunkPath(id: string, surah: number, ayah: number): string {
  return `tafsir/${id}/${surah}/${Math.floor((ayah - 1) / TAFSIR_CHUNK)}.json`
}

/** The entry for an ayah inside its chunk. */
export function entryAt(chunk: TafsirEntry[], ayah: number): TafsirEntry | undefined {
  return chunk[(ayah - 1) % TAFSIR_CHUNK]
}
