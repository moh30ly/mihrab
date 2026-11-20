import { test } from "node:test"
import assert from "node:assert/strict"
import { NOTE_MAX, parseLastRead, parseNotes, sortNotes, withNote } from "./quran-notes"

test("parseNotes keeps valid notes and drops broken ones", () => {
  const raw = JSON.stringify({
    "2:255": { surah: 2, ayah: 255, text: "Ayat al-Kursi", updated: 5 },
    "1:8": { surah: 1, ayah: 8, text: "no such ayah", updated: 1 },
    "115:1": { surah: 115, ayah: 1, text: "no such surah" },
    "3:1": { surah: 3, ayah: 1, text: "   " },
    bad: "nope",
  })
  const notes = parseNotes(raw)
  assert.deepEqual(Object.keys(notes), ["2:255"])
  assert.equal(notes["2:255"].text, "Ayat al-Kursi")
  assert.deepEqual(parseNotes("not json"), {})
  assert.deepEqual(parseNotes(null), {})
  assert.deepEqual(parseNotes("[1,2]"), {})
})

test("withNote adds, edits and removes", () => {
  let notes = withNote({}, 36, 1, "Ya-Sin  \n", 10)
  assert.deepEqual(notes["36:1"], { surah: 36, ayah: 1, text: "Ya-Sin", updated: 10 })
  notes = withNote(notes, 36, 1, "edited", 20)
  assert.equal(notes["36:1"].text, "edited")
  assert.equal(notes["36:1"].updated, 20)
  const before = notes
  notes = withNote(notes, 36, 1, "  ")
  assert.equal(notes["36:1"], undefined)
  assert.ok(before["36:1"], "the old object is not changed")
  assert.equal(withNote({}, 1, 1, "x".repeat(NOTE_MAX + 50))["1:1"].text.length, NOTE_MAX)
})

test("sortNotes follows the order of the mushaf", () => {
  let notes = withNote({}, 18, 10, "c")
  notes = withNote(notes, 2, 255, "b")
  notes = withNote(notes, 2, 3, "a")
  assert.deepEqual(
    sortNotes(notes).map((n) => n.text),
    ["a", "b", "c"],
  )
})

test("parseLastRead accepts old and new shapes", () => {
  assert.deepEqual(parseLastRead('{"surah":2,"ayah":40}'), { surah: 2, ayah: 40, at: null })
  assert.deepEqual(parseLastRead('{"surah":2,"ayah":40,"at":99}'), { surah: 2, ayah: 40, at: 99 })
  assert.equal(parseLastRead('{"surah":1,"ayah":9}'), null)
  assert.equal(parseLastRead("{"), null)
  assert.equal(parseLastRead(null), null)
})
