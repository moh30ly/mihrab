import assert from "node:assert/strict"
import { test } from "node:test"
import { IRABS, TAFSIRS, defaultIrab, defaultTafsir, entryAt, tafsirById, tafsirChunkPath } from "./tafsir"

test("tafsir and i‘rab ids are unique", () => {
  const all = [...TAFSIRS, ...IRABS]
  assert.equal(new Set(all.map((t) => t.id)).size, all.length)
  assert.equal(new Set(all.map((t) => t.slug)).size, all.length)
})

test("i‘rab books are Arabic and kept apart from the tafsirs", () => {
  assert.ok(IRABS.every((b) => b.lang === "ar" && b.dir === "rtl"))
  assert.equal(defaultIrab().id, "irab-muyassar")
  assert.equal(tafsirById("irab-darwish", "irab")?.slug, "i-rab-al-quran-li-al-darwish")
  assert.equal(tafsirById("irab-darwish"), undefined)
  assert.equal(tafsirById("saadi", "irab"), undefined)
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
