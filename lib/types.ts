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
