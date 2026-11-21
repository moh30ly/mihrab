"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Globe, HandHeart } from "lucide-react"
import { GivingIcon, MihrabIcon, QiblaIcon, QuranIcon, TasbihIcon } from "@/components/nav-icons"
import { useT } from "@/lib/i18n"
import { LOCALES, type Locale } from "@/lib/i18n/locales"
import { setLocale } from "@/lib/i18n/store"
import { PALETTE as P, star8 } from "@/lib/art"
import { cn } from "@/lib/utils"

const SECTIONS = ["/qibla", "/quran", "/hifz", "/hadith", "/athkar", "/sibha", "/sadaqah"]

const LINKS = [
  { href: "/", label: "Prayer", icon: MihrabIcon, match: (p: string) => !SECTIONS.some((s) => p.startsWith(s)) },
  { href: "/qibla/", label: "Qibla", icon: QiblaIcon, match: (p: string) => p.startsWith("/qibla") },
  { href: "/quran/", label: "Quran", icon: QuranIcon, match: (p: string) => p.startsWith("/quran") || p.startsWith("/hifz") || p.startsWith("/hadith") },
  { href: "/athkar/", label: "Athkar", icon: TasbihIcon, match: (p: string) => p.startsWith("/athkar") || p.startsWith("/sibha") },
  { href: "/sadaqah/", label: "Sadaqah", icon: GivingIcon, match: (p: string) => p.startsWith("/sadaqah") },
]

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill={P.oxblood} />
      <path d="M9.2 27V15.6A6.8 6.8 0 1 1 22.8 15.6V27Z" fill={P.teal} stroke={P.gold} strokeWidth="1.6" />
      <path d="M7.4 15.6A8.6 8.6 0 1 1 24.6 15.6" fill="none" stroke={P.stone} strokeWidth="1.8" strokeDasharray="2.6 2.2" />
      <path d={star8(16, 14.2, 3.6, 0.7)} fill={P.goldBright} />
      <path d="M6 27h20" stroke={P.gold} strokeWidth="1.8" />
    </svg>
  )
}

export function SiteNav() {
  const pathname = usePathname() ?? "/"
  const { t, locale } = useT()
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gold/40 bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BrandMark />
            <span className="font-heading text-xl text-grove">Mihrab</span>
            <span lang="ar" dir="rtl" className="font-arabic text-lg text-brass">
              محراب
            </span>
          </Link>
          <div className="flex items-center gap-2">
          <Link
            href="/donate/"
            aria-label={t("Donate")}
            title={t("Donate")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-grove hover:bg-accent"
          >
            <HandHeart className="size-5" aria-hidden />
          </Link>
          <label className="relative inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-card ps-2.5 pe-1 text-sm text-ink">
            <Globe className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">{t("Language")}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="h-full max-w-24 cursor-pointer appearance-none bg-transparent ps-1.5 pe-1 text-sm outline-none sm:max-w-28"
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          </div>
        </div>
      </header>

      <nav
        aria-label={t("Main")}
        className="fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(180deg,#7a2819,#4a150d)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgba(63,18,11,0.6)]"
      >
        <div aria-hidden className="frieze-thin absolute inset-x-0 -top-[13px]" />
        <ul className="mx-auto grid h-[4.25rem] max-w-xl grid-cols-5 px-1">
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <li key={href} className="min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-[0.7rem] leading-tight font-medium transition-colors",
                    active ? "text-brass-bright" : "text-[#f4e6c8]/80 hover:text-[#f4e6c8]",
                  )}
                >
                  <span className="relative grid h-9 w-12 place-items-center">
                    <svg
                      viewBox="0 0 48 36"
                      aria-hidden
                      className={cn("absolute inset-0 transition-opacity", active ? "opacity-100" : "opacity-0")}
                    >
                      <path
                        d="M10 36V19.5A14 14 0 1 1 38 19.5V36"
                        fill="rgba(236,201,122,0.16)"
                        stroke={P.goldBright}
                        strokeOpacity="0.85"
                        strokeWidth="1.2"
                      />
                    </svg>
                    <Icon className="relative mt-1 size-6" />
                  </span>
                  <span className="max-w-full truncate">{t(label)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
