"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Compass, Globe, HandHeart } from "lucide-react"
import { useT } from "@/lib/i18n"
import { LOCALES, type Locale } from "@/lib/i18n/locales"
import { setLocale } from "@/lib/i18n/store"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Prayer", icon: Compass, match: (p: string) => !p.startsWith("/quran") && !p.startsWith("/athkar") },
  { href: "/quran/", label: "Quran", icon: BookOpen, match: (p: string) => p.startsWith("/quran") },
  { href: "/athkar/", label: "Athkar", icon: HandHeart, match: (p: string) => p.startsWith("/athkar") },
]

export function SiteNav() {
  const pathname = usePathname() ?? "/"
  const { t, locale } = useT()
  return (
    <nav aria-label={t("Main")} className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href="/" className="hidden font-heading text-lg text-grove sm:block">
          Mihrab
        </Link>
        <ul className="flex min-w-0 gap-0.5 sm:gap-1">
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-4",
                    active ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(label)}
                </Link>
              </li>
            )
          })}
        </ul>
        <label className="relative inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-card ps-2.5 pe-1 text-sm text-ink">
          <Globe className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">{t("Language")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-full max-w-20 cursor-pointer sm:max-w-28 appearance-none bg-transparent ps-1.5 pe-1 text-sm outline-none"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </nav>
  )
}
