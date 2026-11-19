import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildNativeReminders, NATIVE_DAYS_AHEAD } from "./native-reminders"
import { DEFAULT_SETTINGS } from "./storage"
import type { Place, Settings } from "./types.ts"

const makkah: Place = {
  label: "Makkah",
  detail: "",
  country: "SA",
  countryName: "Saudi Arabia",
  latitude: 21.4266,
  longitude: 39.8256,
  timezone: "Asia/Riyadh",
  source: "coordinates",
}

const on: Settings = { ...DEFAULT_SETTINGS, remindersEnabled: true, leadMinutes: 0 }
const now = new Date("2026-03-01T00:00:00Z")

describe("native reminders", () => {
  it("schedules nothing when reminders are off", () => {
    assert.equal(buildNativeReminders(makkah, { ...on, remindersEnabled: false }, now).length, 0)
  })

  it("schedules each enabled prayer for the coming days, in the future, with unique ids", () => {
    const list = buildNativeReminders(makkah, on, now)
    assert.ok(list.length >= 5 * (NATIVE_DAYS_AHEAD - 1))
    assert.ok(list.every((r) => r.at.getTime() > now.getTime()))
    assert.equal(new Set(list.map((r) => r.id)).size, list.length)
  })

  it("adds an early reminder when a lead time is chosen", () => {
    const plain = buildNativeReminders(makkah, on, now)
    const early = buildNativeReminders(makkah, { ...on, leadMinutes: 10 }, now)
    assert.equal(early.length, plain.length * 2)
    assert.ok(early.some((r) => r.title.endsWith("in 10 minutes")))
  })

  it("skips prayers that are switched off", () => {
    const list = buildNativeReminders(makkah, { ...on, prayers: { ...on.prayers, fajr: false } }, now)
    assert.ok(list.every((r) => !r.title.includes("Fajr")))
  })
})
