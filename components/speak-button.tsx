"use client"

import { useEffect, useState } from "react"
import { Square, Volume2 } from "lucide-react"
import { NoArabicVoiceError, isNativeSpeech, openVoiceInstall, speakArabic, stopSpeaking } from "@/lib/speak"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// Only one button plays at a time; starting another stops the first.
let stopCurrent: (() => void) | null = null

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const { t } = useT()
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState<"no-voice" | "error" | null>(null)
  const [detail, setDetail] = useState("")

  useEffect(() => () => {
    if (stopCurrent && playing) void stopSpeaking()
  }, [playing])

  const toggle = async () => {
    if (playing) {
      setPlaying(false)
      stopCurrent = null
      await stopSpeaking()
      return
    }
    stopCurrent?.()
    const stop = () => setPlaying(false)
    stopCurrent = stop
    setFailed(null)
    setPlaying(true)
    try {
      await speakArabic(text)
    } catch (e) {
      setFailed(e instanceof NoArabicVoiceError ? "no-voice" : "error")
      // The engine's own words, so a report from a phone tells us what went wrong.
      setDetail(e instanceof Error ? e.message : String(e))
    } finally {
      if (stopCurrent === stop) stopCurrent = null
      setPlaying(false)
    }
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={playing}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-grove hover:border-gold hover:bg-secondary"
      >
        {playing ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
        {playing ? t("Stop") : t("Listen")}
      </button>
      {failed ? (
        <span className="text-xs text-muted-foreground" role="status">
          {failed === "error"
            ? isNativeSpeech()
              ? t("The voice couldn't play this. Check that the media volume is up and that a text-to-speech engine with Arabic is set in your phone's settings.")
              : t("The voice couldn't play this. Please try again.")
            : isNativeSpeech()
              ? t("No Arabic voice found. Add Arabic in your phone's text-to-speech settings.")
              : t("This browser has no Arabic voice. Try Microsoft Edge or Chrome on your phone, or add an Arabic voice in your device's speech settings.")}
          {failed === "no-voice" && isNativeSpeech() ? (
            <button type="button" onClick={() => void openVoiceInstall()} className="ms-2 underline text-grove">
              {t("Install voice")}
            </button>
          ) : null}
          {failed === "error" && detail ? <span className="block opacity-70" dir="ltr">({detail})</span> : null}
        </span>
      ) : null}
    </span>
  )
}
