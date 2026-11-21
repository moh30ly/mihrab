"use client"

import Link from "next/link"
import { ExternalLink, HandHeart, Info } from "lucide-react"
import { ArabicTitle } from "@/components/arabic-title"
import { Frieze, StarMark } from "@/components/ornament"
import { aidgazaDonateUrl, aidgazaHistoryUrl } from "@/lib/aidgaza"
import { useT } from "@/lib/i18n"

export function DonatePage() {
  const { t, locale } = useT()
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>تبرّع</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">{t("Donate")}</h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {t("Help the people of Gaza through Aid Gaza.")}
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />

      <section className="alfiz mt-6 px-6 py-8 text-center sm:px-10">
        <StarMark className="size-6 text-brass-bright" />
        <p className="font-display mt-3 text-2xl leading-snug text-[#fbf1de] sm:text-3xl">
          {t("All donations go to Aid Gaza (aidgaza.org).")}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#fbf1de]/85">
          {t("Mihrab never collects, holds or receives any money. When you tap Donate, Aid Gaza’s own donation page opens in your browser and you give to them directly.")}
        </p>
        <a
          href={aidgazaDonateUrl(locale)}
          target="_blank"
          rel="noopener"
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brass-bright px-6 text-base font-semibold text-[#3f120b] shadow hover:brightness-105"
        >
          <HandHeart className="size-5" aria-hidden />
          {t("Donate on aidgaza.org")}
          <ExternalLink className="size-4 opacity-70" aria-hidden />
        </a>
      </section>

      <section className="andalus-card mt-6 flex items-start gap-4 px-5 py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-grove text-brass-bright">
          <Info className="size-6" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-2xl text-grove">{t("About Aid Gaza")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("Aid Gaza is the humanitarian relief work of Mohammed Hamada, who made Mihrab. It tracks every donation from collection to delivery.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={aidgazaHistoryUrl(locale)}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-grove hover:bg-accent"
            >
              {t("See the donations history")}
              <ExternalLink className="size-4" aria-hidden />
            </a>
            <Link
              href="/about/"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-grove hover:bg-accent"
            >
              {t("About us")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
