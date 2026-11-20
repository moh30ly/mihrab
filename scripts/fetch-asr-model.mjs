// Copies the offline Quran recitation checker (lib/quran-asr.ts) into the app's web files, so
// the Android app ships with it. The model is Tarteel's whisper-base-ar-quran (Apache-2.0),
// built by .github/workflows/asr-model.yml as assets of the quran-asr-v1 release.
// Usage: node scripts/fetch-asr-model.mjs <out dir> [tiny|base]   (writes <out>/models/quran-asr/)
import fs from "node:fs/promises"
import path from "node:path"

const RELEASE = "https://github.com/moh30ly/mihrab/releases/download/quran-asr-v1/"
// The base model by default: on five reciters with phone-like noise it marked 99% of words
// right against 97.5% for the tiny one ("tiny." assets, about twice as fast).
// See .github/workflows/asr-eval.yml.
const MODEL = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
]
const RUNTIME = ["ort/ort-wasm-simd-threaded.jsep.mjs", "ort/ort-wasm-simd-threaded.jsep.wasm", "worker.js"]

const dir = path.join(process.argv[2] ?? "out", "models", "quran-asr")
const prefix = process.argv[3] === "tiny" ? "tiny." : ""
const files = [...MODEL.map((f) => [f, prefix + f.replaceAll("/", ".")]), ...RUNTIME.map((f) => [f, f.replaceAll("/", ".")])]
let total = 0
for (const [file, asset] of files) {
  let r
  for (let attempt = 1; ; attempt++) {
    r = await fetch(RELEASE + asset).catch((e) => ({ ok: false, status: e.message }))
    if (r.ok || attempt === 4) break
    await new Promise((ok) => setTimeout(ok, attempt * 2000))
  }
  if (!r.ok) throw new Error(`${asset}: ${r.status}`)
  const body = Buffer.from(await r.arrayBuffer())
  await fs.mkdir(path.dirname(path.join(dir, file)), { recursive: true })
  await fs.writeFile(path.join(dir, file), body)
  total += body.length
  console.log(`${file}: ${(body.length / 1048576).toFixed(1)} MB`)
}
console.log(`Quran recitation checker: ${(total / 1048576).toFixed(0)} MB in ${dir}`)
