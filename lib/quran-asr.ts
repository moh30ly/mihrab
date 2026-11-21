"use client"

// The offline Quran recitation checker: Tarteel's Whisper model fine-tuned on recitation
// (Apache-2.0, whisper-base-ar-quran), exported by scripts/build-asr-model.py and published
// as the assets of the quran-asr-v1 release. The Android build copies it into the app
// (scripts/fetch-asr-model.mjs, about 85 MB), so the app hears recitation without the
// Google app or a connection.
//
// The microphone is read here, cut into stretches of voice at the reciter's pauses, and each
// stretch is transcribed in a worker (lib/asr-worker.ts, shipped with the model). While a
// stretch is still going it is transcribed again whenever the worker is free, so the words
// light up as they are recited.
import { Capacitor } from "@capacitor/core"
import type { ListenHandlers, Listening } from "@/lib/listen"

export function quranAsrSupported(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined"
}

// For trying the model in a browser: the folder that holds quran-asr/, e.g. a local server.
const TEST_BASE_KEY = "mihrab:quran-asr:base"

let bundled = false
let probing: Promise<boolean> | null = null

/** Finds out whether this app carries the model; the website doesn't. */
export function probeQuranAsr(): Promise<boolean> {
  if (!quranAsrSupported()) return Promise.resolve(false)
  probing ??= (Capacitor.isNativePlatform()
    ? fetch("/models/quran-asr/config.json", { cache: "no-store" }).then((r) => r.ok, () => false)
    : Promise.resolve(false)
  ).then((ok) => (bundled = ok) || testBase() != null)
  return probing
}

function testBase(): string | null {
  try {
    return window.localStorage.getItem(TEST_BASE_KEY)
  } catch {
    return null
  }
}

/** The folder holding quran-asr/, or null when the model isn't available here. */
function modelBase(): string | null {
  if (!quranAsrSupported()) return null
  if (bundled) return `${window.location.origin}/models/`
  return testBase()
}

/** Whether Recite listens with the model (known once probeQuranAsr has finished). */
export function quranAsrReady(): boolean {
  return modelBase() != null
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
  if (!base) return Promise.reject(new Error("The recitation model is not in this app"))
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
  void probeQuranAsr().then((ok) => {
    if (ok) void getWorker().catch(() => {})
  })
}

function transcribe(stretch: Float32Array): Promise<{ text: string; ms: number }> {
  const id = nextId++
  // A little quiet after the last word, so the model doesn't cut it short.
  const audio = new Float32Array(stretch.length + Math.round(RATE * 0.3))
  audio.set(stretch)
  return new Promise((resolve) => {
    const seconds = (audio.length / RATE).toFixed(1)
    waiting.set(id, (r) => {
      console.info(`[quran-asr] ${seconds} s of audio in ${r.ms} ms: ${r.text}`)
      resolve(r)
    })
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

/** Whisper hears 16 kHz; some phones run audio at their own rate whatever is asked for. */
function toRate(frame: Float32Array, from: number): Float32Array {
  if (from === RATE) return frame
  const out = new Float32Array(Math.floor((frame.length * RATE) / from))
  const step = from / RATE
  for (let i = 0; i < out.length; i++) {
    // Average the input samples this output sample covers (a simple low-pass before decimating).
    const a = Math.floor(i * step)
    const b = Math.min(frame.length, Math.max(a + 1, Math.floor((i + 1) * step)))
    let sum = 0
    for (let k = a; k < b; k++) sum += frame[k]
    out[i] = sum / (b - a)
  }
  return out
}

// The whole recitation is checked again in one go at the end when it fits in one Whisper
// window: words cut at a pause are heard better with what comes around them.
const MAX_WHOLE = 28

/** 16-bit mono WAV, which every WebView can play back. */
function wav(chunks: Float32Array[]): Blob {
  const samples = chunks.reduce((n, c) => n + c.length, 0)
  const buf = new ArrayBuffer(44 + samples * 2)
  const v = new DataView(buf)
  const text = (at: number, s: string) => [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)))
  text(0, "RIFF")
  v.setUint32(4, 36 + samples * 2, true)
  text(8, "WAVE")
  text(12, "fmt ")
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, RATE, true)
  v.setUint32(28, RATE * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  text(36, "data")
  v.setUint32(40, samples * 2, true)
  let at = 44
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++, at += 2) v.setInt16(at, Math.max(-1, Math.min(1, c[i])) * 0x7fff, true)
  }
  return new Blob([buf], { type: "audio/wav" })
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
  // Every stretch so far, kept for the check of the whole recitation at the end.
  const all: Float32Array[] = []
  // Everything the microphone picked up, pauses included, so the recitation can be replayed.
  const recording: Float32Array[] = []
  let wholeDone = false

  const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).trim()
  const show = () => h.onText(join(committed, interim))

  const finish = (error?: Parameters<ListenHandlers["onEnd"]>[0], detail?: string) => {
    if (finished) return
    finished = true
    node?.disconnect()
    stream?.getTracks().forEach((t) => t.stop())
    void ctx?.close().catch(() => {})
    if (recording.length && h.onAudio) h.onAudio(wav(recording))
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
    if (stopped) {
      const seconds = all.reduce((n, c) => n + c.length, 0) / RATE + all.length * 0.3
      if (!wholeDone && all.length > 1 && seconds <= MAX_WHOLE && (h.recheck?.(committed) ?? true)) {
        wholeDone = true
        busy = true
        const gap = new Float32Array(Math.round(RATE * 0.3))
        const { text } = await transcribe(concat(all.flatMap((c) => [c, gap])))
        busy = false
        if (text) committed = text
      }
      return finish()
    }
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
    if (audio.length >= RATE * MIN_STRETCH) {
      all.push(audio.slice())
      finals.push(audio)
    }
    else interim = ""
    void pump()
  }

  const onFrame = (frame: Float32Array) => {
    recording.push(frame)
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
        // Phones' noise suppression smears the consonants the model listens for.
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: true },
      })
      if (finished) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      await model
      if (stopped) return finish()
      try {
        ctx = new AudioContext({ sampleRate: RATE })
      } catch {
        ctx = new AudioContext()
      }
      const source = ctx.createMediaStreamSource(stream)
      const rate = ctx.sampleRate
      node = ctx.createScriptProcessor(rate === RATE ? FRAME : 4096, 1, 1)
      node.onaudioprocess = (e) => {
        if (!stopped) onFrame(toRate(new Float32Array(e.inputBuffer.getChannelData(0)), rate))
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
      // Free the microphone at once; what is left is the model finishing what it heard.
      node?.disconnect()
      stream?.getTracks().forEach((t) => t.stop())
      h.onStatus?.({ phase: "checking" })
      if (voiced) endStretch()
      void pump()
    },
  }
}
