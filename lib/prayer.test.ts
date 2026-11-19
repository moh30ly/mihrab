import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_SETTINGS } from "./storage"
import {
  cardinal,
  civilParts,
  dateForCivilDay,
  dayTimes,
  distanceToKaabaKm,
  nextObligatory,
  qiblaBearing,
  timesAreOrdered,
  turnToward,
} from "./prayer"
import type { Place, Settings } from "./types.ts"

function place(partial: Pick<Place, "latitude" | "longitude" | "timezone"> & Partial<Place>): Place {
  return {
    label: "Test",
    detail: "",
    country: "",
    countryName: "",
    source: "coordinates",
    ...partial,
  }
}

const makkah = place({
  latitude: 21.4266,
  longitude: 39.8256,
  timezone: "Asia/Riyadh",
  label: "Makkah",
})

const chicago = place({
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: "America/Chicago",
  label: "Chicago",
})

function localHour(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date)
  return Number(parts.find((part) => part.type === "hour")?.value)
}

describe("qibla", () => {
  it("points north from just south of the Kaaba and south from just north", () => {
    const southOfKaaba = qiblaBearing(20, 39.8261818)
    const northOfKaaba = qiblaBearing(23, 39.8261818)
    assert.ok(southOfKaaba < 8 || southOfKaaba > 352)
    assert.ok(Math.abs(northOfKaaba - 180) < 8)
  })

  it("matches familiar bearings", () => {
    const newYork = qiblaBearing(40.7128, -74.006)
    const jakarta = qiblaBearing(-6.2088, 106.8456)
    const london = qiblaBearing(51.5074, -0.1278)
    assert.ok(newYork > 50 && newYork < 70, `New York ${newYork}`)
    assert.ok(jakarta > 280 && jakarta < 310, `Jakarta ${jakarta}`)
    assert.ok(london > 110 && london < 130, `London ${london}`)
    assert.equal(cardinal(newYork), "ENE")
  })

  it("measures distance to the Kaaba", () => {
    assert.ok(distanceToKaabaKm(21.4225241, 39.8261818) < 1)
    const chicagoKm = distanceToKaabaKm(chicago.latitude, chicago.longitude)
    assert.ok(chicagoKm > 10000 && chicagoKm < 12000, String(chicagoKm))
  })

  it("turns the short way", () => {
    assert.equal(turnToward(90, 90), 0)
    assert.equal(turnToward(10, 0), 10)
    assert.equal(turnToward(0, 10), -10)
    assert.equal(turnToward(10, 350), 20)
  })
})

describe("prayer times", () => {
  const samples = [
    makkah,
    chicago,
    place({ latitude: -6.2088, longitude: 106.8456, timezone: "Asia/Jakarta", label: "Jakarta" }),
    place({ latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", label: "London" }),
    place({ latitude: 59.9139, longitude: 10.7522, timezone: "Europe/Oslo", label: "Oslo" }),
    place({ latitude: 69.6492, longitude: 18.9553, timezone: "Europe/Oslo", label: "Tromso" }),
  ]

  for (const sample of samples) {
    it(`keeps ${sample.label} in order`, () => {
      for (const offset of [-1, 0, 1]) {
        const times = dayTimes(sample, DEFAULT_SETTINGS, offset)
        assert.equal(timesAreOrdered(times), true, `${sample.label} offset ${offset}`)
      }
    })
  }

  it("puts Dhuhr near solar noon in the city's time zone", () => {
    for (const sample of [makkah, chicago]) {
      const times = dayTimes(sample, DEFAULT_SETTINGS, 0)
      const hour = localHour(times.dhuhr, sample.timezone)
      assert.ok(hour >= 10 && hour <= 15, `${sample.label} dhuhr hour ${hour}`)
    }
  })

  it("makes Hanafi Asr later than standard Asr", () => {
    const standard = dayTimes(chicago, DEFAULT_SETTINGS)
    const hanafi = dayTimes(chicago, { ...DEFAULT_SETTINGS, madhab: "hanafi" })
    assert.ok(hanafi.asr.getTime() > standard.asr.getTime())
  })

  it("shifts Fajr by the mosque adjustment", () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      adjustments: { ...DEFAULT_SETTINGS.adjustments, fajr: 10 },
    }
    const base = dayTimes(makkah, DEFAULT_SETTINGS)
    const shifted = dayTimes(makkah, settings)
    const minutes = (shifted.fajr.getTime() - base.fajr.getTime()) / 60000
    assert.ok(minutes >= 9 && minutes <= 11, String(minutes))
  })

  it("names tomorrow's Fajr once Isha has passed", () => {
    const today = dayTimes(chicago, DEFAULT_SETTINGS, 0)
    const tomorrow = dayTimes(chicago, DEFAULT_SETTINGS, 1)
    const next = nextObligatory(today, tomorrow, today.isha.getTime() + 60_000)
    assert.equal(next.key, "fajr")
    assert.equal(next.tomorrow, true)
    assert.equal(next.at.getTime(), tomorrow.fajr.getTime())
  })
})

describe("civil dates", () => {
  it("builds a local date for the city's calendar day", () => {
    const now = new Date()
    for (const timeZone of ["Pacific/Auckland", "Asia/Tokyo", "America/Chicago", "Pacific/Honolulu"]) {
      const date = dateForCivilDay(timeZone, 0, now)
      const civil = civilParts(timeZone, now)
      assert.equal(date.getFullYear(), civil.year)
      assert.equal(date.getMonth() + 1, civil.month)
      assert.equal(date.getDate(), civil.day)
    }
  })
})
