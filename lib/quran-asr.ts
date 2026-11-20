"use client"

// The offline Quran recitation checker: Tarteel's Whisper model fine-tuned on recitation
// (Apache-2.0), exported by scripts/build-asr-model.py and published as the assets of the
// quran-asr-v1 release. In the Android app it is an optional download (about 100 MB) kept
// with the other offline packs, and it then hears recitation without Google or a connection.
//
// The microphone is read here, cut into stretches of voice at the reciter's pauses, and each
// stretch is transcribed in a worker (lib/asr-worker.ts, downloaded with the model). While a stretch is still going it is
// transcribed again whenever the worker is free, so the words light up as they are recited.
import { downloadPack, isDownloaded, localUrl, offlineSupported } from "@/lib/offline"
import type { ListenHandlers, Listening } from "@/lib/listen"

export const QURAN_ASR_PACK = "models/quran-asr"
const RELEASE = "https://github.com/moh30ly/mihrab/releases/download/quran-asr-v1/"

/** The model's files, as scripts/build-asr-model.py and .github/workflows/asr-model.yml write them. */
const FILES = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
  "ort/ort-wasm-simd-threaded.jsep.mjs",
  "ort/ort-wasm-simd-threaded.jsep.wasm",
  "worker.js",
]

/** Approximate download size, in bytes. */
export const QURAN_ASR_SIZE = 100 * 1024 * 1024

export function quranAsrSupported(): boolean {
  return offlineSupported() && typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined"
}

// For trying the model in a browser: the folder that holds quran-asr/, e.g. a local server.
const TEST_BASE_KEY = "mihrab:quran-asr:base"

/** The folder holding quran-asr/, or null when the model isn't available here. */
function modelBase(): string | null {
  if (typeof window === "undefined") return null
  if (quranAsrSupported() && isDownloaded(QURAN_ASR_PACK)) return localUrl("models/")
  try {
    return window.localStorage.getItem(TEST_BASE_KEY)
  } catch {
    return null
  }
}

export function quranAsrReady(): boolean {
  return typeof Worker !== "undefined" && modelBase() != null
}

export function downloadQuranAsr() {
  downloadPack(QURAN_ASR_PACK, async () => FILES.map((f) => ({ url: RELEASE + f.replaceAll("/", "."), file: f })))
}

// ---- The worker ----------------------------------------------------------------

type Out =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "text"; id: number; text: string; ms: number; error?: string }

let worker: Worker | null = null
let ready: Promise<void> | null = null
const waiting = new Map<number, (r: { text: string; ms: number }) => void>()
let nextId = 1
let loadFailed = false
let loadError = ""

/** Why the model would not start, for the Offline page. */
export function quranAsrError() {
  return loadError
}

/** The model is downloaded but would not start on this phone; the phone's recogniser is used instead. */
export function quranAsrFailed() {
  return loadFailed
}

function getWorker(): Promise<void> {
  if (ready) return ready
  const base = modelBase()
  if (!base) return Promise.reject(new Error("The recitation model is not downloaded"))
  // The worker (lib/asr-worker.ts, bundled with Transformers.js) comes with the model, so
  // the app itself carries none of it.
  worker = new Worker(`${base}quran-asr/worker.js`, { type: "module" })
  ready = new Promise<void>((resolve, reject) => {
    worker!.onmessage = (e: MessageEvent<Out>) => {
      const m = e.data
      if (m.type === "ready") resolve()
      else if (m.type === "error") {
        loadFailed = true
        loadError = m.message
        reject(new Error(m.message))
        worker?.terminate()
        worker = null
        ready = null
      } else if (m.type === "text") {
        waiting.get(m.id)?.({ text: m.text, ms: m.ms })
        waiting.delete(m.id)
      }
    }
    worker!.onerror = (e) => {
      loadFailed = true
      loadError = e.message || "worker error"
      reject(new Error(e.message || "The recitation model could not start"))
      worker = null
      ready = null
    }
  })
  worker.postMessage({ type: "load", base, cache: false })
  return ready
}

/** Loads the model ahead of time, so the first Recite doesn't wait for it. */
export function warmQuranAsr() {
  if (quranAsrReady()) void getWorker().catch(() => {})
}

function transcribe(audio: Float32Array): Promise<{ text: string; ms: number }> {
  const id = nextId++
  return new Promise((resolve) => {
    waiting.set(id, resolve)
    worker!.postMessage({ type: "transcribe", id, audio }, [audio.buffer])
  })
}

// ---- Listening -------------------------------------------------------------------

const RATE = 16000
const FRAME = 2048 // 128 ms
const END_SILENCE = 0.9 // seconds of quiet that end a stretch of recitation
const MAX_STRETCH = 24 // Whisper hears at most 30 seconds at a time
const MIN_STRETCH = 0.35

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

export function listenQuran(h: ListenHandlers): Listening {
  let stopped = false
  let finished = false
  let committed = ""
  let interim = ""
  let stream: MediaStream | null = null
  let ctx: AudioContext | null = null
  let node: ScriptProcessorNode | null = null

  // The stretch being recited, and the finished stretches waiting for the model, in order.
  let stretch: Float32Array[] = []
  let voiced = false
  let quiet = 0
  let preroll: Float32Array | null = null
  let noise = 0.004
  let busy = false
  let lastInterimLength = 0
  const finals: Float32Array[] = []

  const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).trim()
  const show = () => h.onText(join(committed, interim))

  const finish = (error?: Parameters<ListenHandlers["onEnd"]>[0], detail?: string) => {
    if (finished) return
    finished = true
    node?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    void ctx?.close().catch(() => {})
    h.onText(committed)
    h.onEnd(error, detail)
  }

  // One request to the model at a time: finished stretches first, then a look at the current one.
  const pump = async () => {
    if (busy || finished) return
    const next = finals.shift()
    if (next) {
      busy = true
      const { text } = await transcribe(next)
      committed = join(committed, text)
      interim = ""
      busy = false
      show()
      void pump()
      return
    }
    if (stopped) return finish()
    const length = stretch.reduce((n, c) => n + c.length, 0)
    if (voiced && length - lastInterimLength >= RATE * 0.6) {
      busy = true
      lastInterimLength = length
      const { text } = await transcribe(concat(stretch))
      busy = false
      // The stretch may have ended meanwhile; its final text replaces this.
      if (voiced) {
        interim = text
        show()
      }
      void pump()
    }
  }

  const endStretch = () => {
    const audio = concat(stretch)
    stretch = []
    voiced = false
    quiet = 0
    lastInterimLength = 0
    if (audio.length >= RATE * MIN_STRETCH) finals.push(audio)
    else interim = ""
    void pump()
  }

  const onFrame = (frame: Float32Array) => {
    let sum = 0
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
    const rms = Math.sqrt(sum / frame.length)
    // The quietest recent level is the room; a voice is well above it.
    noise = rms < noise ? rms : noise * 0.995 + rms * 0.005
    const speaking = rms > Math.max(0.012, noise * 3)
    const db = 20 * Math.log10(Math.max(rms, 1e-5))
    h.onStatus?.({ level: Math.max(-2, Math.min(10, ((db + 60) / 45) * 12 - 2)) })

    if (!voiced) {
      if (speaking) {
        voiced = true
        quiet = 0
        stretch = preroll ? [preroll, frame] : [frame]
        h.onStatus?.({ phase: "speech" })
      }
      preroll = frame
      return
    }
    stretch.push(frame)
    quiet = speaking ? 0 : quiet + frame.length / RATE
    const length = stretch.reduce((n, c) => n + c.length, 0) / RATE
    if (quiet >= END_SILENCE || length >= MAX_STRETCH) {
      endStretch()
      h.onStatus?.({ phase: "ready" })
    } else void pump()
  }

  void (async () => {
    try {
      h.onStatus?.({ engine: "quran" })
      const model = getWorker()
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      })
      if (finished) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      await model
      if (stopped) return finish()
      ctx = new AudioContext({ sampleRate: RATE })
      const source = ctx.createMediaStreamSource(stream)
      node = ctx.createScriptProcessor(FRAME, 1, 1)
      node.onaudioprocess = (e) => {
        if (!stopped) onFrame(new Float32Array(e.inputBuffer.getChannelData(0)))
      }
      source.connect(node)
      // Some browsers only run the processor while it is connected to the output; it writes silence.
      node.connect(ctx.destination)
      h.onStatus?.({ phase: "ready" })
    } catch (e) {
      const name = (e as { name?: string })?.name
      finish(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "other", e instanceof Error ? e.message : String(e))
    }
  })()

  return {
    stop: () => {
      if (stopped) return
      stopped = true
      if (voiced) endStretch()
      void pump()
    },
  }
}
