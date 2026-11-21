// Builds the human recordings behind the Listen buttons (lib/dhikr-audio.ts):
//
// - public/audio/dhikr/h<n>.m4a: each supplication of Hisn al-Muslim as read by Hamad
//   Al-Duraihim (hisnmuslim.com, published by IslamHouse), taken from the per-supplication MP3s
//   in the Islamic-Pro-azkar-API dataset (the same dataset as data/hisn.json, so the ids line up).
// - public/audio/dhikr/s-<phrase>.m4a: the sibha phrases, cut from those readings. Each cut was
//   checked by running the clip through Mihrab's own Arabic speech recogniser.
// - data/dhikr-audio.json: text key -> file, for Hisn items, sibha phrases, and the athkar and duas
//   whose Arabic is the same supplication as a Hisn item.
//
// Re-encoded to mono AAC at 32 kb/s with loudness evened out, about a tenth of the source size.
// Needs ffmpeg. Run: npx tsx scripts/build-dhikr-audio.mts [mp3 cache dir]
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { dhikrKey, dhikrWords } from "../lib/dhikr-audio"
import { SIBHA_PHRASES } from "../lib/sibha"

const SOURCE = "https://raw.githubusercontent.com/YousefAsalya/Islamic-Pro-azkar-API/main"
const OUT = path.join("public", "audio", "dhikr")
const cache = process.argv[2] ?? path.join("node_modules", ".cache", "hisn-audio")

/** Sibha phrase -> [source recording, start s, end s]. Times found from pauses in the reading. */
const SIBHA_CUTS: Record<string, [string, number, number]> = {
  subhanallah: ["106", 0.67, 2.66], // "سبحان الله (ثلاثا وثلاثين)…" after prayer
  alhamdulillah: ["181", 0.2, 1.46], // "الحمد لله حمدا كثيرا…" after eating
  allahuakbar: ["106", 11.0, 12.78], // "…والله أكبر (أربعا وثلاثين)", from after the "wa"
  tahlil: ["245", 3.92, 7.57], // "لا إله إلا الله!" on being startled
  istighfar: ["96", 0.76, 2.12], // "أستغفر الله وأتوب إليه"
  hawqala: ["16", 11.09, 14.89], // "…ولا حول ولا قوة إلا بالله" on leaving home
  "subhanallahi-wa-bihamdihi": ["91", 0.05, 3.34], // "سبحان الله وبحمده (مائة مرة)"
  salawat: ["98", 0.78, 4.86], // "اللهم صل وسلم على نبينا محمد (عشر مرات)"
}

type Book = { id: number; array: { id: number; text: string; audio: string }[] }[]
type Hisn = { id: number; items: { id: number; ar: string }[] }[]
type Entry = { arabic: string }

const read = <T,>(file: string) => JSON.parse(fs.readFileSync(file, "utf8")) as T

async function mp3(id: string): Promise<string | null> {
  const file = path.join(cache, `${id}.mp3`)
  if (fs.existsSync(file)) return file
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${SOURCE}/audio/${id}.mp3`).catch(() => null)
    if (res?.ok) {
      fs.mkdirSync(cache, { recursive: true })
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
      return file
    }
    if (res?.status === 404) break
    await new Promise((ok) => setTimeout(ok, attempt * 1500))
  }
  console.warn(`no recording ${id}.mp3`)
  return null
}

function encode(input: string, output: string, cut?: [number, number]) {
  const trim = cut ? ["-ss", String(cut[0]), "-to", String(cut[1])] : []
  // Short fades so a cut never clicks; the end fade is applied by reversing.
  const fades = cut ? "afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse," : ""
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", input, ...trim, "-vn", "-map_metadata", "-1", "-ac", "1", "-ar", "24000", "-af", `${fades}loudnorm=I=-18:TP=-2:LRA=11`, "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", output])
}

const book = (await (await fetch(`${SOURCE}/data/ar.json`)).json()) as Book
const hisn = read<Hisn>("data/hisn.json")
fs.mkdirSync(OUT, { recursive: true })

const table: Record<string, string> = {}
const hisnItems: { words: Set<string>; evening: boolean; file: string }[] = []
/** Whether a text says the evening wording ("amsayna"); the book's [notes] don't count. */
const evening = (arabic: string) => dhikrWords(arabic.replace(/\[[^\]]*\]/g, " ")).some((w) => /^(امسي|امسينا|امسيت|وامسي)$/.test(w))

for (const chapter of hisn) {
  const source = book.find((c) => c.id === chapter.id)
  for (const item of chapter.items) {
    const audio = source?.array.find((a) => a.id === item.id)?.audio
    const id = audio?.match(/\/(\d+)\.mp3$/)?.[1]
    if (!id) continue
    const file = `h${id}`
    const out = path.join(OUT, `${file}.m4a`)
    if (!fs.existsSync(out)) {
      const input = await mp3(id)
      if (!input) continue
      encode(input, out)
    }
    table[dhikrKey(item.ar)] = file
    hisnItems.push({ words: new Set(dhikrWords(item.ar)), evening: evening(item.ar), file })
  }
}

for (const phrase of SIBHA_PHRASES) {
  const cut = SIBHA_CUTS[phrase.id]
  if (!cut) continue
  const file = `s-${phrase.id}`
  const input = await mp3(cut[0])
  if (!input) continue
  encode(input, path.join(OUT, `${file}.m4a`), [cut[1], cut[2]])
  table[dhikrKey(phrase.arabic)] = file
}

/** The Hisn recording of the same supplication: nearly the same words (the readings also say the counts). */
function sameAsHisn(arabic: string): string | null {
  const mine = new Set(dhikrWords(arabic))
  // The book gives the evening wording only as a note, and its reading starts with the morning
  // wording, so an evening dhikr keeps the device's voice rather than play the morning words.
  const wantEvening = evening(arabic)
  let best: string | null = null
  let bestScore = 0
  for (const h of hisnItems) {
    if (wantEvening && !h.evening) continue
    let common = 0
    for (const w of mine) if (h.words.has(w)) common++
    const jaccard = common / (mine.size + h.words.size - common || 1)
    // The book's text often adds a note such as "(three times)"; the reading says it too.
    const contained = mine.size >= 2 && common / mine.size >= 0.9 && common / h.words.size >= 0.6
    if (!contained && jaccard < 0.8) continue
    // Among the candidates, the closest wording wins.
    const score = jaccard
    if (score > bestScore) {
      bestScore = score
      best = h.file
    }
  }
  return best
}

let matched = 0
const others = [...read<Entry[]>("data/athkar.json"), ...read<Entry[]>("data/duas.json")]
for (const entry of others) {
  const key = dhikrKey(entry.arabic)
  if (table[key]) {
    matched++
    continue
  }
  const file = sameAsHisn(entry.arabic)
  if (file) {
    table[key] = file
    matched++
  }
}

fs.writeFileSync("data/dhikr-audio.json", JSON.stringify(table) + "\n")
const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0)
console.log(`${Object.keys(table).length} texts with recordings; athkar and duas matched: ${matched}/${others.length}; ${(bytes / 1048576).toFixed(1)} MB in ${OUT}`)
