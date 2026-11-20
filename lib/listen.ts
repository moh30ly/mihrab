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
  available(): Promise<{ available: boolean; onDevice: boolean; service?: boolean; dialog?: boolean }>
  requestMic(): Promise<{ granted: boolean }>
  recognizeDialog(options: { lang: string; prompt?: string }): Promise<{ text: string }>
  start(options: { lang: string; preferOffline?: boolean }): Promise<{ engine?: "service" | "on-device" } | void>
  offlineModel(options: { lang: string }): Promise<{ status: OfflineModel }>
  downloadModel(options: { lang: string }): Promise<void>
  stop(): Promise<void>
  cancel(): Promise<void>
  addListener(event: "partial" | "result", fn: (e: { text: string }) => void): Promise<PluginListenerHandle>
  addListener(event: "error", fn: (e: { code: string; message: string }) => void): Promise<PluginListenerHandle>
  addListener(event: "end", fn: () => void): Promise<PluginListenerHandle>
  addListener(event: "status", fn: (e: { phase: "ready" | "speech" }) => void): Promise<PluginListenerHandle>
  addListener(event: "level", fn: (e: { level: number }) => void): Promise<PluginListenerHandle>
}

const NativeSpeech = registerPlugin<NativeSpeech>("MihrabSpeech")

/**
 * Whether the phone can recognise Arabic without a connection (Android 13 and later):
 * installed, being downloaded, available to download, or not on this phone.
 */
export type OfflineModel = "installed" | "pending" | "available" | "unsupported"

export async function offlineSpeechModel(): Promise<OfflineModel> {
  if (!Capacitor.isNativePlatform()) return "unsupported"
  try {
    return (await NativeSpeech.offlineModel({ lang: LANG })).status
  } catch {
    return "unsupported"
  }
}

/** Asks Android to download its offline Arabic speech model; the system shows its own progress. */
export async function downloadSpeechModel(): Promise<boolean> {
  try {
    await NativeSpeech.downloadModel({ lang: LANG })
    return true
  } catch {
    return false
  }
}

export type ListenError = "unsupported" | "permission" | "network" | "language" | "audio" | "other"

export type ListenHandlers = {
  /** Everything heard so far, including words the recogniser may still revise. */
  onText: (text: string) => void
  /** Listening has stopped, by stop() or because of an error. */
  onEnd: (error?: ListenError, detail?: string) => void
  /** What the recogniser is doing, so the page can show that it hears the person. */
  onStatus?: (status: ListenStatus) => void
}

export type ListenEngine = "service" | "on-device" | "dialog" | "browser"
export type ListenStatus = {
  engine?: ListenEngine
  /** ready: waiting for speech; speech: hearing a voice; dialog: the phone's speak-now screen is open. */
  phase?: "ready" | "speech" | "dialog"
  /** Microphone loudness from the phone's recogniser, roughly -2 (silence) to 10 (loud). */
  level?: number
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
  onaudiostart?: (() => void) | null
  onspeechstart?: (() => void) | null
}

function webRecognitionClass(): (new () => WebRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, unknown>
  return ((w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => WebRecognition) | undefined) ?? null
}

/**
 * In the app, asks Android for the microphone (shows the system prompt the first time).
 * On the web the browser asks by itself when listening or recording starts.
 */
export async function ensureMic(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    return (await NativeSpeech.requestMic()).granted
  } catch {
    return false
  }
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
    let pending = ""
    rec.onresult = (e) => {
      let finals = ""
      let interim = ""
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finals = join(finals, r[0].transcript)
        else interim = join(interim, r[0].transcript)
      }
      session = finals
      pending = interim
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
      // Words still provisional when listening stopped count too; some browsers never finalise them.
      committed = join(committed, join(session, pending))
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
    rec.onaudiostart = () => h.onStatus?.({ engine: "browser", phase: "ready" })
    rec.onspeechstart = () => h.onStatus?.({ phase: "speech" })
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

  let dialogMode = false
  let wantDialog = false
  let heardAnything = false

  const finish = () => {
    if (finished) return
    finished = true
    for (const p of handles) void p.then((x) => x.remove()).catch(() => {})
    h.onText(committed)
    h.onEnd(failed, detail)
  }

  // Many phones (and Android without a bindable recognition service) still have the
  // system's "speak now" screen. It gives no live words, only the text once it closes.
  const dialog = () => {
    dialogMode = true
    active = false
    failed = undefined
    detail = undefined
    for (const p of handles) void p.then((x) => x.remove()).catch(() => {})
    h.onStatus?.({ engine: "dialog", phase: "dialog" })
    NativeSpeech.recognizeDialog({ lang: LANG })
      .then(({ text }) => {
        committed = join(committed, text)
      })
      .catch((e: { message?: string }) => {
        failed = "unsupported"
        detail = e?.message
      })
      .finally(finish)
  }

  const begin = () =>
    // Offline, the phone's on-device recogniser is used when it has Arabic.
    NativeSpeech.start({ lang: LANG, preferOffline: typeof navigator !== "undefined" && !navigator.onLine })
      .then((r) => {
        if (r && r.engine) h.onStatus?.({ engine: r.engine })
      })
      .catch((e: { code?: string; message?: string }) => {
      if (e?.code === "unavailable" && !heardAnything) return dialog()
      failed = e?.code === "permission" ? "permission" : "other"
      detail = e?.message
      active = false
      finish()
    })

  handles.push(
    NativeSpeech.addListener("partial", ({ text }) => {
      if (text) heardAnything = true
      current = text
      h.onText(join(committed, current))
    }),
    NativeSpeech.addListener("result", ({ text }) => {
      if (text) heardAnything = true
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
      // The bound service refused before hearing anything: try the system screen instead.
      if (!heardAnything && !committed && code !== "permission" && code !== "network") {
        wantDialog = true
        active = false
        return
      }
      failed = (["permission", "network", "language", "audio"] as const).find((c) => c === code) ?? "other"
      detail = message
      active = false
    }),
    NativeSpeech.addListener("status", ({ phase }) => h.onStatus?.({ phase })),
    NativeSpeech.addListener("level", ({ level }) => h.onStatus?.({ level })),
    NativeSpeech.addListener("end", () => {
      if (dialogMode) return
      if (wantDialog) return dialog()
      if (active) void begin()
      else finish()
    }),
  )
  void Promise.all(handles).then(begin)

  return {
    stop: () => {
      // The system screen closes by itself.
      if (dialogMode) return
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
