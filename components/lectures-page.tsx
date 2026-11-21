"use client"

import { useRef, useState } from "react"
import { Captions, ExternalLink, ListVideo, Play } from "lucide-react"
import { ArabicTitle } from "@/components/arabic-title"
import { Frieze } from "@/components/ornament"
import { useT } from "@/lib/i18n"
import { localeInfo } from "@/lib/i18n/locales"
import {
  CHANNEL,
  GROUPS,
  PLAYLISTS,
  UPLOADS,
  embedUrl,
  playlistUrl,
  type LecturePlaylist,
} from "@/lib/lectures"
import { cn } from "@/lib/utils"

export function LecturesPage() {
  const { t, locale } = useT()
  const [selected, setSelected] = useState<LecturePlaylist>(UPLOADS)
  // The player loads from YouTube only after a tap, so opening the page contacts no one.
  const [playing, setPlaying] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  const choose = (p: LecturePlaylist) => {
    setSelected(p)
    setPlaying(true)
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const language = localeInfo(locale).name
  const titleOf = (p: LecturePlaylist) => (locale === "ar" ? p.ar : t(p.title))

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>الدروس والمحاضرات</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">{t("Lectures")}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {t("Lessons by Sheikh Said El Kamali, from his official YouTube channel.")}
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />

      <div ref={playerRef} className="mt-6 scroll-mt-20">
        <div className="andalus-card overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-[#1d0b07]">
            {playing ? (
              <iframe
                key={`${selected.id}-${locale}`}
                src={embedUrl(selected.id, locale, window.location.origin)}
                title={titleOf(selected)}
                className="absolute inset-0 size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => choose(selected)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_50%_40%,#7a2819,#3f120b)] px-6 text-center text-[#fbf1de]"
              >
                <span className="grid size-16 place-items-center rounded-full bg-brass-bright text-[#3f120b] shadow-lg">
                  <Play className="ms-1 size-8" aria-hidden />
                </span>
                <span lang="ar" dir="rtl" className="font-arabic text-xl">
                  {selected.ar}
                </span>
                {locale !== "ar" && <span className="text-sm opacity-85">{t(selected.title)}</span>}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <p className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Captions className="size-4 shrink-0" aria-hidden />
              {locale === "ar"
                ? t("Subtitles can be turned on from the CC button in the player.")
                : t("Subtitles open in {language} when YouTube has them for a lecture.", { language })}
            </p>
            <a
              href={playlistUrl(selected.id)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-grove underline-offset-4 hover:underline"
            >
              {t("Open on YouTube")}
              <ExternalLink className="size-3.5 opacity-70" aria-hidden />
            </a>
          </div>
        </div>
        <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">
          {t(
            "Use the list button in the player to pick a lesson in the series. Many of these lectures have no captions on YouTube yet; when the channel adds them, YouTube translates them into your language.",
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() => choose(UPLOADS)}
        aria-pressed={selected.id === UPLOADS.id}
        className={cn(
          "andalus-card mt-6 flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-accent",
          selected.id === UPLOADS.id && "ring-2 ring-brass-bright",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-grove text-[#f6f1e6]">
          <Play className="ms-0.5 size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-ink">{t("Latest lectures")}</span>
          <span className="block text-xs text-muted-foreground">{t("Every video on the channel, newest first")}</span>
        </span>
      </button>

      {GROUPS.map((g) => (
        <section key={g.id} className="mt-8">
          <h2 className="font-display text-2xl text-grove">{t(g.title)}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PLAYLISTS.filter((p) => p.group === g.id).map((p) => {
              const active = p.id === selected.id
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    aria-pressed={active}
                    className={cn(
                      "andalus-card flex h-full w-full items-start gap-3 px-4 py-3 text-start hover:bg-accent",
                      active && "ring-2 ring-brass-bright",
                    )}
                  >
                    <ListVideo className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden />
                    <span className="min-w-0">
                      {locale !== "ar" && <span className="block font-medium text-ink">{t(p.title)}</span>}
                      <span
                        lang="ar"
                        dir="rtl"
                        className={cn("block font-arabic", locale === "ar" ? "text-base text-ink" : "text-sm text-muted-foreground")}
                      >
                        {p.ar}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {p.count === 1 ? t("1 video") : t("{count} videos", { count: p.count })}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">
        {t("Videos are played by YouTube from the channel {channel}. Mihrab does not host or download them.", {
          channel: CHANNEL.handle,
        })}{" "}
        <a href={CHANNEL.url} target="_blank" rel="noopener" className="text-grove underline underline-offset-2">
          {t("Visit the channel")}
        </a>
      </p>
    </main>
  )
}
