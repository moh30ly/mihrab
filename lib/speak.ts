"use client"

// Reads Arabic aloud with the device's own text-to-speech voice: the browser's
// speech synthesis on the web, and Android's TTS engine in the app. Nothing is
// downloaded, so it works offline once the phone has an Arabic voice.

async function tts() {
  // Loaded on first use: the plugin touches window, which doesn't exist while pages are prerendered.
  const { TextToSpeech } = await import("@capacitor-community/text-to-speech")
  return TextToSpeech
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

export async function speakArabic(text: string): Promise<void> {
  await stopSpeaking()
  await (await tts()).speak({ text: speakableArabic(text), lang: "ar-SA", rate: 0.85, pitch: 1, volume: 1, category: "playback" })
}

export async function stopSpeaking() {
  try {
    await (await tts()).stop()
  } catch {
    // Nothing was playing, or speech isn't available.
  }
}
