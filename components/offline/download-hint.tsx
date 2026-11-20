"use client"

import Link from "next/link"
import { useCanDownload } from "@/components/offline/use-offline"
import { useT } from "@/lib/i18n"

/** After a load fails: points the reader of the Android app to the downloads page. */
export function DownloadHint({ kind = "book" }: { kind?: "book" | "audio" }) {
  const { t } = useT()
  const app = useCanDownload()
  if (!app) return null
  return (
    <Link href="/quran/offline/" className="mt-1 block text-sm font-medium text-grove underline underline-offset-2">
      {kind === "audio" ? t("Download this surah to listen without a connection.") : t("Download this book to read it without a connection.")}
    </Link>
  )
}
