import duas from "@/data/duas.json"

export type DuaGroupId = "sleep" | "home" | "purity" | "mosque" | "food" | "travel" | "nature" | "hardship" | "people" | "quran" | "sunnah" | "ruqya"

export type Dua = {
  id: string
  group: DuaGroupId
  /** When the dua is said, in English; translated with t(). */
  title: string
  count: number
  note: string | null
  arabic: string
  english: string
  reference: string
}

const ALL = duas as Dua[]

/** The everyday duas (the Duas tab). */
export const DUAS = ALL.filter((d) => d.group !== "ruqya")

/** The Quranic verses and prophetic words of ruqya (the Ruqya tab). */
export const RUQYA = ALL.filter((d) => d.group === "ruqya")

/** The occasions, in the order they appear. Titles are translated with t(). */
export const DUA_GROUPS: { id: DuaGroupId; title: string; arabic: string }[] = [
  { id: "sleep", title: "Waking and sleeping", arabic: "الاستيقاظ والنوم" },
  { id: "home", title: "Home and clothing", arabic: "البيت واللباس" },
  { id: "purity", title: "Toilet and wudu", arabic: "الخلاء والوضوء" },
  { id: "mosque", title: "Prayer and mosque", arabic: "الصلاة والمسجد" },
  { id: "food", title: "Food and fasting", arabic: "الطعام والصيام" },
  { id: "travel", title: "Travel", arabic: "السفر" },
  { id: "nature", title: "Rain, wind and the new moon", arabic: "المطر والريح والهلال" },
  { id: "hardship", title: "Worry and hardship", arabic: "الهم والكرب" },
  { id: "people", title: "With other people", arabic: "مع الناس" },
  { id: "quran", title: "From the Quran", arabic: "من القرآن" },
  { id: "sunnah", title: "From the Sunnah", arabic: "من السنة" },
]

export function duasIn(group: DuaGroupId) {
  return ALL.filter((d) => d.group === group)
}

/**
 * The same dua for everyone on a given calendar day, moving through the whole
 * collection one day at a time. `year`, `month` (1-12) and `day` are the local date.
 */
export function duaOfTheDay(year: number, month: number, day: number): Dua {
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
  // Step by a number coprime with the list length so consecutive days come from different occasions.
  const step = coprimeStep(DUAS.length)
  return DUAS[(((dayNumber * step) % DUAS.length) + DUAS.length) % DUAS.length]
}

function coprimeStep(n: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  for (let s = 7; s < n; s++) if (gcd(s, n) === 1) return s
  return 1
}

export function duaOfTheDayFor(date: Date) {
  return duaOfTheDay(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
