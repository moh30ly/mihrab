import { test } from "node:test"
import assert from "node:assert/strict"
import { audioPack, audioSize, ayahSources, bookPack, packOfLibraryPath, totalAudioSize } from "./offline"
import { reciterById } from "./recitation"

const ghamdi = reciterById("ghamdi")

test("library files belong to the pack of their book", () => {
  assert.equal(packOfLibraryPath("tafsir/saadi/2/25.json"), bookPack("tafsir", "saadi"))
  assert.equal(packOfLibraryPath("tafsir/irab-darwish/1/0.json"), "library/tafsir/irab-darwish")
  assert.equal(packOfLibraryPath("hadith/bukhari/index.json"), "library/hadith/bukhari")
  assert.equal(packOfLibraryPath("manifest.json"), null)
})

test("a surah's recitation is its own pack", () => {
  assert.equal(audioPack(ghamdi, 36), "audio/ghamdi/36")
})

test("without a download, ayahs play from EveryAyah", () => {
  assert.deepEqual(ayahSources(ghamdi, 2, 255), ["https://everyayah.com/data/Ghamadi_40kbps/002255.mp3"])
})

test("recitation sizes are known for every reciter and surah", () => {
  for (const id of ["ghamdi", "minshawi", "minshawi-mujawwad", "abdulbasit", "abdulbasit-mujawwad"]) {
    const r = reciterById(id)
    assert.equal(r.id, id)
    for (let s = 1; s <= 114; s++) assert.ok(audioSize(r, s) > 0, `${id} ${s}`)
  }
  // Al-Baqarah is the longest surah; Al-Ghamdi's whole Quran is about 420 MB.
  assert.ok(audioSize(ghamdi, 2) > audioSize(ghamdi, 3))
  const total = totalAudioSize(ghamdi) / 1024 / 1024
  assert.ok(total > 380 && total < 460, String(total))
})
