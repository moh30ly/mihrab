// Runs the exported recitation model (scripts/build-asr-model.py) on a few recited ayahs,
// so a broken export fails CI before it is published. Each argument after the model folder
// is a raw 16 kHz mono float32 file. Usage: node scripts/check-asr-model.mjs <model dir> <pcm>...
import fs from "node:fs"
import path from "node:path"
import { env, pipeline } from "@huggingface/transformers"

const [dir, ...clips] = process.argv.slice(2)
env.allowRemoteModels = false
env.localModelPath = path.resolve(dir, "..") + "/"
const asr = await pipeline("automatic-speech-recognition", path.basename(path.resolve(dir)), { dtype: "q8" })

let failed = false
for (const clip of clips) {
  const buf = fs.readFileSync(clip)
  const audio = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
  const t0 = performance.now()
  const out = await asr(audio, { language: "arabic", task: "transcribe" })
  const ms = Math.round(performance.now() - t0)
  const text = Array.isArray(out) ? out[0].text : out.text
  console.log(`${path.basename(clip)} (${(audio.length / 16000).toFixed(1)} s audio, ${ms} ms): ${text}`)
  if (!/[ء-ي]{2}/.test(text)) failed = true
}
if (failed) {
  console.error("The model did not write Arabic.")
  process.exit(1)
}
