"use client"

import Link from "next/link"
import { WifiOff } from "lucide-react"
import { useCanDownload, useOnline } from "@/components/offline/use-offline"
import { useT } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/** Says what still works while the phone has no connection. Hidden when online. */
export function OfflineNotice({ className }: { className?: string }) {
  const { t } = useT()
  const online = useOnline()
  const app = useCanDownload()
  if (online) return null
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border border-gold/60 bg-secondary px-4 py-3 text-sm", className)}>
      <WifiOff className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden />
      <p className="min-w-0 flex-1 leading-6 text-ink">
        {app
          ? t("You are offline. The Quran and its translations still work, and so does everything you have downloaded.")
          : t("You are offline. Pages you have already opened may still work.")}{" "}
        {app ? (
          <Link href="/quran/offline/" className="font-medium text-grove underline underline-offset-2">
            {t("Downloads")}
          </Link>
        ) : null}
      </p>
    </div>
  )
}
