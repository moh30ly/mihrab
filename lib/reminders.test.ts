import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isInsideReminderWindow, pruneFiredKeys, reminderStorageKey } from "./reminders"

describe("reminders", () => {
  const at = Date.parse("2026-11-19T18:00:00Z")

  it("opens a window before the prayer and closes it after", () => {
    assert.equal(isInsideReminderWindow(at - 10 * 60_000, at, 10), true)
    assert.equal(isInsideReminderWindow(at - 10 * 60_000 - 1, at, 10), false)
    assert.equal(isInsideReminderWindow(at - 7 * 60_000, at, 10), false)
    assert.equal(isInsideReminderWindow(at, at, 0), true)
    assert.equal(isInsideReminderWindow(at + 3 * 60_000, at, 0), false)
  })

  it("builds a stable key and drops old ones", () => {
    assert.equal(reminderStorageKey("2026-11-19", "asr", 10), "2026-11-19:asr:10")
    const kept = pruneFiredKeys(["2026-11-17:fajr:0", "2026-11-18:dhuhr:10", "2026-11-16:isha:0"], "2026-11-19")
    assert.deepEqual(kept, ["2026-11-17:fajr:0", "2026-11-18:dhuhr:10"])
  })
})
