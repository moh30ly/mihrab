import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DUAS, DUA_GROUPS, RUQYA, duaOfTheDay, duasIn } from "./duas"

describe("duas", () => {
  it("has unique ids and something in every occasion", () => {
    const all = [...DUAS, ...RUQYA]
    assert.equal(new Set(all.map((d) => d.id)).size, all.length)
    for (const g of DUA_GROUPS) assert.ok(duasIn(g.id).length > 0, g.id)
    assert.ok(RUQYA.length >= 6)
  })

  it("gives every dua Arabic, a meaning and a source", () => {
    for (const d of [...DUAS, ...RUQYA]) {
      assert.match(d.arabic, /[ء-ي]/, d.id)
      assert.ok(d.english.length > 0 && d.reference.length > 0, d.id)
      assert.ok(d.count >= 1, d.id)
    }
  })

  it("keeps the ruqya verses out of the dua of the day and changes it each day", () => {
    const seen = new Set<string>()
    for (let day = 1; day <= DUAS.length; day++) {
      const d = duaOfTheDay(2027, 1, day)
      assert.notEqual(d.group, "ruqya")
      seen.add(d.id)
    }
    assert.equal(seen.size, DUAS.length, "a full cycle shows every dua once")
    assert.notEqual(duaOfTheDay(2026, 11, 19).id, duaOfTheDay(2026, 11, 20).id)
  })
})
