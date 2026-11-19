import { tNow } from "@/lib/i18n/translate"
import { intlLocale } from "@/lib/i18n/store"

export function formatClock(instant: Date, timeZone: string, withSeconds = false) {
  return new Intl.DateTimeFormat(intlLocale(), {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
  }).format(instant)
}

export function formatPrayerTime(date: Date, timeZone: string) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return "—"
  return formatClock(date, timeZone)
}

export function formatGregorian(instant: Date, timeZone: string) {
  return new Intl.DateTimeFormat(intlLocale(), {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(instant)
}

export function formatHijri(instant: Date, timeZone: string) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }
  // Keep any numbering system from the locale (Arabic uses Latin digits), and add the Hijri calendar.
  const [base, ext] = intlLocale().split("-u-")
  const numbering = ext?.match(/nu-\w+/)?.[0]
  const tag = (calendar: string) => `${base}-u-ca-${calendar}${numbering ? `-${numbering}` : ""}`
  try {
    return new Intl.DateTimeFormat(tag("islamic-umalqura"), options).format(instant)
  } catch {
    return new Intl.DateTimeFormat(tag("islamic"), options).format(instant)
  }
}

export function hijriMonth(instant: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      timeZone,
      month: "numeric",
    }).formatToParts(instant)
    const month = Number(parts.find((part) => part.type === "month")?.value)
    return Number.isFinite(month) ? month : null
  } catch {
    return null
  }
}

export function timeZoneParts(timeZone: string, instant: Date) {
  const read = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...options })
      .formatToParts(instant)
      .find((part) => part.type === "timeZoneName")?.value ?? ""
  const offset = read({ timeZoneName: "shortOffset", hour: "numeric" }).replace("GMT", "UTC")
  const short = read({ timeZoneName: "short" })
  const place = timeZone.split("/").slice(1).join(" / ").replaceAll("_", " ") || timeZone
  return { offset, short, place, id: timeZone }
}

export function formatCoordinates(latitude: number, longitude: number) {
  const northSouth = latitude >= 0 ? "N" : "S"
  const eastWest = longitude >= 0 ? "E" : "W"
  return `${Math.abs(latitude).toFixed(3)}° ${northSouth}, ${Math.abs(longitude).toFixed(3)}° ${eastWest}`
}

export function formatDistance(km: number) {
  if (!Number.isFinite(km)) return "—"
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km).toLocaleString("en-US")} km`
}

export function formatPopulation(population: number) {
  if (population >= 1_000_000) {
    const millions = population / 1_000_000
    const digits = millions >= 10 ? 0 : 1
    return tNow("{n} million", { n: millions.toFixed(digits) })
  }
  if (population >= 100_000) return tNow("{n} thousand", { n: Math.round(population / 1000) })
  return ""
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return tNow("now")
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return tNow("in {n} s", { n: totalSeconds })
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return tNow("in {n} min", { n: totalMinutes })
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) return tNow("in {h} h", { h: hours })
  return tNow("in {h} h {m} min", { h: hours, m: minutes })
}

export function formatRemainingShort(ms: number) {
  if (ms <= 0) return tNow("now")
  const totalMinutes = Math.ceil(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

export function formatSignedMinutes(minutes: number) {
  if (minutes > 0) return `+${minutes} min`
  if (minutes < 0) return `${minutes} min`
  return "0 min"
}
