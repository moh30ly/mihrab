import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { GOOD_DEEDS, goodDeedOfTheDay } from "./good-deeds"

describe("good deeds", () => {
  it("has a source for every nudge and unique ids", () => {
    assert.equal(new Set(GOOD_DEEDS.map((d) => d.id)).size, GOOD_DEEDS.length)
    for (const d of GOOD_DEEDS) assert.ok(d.question.endsWith("?") && d.reason && d.reference, d.id)
  })

  it("shows every nudge once over a full cycle of days", () => {
    const seen = new Set<string>()
    for (let day = 1; day <= GOOD_DEEDS.length; day++) seen.add(goodDeedOfTheDay(2027, 3, day).id)
    assert.equal(seen.size, GOOD_DEEDS.length)
  })
})
