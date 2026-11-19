import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { chunkTimeoutMs, pickArabicVoice, speakableArabic, speechChunks } from "./speak"

const v = (lang: string, localService = true, name = lang) => ({ lang, localService, name })

describe("pickArabicVoice", () => {
  it("returns null when there is no Arabic voice", () => {
    assert.equal(pickArabicVoice([v("en-US"), v("de-DE")]), null)
  })
  it("prefers a Saudi or standard Arabic voice that works offline", () => {
    assert.equal(pickArabicVoice([v("ar-EG"), v("ar-SA", false), v("ar-SA")])?.lang, "ar-SA")
    assert.equal(pickArabicVoice([v("en-US"), v("ar_EG")])?.lang, "ar_EG")
  })
})

describe("speechChunks", () => {
  it("keeps short text whole", () => {
    assert.deepEqual(speechChunks("سبحان الله"), ["سبحان الله"])
  })
  it("splits long text at Arabic punctuation without losing words", () => {
    const text = Array.from({ length: 12 }, () => "اللهم إني أسألك العفو والعافية في الدنيا والآخرة،").join(" ")
    const chunks = speechChunks(text)
    assert.ok(chunks.length > 1)
    assert.ok(chunks.every((c) => c.length <= 160))
    assert.equal(chunks.join(" "), text)
  })
})

describe("speakableArabic", () => {
  it("drops Quranic brackets, ayah marks and notes", () => {
    assert.equal(speakableArabic("﴿قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ﴾ (ثلاثا)"), "قُلْ هُوَ اللَّهُ أَحَدٌ اللَّهُ الصَّمَدُ")
  })
})

describe("chunkTimeoutMs", () => {
  it("gives longer chunks more time", () => {
    assert.ok(chunkTimeoutMs("a".repeat(160)) > chunkTimeoutMs("a"))
    assert.ok(chunkTimeoutMs("a") >= 8000)
  })
})
