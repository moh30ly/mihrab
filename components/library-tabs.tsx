"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/quran/", label: "Quran", match: "/quran" },
  { href: "/hifz/", label: "Memorize", match: "/hifz" },
  { href: "/hadith/", label: "Hadith", match: "/hadith" },
]

/** Switches between the Quran, memorisation and the hadith collections, which share the Quran tab. */
export function LibraryTabs({ className }: { className?: string }) {
  const pathname = usePathname() ?? ""
  const { t } = useT()
  return (
    <nav aria-label={t("Library")} className={cn("mx-auto flex w-fit gap-1 rounded-full border border-gold/50 bg-card p-1", className)}>
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.match)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-5 text-sm font-medium",
              active ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
            )}
          >
            {t(tab.label)}
          </Link>
        )
      })}
    </nav>
  )
}
