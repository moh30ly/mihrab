"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { NotebookPen, Pencil, Search, Trash2 } from "lucide-react"
import { StarBadge } from "@/components/ornament"
import { NoteSheet } from "@/components/quran/note-sheet"
import { Input } from "@/components/ui/input"
import { surahById } from "@/lib/quran-index"
import { deleteNote, sortNotes, useNotes, type AyahNote } from "@/lib/quran-notes"
import { useT } from "@/lib/i18n"

/** Every note the reader has written, in the order of the mushaf. */
export function NotesList() {
  const { t, locale } = useT()
  const notes = useNotes()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<AyahNote | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const all = useMemo(() => sortNotes(notes), [notes])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((n) => {
      const s = surahById(n.surah)
      return (
        n.text.toLowerCase().includes(q) ||
        `${n.surah}:${n.ayah}` === q ||
        s?.transliteration.toLowerCase().includes(q) ||
        s?.name.includes(query.trim())
      )
    })
  }, [all, query])
  const date = (ms: number) =>
    ms ? new Date(ms).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" }) : ""

  if (all.length === 0) {
    return (
      <div className="andalus-card mt-6 px-6 py-8 text-center">
        <NotebookPen className="mx-auto size-8 text-brass" aria-hidden />
        <p className="mt-3 font-heading text-xl text-grove">{t("No notes yet")}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("While reading, tap Note under an ayah (or tap the ayah in Book mode) to write your own reflection.")}
        </p>
        <Link href="/quran/" className="mt-4 inline-flex h-11 items-center rounded-full bg-grove px-5 text-sm font-medium text-[#f6f1e6]">
          {t("Open the Quran")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <label className="relative block">
        <span className="sr-only">{t("Search notes")}</span>
        <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search notes")}
          className="h-12 rounded-full bg-card ps-10 text-base"
        />
      </label>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {all.length === 1 ? t("1 note") : t("{n} notes", { n: all.length })} · {t("Notes are kept on this device only.")}
      </p>
      <ol className="mt-3 grid gap-3">
        {shown.map((n) => {
          const s = surahById(n.surah)
          const id = `${n.surah}:${n.ayah}`
          return (
            <li key={id} className="andalus-card px-4 py-3">
              <div className="flex items-center gap-3">
                <StarBadge>{n.surah}</StarBadge>
                <Link href={`/quran/${n.surah}/#ayah-${n.ayah}`} className="min-w-0 flex-1 hover:text-grove">
                  <span className="block truncate font-medium text-ink">
                    {t("{surah}, ayah {n}", { surah: s?.transliteration ?? n.surah, n: n.ayah })}
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{date(n.updated)}</span>
                </Link>
                <span lang="ar" dir="rtl" className="shrink-0 font-quran text-xl text-grove">
                  {s?.name}
                </span>
              </div>
              <p dir="auto" className="mt-2 text-sm leading-6 whitespace-pre-line text-ink">
                {n.text}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <Link
                  href={`/quran/${n.surah}/#ayah-${n.ayah}`}
                  className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-brass hover:bg-secondary"
                >
                  {t("Go to ayah")}
                </Link>
                <button
                  type="button"
                  onClick={() => setEditing(n)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-brass hover:bg-secondary"
                >
                  <Pencil className="size-4" aria-hidden />
                  {t("Edit note")}
                </button>
                <span className="flex-1" />
                {confirm === id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        deleteNote(n.surah, n.ayah)
                        setConfirm(null)
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-destructive px-3 text-sm font-medium text-white"
                    >
                      {t("Delete note")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirm(null)}
                      className="inline-flex h-9 items-center rounded-full px-3 text-sm text-muted-foreground hover:bg-secondary"
                    >
                      {t("Cancel")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm(id)}
                    aria-label={t("Delete note")}
                    className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {shown.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t("No note matches “{query}”.", { query })}</p>
      ) : null}
      <NoteSheet surahId={editing?.surah ?? 1} ayah={editing?.ayah ?? null} arabic={null} onClose={() => setEditing(null)} />
    </div>
  )
}
