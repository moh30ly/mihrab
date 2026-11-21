"use client"

// Reads Arabic aloud. Athkar, duas and sibha phrases that have a human recording
// (lib/dhikr-audio.ts) play that; anything else uses the device's own text-to-speech
// voice: the browser's speech synthesis on the web, and Android's TTS engine in the app.
// Both work offline in the app.
import { Capacitor } from "@capacitor/core"
import { dhikrRecording } from "@/lib/dhikr-audio"

/** Thrown when the device has no Arabic voice, so nothing would be heard. */
export class NoArabicVoiceError extends Error {
  constructor() {
    super("No Arabic text-to-speech voice on this device")
    this.name = "NoArabicVoiceError"
  }
}

/** Remove the Quranic brackets, ayah marks and notes in parentheses that a voice would read out or stumble on. */
export function speakableArabic(text: string) {
  return text
    .replace(/[﴿﴾۝۞]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[ۖ-ۭ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Pieces short enough for browsers that go quiet partway through a long utterance
 * (Chrome stops after about 15 seconds). Splits at Arabic commas and full stops.
 */
export function speechChunks(text: string, max = 160): string[] {
  const parts = text.split(/(?<=[،.؛!?؟])\s+/u)
  const out: string[] = []
  let current = ""
  for (const part of parts) {
    if (current && (current + " " + part).length > max) {
      out.push(current)
      current = part
    } else {
      current = current ? `${current} ${part}` : part
    }
  }
  if (current) out.push(current)
  return out
}

const RATE = 0.85
const isNative = () => Capacitor.isNativePlatform()

async function plugin() {
  // Loaded on first use: the plugin touches window, which doesn't exist while pages are prerendered.
  const { TextToSpeech } = await import("@capacitor-community/text-to-speech")
  return TextToSpeech
}

// ---- Web: speechSynthesis, with the voice chosen explicitly ----

/** Browsers fill the voice list late; wait for it briefly. */
function webVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis
  const now = synth.getVoices()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done)
      window.clearTimeout(timer)
      resolve(synth.getVoices())
    }
    const timer = window.setTimeout(done, 2000)
    synth.addEventListener("voiceschanged", done)
  })
}

export function pickArabicVoice(voices: Pick<SpeechSynthesisVoice, "lang" | "localService" | "name">[]) {
  const arabic = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ar"))
  // Prefer Saudi or standard Arabic, then any; prefer voices that work offline.
  const rank = (v: (typeof arabic)[number]) => (/^ar-(sa|001)$/i.test(v.lang) ? 0 : 2) + (v.localService ? 0 : 1)
  return arabic.sort((a, b) => rank(a) - rank(b))[0] ?? null
}

let webRun = 0

async function speakWeb(text: string) {
  if (!("speechSynthesis" in window)) throw new NoArabicVoiceError()
  const synth = window.speechSynthesis
  const voice = pickArabicVoice(await webVoices())
  if (!voice) throw new NoArabicVoiceError()
  synth.cancel()
  const run = ++webRun
  for (const chunk of speechChunks(text)) {
    if (run !== webRun) return
    await new Promise<void>((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(chunk)
      u.voice = voice as SpeechSynthesisVoice
      u.lang = voice.lang
      u.rate = RATE
      let started = false
      // If the engine never starts (a broken or missing voice), don't sit in "playing" forever.
      const watchdog = window.setTimeout(() => {
        if (!started) {
          synth.cancel()
          reject(new NoArabicVoiceError())
        }
      }, 4000)
      u.onstart = () => {
        started = true
      }
      u.onend = () => {
        window.clearTimeout(watchdog)
        resolve()
      }
      u.onerror = (e) => {
        window.clearTimeout(watchdog)
        // "interrupted" and "canceled" mean Stop was pressed.
        if (e.error === "interrupted" || e.error === "canceled") resolve()
        else reject(new Error(e.error))
      }
      synth.speak(u)
    })
  }
}

// ---- Android: the TTS engine through the plugin ----

type NativeTts = Awaited<ReturnType<typeof plugin>>

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

/** The engine binds a moment after the app starts, and calls before that are refused as "not yet initialized". */
async function whenReady<T>(call: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await call()
    } catch (e) {
      if (i >= 15 || !/initiali[sz]ed|not available/i.test(message(e))) throw e
      await sleep(250)
    }
  }
}

/** Ask the engine the same question its speak() asks, so we only refuse when it would too. */
async function nativeArabic(tts: NativeTts): Promise<string | null> {
  for (const lang of ["ar-SA", "ar", "ar-EG", "ar-AE"]) {
    try {
      if ((await tts.isLanguageSupported({ lang })).supported) return lang
    } catch {
      // Try the next one.
    }
  }
  try {
    const { languages } = await tts.getSupportedLanguages()
    const found = languages.find((l) => l.toLowerCase().replace("_", "-").startsWith("ar"))
    if (found) return found.replace("_", "-")
  } catch {
    // Some engines can't list their languages.
  }
  return null
}

let nativeRun = 0

/** How long a chunk may take before we assume the engine went quiet (Android sends no "started" event). */
export const chunkTimeoutMs = (chunk: string) => 8000 + chunk.length * 250

async function speakNative(text: string) {
  const tts = await plugin()
  // Speaking needs an initialised engine; stop() is refused the same way until it is.
  await whenReady(() => tts.stop())
  const lang = await nativeArabic(tts)
  if (!lang) throw new NoArabicVoiceError()
  const run = ++nativeRun
  for (const chunk of speechChunks(text)) {
    if (run !== nativeRun) return
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        tts.speak({ text: chunk, lang, rate: RATE, pitch: 1, volume: 1, category: "playback" }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("The voice did not finish speaking")), chunkTimeoutMs(chunk))
        }),
      ])
    } catch (e) {
      if (run !== nativeRun) return // Stop was pressed.
      void tts.stop().catch(() => {})
      throw e
    } finally {
      clearTimeout(timer)
    }
  }
}

/** Opens the Android screen to install voice data (a no-op elsewhere). */
export async function openVoiceInstall() {
  if (!isNative()) return
  try {
    await (await plugin()).openInstall()
  } catch {
    // Some engines have no install screen.
  }
}

// ---- Human recordings ----

let recording: HTMLAudioElement | null = null
let recordingStopped: (() => void) | null = null

/** Plays a recording to the end. Resolves early when Stop is pressed; rejects if it can't play. */
function playRecording(src: string): Promise<void> {
  stopRecording()
  const audio = new Audio(src)
  recording = audio
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      if (recording === audio) recording = null
      recordingStopped = null
      resolve()
    }
    recordingStopped = done
    audio.onended = done
    audio.onerror = () => {
      if (recording === audio) recording = null
      recordingStopped = null
      reject(new Error("The recording could not be played"))
    }
    audio.play().catch((e: unknown) => {
      if (recording !== audio) return resolve() // Stopped before it started.
      recording = null
      recordingStopped = null
      reject(e instanceof Error ? e : new Error(String(e)))
    })
  })
}

function stopRecording() {
  if (recording) {
    recording.pause()
    recording.removeAttribute("src")
    recording = null
  }
  recordingStopped?.()
}

/** Whether this text plays a person's recording rather than the device's voice. */
export function hasRecording(text: string) {
  return dhikrRecording(text) !== null
}

export async function speakArabic(text: string): Promise<void> {
  const src = dhikrRecording(text)
  if (src) {
    await stopVoice()
    try {
      return await playRecording(src)
    } catch (e) {
      // Autoplay refused by the browser is worth reporting; a missing file falls back to the voice.
      if (e instanceof Error && e.name === "NotAllowedError") throw e
    }
  }
  const clean = speakableArabic(text)
  if (isNative()) await speakNative(clean)
  else await speakWeb(clean)
}

/** Silences the device's voice (not a recording). */
async function stopVoice() {
  try {
    if (isNative()) {
      nativeRun++
      await (await plugin()).stop()
    } else if ("speechSynthesis" in window) {
      webRun++
      window.speechSynthesis.cancel()
    }
  } catch {
    // Nothing was playing.
  }
}

export async function stopSpeaking() {
  stopRecording()
  await stopVoice()
}

export function isNativeSpeech() {
  return isNative()
}
