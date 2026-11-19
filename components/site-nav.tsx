"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Prayer & Qibla", icon: Compass, match: (p: string) => !p.startsWith("/quran") },
  { href: "/quran/", label: "Quran", icon: BookOpen, match: (p: string) => p.startsWith("/quran") },
]

export function SiteNav() {
  const pathname = usePathname() ?? "/"
  return (
    <nav aria-label="Main" className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Link href="/" className="font-heading text-lg text-grove">
          Mihrab
        </Link>
        <ul className="flex gap-1">
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                    active ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
