// Lectures by Sheikh Said El Kamali, played with YouTube's own embedded player from his official channel.
// Nothing is downloaded or copied: the app lists the channel's playlists and hands them to the player.
// Playlist ids and titles were read from https://www.youtube.com/@elkamali/playlists on 2026-11-21.

export const CHANNEL = {
  id: "UCASAOTD6fMPEg8jmO4nPblQ",
  handle: "@elkamali",
  name: "قناة الشَّيخ سَعيد الكَمَلي",
  url: "https://www.youtube.com/@elkamali",
}

export type LectureGroup = "series" | "ramadan" | "texts" | "talks"

export type LecturePlaylist = {
  /** YouTube playlist id. */
  id: string
  /** The title on the channel, in Arabic. */
  ar: string
  /** English title, also the key for the other interface languages. */
  title: string
  /** Number of videos when the list was made; YouTube's player always shows the current list. */
  count: number
  group: LectureGroup
}

/** Every upload on the channel, newest first, through YouTube's automatic uploads playlist. */
export const UPLOADS: LecturePlaylist = {
  id: "UU" + CHANNEL.id.slice(2),
  ar: "أحدث الدروس",
  title: "Latest lectures",
  count: 0,
  group: "series",
}

export const GROUPS: { id: LectureGroup; title: string }[] = [
  { id: "series", title: "Lecture series" },
  { id: "texts", title: "Texts and poems explained" },
  { id: "talks", title: "Talks, sermons and fatwas" },
  { id: "ramadan", title: "Ramadan" },
]

export const PLAYLISTS: LecturePlaylist[] = [
  { id: "PLFkuO76ICjPmWI-3Se9r7zv-jlPqzkX6Q", ar: "مجالس الموطأ - كتاب الجامع", title: "Gatherings on the Muwatta: the Book of Al-Jami", count: 33, group: "series" },
  { id: "PLFkuO76ICjPljROhOWwZ-z9Jzc81KuxFf", ar: "مجالس الموطأ | الشيخ سعيد الكملي", title: "Gatherings on the Muwatta", count: 179, group: "series" },
  { id: "PLFkuO76ICjPkbBMG9VNcyNzf4_IFMx5eC", ar: "شرح موطأ الإمام مالك بن أنس رحمه الله", title: "Commentary on the Muwatta of Imam Malik", count: 234, group: "series" },
  { id: "PLFkuO76ICjPkxCbn7PrDvMpio4oHlT2om", ar: "سلسلة سيرة الحبيب ـ الشيخ سعيد الكملي", title: "The life of the Beloved Prophet ﷺ", count: 102, group: "series" },
  { id: "PLFkuO76ICjPmSckkduR7TcQn-2BANlw2G", ar: "سلسلة جميلة - أخبار العرب و سيرة سيد البشر", title: "The Arabs and the life of the Prophet ﷺ", count: 32, group: "series" },
  { id: "PLFkuO76ICjPmgiy50tDpg8ZhAXuX3THJM", ar: "مشاهد من سيرة الإمام مالك بن أنس رحمه الله", title: "Scenes from the life of Imam Malik", count: 49, group: "series" },
  { id: "PLFkuO76ICjPmXSX0AOmy60e39KmeRD2Rt", ar: "برنامج آية وحكاية", title: "An Ayah and a Story", count: 41, group: "series" },
  { id: "PLFkuO76ICjPk-P6Ts1Y5Gkq192WOA0dhR", ar: "أشذاء و أنداء ـ الشيخ سعيد الكملي", title: "Fragrances and Dew", count: 30, group: "series" },
  { id: "PLFkuO76ICjPmw_LkCYPJI6E79mvBlLZQT", ar: "إسوة حسنة ﷺ ـ الشيخ سعيد الكملي", title: "A Good Example ﷺ", count: 10, group: "series" },
  { id: "PLFkuO76ICjPkUP5-Nbi6Fur5QMMjRsN86", ar: "مواقيت الصلاة", title: "The prayer times", count: 6, group: "series" },
  { id: "PLFkuO76ICjPlcS3MIqSEqYDHxe5RqYPDU", ar: "شرح أبواب الصيام لابن أبي زيد القيرواني المالكي", title: "The chapters on fasting by Ibn Abi Zayd al-Qayrawani", count: 3, group: "texts" },
  { id: "PLFkuO76ICjPkhtq5s22uS_v9t3HnPUOIQ", ar: "شرح لامية ابن الوردي", title: "The Lamiyya of Ibn al-Wardi explained", count: 3, group: "texts" },
  { id: "PLFkuO76ICjPk8J6mqGHqzs2rNWzbL03Rh", ar: "شرح قصيدة \"عنوان الحكم\" للبستي", title: "The poem Unwan al-Hikam by al-Busti explained", count: 2, group: "texts" },
  { id: "PLFkuO76ICjPlB1AQVmGLgYQwfLdNwnrHL", ar: "شرح منظومة ابن أبي العز الحنفي في السيرة النبوية", title: "Ibn Abi al-Izz's poem on the Prophet's life explained", count: 2, group: "texts" },
  { id: "PLFkuO76ICjPk5Gr_x8SXQ692YCwA7zEur", ar: "شرح منظومة الألبيري في الأدب", title: "Al-Ilbiri's poem on good manners explained", count: 3, group: "texts" },
  { id: "PLFkuO76ICjPnm2d8UvkgE_ke1-MeHs1Oj", ar: "شرح لامية العرب للشنفرى", title: "The Lamiyyat al-Arab of al-Shanfara explained", count: 4, group: "texts" },
  { id: "PLFkuO76ICjPlA8v1je7EhUO3UWP1uvBFe", ar: "محاضرات متنوعة ـ الشيخ سعيد الكملي", title: "Various lectures", count: 752, group: "talks" },
  { id: "PLFkuO76ICjPmh5JswtEKws6YG4-9Ttc33", ar: "نصائح من ذهب", title: "Golden advice", count: 6, group: "talks" },
  { id: "PLFkuO76ICjPl_6ZN-jkol32ohg_FC8FpR", ar: "خطب الجمعة ـ الشيخ سعيد الكملي", title: "Friday sermons", count: 6, group: "talks" },
  { id: "PLFkuO76ICjPlmJEWw6-AyKGp0Yj8v9py8", ar: "فتاوى", title: "Fatwas", count: 25, group: "talks" },
  { id: "PLFkuO76ICjPnhZ0pmyfUAEXzruc84988Q", ar: "العقيدة", title: "Creed", count: 1, group: "talks" },
  { id: "PLFkuO76ICjPlyokqSyhP9_rkdZ__MxGrU", ar: "حفظ القرآن", title: "Memorizing the Quran", count: 1, group: "talks" },
  { id: "PLFkuO76ICjPk-Du5_IlswvQWssChOTmn9", ar: "رمضان 2025", title: "Ramadan 2025", count: 24, group: "ramadan" },
  { id: "PLFkuO76ICjPk0uxSJHsjmoy_v-TQy-cBr", ar: "رمضان 2024", title: "Ramadan 2024", count: 47, group: "ramadan" },
  { id: "PLFkuO76ICjPkUl-QKSDo4uVsZxLCiZf93", ar: "محاضرات رمضان 2024", title: "Ramadan 2024 lectures", count: 6, group: "ramadan" },
  { id: "PLFkuO76ICjPnnMHjKJyM3j_CU7e_nBFhL", ar: "رمضان 2023", title: "Ramadan 2023", count: 16, group: "ramadan" },
]

export function findPlaylist(id: string | null | undefined): LecturePlaylist | undefined {
  if (!id) return undefined
  return id === UPLOADS.id ? UPLOADS : PLAYLISTS.find((p) => p.id === id)
}

/** YouTube's language codes for the interface (hl) and for captions (cc_lang_pref). */
const YT_LANG: Record<string, { hl: string; cc: string }> = {
  en: { hl: "en", cc: "en" },
  ar: { hl: "ar", cc: "ar" },
  de: { hl: "de", cc: "de" },
  it: { hl: "it", cc: "it" },
  zh: { hl: "zh-CN", cc: "zh-Hans" },
  ja: { hl: "ja", cc: "ja" },
  tr: { hl: "tr", cc: "tr" },
  pt: { hl: "pt-BR", cc: "pt" },
  es: { hl: "es", cc: "es" },
}

export function youtubeLang(locale: string) {
  return YT_LANG[locale] ?? YT_LANG.en
}

/**
 * The embed address for a playlist, with the player's menus in the app language and
 * subtitles switched on in that language. The lectures are in Arabic, so Arabic readers
 * get captions only when they turn them on.
 */
export function embedUrl(listId: string, locale: string, origin?: string): string {
  const { hl, cc } = youtubeLang(locale)
  const q = new URLSearchParams({
    listType: "playlist",
    list: listId,
    hl,
    cc_lang_pref: cc,
    rel: "0",
    playsinline: "1",
    iv_load_policy: "3",
  })
  if (locale !== "ar") q.set("cc_load_policy", "1")
  if (origin && origin.startsWith("http")) q.set("origin", origin)
  return `https://www.youtube-nocookie.com/embed/videoseries?${q}`
}

export function playlistUrl(listId: string): string {
  return `https://www.youtube.com/playlist?list=${listId}`
}
