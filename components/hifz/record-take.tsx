"use client"

import { useEffect, useRef, useState } from "react"
import { Circle, Square, Trash2 } from "lucide-react"
import { ensureMic } from "@/lib/listen"
import { canRecord, deleteTake, loadTake, saveTake, startRecording, type Recorder } from "@/lib/recordings"
import { useT } from "@/lib/i18n"

/** Record yourself reciting and play it back; the latest take is kept for each ayah or range. */
export function RecordTake({
  takeKey,
  disabled,
  onRecording,
}: {
  takeKey: string
  disabled?: boolean
  onRecording?: (on: boolean) => void
}) {
  const { t } = useT()
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const rec = useRef<Recorder | null>(null)

  useEffect(() => {
    // Recording needs browser APIs that don't exist while pages are prerendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(canRecord())
  }, [])

  // The saved take for this ayah or range.
  useEffect(() => {
    let cancelled = false
    let made: string | null = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(null)
    void loadTake(takeKey).then((take) => {
      if (cancelled || !take) return
      made = URL.createObjectURL(take.blob)
      setUrl(made)
    })
    return () => {
      cancelled = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [takeKey])

  useEffect(() => {
    if (!recording) return
    const started = Date.now()
    const id = window.setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 500)
    return () => window.clearInterval(id)
  }, [recording])

  // Leaving the page or the ayah stops the microphone.
  useEffect(
    () => () => {
      rec.current?.cancel()
      rec.current = null
    },
    [takeKey],
  )

  if (!supported) return null

  const start = async () => {
    setError(false)
    try {
      if (!(await ensureMic())) throw new Error("Microphone permission was denied")
      rec.current = await startRecording()
      setSeconds(0)
      setRecording(true)
      onRecording?.(true)
    } catch {
      setError(true)
    }
  }

  const stop = async () => {
    const r = rec.current
    rec.current = null
    setRecording(false)
    onRecording?.(false)
    const blob = r ? await r.stop() : null
    if (!blob) return
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return URL.createObjectURL(blob)
    })
    void saveTake(takeKey, blob)
  }

  const remove = () => {
    void deleteTake(takeKey)
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old)
      return null
    })
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={() => void stop()}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b4472c] px-5 text-sm font-medium text-white"
          >
            <Square className="size-4 fill-current" aria-hidden /> {t("Stop recording")} · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={disabled}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium disabled:opacity-50"
          >
            <Circle className="size-4 fill-[#b4472c] text-[#b4472c]" aria-hidden /> {t("Record myself")}
          </button>
        )}
        {url && !recording ? (
          <>
            <audio controls src={url} className="h-10 max-w-full flex-1" aria-label={t("My recording")} />
            <button
              type="button"
              onClick={remove}
              aria-label={t("Delete my recording")}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-[#b4472c]">{t("Mihrab needs the microphone to record you. Allow it in your browser or phone settings.")}</p>
      ) : null}
    </div>
  )
}
