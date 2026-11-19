export function formatClock(instant: Date, timeZone: string, withSeconds = false) {
  return new Intl.DateTimeFormat("en-US", {
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
  return new Intl.DateTimeFormat("en-US", {
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
  try {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", options).format(instant)
  } catch {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic", options).format(instant)
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
    return `${millions.toFixed(digits)} million`
  }
  if (population >= 100_000) return `${Math.round(population / 1000)} thousand`
  return ""
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return "now"
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) {
    return totalSeconds === 1 ? "in 1 second" : `in ${totalSeconds} seconds`
  }
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) {
    return totalMinutes === 1 ? "in 1 minute" : `in ${totalMinutes} minutes`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`
  if (minutes === 0) return `in ${hourLabel}`
  const minuteLabel = minutes === 1 ? "1 minute" : `${minutes} minutes`
  return `in ${hourLabel} ${minuteLabel}`
}

export function formatRemainingShort(ms: number) {
  if (ms <= 0) return "now"
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
