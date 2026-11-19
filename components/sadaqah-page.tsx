"use client"

import Link from "next/link"
import { BellRing } from "lucide-react"
import { Frieze, StarMark } from "@/components/ornament"
import { GivingIcon } from "@/components/nav-icons"
import { ZakatCalculator } from "@/components/zakat-calculator"
import { useT } from "@/lib/i18n"
import { ArabicTitle } from "@/components/arabic-title"

type Verse = { surah: number; ayah: number; arabic: string; meanings: Record<string, string> }

export function SadaqahPage({ verse }: { verse: Verse }) {
  const { t, locale } = useT()
  const meaning = locale === "ar" ? null : (verse.meanings[locale] ?? verse.meanings.en)
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>الصدقة والزكاة</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">{t("Sadaqah and zakat")}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {t("Give in charity, and work out the zakat due on what you hold.")}
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />

      <figure className="alfiz mt-6 px-6 py-7 text-center sm:px-10">
        <StarMark className="size-6 text-brass-bright" />
        <blockquote>
          <p lang="ar" dir="rtl" className="font-quran mt-3 text-2xl leading-[2.2] text-[#fbf1de] sm:text-3xl">
            {verse.arabic}
          </p>
          {meaning && <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#fbf1de]/85">{meaning}</p>}
        </blockquote>
        <figcaption className="mt-3 text-sm text-brass-bright">
          <Link href={`/quran/${verse.surah}/#ayah-${verse.ayah}`} className="underline decoration-brass-bright/50 underline-offset-4">
            {t("Al-Baqarah {ref}", { ref: `${verse.surah}:${verse.ayah}` })}
          </Link>
        </figcaption>
      </figure>

      <ZakatCalculator />

      <section className="andalus-card mt-6 flex items-start gap-4 px-5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-grove text-brass-bright">
          <GivingIcon className="size-6" />
        </span>
        <div>
          <h2 className="font-display text-2xl text-grove">{t("Reminders to give")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("Mihrab can remind you to give sadaqah each week, and when your zakat year (hawl) ends.")}
          </p>
          <Link
            href="/#reminders"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-grove hover:bg-accent"
          >
            <BellRing className="size-4" aria-hidden />
            {t("Set reminders")}
          </Link>
        </div>
      </section>
    </main>
  )
}
