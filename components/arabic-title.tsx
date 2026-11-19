"use client"

import { useLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** The Arabic name over a page title, left out when the interface is already in Arabic. */
export function ArabicTitle({ children, className }: { children: string; className?: string }) {
  if (useLocale() === "ar") return null
  return (
    <p lang="ar" dir="rtl" className={cn("font-arabic text-3xl text-brass", className)}>
      {children}
    </p>
  )
}
