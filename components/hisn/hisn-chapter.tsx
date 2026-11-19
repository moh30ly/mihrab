"use client"

import { useState } from "react"
import { SpeakButton } from "@/components/speak-button"
import { chapterTitle, type HisnChapter } from "@/lib/hisn"
import { useT } from "@/lib/i18n"

export function HisnChapterView({ chapter }: { chapter: HisnChapter }) {
  const { t, locale } = useT()
  const [showMeaning, setShowMeaning] = useState(true)
  const lang = locale === "tr" ? "tr" : "en"

  return (
    <>
      <h1 className="mt-4 text-center">
        <span lang="ar" dir="rtl" className="block font-arabic text-3xl leading-snug text-brass">
          {chapter.ar}
        </span>
        {locale !== "ar" ? <span className="mt-1 block font-heading text-2xl text-grove">{chapterTitle(chapter, locale)}</span> : null}
      </h1>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setShowMeaning(!showMeaning)}
          aria-pressed={showMeaning}
          className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm text-ink hover:bg-secondary"
        >
          {showMeaning ? t("Hide meaning") : t("Show meaning")}
        </button>
      </div>
      <ol className="mt-5 grid gap-3">
        {chapter.items.map((d, i) => (
          <li key={d.id} id={`dua-${d.id}`} className="andalus-card scroll-mt-20 px-5 py-5">
            <p className="text-xs tracking-wide text-brass uppercase">
              {chapter.id}.{i + 1}
            </p>
            <p lang="ar" dir="rtl" className="mt-2 font-arabic text-2xl leading-[2.1] whitespace-pre-line text-ink">
              {d.ar}
            </p>
            {showMeaning && d[lang] ? (
              <p lang={lang} dir="ltr" className="mt-3 text-start text-base leading-7 text-muted-foreground">
                {d[lang]}
              </p>
            ) : null}
            {d.count > 1 ? <p className="mt-3 text-sm text-grove">{t("{n} times", { n: d.count })}</p> : null}
            <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-1">
              <SpeakButton text={d.ar} />
              {d.ref ? (
                <details className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                  <summary className="cursor-pointer py-2">{t("Source")}</summary>
                  <span lang="ar" dir="rtl" className="block font-arabic text-sm leading-7">
                    {d.ref}
                  </span>
                </details>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
