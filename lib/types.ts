export const PRAYER_KEYS = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const

export type PrayerKey = (typeof PRAYER_KEYS)[number]

export const OBLIGATORY_KEYS = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const

export type ObligatoryKey = (typeof OBLIGATORY_KEYS)[number]

export type MethodId =
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "NorthAmerica"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Tehran"
  | "Turkey"

export type MadhabId = "shafi" | "hanafi"

export type HighLatitudeId =
  | "middleofthenight"
  | "seventhofthenight"
  | "twilightangle"

export type PrayerAdjustments = Record<PrayerKey, number>

export type PrayerToggles = Record<ObligatoryKey, boolean>

export type ExtraReminders = {
  duha: boolean
  athkarMorning: boolean
  athkarEvening: boolean
  sadaqah: boolean
  /** 0 = Sunday … 6 = Saturday */
  sadaqahDay: number
  zakat: boolean
  /** Hijri month 1–12 and day 1–30 of the zakat year (hawl). */
  zakatMonth: number
  zakatDay: number
  /** A dua from the collection each day, after Dhuhr. */
  duaOfDay: boolean
  /** A nudge to read some Quran every hour, on the hour, between Fajr and Isha. */
  quranHourly: boolean
  /** A nudge toward a good deed, an hour before Maghrib. */
  goodDeed: boolean
}

export type Settings = {
  method: MethodId
  methodCustom: boolean
  madhab: MadhabId
  madhabCustom: boolean
  highLatitude: HighLatitudeId
  adjustments: PrayerAdjustments
  remindersEnabled: boolean
  leadMinutes: 0 | 5 | 10 | 15
  prayers: PrayerToggles
  tone: boolean
  extras: ExtraReminders
}

export type PlaceSource = "device" | "city" | "coordinates"

export type Place = {
  label: string
  detail: string
  country: string
  countryName: string
  latitude: number
  longitude: number
  timezone: string
  source: PlaceSource
}

export type DayTimes = Record<PrayerKey, Date>

export type CityRecord = {
  name: string
  ascii: string
  country: string
  countryName: string
  latitude: number
  longitude: number
  timezone: string
  population: number
  extra: string
}
