// Reminders beyond the five prayers: Duha, the morning and evening athkar,
// a weekly sadaqah nudge, and a yearly zakat date on the Hijri calendar.
import { formatPrayerTime } from "@/lib/format"
import { tNow } from "@/lib/i18n/translate"
import { civilParts, dayTimes, timesAreOrdered, validDate } from "@/lib/prayer"
import type { DayTimes, Place, Settings } from "@/lib/types"

export type ExtraKey = "duha" | "athkarMorning" | "athkarEvening" | "sadaqah" | "zakat"

export type ExtraEvent = { key: ExtraKey; at: Date; title: string; body: string }

/** Duha starts about 20 minutes after sunrise and ends about 10 minutes before Dhuhr. */
export const DUHA_AFTER_SUNRISE_MIN = 20
export const DUHA_BEFORE_DHUHR_MIN = 10
/** The athkar reminders come 20 minutes after Fajr and after Asr. */
export const ATHKAR_AFTER_PRAYER_MIN = 20
/** Sadaqah and zakat reminders arrive at 10:00 local time. */
export const DAY_REMINDER_HOUR = 10

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Shaban",
  "Ramadan",
  "Shawwal",
  "Dhu al-Qadah",
  "Dhu al-Hijjah",
]

const MIN = 60_000

export function duhaWindow(times: DayTimes) {
  return {
    start: new Date(times.sunrise.getTime() + DUHA_AFTER_SUNRISE_MIN * MIN),
    end: new Date(times.dhuhr.getTime() - DUHA_BEFORE_DHUHR_MIN * MIN),
  }
}

/** The instant when the wall clock in `timeZone` shows year-month-day hour:minute. */
export function zonedTime(timeZone: string, year: number, month: number, day: number, hour: number, minute = 0) {
  const target = Date.UTC(year, month - 1, day, hour, minute)
  let guess = target
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).formatToParts(new Date(guess))
    const read = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value)
    const shown = Date.UTC(read("year"), read("month") - 1, read("day"), read("hour") % 24, read("minute"))
    guess += target - shown
  }
  return new Date(guess)
}

export function hijriParts(instant: Date, timeZone: string) {
  for (const calendar of ["islamic-umalqura", "islamic"]) {
    try {
      const parts = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}`, {
        timeZone,
        day: "numeric",
        month: "numeric",
        year: "numeric",
      }).formatToParts(instant)
      const read = (t: Intl.DateTimeFormatPartTypes) => Number.parseInt(parts.find((p) => p.type === t)?.value ?? "", 10)
      const month = read("month")
      const day = read("day")
      if (month >= 1 && day >= 1) return { month, day, year: read("year") }
    } catch {
      // Try the next calendar.
    }
  }
  return null
}

/** Civil dates (in the place's time zone) from today onward. */
function civilDay(place: Place, offset: number, now: Date) {
  const today = civilParts(place.timezone, now)
  const d = new Date(Date.UTC(today.year, today.month - 1, today.day + offset))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() }
}

/** The next civil day (within about a year) whose Hijri date is month/day. A 30th that a month lacks falls on the 29th. */
export function nextZakatDate(place: Place, month: number, day: number, now = new Date()) {
  for (let offset = 0; offset < 390; offset++) {
    const c = civilDay(place, offset, now)
    const noon = zonedTime(place.timezone, c.year, c.month, c.day, 12)
    const h = hijriParts(noon, place.timezone)
    if (!h || h.month !== month) continue
    if (h.day === day) return zonedTime(place.timezone, c.year, c.month, c.day, DAY_REMINDER_HOUR)
    if (day === 30 && h.day === 29) {
      const next = hijriParts(new Date(noon.getTime() + 24 * 60 * MIN), place.timezone)
      if (next && next.month !== month) return zonedTime(place.timezone, c.year, c.month, c.day, DAY_REMINDER_HOUR)
    }
  }
  return null
}

/** Extra reminders on the civil day `offset` days from today (zakat excluded; see nextZakatDate). */
export function extraEventsForDay(place: Place, settings: Settings, offset: number, now = new Date()): ExtraEvent[] {
  const x = settings.extras
  const out: ExtraEvent[] = []
  let times: DayTimes | null = null
  if (x.duha || x.athkarMorning || x.athkarEvening) {
    const t = dayTimes(place, settings, offset, now)
    times = timesAreOrdered(t) ? t : null
  }
  const at = (d: Date) => formatPrayerTime(d, place.timezone)
  if (times && x.duha) {
    const w = duhaWindow(times)
    if (validDate(w.start) && w.end > w.start) {
      out.push({ key: "duha", at: w.start, title: tNow("Time for Duha"), body: tNow("Duha can be prayed until about {time} · {place}", { time: at(w.end), place: place.label }) })
    }
  }
  if (times && x.athkarMorning) {
    out.push({
      key: "athkarMorning",
      at: new Date(times.fajr.getTime() + ATHKAR_AFTER_PRAYER_MIN * MIN),
      title: tNow("Morning athkar"),
      body: tNow("Take a few minutes for the morning remembrances."),
    })
  }
  if (times && x.athkarEvening) {
    out.push({
      key: "athkarEvening",
      at: new Date(times.asr.getTime() + ATHKAR_AFTER_PRAYER_MIN * MIN),
      title: tNow("Evening athkar"),
      body: tNow("Take a few minutes for the evening remembrances."),
    })
  }
  if (x.sadaqah) {
    const c = civilDay(place, offset, now)
    if (c.weekday === x.sadaqahDay) {
      out.push({
        key: "sadaqah",
        at: zonedTime(place.timezone, c.year, c.month, c.day, DAY_REMINDER_HOUR),
        title: tNow("A reminder to give sadaqah"),
        body: tNow("Even a small charity given regularly is beloved to Allah."),
      })
    }
  }
  return out
}

export function zakatEvent(place: Place, settings: Settings, now = new Date()): ExtraEvent | null {
  if (!settings.extras.zakat) return null
  const at = nextZakatDate(place, settings.extras.zakatMonth, settings.extras.zakatDay, now)
  if (!at) return null
  return {
    key: "zakat",
    at,
    title: tNow("Your zakat is due"),
    body: tNow("Your zakat year ends on {day} {month}. Work out what you owe and pay it.", {
      day: settings.extras.zakatDay,
      month: tNow(HIJRI_MONTHS[settings.extras.zakatMonth - 1]),
    }),
  }
}
