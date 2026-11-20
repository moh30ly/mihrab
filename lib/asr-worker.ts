// Runs the offline Quran recitation model (Tarteel's Whisper, see scripts/build-asr-model.py)
// off the page's main thread, so the page stays responsive while it listens. It is bundled
// with Transformers.js by .github/workflows/asr-model.yml and downloaded with the model, so
// the app itself doesn't carry the library.
//
// Messages in:  { type: "load", base } where base is the folder holding quran-asr/
//               { type: "transcribe", id, audio: Float32Array (16 kHz mono) }
// Messages out: { type: "progress", loaded, total } | { type: "ready" } | { type: "error", message }
//               { type: "text", id, text, ms }
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers"

type In = { type: "load"; base: string; cache: boolean } | { type: "transcribe"; id: number; audio: Float32Array }

const post = (m: unknown) => (self as unknown as Worker).postMessage(m)
let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null

// A missing optional file can come back as a failed request rather than a 404 from the
// phone's local file server, and Transformers.js treats a failed request as fatal.
const realFetch = self.fetch.bind(self)
self.fetch = async (input, init) => {
  try {
    return await realFetch(input, init)
  } catch {
    return new Response(null, { status: 404 })
  }
}

function load(base: string, cache: boolean) {
  const root = base.endsWith("/") ? base : `${base}/`
  env.allowLocalModels = false
  env.allowRemoteModels = true
  env.remoteHost = root
  env.remotePathTemplate = "{model}/"
  env.useBrowserCache = cache
  const wasm = env.backends.onnx.wasm!
  wasm.wasmPaths = {
    mjs: `${root}quran-asr/ort/ort-wasm-simd-threaded.jsep.mjs`,
    wasm: `${root}quran-asr/ort/ort-wasm-simd-threaded.jsep.wasm`,
  }
  // The app's web view isn't cross-origin isolated, so there are no worker threads.
  wasm.numThreads = 1
  const seen: Record<string, { loaded: number; total: number }> = {}
  // (Typed loosely: the full option types are too large for TypeScript to check here.)
  const make = pipeline as unknown as (task: string, model: string, options: Record<string, unknown>) => Promise<AutomaticSpeechRecognitionPipeline>
  return make("automatic-speech-recognition", "quran-asr", {
    dtype: "q8",
    device: "wasm",
    progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file) return
      seen[p.file] = { loaded: p.loaded ?? 0, total: p.total ?? 0 }
      const all = Object.values(seen)
      post({ type: "progress", loaded: all.reduce((a, f) => a + f.loaded, 0), total: all.reduce((a, f) => a + f.total, 0) })
    },
  })
}

self.onmessage = async (e: MessageEvent<In>) => {
  const m = e.data
  if (m.type === "load") {
    asr ??= load(m.base, m.cache)
    try {
      await asr
      post({ type: "ready" })
    } catch (err) {
      asr = null
      post({ type: "error", message: err instanceof Error ? err.message : String(err) })
    }
    return
  }
  if (m.type === "transcribe") {
    try {
      if (!asr) throw new Error("The model is not loaded")
      const run = await asr
      const t0 = performance.now()
      const out = await run(m.audio, { language: "arabic", task: "transcribe", max_new_tokens: 160 })
      const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text
      post({ type: "text", id: m.id, text: text.trim(), ms: Math.round(performance.now() - t0) })
    } catch (err) {
      post({ type: "text", id: m.id, text: "", error: err instanceof Error ? err.message : String(err) })
    }
  }
}
