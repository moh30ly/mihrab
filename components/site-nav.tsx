"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Compass, HandHeart } from "lucide-react"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Prayer", icon: Compass, match: (p: string) => !p.startsWith("/quran") && !p.startsWith("/athkar") },
  { href: "/quran/", label: "Quran", icon: BookOpen, match: (p: string) => p.startsWith("/quran") },
  { href: "/athkar/", label: "Athkar", icon: HandHeart, match: (p: string) => p.startsWith("/athkar") },
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
                    "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors sm:px-4",
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
