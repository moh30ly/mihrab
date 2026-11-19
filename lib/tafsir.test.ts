import assert from "node:assert/strict"
import { test } from "node:test"
import { TAFSIRS, defaultTafsir, entryAt, tafsirChunkPath } from "./tafsir"

test("tafsir ids are unique", () => {
  assert.equal(new Set(TAFSIRS.map((t) => t.id)).size, TAFSIRS.length)
})

test("defaultTafsir follows the interface language, else English", () => {
  assert.equal(defaultTafsir("ar").id, "mukhtasar-ar")
  assert.equal(defaultTafsir("tr").id, "mukhtasar-tr")
  assert.equal(defaultTafsir("de").id, "mukhtasar-en")
})

test("chunks hold ten ayahs", () => {
  assert.equal(tafsirChunkPath("saadi", 2, 1), "tafsir/saadi/2/0.json")
  assert.equal(tafsirChunkPath("saadi", 2, 10), "tafsir/saadi/2/0.json")
  assert.equal(tafsirChunkPath("saadi", 2, 11), "tafsir/saadi/2/1.json")
  assert.equal(entryAt(["a", "b", 2], 13), 2)
})
