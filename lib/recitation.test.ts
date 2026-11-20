import assert from "node:assert/strict"
import { test } from "node:test"
import { ayahAudioUrl, nextAyah, parseRecitationPrefs, RECITERS, reciterById, startAyah } from "./recitation"

test("ayah files are named by three-digit surah and ayah", () => {
  const ghamdi = reciterById("ghamdi")
  assert.equal(ayahAudioUrl(ghamdi, 2, 255), "https://everyayah.com/data/Ghamadi_40kbps/002255.mp3")
  assert.equal(ayahAudioUrl(reciterById("abdulbasit-mujawwad"), 114, 6), "https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps/114006.mp3")
})

test("the basmala (ayah 0) plays Al-Fatihah's first ayah", () => {
  assert.equal(ayahAudioUrl(reciterById("minshawi"), 36, 0), "https://everyayah.com/data/Minshawy_Murattal_128kbps/001001.mp3")
})

test("reading a surah from the start begins with the basmala, except Al-Fatihah and At-Tawbah", () => {
  assert.equal(startAyah(2, 1, "surah"), 0)
  assert.equal(startAyah(1, 1, "surah"), 1)
  assert.equal(startAyah(9, 1, "surah"), 1)
  assert.equal(startAyah(2, 5, "surah"), 5)
  assert.equal(startAyah(2, 1, "ayah"), 1)
})

test("what plays next depends on the mode", () => {
  assert.equal(nextAyah(0, 7, "ayah"), 1)
  assert.equal(nextAyah(3, 7, "surah"), 4)
  assert.equal(nextAyah(7, 7, "surah"), null)
  assert.equal(nextAyah(3, 7, "ayah"), null)
  assert.equal(nextAyah(3, 7, "repeat"), 3)
})

test("saved choices fall back to defaults", () => {
  assert.deepEqual(parseRecitationPrefs(null), { reciter: "ghamdi", mode: "surah" })
  assert.deepEqual(parseRecitationPrefs("not json"), { reciter: "ghamdi", mode: "surah" })
  assert.deepEqual(parseRecitationPrefs('{"reciter":"nobody","mode":"loop"}'), { reciter: "ghamdi", mode: "surah" })
  assert.deepEqual(parseRecitationPrefs('{"reciter":"minshawi-mujawwad","mode":"repeat"}'), { reciter: "minshawi-mujawwad", mode: "repeat" })
})

test("reciter ids are unique", () => {
  assert.equal(new Set(RECITERS.map((r) => r.id)).size, RECITERS.length)
})
