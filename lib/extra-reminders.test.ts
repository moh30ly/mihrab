import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extraEventsForDay, hijriParts, nextZakatDate, zonedTime } from "./extra-reminders"
import { buildNativeReminders } from "./native-reminders"
import { dayTimes } from "./prayer"
import { DEFAULT_SETTINGS } from "./storage"
import type { Place, Settings } from "./types.ts"

const london: Place = {
  label: "London",
  detail: "",
  country: "GB",
  countryName: "United Kingdom",
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: "Europe/London",
  source: "city",
}

const all: Settings = {
  ...DEFAULT_SETTINGS,
  remindersEnabled: true,
  extras: { ...DEFAULT_SETTINGS.extras, duha: true, athkarMorning: true, athkarEvening: true, sadaqah: true, sadaqahDay: 5, zakat: true, duaOfDay: true, quranHourly: true },
}

describe("extra reminders", () => {
  it("finds the instant for a wall-clock time in another zone, across DST", () => {
    assert.equal(zonedTime("Europe/London", 2026, 1, 15, 10).toISOString(), "2026-01-15T10:00:00.000Z")
    assert.equal(zonedTime("Europe/London", 2026, 7, 15, 10).toISOString(), "2026-07-15T09:00:00.000Z")
    assert.equal(zonedTime("Asia/Riyadh", 2026, 7, 15, 10).toISOString(), "2026-07-15T07:00:00.000Z")
  })

  it("puts Duha after sunrise and the athkar after Fajr and Asr", () => {
    const now = new Date("2026-03-04T00:30:00Z") // a Wednesday in London
    const events = extraEventsForDay(london, all, 0, now)
    const keys = events.map((e) => e.key).filter((k) => k !== "quran" && k !== "duaOfDay")
    assert.deepEqual(keys, ["duha", "athkarMorning", "athkarEvening"])
    const duha = events[0].at.getTime()
    const morning = events[1].at.getTime()
    assert.ok(morning < duha, "morning athkar comes before Duha")
  })

  it("reminds about sadaqah only on the chosen weekday", () => {
    const now = new Date("2026-03-04T00:30:00Z") // Wednesday
    const friday = extraEventsForDay(london, all, 2, now)
    assert.ok(friday.some((e) => e.key === "sadaqah"))
    assert.equal(friday.find((e) => e.key === "sadaqah")?.at.toISOString(), "2026-03-06T10:00:00.000Z")
    assert.ok(!extraEventsForDay(london, all, 0, now).some((e) => e.key === "sadaqah"))
  })

  it("finds the next zakat date on the Hijri calendar", () => {
    const now = new Date("2026-01-01T12:00:00Z")
    const at = nextZakatDate(london, 9, 1, now)
    assert.ok(at)
    const h = hijriParts(new Date(at.getTime() + 2 * 3600_000), "Europe/London")
    assert.equal(h?.month, 9)
    assert.equal(h?.day, 1)
    assert.ok(at.getTime() > now.getTime())
    assert.ok(at.getTime() - now.getTime() < 366 * 86400_000)
  })

  it("sends the dua of the day after Dhuhr, a different one each day", () => {
    const now = new Date("2026-03-04T00:30:00Z")
    const today = extraEventsForDay(london, all, 0, now).find((e) => e.key === "duaOfDay")
    const tomorrow = extraEventsForDay(london, all, 1, now).find((e) => e.key === "duaOfDay")
    assert.ok(today && tomorrow)
    assert.equal(today.title, "Dua of the day")
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric" }).format(today.at))
    assert.ok(hour >= 12 && hour <= 13, `dua at ${today.at.toISOString()}`)
    assert.notEqual(today.body, tomorrow.body)
  })

  it("reminds to read Quran every hour on the hour between Fajr and Isha", () => {
    const now = new Date("2026-03-04T00:30:00Z")
    const hourly = extraEventsForDay(london, all, 0, now).filter((e) => e.key === "quran")
    const { fajr, isha } = dayTimes(london, all, 0, now)
    const hours = hourly.map((e) => e.at.getTime())
    assert.ok(hours.length >= 12, `${hours.length} reminders`)
    assert.ok(hours[0] > fajr.getTime() && hours[0] - 3600_000 <= fajr.getTime(), "the first comes in the hour after Fajr")
    const last = hours[hours.length - 1]
    assert.ok(last < isha.getTime() && last + 3600_000 >= isha.getTime(), "the last comes in the hour before Isha")
    hours.slice(1).forEach((t, i) => assert.equal(t - hours[i], 3600_000))
    assert.ok(hourly.every((e) => e.at.getUTCMinutes() === 0))
    const off = { ...all, extras: { ...all.extras, quranHourly: false } }
    assert.ok(!extraEventsForDay(london, off, 0, now).some((e) => e.key === "quran"))
  })

  it("schedules the extras natively with ids that don't collide", () => {
    const list = buildNativeReminders(london, all, new Date("2026-03-04T00:30:00Z"))
    assert.equal(new Set(list.map((r) => r.id)).size, list.length)
    assert.ok(list.some((r) => r.title === "Time for Duha"))
    assert.ok(list.some((r) => r.id === 5000))
  })
})
