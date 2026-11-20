"use client"

import Link from "next/link"
import { Bookmark } from "lucide-react"
import { surahById } from "@/lib/quran-index"
import { useLastRead } from "@/lib/quran-notes"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Takes the reader back to the ayah they were reading when they last closed the Quran. */
export function ContinueReading({ className }: { className?: string }) {
  const { t } = useT()
  const last = useLastRead()
  const surah = last ? surahById(last.surah) : null
  if (!last || !surah) return null
  return (
    <Link
      href={`/quran/${surah.id}/#ayah-${last.ayah}`}
      className={cn("arch-panel flex items-center justify-between gap-4 px-6 py-5 !rounded-[1.5rem]", className)}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-xs tracking-wide text-brass-bright uppercase">
          <Bookmark className="size-3.5 fill-current" aria-hidden />
          {t("Continue reading")}
        </span>
        <span className="block font-heading text-2xl">
          {t("{surah}, ayah {n}", { surah: surah.transliteration, n: last.ayah })}
        </span>
        <span className="block text-xs text-[#fbf1de]/75">{t("Where you left off")}</span>
      </span>
      <span lang="ar" dir="rtl" className="shrink-0 font-quran text-3xl">
        {surah.name}
      </span>
    </Link>
  )
}
