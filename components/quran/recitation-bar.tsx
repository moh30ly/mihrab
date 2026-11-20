"use client"

import { CircleCheck, Download, Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from "lucide-react"
import { DownloadHint } from "@/components/offline/download-hint"
import { formatBytes, useCanDownload, useOfflineState, useOnline } from "@/components/offline/use-offline"
import type { Recitation } from "@/components/quran/use-recitation"
import { audioPack, audioSize, cancelDownload, downloadSurahAudio } from "@/lib/offline"
import { AUDIO_SOURCE, PLAY_MODES, RECITERS, reciterById, type PlayMode, type Reciter } from "@/lib/recitation"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function reciterLabel(r: Reciter, locale: string, t: (k: string) => string) {
  const name = locale === "ar" ? r.nameAr : r.name
  return r.style === "mujawwad" ? `${name} (${t("Mujawwad")})` : name
}

/** Choose who recites; shared by the Quran reader and the memorisation page. */
export function ReciterSelect({ value, onChange, className }: { value: string; onChange: (id: string) => void; className?: string }) {
  const { t, locale } = useT()
  return (
    <select
      aria-label={t("Reciter")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 min-w-0 rounded-full border border-border bg-card px-3 text-sm text-ink", className)}
    >
      {RECITERS.map((r) => (
        <option key={r.id} value={r.id}>
          {reciterLabel(r, locale, t)}
        </option>
      ))}
    </select>
  )
}

/** Keeps this surah's recitation on the phone, in the Android app. */
function SurahDownload({ surahId, reciterId }: { surahId: number; reciterId: string }) {
  const { t, locale } = useT()
  const s = useOfflineState()
  const online = useOnline()
  const app = useCanDownload()
  if (!app) return null
  const reciter = reciterById(reciterId)
  const path = audioPack(reciter, surahId)
  const job = s.jobs[path]
  const cls = "inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium"
  if (s.packs[path] != null) {
    return (
      <span className={cn(cls, "text-grove")} title={t("Downloaded")}>
        <CircleCheck className="size-4" aria-hidden /> {t("Offline")}
      </span>
    )
  }
  if (job && job.status !== "error") {
    const pct = job.status === "downloading" && job.total ? Math.floor((job.done / job.total) * 100) : 0
    return (
      <button type="button" onClick={() => void cancelDownload(path)} aria-label={t("Stop downloading {name}", { name: t("Surah {n}", { n: surahId }) })} className={cn(cls, "border border-border text-ink")}>
        <Loader2 className="size-4 animate-spin" aria-hidden /> <span className="tabular-nums">{pct}%</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      disabled={!online}
      onClick={() => downloadSurahAudio(reciter, surahId)}
      aria-label={t("Download this surah’s recitation ({size})", { size: formatBytes(audioSize(reciter, surahId), locale) })}
      className={cn(cls, "border border-border text-ink hover:bg-secondary disabled:opacity-40")}
    >
      <Download className="size-4" aria-hidden /> {formatBytes(audioSize(reciter, surahId), locale)}
    </button>
  )
}

/** The player shown above the tab bar while a surah is being recited. */
export function RecitationBar({ surahId, recitation }: { surahId: number; recitation: Recitation }) {
  const { t } = useT()
  const { status, ayah, prefs } = recitation
  if (ayah == null && status === "idle") return null
  const busy = status === "loading"
  const playing = status === "playing" || busy
  const modeLabels: Record<PlayMode, string> = { surah: t("Whole surah"), ayah: t("One ayah"), repeat: t("Repeat ayah") }
  const where = ayah === 0 ? t("Basmala") : t("Ayah {n}", { n: `${surahId}:${ayah}` })

  return (
    <div
      role="region"
      aria-label={t("Recitation")}
      className="fixed inset-x-0 bottom-[calc(4.9rem+env(safe-area-inset-bottom))] z-30 px-3"
    >
      <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-gold/60 bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => recitation.skip(-1)}
            aria-label={t("Previous ayah")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-secondary"
          >
            <SkipBack className="size-5 rtl:rotate-180" aria-hidden />
          </button>
          <button
            type="button"
            onClick={status === "error" ? () => ayah != null && recitation.play(ayah || 1) : recitation.toggle}
            aria-label={status === "error" ? t("Try again") : playing ? t("Pause") : t("Play")}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-grove text-[#f6f1e6]"
          >
            {status === "error" ? (
              <RotateCcw className="size-5" aria-hidden />
            ) : busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : playing ? (
              <Pause className="size-5 fill-current" aria-hidden />
            ) : (
              <Play className="size-5 fill-current" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => recitation.skip(1)}
            aria-label={t("Next ayah")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-secondary"
          >
            <SkipForward className="size-5 rtl:rotate-180" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-brass tabular-nums" aria-live="polite">
            {where}
          </p>
          <button
            type="button"
            onClick={recitation.stop}
            aria-label={t("Stop")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {status === "error" ? (
          <div className="px-1 pb-1 text-sm text-[#b4472c]">
            <p>{t("The recitation could not be loaded. Check your internet connection and try again.")}</p>
            <DownloadHint kind="audio" />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ReciterSelect value={prefs.reciter} onChange={recitation.setReciter} className="max-w-full flex-1 basis-48" />
          <SurahDownload surahId={surahId} reciterId={prefs.reciter} />
          <select
            aria-label={t("When an ayah ends")}
            value={prefs.mode}
            onChange={(e) => recitation.setMode(e.target.value as PlayMode)}
            className="h-9 rounded-full border border-border bg-card px-3 text-sm text-ink"
          >
            {PLAY_MODES.map((m) => (
              <option key={m} value={m}>
                {modeLabels[m]}
              </option>
            ))}
          </select>
          <a href={AUDIO_SOURCE.url} rel="noopener" className="px-1 text-xs text-muted-foreground underline underline-offset-2">
            {AUDIO_SOURCE.name}
          </a>
        </div>
      </div>
    </div>
  )
}
