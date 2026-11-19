// Gentle daily nudges toward a good deed, each with the hadith or verse behind it.
// `question` and `reason` are English keys translated with t(); `reference` stays as written.

export type GoodDeed = { id: string; question: string; reason: string; reference: string }

export const GOOD_DEEDS: GoodDeed[] = [
  {
    id: "visit-sick",
    question: "Did you visit someone who is ill today?",
    reason: "Whoever visits a sick person stays in the gardens of Paradise until he returns.",
    reference: "Muslim 2568",
  },
  {
    id: "parents",
    question: "Did you call your mother and father to ask how they are?",
    reason: "Your Lord has decreed that you worship none but Him, and that you be good to your parents.",
    reference: "Al-Isra’ 17:23",
  },
  {
    id: "relatives",
    question: "Have you been in touch with your relatives lately?",
    reason: "Whoever wants his provision increased and his life extended, let him keep the ties of kinship.",
    reference: "Al-Bukhari 5986",
  },
  {
    id: "smile",
    question: "Did you smile at someone today?",
    reason: "Your smile to your brother is charity.",
    reference: "At-Tirmidhi 1956",
  },
  {
    id: "charity",
    question: "Did you give some charity today, even a little?",
    reason: "Protect yourselves from the Fire, even with half a date.",
    reference: "Al-Bukhari 1417",
  },
  {
    id: "salam",
    question: "Did you greet people with salam, those you know and those you don't?",
    reason: "The Prophet ﷺ was asked which deed in Islam is best, and said: to feed people and to greet those you know and those you don't.",
    reference: "Al-Bukhari 12",
  },
  {
    id: "neighbour",
    question: "Did you check on your neighbour?",
    reason: "He is not a believer whose stomach is full while his neighbour beside him is hungry.",
    reference: "Al-Bukhari, al-Adab al-Mufrad 112",
  },
  {
    id: "feed",
    question: "Did you feed someone today?",
    reason: "Feed the hungry, visit the sick and free the captive.",
    reference: "Al-Bukhari 5649",
  },
  {
    id: "quran",
    question: "Did you read some Quran today?",
    reason: "Read the Quran, for on the Day of Resurrection it will come as an intercessor for its companions.",
    reference: "Muslim 804",
  },
  {
    id: "forgive",
    question: "Is there someone you can forgive today?",
    reason: "Let them pardon and overlook. Would you not love Allah to forgive you?",
    reference: "An-Nur 24:22",
  },
  {
    id: "thank",
    question: "Did you thank someone who helped you?",
    reason: "Whoever does not thank people has not thanked Allah.",
    reference: "Abu Dawud 4811",
  },
  {
    id: "good-word",
    question: "Did you say a kind word to someone today?",
    reason: "A good word is charity.",
    reference: "Al-Bukhari 2989",
  },
  {
    id: "remove-harm",
    question: "Did you move something harmful out of people's way?",
    reason: "Removing something harmful from the road is a branch of faith.",
    reference: "Muslim 35",
  },
  {
    id: "dua-for-others",
    question: "Did you make dua for someone who doesn't know you're doing it?",
    reason: "When you pray for your brother in his absence, an angel says: And for you the same.",
    reference: "Muslim 2733",
  },
  {
    id: "orphan",
    question: "Did you help an orphan or someone in need?",
    reason: "I and the one who looks after an orphan will be in Paradise like this, and he held up two fingers together.",
    reference: "Al-Bukhari 5304",
  },
  {
    id: "istighfar",
    question: "Did you ask Allah for forgiveness today?",
    reason: "The Prophet ﷺ said: I seek Allah's forgiveness and turn to Him more than seventy times a day.",
    reference: "Al-Bukhari 6307",
  },
  {
    id: "salawat",
    question: "Did you send blessings on the Prophet ﷺ today?",
    reason: "Whoever sends blessings on me once, Allah sends blessings on him ten times.",
    reference: "Muslim 408",
  },
  {
    id: "sunnah-prayers",
    question: "Did you pray the sunnah prayers with the obligatory ones?",
    reason: "Whoever prays twelve voluntary rak‘ahs in a day and night, a house is built for him in Paradise.",
    reference: "Muslim 728",
  },
  {
    id: "help-at-home",
    question: "Did you help out at home today?",
    reason: "‘A’ishah said the Prophet ﷺ would be busy serving his family until the time for prayer came.",
    reference: "Al-Bukhari 676",
  },
  {
    id: "children",
    question: "Did you spend some kind, unhurried time with your children?",
    reason: "He is not one of us who does not show mercy to our young and respect to our elders.",
    reference: "At-Tirmidhi 1919",
  },
  {
    id: "family",
    question: "Did you say something kind to your husband or wife today?",
    reason: "The best of you are those who are best to their families.",
    reference: "At-Tirmidhi 3895",
  },
  {
    id: "tongue",
    question: "Did you keep away from backbiting today?",
    reason: "Whoever believes in Allah and the Last Day, let him speak good or stay silent.",
    reference: "Al-Bukhari 6018",
  },
  {
    id: "animals",
    question: "Were you kind to an animal today?",
    reason: "There is a reward for kindness to every living being.",
    reference: "Al-Bukhari 2363",
  },
  {
    id: "make-peace",
    question: "Is there someone you should make peace with?",
    reason: "It is not lawful for a Muslim to shun his brother for more than three days.",
    reference: "Al-Bukhari 6077",
  },
  {
    id: "learn",
    question: "Did you learn something new about your religion today?",
    reason: "Whoever takes a path seeking knowledge, Allah makes easy for him a path to Paradise.",
    reference: "Muslim 2699",
  },
  {
    id: "elders",
    question: "Did you sit with an elderly person and listen to them?",
    reason: "Part of glorifying Allah is honouring the grey-haired Muslim.",
    reference: "Abu Dawud 4843",
  },
]

/** The same nudge for everyone on a given local date, a different one each day. */
export function goodDeedOfTheDay(year: number, month: number, day: number, skip = 0): GoodDeed {
  const n = GOOD_DEEDS.length
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
  // 11 is coprime with the list length, so a full cycle shows every nudge once.
  return GOOD_DEEDS[((((dayNumber + skip) * 11) % n) + n) % n]
}

export function goodDeedFor(date: Date, skip = 0) {
  return goodDeedOfTheDay(date.getFullYear(), date.getMonth() + 1, date.getDate(), skip)
}

const DONE_KEY = "mihrab:good-deeds-done"

/** Local dates (yyyy-m-d) and the deeds marked done on them, kept for a week. */
export function loadDone(): Record<string, string[]> {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "{}") as Record<string, string[]>
    return raw && typeof raw === "object" ? raw : {}
  } catch {
    return {}
  }
}

export function markDone(dateKey: string, id: string) {
  const all = loadDone()
  const keep = Object.keys(all).sort().slice(-6)
  const next: Record<string, string[]> = {}
  for (const k of keep) next[k] = all[k]
  next[dateKey] = [...new Set([...(next[dateKey] ?? []), id])]
  try {
    window.localStorage.setItem(DONE_KEY, JSON.stringify(next))
  } catch {
    // It still shows as done for this visit.
  }
  return next
}
