import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_SETTINGS } from "./storage"
import type { Place } from "./types.ts"
import { buildWidgetSnapshot, WIDGET_DAYS } from "./widget"

const granada: Place = {
  label: "Granada",
  detail: "",
  country: "ES",
  countryName: "Spain",
  latitude: 37.1773,
  longitude: -3.5986,
  timezone: "Europe/Madrid",
  source: "city",
}

const now = new Date("2026-11-19T22:00:00Z")

describe("widget snapshot", () => {
  it("has the coming days in order, five future-facing times each, starting today", () => {
    const s = buildWidgetSnapshot(granada, DEFAULT_SETTINGS, "en", now)
    assert.equal(s.days.length, WIDGET_DAYS)
    assert.equal(s.days[0].date, "2026-11-19")
    assert.equal(s.days[1].date, "2026-11-20")
    assert.deepEqual(s.names, ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"])
    const all = s.days.flatMap((d) => d.at)
    for (let i = 1; i < all.length; i++) assert.ok(all[i] > all[i - 1])
    for (const d of s.days) {
      assert.equal(d.at.length, 5)
      assert.equal(d.times.length, 5)
      assert.ok(d.hijri.length > 0)
      assert.ok(d.deed.endsWith("?"))
    }
    assert.equal(s.rtl, false)
  })

  it("follows the app's language, with Arabic right to left", () => {
    const s = buildWidgetSnapshot(granada, DEFAULT_SETTINGS, "ar", now)
    assert.equal(s.rtl, true)
    assert.equal(s.names[0], "الفجر")
    assert.equal(s.labels.next, "الصلاة التالية")
    assert.notEqual(s.labels.stale, "Open Mihrab to update the prayer times.")
  })
})
