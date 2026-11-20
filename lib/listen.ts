"use client"

// Listens to a recitation and turns it into text, for the memorisation page.
// On the web this is the browser's speech recognition (Chrome, Edge and Safari have it);
// in the Android app it is the phone's own recogniser, through the MihrabSpeech plugin
// (android/.../speech/SpeechPlugin.java), because the WebView has none.
//
// Recognisers stop at a pause, and reciters pause between ayahs, so listening restarts
// by itself until stop() is called, and the pieces heard are joined together.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"

type NativeSpeech = {
  available(): Promise<{ available: boolean; onDevice: boolean }>
  start(options: { lang: string }): Promise<void>
  stop(): Promise<void>
  cancel(): Promise<void>
  addListener(event: "partial" | "result", fn: (e: { text: string }) => void): Promise<PluginListenerHandle>
  addListener(event: "error", fn: (e: { code: string; message: string }) => void): Promise<PluginListenerHandle>
  addListener(event: "end", fn: () => void): Promise<PluginListenerHandle>
}

const NativeSpeech = registerPlugin<NativeSpeech>("MihrabSpeech")

export type ListenError = "unsupported" | "permission" | "network" | "language" | "audio" | "other"

export type ListenHandlers = {
  /** Everything heard so far, including words the recogniser may still revise. */
  onText: (text: string) => void
  /** Listening has stopped, by stop() or because of an error. */
  onEnd: (error?: ListenError, detail?: string) => void
}

export type Listening = { stop: () => void }

const LANG = "ar-SA"

type WebRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string; message?: string }) => void) | null
  onend: (() => void) | null
}

function webRecognitionClass(): (new () => WebRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return ((w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => WebRecognition) | undefined) ?? null
}

/** Whether this device can listen at all; false means only typing is offered. */
export async function canListen(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      return (await NativeSpeech.available()).available
    } catch {
      return false
    }
  }
  return webRecognitionClass() !== null
}

function webError(code: string): ListenError | null {
  if (code === "no-speech" || code === "aborted") return null
  if (code === "not-allowed" || code === "service-not-allowed") return "permission"
  if (code === "network") return "network"
  if (code === "language-not-supported") return "language"
  if (code === "audio-capture") return "audio"
  return "other"
}

function listenWeb(h: ListenHandlers): Listening {
  const Recognition = webRecognitionClass()
  if (!Recognition) {
    h.onEnd("unsupported")
    return { stop: () => {} }
  }
  let committed = ""
  let active = true
  let failed: ListenError | undefined
  let detail: string | undefined
  let rec: WebRecognition

  const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).trim()

  const run = () => {
    rec = new Recognition()
    rec.lang = LANG
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    let session = ""
    rec.onresult = (e) => {
      let finals = ""
      let interim = ""
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finals = join(finals, r[0].transcript)
        else interim = join(interim, r[0].transcript)
      }
      session = finals
      h.onText(join(committed, join(finals, interim)))
    }
    rec.onerror = (e) => {
      const err = webError(e.error)
      if (err) {
        failed = err
        detail = e.message || e.error
        active = false
      }
    }
    rec.onend = () => {
      committed = join(committed, session)
      if (active) {
        try {
          run()
          return
        } catch {
          active = false
        }
      }
      h.onText(committed)
      h.onEnd(failed, detail)
    }
    rec.start()
  }

  try {
    run()
  } catch (e) {
    h.onEnd("other", e instanceof Error ? e.message : String(e))
    return { stop: () => {} }
  }
  return {
    stop: () => {
      active = false
      try {
        rec.stop()
      } catch {
        // Already stopped.
      }
    },
  }
}

function listenNative(h: ListenHandlers): Listening {
  let committed = ""
  let current = ""
  let active = true
  let finished = false
  let failed: ListenError | undefined
  let detail: string | undefined
  const handles: Promise<PluginListenerHandle>[] = []
  const join = (a: string, b: string) => (a && b ? `${a} ${b}` : a || b).trim()

  const finish = () => {
    if (finished) return
    finished = true
    for (const p of handles) void p.then((x) => x.remove()).catch(() => {})
    h.onText(committed)
    h.onEnd(failed, detail)
  }

  const begin = () =>
    NativeSpeech.start({ lang: LANG }).catch((e: { code?: string; message?: string }) => {
      failed = e?.code === "permission" ? "permission" : "other"
      detail = e?.message
      active = false
      finish()
    })

  handles.push(
    NativeSpeech.addListener("partial", ({ text }) => {
      current = text
      h.onText(join(committed, current))
    }),
    NativeSpeech.addListener("result", ({ text }) => {
      committed = join(committed, text || current)
      current = ""
      h.onText(committed)
    }),
    NativeSpeech.addListener("error", ({ code, message }) => {
      // A pause with nothing new heard is normal while reciting from memory.
      if (code === "no-match" || code === "no-speech") {
        committed = join(committed, current)
        current = ""
        return
      }
      if (code === "busy") return
      failed = (["permission", "network", "language", "audio"] as const).find((c) => c === code) ?? "other"
      detail = message
      active = false
    }),
    NativeSpeech.addListener("end", () => {
      if (active) void begin()
      else finish()
    }),
  )
  void Promise.all(handles).then(begin)

  return {
    stop: () => {
      active = false
      void NativeSpeech.stop()
        .catch(() => {})
        // Some recognisers send nothing after stop when they heard nothing.
        .then(() => setTimeout(() => {
          if (!finished) {
            committed = join(committed, current)
            void NativeSpeech.cancel().catch(() => {})
            finish()
          }
        }, 1500))
    },
  }
}

export function listen(h: ListenHandlers): Listening {
  return Capacitor.isNativePlatform() ? listenNative(h) : listenWeb(h)
}
