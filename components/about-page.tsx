"use client"

import Link from "next/link"
import { ExternalLink, HandHeart } from "lucide-react"
import { ArabicTitle } from "@/components/arabic-title"
import { Frieze, StarMark } from "@/components/ornament"
import { AIDGAZA_SITE, aidgazaTeamUrl } from "@/lib/aidgaza"
import { useT } from "@/lib/i18n"

export function AboutPage() {
  const { t, locale } = useT()
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>من نحن</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">{t("About us")}</h1>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />

      <section className="alfiz mt-6 px-6 py-8 text-center sm:px-10">
        <StarMark className="size-6 text-brass-bright" />
        <p className="font-display mt-3 text-2xl leading-snug text-[#fbf1de] sm:text-3xl">
          {t("Mihrab, this website and app, was made by Mohammed Hamada of Aid Gaza.")}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#fbf1de]/85">
          {t("Mohammed Hamada is from Gaza, Palestine, and founded Aid Gaza (aidgaza.org) to help displaced and needy families in Gaza with water, shelter and support for orphans.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href={AIDGAZA_SITE}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brass-bright px-5 text-sm font-semibold text-[#3f120b] hover:brightness-105"
          >
            {t("Visit aidgaza.org")}
            <ExternalLink className="size-4 opacity-70" aria-hidden />
          </a>
          <a
            href={aidgazaTeamUrl(locale)}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-brass-bright/60 px-5 text-sm font-medium text-[#fbf1de] hover:bg-white/10"
          >
            {t("Meet the Aid Gaza team")}
            <ExternalLink className="size-4 opacity-70" aria-hidden />
          </a>
        </div>
      </section>

      <section className="andalus-card mt-6 px-5 py-5">
        <h2 className="font-display text-2xl text-grove">{t("What Mihrab is")}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("Mihrab is a free companion for prayer times, the Qibla, the Quran and daily athkar. It has no ads, no accounts and no tracking.")}
        </p>
        <Link href="/privacy/" className="mt-2 inline-block text-sm text-grove underline underline-offset-4">
          {t("Privacy policy")}
        </Link>
      </section>

      <section className="andalus-card mt-6 flex items-start gap-4 px-5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-grove text-brass-bright">
          <HandHeart className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-2xl text-grove">{t("Support Aid Gaza")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("If Mihrab helps you, please consider a donation. All donations go to Aid Gaza.")}
          </p>
          <Link
            href="/donate/"
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-grove hover:bg-accent"
          >
            <HandHeart className="size-4" aria-hidden />
            {t("Donate")}
          </Link>
        </div>
      </section>
    </main>
  )
}
