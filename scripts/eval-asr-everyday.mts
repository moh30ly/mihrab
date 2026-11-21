// Scores the offline recitation checker on everyday reciters, and on whether it catches mistakes.
//
// Clips come from a manifest made by scripts/asr-train/prepare_data.py (learners, volunteers,
// professional reciters). For each clip the model runs once, the way the app checks a whole
// recitation at the end (lib/quran-asr.ts), and what it heard is scored with the app's own
// matching (lib/hifz.ts) in three ways:
//
//   as recited     correct clips should come out all right; incorrect ones should be flagged
//   changed word   one expected word swapped for a different Quran word: that word must be marked
//                  wrong or missed (what a reciter saying the wrong word looks like to the checker)
//   skipped word   one extra word added to the expected text, never said: it must be marked missed
//
// The edits are only scored where the untouched word was heard right, so a mishearing is not a catch.
//
// The last two need no extra audio, so they also run on professional recitations.
// Usage: npx tsx scripts/eval-asr-everyday.mts <dataset dir> [--split test] [--limit N] [--json out.json] <model dir>...
import fs from "node:fs"
import path from "node:path"
import { env, pipeline } from "@huggingface/transformers"
import { arabicWords, compareRecitation, similarity, skeleton } from "../lib/hifz"

const RATE = 16000
const argv = process.argv.slice(2)
const opt = (name: string) => {
  const i = argv.indexOf(name)
  if (i < 0) return undefined
  const v = argv[i + 1]
  argv.splice(i, 2)
  return v
}
const split = opt("--split") ?? "test"
const limit = Number(opt("--limit") ?? 0)
const jsonOut = opt("--json")
const [dataDir, ...modelDirs] = argv

type Clip = { id: string; audio: string; surah: number; ayah: number; label: string; source: string; speaker: string; split: string; seconds: number }
let clips = fs
  .readFileSync(path.join(dataDir, "manifest.jsonl"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Clip)
  .filter((c) => split === "all" || c.split === split)
if (limit) clips = clips.slice(0, limit)

const surahs = new Map<number, string[]>()
function ayahText(surah: number, ayah: number): string {
  if (!surahs.has(surah)) {
    const raw = JSON.parse(fs.readFileSync(path.join("data", "quran", `${surah}.json`), "utf8")) as { verses: [string, string][] }
    surahs.set(surah, raw.verses.map((v) => v[0]))
  }
  return surahs.get(surah)![ayah - 1]
}

/** 16-bit PCM WAV -> float32. */
function readWav(file: string): Float32Array {
  const b = fs.readFileSync(file)
  let at = 12
  while (at < b.length - 8) {
    const id = b.toString("ascii", at, at + 4)
    const size = b.readUInt32LE(at + 4)
    if (id === "data") {
      const n = Math.floor(size / 2)
      const out = new Float32Array(n)
      for (let i = 0; i < n; i++) out[i] = b.readInt16LE(at + 8 + i * 2) / 32768
      return out
    }
    at += 8 + size + (size % 2)
  }
  throw new Error(`${file}: no data chunk`)
}

/** A steady pseudo-random number for a clip, so every model faces the same edits. */
function noise(s: string, salt: number): number {
  let h = salt
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 2654435761)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

// Words to swap in: real Quran words, from the surahs used here plus a few long ones.
const pool: string[] = []
for (const s of new Set([...clips.map((c) => c.surah), 2, 18, 36])) {
  ayahText(s, 1)
  for (const v of surahs.get(s)!) pool.push(...arabicWords(v))
}

/** A different word: shares at most a third of its letters with the one it replaces. */
function otherWord(word: string, seed: string): string {
  const sk = skeleton(word)
  for (let t = 0; t < 200; t++) {
    const w = pool[Math.floor(noise(seed, t + 7) * pool.length)]
    const wk = skeleton(w)
    if (Math.abs(wk.length - sk.length) <= 1 && similarity(sk, wk) < 0.34) return w
  }
  return "زَيۡتُونٗا"
}

type Row = {
  model: string
  id: string
  source: string
  label: string
  seconds: number
  ms: number
  heard: string
  score: number
  changed?: boolean
  skipped?: boolean
}
const rows: Row[] = []

for (const dir of modelDirs) {
  env.allowRemoteModels = false
  env.localModelPath = path.resolve(dir, "..") + "/"
  const name = path.basename(path.resolve(dir))
  const asr = await pipeline("automatic-speech-recognition", name, { dtype: "q8" })
  let done = 0
  for (const c of clips) {
    const audio = readWav(path.join(dataDir, c.audio))
    // The app pads the end so the last word isn't cut.
    const padded = new Float32Array(audio.length + Math.round(RATE * 0.3))
    padded.set(audio)
    const long = padded.length > RATE * 29
    const t0 = performance.now()
    const out = await asr(padded, { language: "arabic", task: "transcribe", max_new_tokens: 200, chunk_length_s: long ? 30 : undefined, stride_length_s: long ? 5 : undefined } as never)
    const ms = performance.now() - t0
    const heard = (Array.isArray(out) ? out.map((o) => o.text).join(" ") : (out as { text: string }).text).trim()
    const expected = arabicWords(ayahText(c.surah, c.ayah))
    const plain = compareRecitation(expected, heard)
    const row: Row = { model: name, id: c.id, source: c.source, label: c.label, seconds: c.seconds, ms, heard, score: plain.score }
    // Not the first word: the opening letters of some surahs are matched specially.
    const k = 1 + Math.floor(noise(c.id, 1) * (expected.length - 1))
    // Only where the word was heard right as recited, so a mishearing doesn't count as a catch.
    const heardRight = expected.length >= 3 && ["correct", "close"].includes(plain.words[k]?.status)
    if (c.label === "correct" && heardRight) {
      const changed = [...expected]
      changed[k] = otherWord(expected[k], c.id)
      const st = compareRecitation(changed, heard).words[k].status
      row.changed = st === "wrong" || st === "missed"
      const skipped = [...expected.slice(0, k), otherWord(expected[k], c.id + "+"), ...expected.slice(k)]
      row.skipped = compareRecitation(skipped, heard).words[k].status === "missed"
    }
    rows.push(row)
    if (++done % 50 === 0) console.log(`${name}: ${done}/${clips.length}`)
  }
}

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "-")
const lines: string[] = []
lines.push(`Split: ${split}, ${clips.length} clips, ${(clips.reduce((a, c) => a + c.seconds, 0) / 3600).toFixed(2)} h`)
lines.push("")
lines.push("| Model | Source | Correct clips: words right | Correct clips: all right | Incorrect clips flagged | Changed word caught | Skipped word caught | ms per audio second |")
lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |")
const keys = new Set(rows.map((r) => `${r.model}\t${r.source}`))
for (const k of keys) {
  const [model, source] = k.split("\t")
  const g = rows.filter((r) => r.model === model && r.source === source)
  const ok = g.filter((r) => r.label === "correct")
  const bad = g.filter((r) => r.label === "incorrect")
  const edits = ok.filter((r) => r.changed !== undefined)
  const words = ok.length ? `${((100 * ok.reduce((a, r) => a + r.score, 0)) / ok.length).toFixed(1)}% (${ok.length})` : "-"
  const speed = (g.reduce((a, r) => a + r.ms, 0) / Math.max(1, g.reduce((a, r) => a + r.seconds, 0))).toFixed(0)
  lines.push(
    `| ${model} | ${source} | ${words} | ${pct(ok.filter((r) => r.score === 1).length, ok.length)} | ${bad.length ? `${pct(bad.filter((r) => r.score < 1).length, bad.length)} (${bad.length})` : "-"} | ${pct(edits.filter((r) => r.changed).length, edits.length)} | ${pct(edits.filter((r) => r.skipped).length, edits.length)} | ${speed} |`,
  )
}
const report = lines.join("\n")
console.log("\n" + report)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + "\n")

console.log("\nWorst correct clips:")
for (const r of rows.filter((r) => r.label === "correct").sort((a, b) => a.score - b.score).slice(0, 25)) {
  const c = clips.find((x) => x.id === r.id)!
  console.log(`${(r.score * 100).toFixed(0)}% ${r.model} ${r.id} (${c.surah}:${c.ayah})\n  expected: ${ayahText(c.surah, c.ayah)}\n  heard:    ${r.heard}`)
}
console.log("\nIncorrect clips the checker passed:")
for (const r of rows.filter((r) => r.label === "incorrect" && r.score === 1).slice(0, 15)) {
  const c = clips.find((x) => x.id === r.id)!
  console.log(`${r.model} ${r.id} (${c.surah}:${c.ayah})\n  expected: ${ayahText(c.surah, c.ayah)}\n  heard:    ${r.heard}`)
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1))
