import assert from "node:assert/strict"
import fs from "node:fs"
import { describe, it } from "node:test"
import table from "../data/dhikr-audio.json"
import athkar from "../data/athkar.json"
import hisn from "../data/hisn.json"
import { dhikrKey, dhikrRecording } from "./dhikr-audio"
import { SIBHA_PHRASES } from "./sibha"

describe("dhikr recordings", () => {
  it("ignores diacritics and letter variants when matching a text", () => {
    assert.equal(dhikrKey("سُبْحَانَ اللَّهِ"), dhikrKey("سبحان الله"))
    assert.equal(dhikrKey("أَسْتَغْفِرُ اللَّهَ"), dhikrKey("استغفر الله"))
    assert.notEqual(dhikrKey("سبحان الله"), dhikrKey("الحمد لله"))
  })
  it("has a recording for every sibha phrase", () => {
    for (const p of SIBHA_PHRASES) assert.equal(dhikrRecording(p.arabic), `/audio/dhikr/s-${p.id}.m4a`, p.id)
  })
  it("has a file for every entry", () => {
    for (const file of new Set(Object.values(table as Record<string, string>))) {
      assert.ok(fs.existsSync(`public/audio/dhikr/${file}.m4a`), file)
    }
  })
  it("covers nearly all of Hisn al-Muslim", () => {
    const items = (hisn as { items: { ar: string }[] }[]).flatMap((c) => c.items)
    const missing = items.filter((d) => !dhikrRecording(d.ar))
    assert.ok(missing.length <= 2, `${missing.length} without a recording`)
  })
  it("doesn't give an evening dhikr the morning reading", () => {
    const evening = (athkar as { when: string; arabic: string }[]).find((d) => d.when === "evening" && d.arabic.startsWith("أمسينا"))
    assert.ok(evening)
    assert.equal(dhikrRecording(evening.arabic), null)
  })
})
