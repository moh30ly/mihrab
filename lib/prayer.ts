import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
  Qibla,
  type CalculationParameters,
} from "adhan"
import type {
  DayTimes,
  HighLatitudeId,
  MethodId,
  ObligatoryKey,
  Place,
  PrayerKey,
  Settings,
} from "@/lib/types"
import { PRAYER_KEYS } from "@/lib/types"

export const KAABA = { latitude: 21.4225241, longitude: 39.8261818 }

const METHOD_FACTORIES: Record<MethodId, () => CalculationParameters> = {
  MuslimWorldLeague: () => CalculationMethod.MuslimWorldLeague(),
  Egyptian: () => CalculationMethod.Egyptian(),
  Karachi: () => CalculationMethod.Karachi(),
  UmmAlQura: () => CalculationMethod.UmmAlQura(),
  Dubai: () => CalculationMethod.Dubai(),
  MoonsightingCommittee: () => CalculationMethod.MoonsightingCommittee(),
  NorthAmerica: () => CalculationMethod.NorthAmerica(),
  Kuwait: () => CalculationMethod.Kuwait(),
  Qatar: () => CalculationMethod.Qatar(),
  Singapore: () => CalculationMethod.Singapore(),
  Tehran: () => CalculationMethod.Tehran(),
  Turkey: () => CalculationMethod.Turkey(),
}

export function clampAdjustment(minutes: number) {
  if (!Number.isFinite(minutes)) return 0
  return Math.max(-45, Math.min(45, Math.round(minutes)))
}

export function civilParts(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: read("year"), month: read("month"), day: read("day") }
}

export function civilKey(timeZone: string, instant: Date) {
  const { year, month, day } = civilParts(timeZone, instant)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** A Date whose local calendar day matches the civil day in `timeZone`. */
export function dateForCivilDay(timeZone: string, dayOffset = 0, now = new Date()) {
  const today = civilParts(timeZone, now)
  const shifted = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset))
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    12,
    0,
    0,
  )
}

export function parametersFor(settings: Settings) {
  const params = METHOD_FACTORIES[settings.method]()
  params.madhab = settings.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi
  params.highLatitudeRule = settings.highLatitude as HighLatitudeId
  params.polarCircleResolution = PolarCircleResolution.AqrabBalad
  for (const key of PRAYER_KEYS) {
    params.adjustments[key] = clampAdjustment(settings.adjustments[key])
  }
  return params
}

export function validDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && Number.isFinite(date.getTime())
}

export function dayTimes(place: Place, settings: Settings, dayOffset = 0, now = new Date()): DayTimes {
  const date = dateForCivilDay(place.timezone, dayOffset, now)
  const times = new PrayerTimes(
    new Coordinates(place.latitude, place.longitude),
    date,
    parametersFor(settings),
  )
  return repairLowSunAsr({
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  })
}

/**
 * When the sun stays low, the Asr shadow formula can return the morning
 * solution. Mirror that time across Dhuhr so Asr stays in the afternoon.
 */
function repairLowSunAsr(times: DayTimes): DayTimes {
  if (!validDate(times.dhuhr) || !validDate(times.asr) || !validDate(times.maghrib)) return times
  if (times.asr.getTime() >= times.dhuhr.getTime()) return times
  const mirrored = times.dhuhr.getTime() + (times.dhuhr.getTime() - times.asr.getTime())
  const latest = times.maghrib.getTime() - 60_000
  const asr = new Date(Math.min(mirrored, Math.max(latest, times.dhuhr.getTime())))
  return { ...times, asr }
}

export function timesAreOrdered(times: DayTimes) {
  const sequence: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]
  for (let index = 0; index < sequence.length; index += 1) {
    if (!validDate(times[sequence[index]])) return false
    if (index > 0 && times[sequence[index]].getTime() < times[sequence[index - 1]].getTime()) {
      return false
    }
  }
  return true
}

export function qiblaBearing(latitude: number, longitude: number) {
  return Qibla(new Coordinates(latitude, longitude))
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = toRadians(lat2 - lat1)
  const longitudeDelta = toRadians(lon2 - lon1)
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function distanceToKaabaKm(latitude: number, longitude: number) {
  return haversineKm(latitude, longitude, KAABA.latitude, KAABA.longitude)
}

const CARDINALS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const

export function normalizeBearing(bearing: number) {
  return ((bearing % 360) + 360) % 360
}

export function cardinal(bearing: number) {
  return CARDINALS[Math.round(normalizeBearing(bearing) / 22.5) % 16]
}

/** Signed degrees to turn. Positive is right, negative is left. */
export function turnToward(bearing: number, heading: number) {
  let diff = normalizeBearing(bearing - heading)
  if (diff > 180) diff -= 360
  return diff
}

export function nextObligatory(today: DayTimes, tomorrow: DayTimes, now: number) {
  const keys: ObligatoryKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
  for (const key of keys) {
    if (today[key].getTime() > now) {
      return { key, at: today[key], tomorrow: false }
    }
  }
  return { key: "fajr" as const, at: tomorrow.fajr, tomorrow: true }
}

export function currentObligatory(today: DayTimes, now: number): ObligatoryKey | null {
  if (now >= today.fajr.getTime() && now < today.sunrise.getTime()) return "fajr"
  if (now >= today.dhuhr.getTime() && now < today.asr.getTime()) return "dhuhr"
  if (now >= today.asr.getTime() && now < today.maghrib.getTime()) return "asr"
  if (now >= today.maghrib.getTime() && now < today.isha.getTime()) return "maghrib"
  if (now >= today.isha.getTime()) return "isha"
  return null
}

export function previousMark(
  key: ObligatoryKey,
  isTomorrow: boolean,
  yesterday: DayTimes,
  today: DayTimes,
) {
  if (isTomorrow || key === "fajr") return isTomorrow ? today.isha : yesterday.isha
  if (key === "dhuhr") return today.sunrise
  if (key === "asr") return today.dhuhr
  if (key === "maghrib") return today.asr
  return today.maghrib
}
