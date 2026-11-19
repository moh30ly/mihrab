"use client"

import { useEffect, useState } from "react"
import { Square, Volume2 } from "lucide-react"
import { speakArabic, stopSpeaking } from "@/lib/speak"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// Only one button plays at a time; starting another stops the first.
let stopCurrent: (() => void) | null = null

export function SpeakButton({ text, className }: { text: string; className?: string }) {
  const { t } = useT()
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

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
    setFailed(false)
    setPlaying(true)
    try {
      await speakArabic(text)
    } catch {
      setFailed(true)
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
        <span className="text-xs text-muted-foreground">
          {t("No Arabic voice found. Add Arabic in your phone's text-to-speech settings.")}
        </span>
      ) : null}
    </span>
  )
}
