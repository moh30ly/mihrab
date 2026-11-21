"use client"

import Link from "next/link"
import { useT } from "@/lib/i18n"

/** Small links at the foot of every page. */
export function SiteFooter() {
  const { t } = useT()
  return (
    <footer className="border-t border-gold/30">
      <nav
        aria-label={t("About Mihrab")}
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-4 text-sm text-muted-foreground"
      >
        <Link href="/about/" className="hover:text-grove hover:underline">{t("About us")}</Link>
        <Link href="/donate/" className="hover:text-grove hover:underline">{t("Donate")}</Link>
        <Link href="/privacy/" className="hover:text-grove hover:underline">{t("Privacy policy")}</Link>
      </nav>
    </footer>
  )
}
