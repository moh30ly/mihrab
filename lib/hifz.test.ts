import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  arabicWords,
  ayahState,
  compareRecitation,
  isHidden,
  parseProgress,
  plainArabic,
  recordAttempt,
  skeleton,
  surahSummary,
} from "./hifz"

const ayah = (s: number, a: number) => (JSON.parse(readFileSync(`data/quran/${s}.json`, "utf8")).verses[a - 1][0] as string)
const statuses = (expected: string, said: string, partial = false) =>
  compareRecitation(arabicWords(expected), said, { partial }).words.map((w) => w.status)

test("Uthmani and modern spelling share a skeleton", () => {
  assert.equal(skeleton("ٱلۡكِتَٰبُ"), skeleton("الكتاب"))
  assert.equal(skeleton("ٱلرَّحۡمَٰنِ"), skeleton("الرحمن"))
  assert.equal(plainArabic("بِسۡمِ ٱللَّهِ"), "بسم الله")
})

test("a correct recitation of al-Fatiha scores fully", () => {
  const r = compareRecitation(arabicWords(ayah(1, 2)), "الحمد لله رب العالمين")
  assert.deepEqual(r.words.map((w) => w.status), ["correct", "correct", "correct", "correct"])
  assert.equal(r.score, 1)
})

test("modern spellings of Uthmani words still count", () => {
  // ٱلصَّلَوٰةَ is said الصلاة; يَٰٓأَيُّهَا is heard as two words.
  const r = compareRecitation(arabicWords(ayah(2, 3)), "الذين يؤمنون بالغيب ويقيمون الصلاة ومما رزقناهم ينفقون")
  assert.ok(r.words.every((w) => w.status === "correct" || w.status === "close"), JSON.stringify(r.words))
  const y = compareRecitation(arabicWords(ayah(2, 21)), "يا أيها الناس اعبدوا ربكم الذي خلقكم والذين من قبلكم لعلكم تتقون")
  assert.equal(y.score, 1, JSON.stringify(y.words))
})

test("a wrong word and a skipped word are found", () => {
  assert.deepEqual(statuses(ayah(1, 2), "الحمد لله رب الناس"), ["correct", "correct", "correct", "wrong"])
  assert.deepEqual(statuses(ayah(1, 2), "الحمد رب العالمين"), ["correct", "missed", "correct", "correct"])
})

test("while reciting, words not reached yet are pending", () => {
  assert.deepEqual(statuses(ayah(1, 2), "الحمد لله", true), ["correct", "correct", "pending", "pending"])
  assert.deepEqual(statuses(ayah(1, 2), "الحمد لله", false), ["correct", "correct", "missed", "missed"])
})

test("the isti'adha before the ayah is ignored as extra words", () => {
  const r = compareRecitation(arabicWords(ayah(1, 2)), "أعوذ بالله من الشيطان الرجيم الحمد لله رب العالمين")
  assert.equal(r.score, 1)
  assert.equal(r.extra.length, 5)
})

test("disjointed letters may be said by their names", () => {
  const r = compareRecitation(arabicWords(ayah(2, 1)), "ألف لام ميم")
  assert.equal(r.score, 1, JSON.stringify(r.words))
})

test("hiding is stable and keeps a cue word", () => {
  const n = 10
  const a = Array.from({ length: n }, (_, i) => isHidden(2, 2, 255, i, n))
  const b = Array.from({ length: n }, (_, i) => isHidden(2, 2, 255, i, n))
  assert.deepEqual(a, b)
  assert.equal(a[0], false)
  assert.equal(isHidden(3, 2, 255, 0, n), false)
  assert.equal(isHidden(3, 2, 255, 1, n), true)
  assert.equal(isHidden(4, 2, 255, 0, n), true)
  assert.equal(isHidden(0, 2, 255, 3, n), false)
})

test("progress becomes memorized only when recited from memory", () => {
  let p = recordAttempt({}, 1, 2, 1, 0)
  assert.equal(ayahState(p, 1, 2), "learning")
  p = recordAttempt(p, 1, 2, 0.95, 4)
  assert.equal(ayahState(p, 1, 2), "memorized")
  p = recordAttempt(p, 1, 2, 0.2, 4)
  assert.equal(ayahState(p, 1, 2), "memorized")
  assert.deepEqual(surahSummary(p, 1, 7), { memorized: 1, learning: 0, verses: 7 })
  assert.deepEqual(parseProgress(JSON.stringify(p)), p)
  assert.deepEqual(parseProgress("not json"), {})
})

test("long ayahs compare quickly", () => {
  const text = ayah(2, 282)
  const start = performance.now()
  const r = compareRecitation(arabicWords(text), plainArabic(text))
  assert.ok(r.score > 0.95, String(r.score))
  assert.ok(performance.now() - start < 500)
})
