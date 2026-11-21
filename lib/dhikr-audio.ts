// Human recordings for the Listen buttons on athkar, duas, Hisn al-Muslim and the sibha.
//
// The recordings are Hisn al-Muslim read by Hamad Al-Duraihim (hisnmuslim.com, published by
// IslamHouse), re-encoded small and shipped with the site and the Android app, so they play
// offline. The sibha phrases are short clips cut from those readings.
// scripts/build-dhikr-audio.mts makes the files in public/audio/dhikr/ and the lookup table in
// data/dhikr-audio.json. A text with no recording falls back to the device's voice (lib/speak.ts).
import table from "@/data/dhikr-audio.json"

/** Arabic words without diacritics, Quranic marks, letter variants or notes, for matching texts. */
export function dhikrWords(text: string): string[] {
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي ]+/g, " ")
    .split(" ")
    .filter(Boolean)
}

/** A short, stable key for a text: FNV-1a over its normalised words. */
export function dhikrKey(text: string): string {
  let h = 0x811c9dc5
  for (const ch of dhikrWords(text).join(" ")) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

const files = table as Record<string, string>

/** The recording's path under the site root, or null when this text has none. */
export function dhikrRecording(text: string): string | null {
  const file = files[dhikrKey(text)]
  return file ? `/audio/dhikr/${file}.m4a` : null
}
