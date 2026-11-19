import type { HighLatitudeId, MadhabId, MethodId, ObligatoryKey, PrayerKey } from "@/lib/types"

export const PRAYER_INFO: Record<
  PrayerKey,
  { name: string; arabic: string; obligatory: boolean; role: string }
> = {
  fajr: { name: "Fajr", arabic: "الفجر", obligatory: true, role: "Dawn" },
  sunrise: { name: "Sunrise", arabic: "الشروق", obligatory: false, role: "Fajr ends" },
  dhuhr: { name: "Dhuhr", arabic: "الظهر", obligatory: true, role: "Noon" },
  asr: { name: "Asr", arabic: "العصر", obligatory: true, role: "Afternoon" },
  maghrib: { name: "Maghrib", arabic: "المغرب", obligatory: true, role: "Sunset" },
  isha: { name: "Isha", arabic: "العشاء", obligatory: true, role: "Night" },
}

export const METHODS: {
  id: MethodId
  name: string
  detail: string
}[] = [
  {
    id: "MuslimWorldLeague",
    name: "Muslim World League",
    detail: "Widely used in Europe, the Far East, and much of Africa.",
  },
  {
    id: "NorthAmerica",
    name: "ISNA (North America)",
    detail: "Islamic Society of North America. Common in the United States and Canada.",
  },
  {
    id: "Egyptian",
    name: "Egyptian General Authority",
    detail: "Used in Egypt, and in parts of Africa and the Levant.",
  },
  {
    id: "UmmAlQura",
    name: "Umm al-Qura",
    detail: "The calendar of Makkah. Used across Saudi Arabia.",
  },
  {
    id: "Dubai",
    name: "Dubai",
    detail: "The method used in the United Arab Emirates.",
  },
  {
    id: "Kuwait",
    name: "Kuwait",
    detail: "The method used in Kuwait.",
  },
  {
    id: "Qatar",
    name: "Qatar",
    detail: "The method used in Qatar.",
  },
  {
    id: "Karachi",
    name: "University of Islamic Sciences, Karachi",
    detail: "Common in Pakistan, India, Bangladesh, and Afghanistan.",
  },
  {
    id: "Singapore",
    name: "Singapore",
    detail: "A close match for Singapore, Malaysia, and Indonesia.",
  },
  {
    id: "Turkey",
    name: "Diyanet (Turkey)",
    detail: "The Presidency of Religious Affairs in Turkey.",
  },
  {
    id: "Tehran",
    name: "Tehran",
    detail: "The Institute of Geophysics at the University of Tehran.",
  },
  {
    id: "MoonsightingCommittee",
    name: "Moonsighting Committee",
    detail: "Often used in the United Kingdom and parts of Europe.",
  },
]

export const MADHHABS: { id: MadhabId; name: string; detail: string }[] = [
  {
    id: "shafi",
    name: "Standard",
    detail:
      "Shafi‘i, Maliki, and Hanbali. Asr begins when the shadow equals the object, plus its noon shadow.",
  },
  {
    id: "hanafi",
    name: "Hanafi",
    detail:
      "Asr begins later, when the shadow is twice the object, plus its noon shadow.",
  },
]

export const HIGH_LATITUDES: { id: HighLatitudeId; name: string; detail: string }[] = [
  {
    id: "middleofthenight",
    name: "Middle of the night",
    detail: "Fajr and Isha share the night in half. The most common rule.",
  },
  {
    id: "seventhofthenight",
    name: "One-seventh of the night",
    detail: "Isha ends after the first seventh of the night. Fajr is the last seventh.",
  },
  {
    id: "twilightangle",
    name: "Twilight angle",
    detail: "The night portion follows the twilight angle of the chosen method.",
  },
]

const METHOD_BY_COUNTRY: Partial<Record<string, MethodId>> = {
  SA: "UmmAlQura",
  AE: "Dubai",
  QA: "Qatar",
  KW: "Kuwait",
  EG: "Egyptian",
  US: "NorthAmerica",
  CA: "NorthAmerica",
  PK: "Karachi",
  IN: "Karachi",
  BD: "Karachi",
  AF: "Karachi",
  TR: "Turkey",
  SG: "Singapore",
  MY: "Singapore",
  ID: "Singapore",
  BN: "Singapore",
  IR: "Tehran",
  GB: "MoonsightingCommittee",
  IE: "MoonsightingCommittee",
  FR: "MoonsightingCommittee",
}

const HANAFI_COUNTRIES = new Set([
  "PK",
  "IN",
  "BD",
  "AF",
  "TR",
  "AL",
  "BA",
  "XK",
  "MK",
  "KZ",
  "UZ",
  "KG",
  "TJ",
  "TM",
  "AZ",
])

export function suggestForCountry(country: string): {
  method: MethodId
  madhab: MadhabId
} {
  return {
    method: METHOD_BY_COUNTRY[country] ?? "MuslimWorldLeague",
    madhab: HANAFI_COUNTRIES.has(country) ? "hanafi" : "shafi",
  }
}

export function methodById(id: MethodId) {
  return METHODS.find((method) => method.id === id) ?? METHODS[0]
}

export function madhabById(id: MadhabId) {
  return MADHHABS.find((madhab) => madhab.id === id) ?? MADHHABS[0]
}

export function isObligatory(key: PrayerKey): key is ObligatoryKey {
  return key !== "sunrise"
}
