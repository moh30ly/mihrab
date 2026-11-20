import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { Frieze } from "@/components/ornament"
import { NotesList } from "@/components/quran/notes-list"
import { T } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "My Quran notes",
  description: "Your own notes on the ayahs of the Quran, kept on this device.",
  alternates: { canonical: "/quran/notes/" },
  robots: { index: false },
}

export default function NotesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <Link href="/quran/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-grove">
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> <T k="All surahs" />
      </Link>
      <header className="mt-4 text-center">
        <h1 className="font-heading text-4xl tracking-tight text-grove">
          <T k="My notes" />
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          <T k="Your reflections on the ayahs you have read." />
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />
      <NotesList />
    </main>
  )
}
