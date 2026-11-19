"use client"

// Reads Arabic aloud with the device's own text-to-speech voice: the browser's
// speech synthesis on the web, and Android's TTS engine in the app. Nothing is
// downloaded, so it works offline once the device has an Arabic voice.
import { Capacitor } from "@capacitor/core"

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

async function speakNative(text: string) {
  const tts = await plugin()
  const { languages } = await tts.getSupportedLanguages()
  const lang = languages.find((l) => /^ar[-_]sa$/i.test(l)) ?? languages.find((l) => l.toLowerCase().startsWith("ar"))
  if (!lang) throw new NoArabicVoiceError()
  await tts.speak({ text, lang: lang.replace("_", "-"), rate: RATE, pitch: 1, volume: 1, category: "playback" })
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

export async function speakArabic(text: string): Promise<void> {
  const clean = speakableArabic(text)
  if (isNative()) await speakNative(clean)
  else await speakWeb(clean)
}

export async function stopSpeaking() {
  try {
    if (isNative()) {
      await (await plugin()).stop()
    } else if ("speechSynthesis" in window) {
      webRun++
      window.speechSynthesis.cancel()
    }
  } catch {
    // Nothing was playing.
  }
}

export function isNativeSpeech() {
  return isNative()
}
