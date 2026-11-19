import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ArabicTitle } from "@/components/arabic-title"
import { Frieze } from "@/components/ornament"
import { Sibha } from "@/components/sibha"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Electronic sibha (tasbih counter)",
  description:
    "A tasbih counter for SubhanAllah, Alhamdulillah, Allahu Akbar, istighfar and more, with targets of 33, 99 or your own number, the 33·33·34 after prayer, and vibration.",
  alternates: { canonical: "/sibha/" },
}

export default function SibhaPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <p className="text-sm">
        <Link href="/athkar/" className="inline-flex items-center gap-1 text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          <T k="Athkar" />
        </Link>
      </p>
      <header className="text-center">
        <ArabicTitle>السبحة الإلكترونية</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">
          <T k="Sibha" />
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="Tap the circle for each dhikr. Your count is kept on this device." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <Sibha />
    </main>
  )
}
