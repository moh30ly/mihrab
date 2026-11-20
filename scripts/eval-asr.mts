// Measures how well the recitation checker marks correct recitations: each clip is a whole
// ayah recited correctly, so every word should come out "correct" or "close". Runs each model
// on each clip both whole and cut at pauses the way the app's microphone code cuts it
// (lib/quran-asr.ts), and scores the text with the app's own matching (lib/hifz.ts).
// Usage: npx tsx scripts/eval-asr.mts <clips dir> <model dir>...
// Clips are 16 kHz mono float32 files named <reciter>__<sss><aaa>__<condition>.pcm.
import fs from "node:fs"
import path from "node:path"
import { env, pipeline } from "@huggingface/transformers"
import { arabicWords, compareRecitation } from "../lib/hifz.ts"

const [clipsDir, ...modelDirs] = process.argv.slice(2)
const RATE = 16000

function ayahText(surah: number, ayah: number): string {
  const raw = JSON.parse(fs.readFileSync(path.join("data", "quran", `${surah}.json`), "utf8")) as { verses: [string, string][] }
  return raw.verses[ayah - 1][0]
}

/** Cuts audio at pauses like the app does: 128 ms frames, adaptive noise floor, 0.9 s of quiet ends a stretch. */
function stretches(audio: Float32Array): Float32Array[] {
  const FRAME = 2048
  const out: Float32Array[] = []
  let noise = 0.004
  let cur: Float32Array[] = []
  let voiced = false
  let quiet = 0
  let pre: Float32Array | null = null
  const flush = () => {
    const n = cur.reduce((a, c) => a + c.length, 0)
    if (n >= RATE * 0.35) {
      const a = new Float32Array(n)
      let at = 0
      for (const c of cur) {
        a.set(c, at)
        at += c.length
      }
      out.push(a)
    }
    cur = []
    voiced = false
    quiet = 0
  }
  for (let i = 0; i + FRAME <= audio.length; i += FRAME) {
    const f = audio.subarray(i, i + FRAME)
    let s = 0
    for (const x of f) s += x * x
    const rms = Math.sqrt(s / FRAME)
    noise = rms < noise ? rms : noise * 0.995 + rms * 0.005
    const speaking = rms > Math.max(0.012, noise * 3)
    if (!voiced) {
      if (speaking) {
        voiced = true
        cur = pre ? [pre, f] : [f]
      }
      pre = f
      continue
    }
    cur.push(f)
    quiet = speaking ? 0 : quiet + FRAME / RATE
    if (quiet >= 0.9 || cur.length * FRAME >= RATE * 24) flush()
  }
  if (voiced) flush()
  return out
}

const clips = fs.readdirSync(clipsDir).filter((f) => f.endsWith(".pcm")).sort()
type Row = { model: string; mode: string; cond: string; clip: string; score: number; heard: string; expected: string; ms: number }
const rows: Row[] = []

for (const dir of modelDirs) {
  env.allowRemoteModels = false
  env.localModelPath = path.resolve(dir, "..") + "/"
  const name = path.basename(path.resolve(dir))
  const asr = await pipeline("automatic-speech-recognition", name, { dtype: "q8" })
  const run = async (a: Float32Array) => {
    const out = await asr(a, { language: "arabic", task: "transcribe", max_new_tokens: 160, chunk_length_s: a.length > RATE * 29 ? 30 : undefined, stride_length_s: a.length > RATE * 29 ? 5 : undefined } as never)
    return (Array.isArray(out) ? out.map((o) => o.text).join(" ") : (out as { text: string }).text).trim()
  }
  for (const clip of clips) {
    const [reciter, id, cond] = clip.replace(".pcm", "").split("__")
    const expected = ayahText(Number(id.slice(0, 3)), Number(id.slice(3)))
    const buf = fs.readFileSync(path.join(clipsDir, clip))
    const audio = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
    for (const mode of ["whole", "stretches"]) {
      const t0 = performance.now()
      let heard: string
      if (mode === "whole") heard = await run(audio)
      else {
        const parts: string[] = []
        for (const s of stretches(audio)) parts.push(await run(s))
        heard = parts.join(" ")
      }
      const ms = performance.now() - t0
      const { score } = compareRecitation(arabicWords(expected), heard)
      rows.push({ model: name, mode, cond, clip: `${reciter} ${id}`, score, heard, expected, ms })
    }
  }
}

const groups = new Map<string, Row[]>()
for (const r of rows) {
  const k = `${r.model} | ${r.cond} | ${r.mode}`
  groups.set(k, [...(groups.get(k) ?? []), r])
}
console.log("\nmodel | condition | mode : words marked right (mean), clips fully right, mean ms")
for (const [k, g] of groups) {
  const mean = g.reduce((a, r) => a + r.score, 0) / g.length
  const perfect = g.filter((r) => r.score === 1).length
  console.log(`${k} : ${(mean * 100).toFixed(1)}%, ${perfect}/${g.length}, ${Math.round(g.reduce((a, r) => a + r.ms, 0) / g.length)} ms`)
}
console.log("\nWorst clips:")
for (const r of [...rows].sort((a, b) => a.score - b.score).slice(0, 40)) {
  console.log(`${(r.score * 100).toFixed(0)}% ${r.model} ${r.cond} ${r.mode} ${r.clip}\n  expected: ${r.expected}\n  heard:    ${r.heard}`)
}
