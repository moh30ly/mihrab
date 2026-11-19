import assert from "node:assert/strict"
import { test } from "node:test"
import { bookOf, normalizeForSearch, searchLanguage, searchRows, type HadithIndex, type SearchRow } from "./hadith"

test("normalizeForSearch drops Arabic diacritics and unifies letter forms", () => {
  assert.equal(normalizeForSearch("إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ"), "انما الاعمال بالنيات")
  assert.equal(normalizeForSearch("Actions are by INTENTIONS!"), "actions are by intentions")
})

test("searchLanguage picks Arabic for Arabic letters", () => {
  assert.equal(searchLanguage("النيات"), "ar")
  assert.equal(searchLanguage("intention"), "en")
})

test("searchRows needs every word and ranks exact phrases first", () => {
  const rows: SearchRow[] = [
    [1, "the reward of deeds depends upon the intentions"],
    [2, "intentions and deeds of the reward"],
    [3, "prayer at night"],
  ]
  assert.deepEqual(searchRows(rows, "reward deeds").map((r) => r[0]), [1, 2])
  assert.deepEqual(searchRows(rows, "of the reward").map((r) => r[0]), [2, 1])
  assert.deepEqual(searchRows(rows, "deeds depends").map((r) => r[0]), [1])
  assert.deepEqual(searchRows(rows, "   "), [])
})

test("bookOf finds the book holding a hadith number", () => {
  const index: HadithIndex = {
    name: "x",
    total: 10,
    books: [
      { n: 1, name: "a", first: 1, last: 7, count: 7 },
      { n: 2, name: "b", first: 8, last: 10, count: 3 },
    ],
  }
  assert.equal(bookOf(index, 7)?.n, 1)
  assert.equal(bookOf(index, 7.5)?.n, 1)
  assert.equal(bookOf(index, 8)?.n, 2)
  assert.equal(bookOf(index, 11), undefined)
})
