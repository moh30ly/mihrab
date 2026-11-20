"use client"

import { useEffect, useState } from "react"
import { Check, CircleCheck, Download, Loader2, Mic, RotateCcw, Trash2, Wifi, WifiOff, X } from "lucide-react"
import { ReciterSelect, reciterLabel } from "@/components/quran/recitation-bar"
import { formatBytes, useCanDownload, useOfflineState, useOnline } from "@/components/offline/use-offline"
import { HADITH_COLLECTIONS } from "@/lib/hadith"
import { isBundled } from "@/lib/library"
import { downloadSpeechModel, offlineSpeechModel, type OfflineModel } from "@/lib/listen"
import { downloadQuranAsr, QURAN_ASR_PACK, QURAN_ASR_SIZE, quranAsrError, quranAsrSupported } from "@/lib/quran-asr"
import {
  audioPack,
  audioSize,
  bookPack,
  bookSizes,
  cancelAll,
  cancelDownload,
  downloadAllAudio,
  downloadBook,
  downloadedSurahs,
  downloadSurahAudio,
  refreshOffline,
  removeAllAudio,
  removePack,
  totalAudioSize,
  usedBytes,
  type BookSizes,
  type JobState,
  type LibraryKind,
} from "@/lib/offline"
import { SURAHS } from "@/lib/quran-index"
import { loadRecitationPrefs, reciterById, saveRecitationPrefs } from "@/lib/recitation"
import { IRABS, TAFSIRS, type TafsirInfo } from "@/lib/tafsir"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const btn = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium disabled:opacity-40"

/** One downloadable book or surah: its size, and a button to download, stop or delete it. */
function PackRow({
  path,
  title,
  subtitle,
  size,
  onDownload,
  lang,
}: {
  path: string
  title: string
  subtitle?: string
  /** Expected size in bytes before it is downloaded. */
  size?: number
  onDownload: () => void
  lang?: string
}) {
  const { t, locale } = useT()
  const s = useOfflineState()
  const online = useOnline()
  const bytes = s.packs[path]
  const job: JobState | undefined = s.jobs[path]

  let status: React.ReactNode
  let action: React.ReactNode
  if (bytes != null) {
    status = (
      <span className="inline-flex items-center gap-1 text-grove">
        <CircleCheck className="size-3.5" aria-hidden /> {t("Downloaded")} · {formatBytes(bytes, locale)}
      </span>
    )
    action = (
      <button type="button" onClick={() => void removePack(path)} aria-label={t("Delete {name}", { name: title })} className={cn(btn, "text-muted-foreground hover:bg-secondary")}>
        <Trash2 className="size-4" aria-hidden />
      </button>
    )
  } else if (job?.status === "downloading" || job?.status === "queued") {
    const pct = job.status === "downloading" && job.total ? Math.floor((job.done / job.total) * 100) : 0
    status =
      job.status === "queued" ? (
        <span>{t("Waiting…")}</span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary" aria-hidden>
            <span className="block h-full bg-grove transition-[width]" style={{ width: `${pct}%` }} />
          </span>
          <span className="tabular-nums">{pct}%</span>
        </span>
      )
    action = (
      <button type="button" onClick={() => void cancelDownload(path)} aria-label={t("Stop downloading {name}", { name: title })} className={cn(btn, "text-muted-foreground hover:bg-secondary")}>
        {job.status === "downloading" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        <X className="size-4" aria-hidden />
      </button>
    )
  } else {
    status =
      job?.status === "error" ? (
        <span className="text-[#b4472c]">
          {job.reason === "storage" ? t("Not enough space on the phone.") : t("The download stopped. Check your connection and try again.")}
        </span>
      ) : size ? (
        <span>{formatBytes(size, locale)}</span>
      ) : null
    action = (
      <button
        type="button"
        onClick={onDownload}
        disabled={!online}
        aria-label={t("Download {name}", { name: title })}
        className={cn(btn, "border border-border bg-card text-ink hover:bg-secondary")}
      >
        {job?.status === "error" ? <RotateCcw className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
        {job?.status === "error" ? t("Try again") : t("Download")}
      </button>
    )
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p lang={lang} dir="auto" className="truncate font-medium text-ink">
          {title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {subtitle ? <span>{subtitle}</span> : null}
          {status}
        </p>
      </div>
      {action}
    </li>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="andalus-card mt-5 px-4 py-4 sm:px-5">
      <h2 className="font-heading text-xl text-grove">{title}</h2>
      {note ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{note}</p> : null}
      {children}
    </section>
  )
}

function BookList({ kind, books, sizes }: { kind: LibraryKind; books: { id: string; title: string; subtitle?: string; lang?: string }[]; sizes: BookSizes }) {
  return (
    <ul className="mt-2 divide-y divide-border">
      {books.map((b) => (
        <PackRow
          key={b.id}
          path={bookPack(kind, b.id)}
          title={b.title}
          subtitle={b.subtitle}
          lang={b.lang}
          size={sizes[`${kind}/${b.id}`]?.bytes}
          onDownload={() => downloadBook(kind, b.id)}
        />
      ))}
    </ul>
  )
}

function Recitations() {
  const { t, locale } = useT()
  const s = useOfflineState()
  const online = useOnline()
  const [reciterId, setReciterId] = useState<string>("")
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    // The chosen reciter lives in localStorage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReciterId(loadRecitationPrefs().reciter)
  }, [])
  const reciter = reciterById(reciterId)
  const prefix = `audio/${reciter.id}/`
  const count = downloadedSurahs(s, reciter)
  const busy = Object.keys(s.jobs).some((p) => p.startsWith(prefix) && s.jobs[p].status !== "error")
  const remaining = SURAHS.filter((x) => s.packs[audioPack(reciter, x.id)] == null).reduce((sum, x) => sum + audioSize(reciter, x.id), 0)

  const choose = (id: string) => {
    setReciterId(id)
    setConfirm(false)
    saveRecitationPrefs({ ...loadRecitationPrefs(), reciter: id })
  }

  return (
    <Section
      title={t("Recitations")}
      note={t("Download a reciter’s voice surah by surah, to listen and memorize without a connection. Sizes are approximate.")}
    >
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ReciterSelect value={reciter.id} onChange={choose} className="max-w-full flex-1 basis-56" />
      </div>
      <p className="mt-3 text-sm text-ink">
        {t("{n} of 114 surahs downloaded", { n: count })}
        {count ? ` · ${formatBytes(usedBytes(s, prefix), locale)}` : ""}
        <span className="text-muted-foreground"> · {t("whole Quran about {size}", { size: formatBytes(totalAudioSize(reciter), locale) })}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {busy ? (
          <button type="button" onClick={() => void cancelAll(prefix)} className={cn(btn, "border border-border bg-card text-ink hover:bg-secondary")}>
            <X className="size-4" aria-hidden /> {t("Stop downloads")}
          </button>
        ) : count < 114 ? (
          <button
            type="button"
            disabled={!online}
            onClick={() => downloadAllAudio(reciter)}
            className={cn(btn, "bg-grove text-[#f6f1e6]")}
          >
            <Download className="size-4" aria-hidden /> {t("Download all ({size})", { size: formatBytes(remaining, locale) })}
          </button>
        ) : null}
        {count > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (!confirm) return setConfirm(true)
              setConfirm(false)
              void removeAllAudio(reciter)
            }}
            className={cn(btn, confirm ? "bg-[#b4472c] text-white" : "text-muted-foreground hover:bg-secondary")}
          >
            <Trash2 className="size-4" aria-hidden /> {confirm ? t("Tap again to delete") : t("Delete all")}
          </button>
        ) : null}
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer py-1 text-sm font-medium text-grove">{t("Choose surahs")}</summary>
        <ul className="mt-1 divide-y divide-border">
          {SURAHS.map((x) => (
            <PackRow
              key={x.id}
              path={audioPack(reciter, x.id)}
              title={`${x.id}. ${locale === "ar" ? x.name : x.transliteration}`}
              subtitle={reciterLabel(reciter, locale, t)}
              size={audioSize(reciter, x.id)}
              onDownload={() => downloadSurahAudio(reciter, x.id)}
            />
          ))}
        </ul>
      </details>
    </Section>
  )
}

/** Whether the phone can check a recitation without a connection, with a button to download Arabic. */
/**
 * Mihrab's own recitation checker (lib/quran-asr.ts): with it, Recite works without the
 * Google app and without a connection.
 */
export function QuranChecker({ card = false }: { card?: boolean }) {
  const { t } = useT()
  const s = useOfflineState()
  const [supported, setSupported] = useState(false)
  useEffect(() => {
    // Needs the app's file storage, which doesn't exist while pages are prerendered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(quranAsrSupported())
  }, [])
  if (!supported) return null
  // On the memorization page, only offer it until it is downloaded.
  if (card && s.packs[QURAN_ASR_PACK] != null) return null
  const error = s.packs[QURAN_ASR_PACK] != null ? quranAsrError() : ""
  return (
    <div className={cn(card ? "andalus-card px-4 py-2" : "mt-3")}>
      <ul>
        <PackRow
          path={QURAN_ASR_PACK}
          title={t("Quran recitation checker")}
          subtitle={t("Hears your recitation on the phone, without Google or a connection")}
          size={QURAN_ASR_SIZE}
          onDownload={downloadQuranAsr}
        />
      </ul>
      {error ? <p className="pb-2 text-xs text-[#b4472c]">{t("It could not start on this phone, so the phone’s recogniser is used instead.")} ({error})</p> : null}
    </div>
  )
}

export function SpeechModel() {
  const { t } = useT()
  const online = useOnline()
  const [model, setModel] = useState<OfflineModel | null>(null)
  useEffect(() => {
    void offlineSpeechModel().then(setModel)
  }, [])
  if (model == null) return null
  return (
    <div className="mt-3 flex items-start gap-3">
      <Mic className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-6">
        <p className="font-medium text-ink">{t("Hearing your recitation offline")}</p>
        <p className="text-muted-foreground">
          {model === "installed"
            ? t("Your phone can recognise Arabic without a connection.")
            : model === "pending"
              ? t("Your phone is downloading offline Arabic recognition.")
              : model === "available"
                ? t("Your phone can download Arabic speech recognition to check your recitation without a connection.")
                : t("This phone recognises speech only online. Without a connection, recite and mark yourself, or type the ayah.")}
        </p>
        {model === "available" ? (
          <button
            type="button"
            disabled={!online}
            onClick={() => void downloadSpeechModel().then(() => offlineSpeechModel().then(setModel))}
            className={cn(btn, "mt-2 border border-border bg-card text-ink hover:bg-secondary")}
          >
            <Download className="size-4" aria-hidden /> {t("Download Arabic recognition")}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const ALWAYS = [
  "The Quran in the Uthmani script",
  "Its meaning in English and eight more languages",
  "Al-Mukhtasar tafsir and Al-I‘rab al-Muyassar",
  "Memorization: hiding words, your progress and typing an ayah",
  "Your notes and where you left off",
  "Athkar, duas and Hisn al-Muslim",
]

/** The Quran's offline page: what always works, and the books and recitations to keep on the phone. */
export function Downloads() {
  const { t, locale } = useT()
  const s = useOfflineState()
  const online = useOnline()
  const app = useCanDownload()
  const [sizes, setSizes] = useState<BookSizes>({})

  useEffect(() => {
    if (!app) return
    void refreshOffline()
    void bookSizes().then(setSizes)
  }, [app, online])

  const bookRow = (b: TafsirInfo) => ({
    id: b.id,
    title: b.name,
    lang: b.lang,
    subtitle: locale === "ar" || b.lang === locale ? undefined : b.english,
  })
  const tafsirs = TAFSIRS.filter((b) => !isBundled(`tafsir/${b.id}/`)).map(bookRow)
  const irabs = IRABS.filter((b) => !isBundled(`tafsir/${b.id}/`)).map(bookRow)
  const hadith = HADITH_COLLECTIONS.map((c) => ({
    id: c.id,
    title: locale === "ar" ? c.arabic : c.english,
    lang: locale === "ar" ? "ar" : undefined,
  }))

  return (
    <div className="mt-6">
      <p
        className={cn(
          "mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-sm",
          online ? "border-border bg-card text-muted-foreground" : "border-gold/60 bg-secondary text-ink",
        )}
        role="status"
      >
        {online ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4 text-brass" aria-hidden />}
        {online ? t("Online") : t("Offline")}
      </p>

      <Section
        title={t("Always available offline")}
        note={app ? t("These are part of the app and work without a connection.") : t("In the Mihrab Android app, these work without a connection.")}
      >
        <ul className="mt-2 space-y-1.5">
          {ALWAYS.map((k) => (
            <li key={k} className="flex items-start gap-2 text-sm text-ink">
              <Check className="mt-0.5 size-4 shrink-0 text-grove" aria-hidden /> {t(k)}
            </li>
          ))}
        </ul>
      </Section>

      {!app ? (
        <Section title={t("Downloads")} note={t("Books and recitations can be downloaded in the Mihrab Android app. The website needs a connection to read them.")}>
          {null}
        </Section>
      ) : (
        <>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {t("Downloads use {used} on this phone", { used: formatBytes(usedBytes(s), locale) })}
            {s.free != null ? ` · ${t("{free} free", { free: formatBytes(s.free, locale) })}` : ""}
          </p>
          {!online ? (
            <p className="mt-2 text-center text-sm text-brass">{t("Connect to the internet to download more.")}</p>
          ) : null}
          <Recitations />
          <Section title={t("Tafsir")}>
            <BookList kind="tafsir" books={tafsirs} sizes={sizes} />
          </Section>
          <Section title={t("I‘rab")} note={t("I‘rab explains the grammar of each Arabic word, so it is written in Arabic.")}>
            <BookList kind="tafsir" books={irabs} sizes={sizes} />
          </Section>
          <Section title={t("Hadith")}>
            <BookList kind="hadith" books={hadith} sizes={sizes} />
          </Section>
          <Section title={t("Memorize")} note={t("Listen plays the recitations you downloaded above. Without them, the phone’s own voice reads the ayah.")}>
            <QuranChecker />
            <SpeechModel />
          </Section>
        </>
      )}
    </div>
  )
}
