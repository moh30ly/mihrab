"use client"

import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NOTE_MAX, deleteNote, noteId, saveNote, useNotes } from "@/lib/quran-notes"
import { surahById } from "@/lib/quran-index"
import { useT } from "@/lib/i18n"

/** Writes, edits or deletes the reader's own note on one ayah. */
export function NoteSheet({
  surahId,
  ayah,
  arabic,
  onClose,
}: {
  surahId: number
  ayah: number | null
  arabic: string | null
  onClose: () => void
}) {
  const { t, dir } = useT()
  const notes = useNotes()
  const existing = ayah ? notes[noteId(surahId, ayah)] : undefined
  const [text, setText] = useState("")

  useEffect(() => {
    // Start from the saved note each time the sheet opens on an ayah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ayah !== null) setText(existing?.text ?? "")
    // Only a new ayah resets the draft, not a save from another tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ayah, surahId])

  const surah = surahById(surahId)
  const save = () => {
    if (ayah === null) return
    saveNote(surahId, ayah, text)
    onClose()
  }
  const remove = () => {
    if (ayah === null) return
    deleteNote(surahId, ayah)
    onClose()
  }

  return (
    <Sheet open={ayah !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] w-full max-w-3xl gap-0 rounded-t-[1.5rem] border-gold/50 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="border-b border-border pr-12 pl-4">
          <SheetTitle className="font-heading text-xl text-grove">
            {existing ? t("Edit note") : t("Add a note")} · {surah?.transliteration} {surahId}:{ayah}
          </SheetTitle>
          <SheetDescription className="text-xs">{t("Notes are kept on this device only.")}</SheetDescription>
        </SheetHeader>
        <form
          className="overflow-y-auto px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          {arabic ? (
            <p lang="ar" dir="rtl" className="quran-text line-clamp-4 text-[1.4rem] text-ink">
              {arabic}
            </p>
          ) : null}
          <label className="mt-3 block">
            <span className="sr-only">{t("Your note")}</span>
            <textarea
              value={text}
              dir="auto"
              autoFocus
              maxLength={NOTE_MAX}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  save()
                }
              }}
              placeholder={t("What did this ayah make you think of?")}
              rows={6}
              className="w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 text-base leading-7 text-ink outline-none focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/40"
              style={{ textAlign: dir === "rtl" ? "right" : undefined }}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="submit" className="h-11 px-5" disabled={!text.trim() && !existing}>
              {t("Save note")}
            </Button>
            <Button type="button" variant="outline" className="h-11 px-5" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <span className="flex-1" />
            {existing ? (
              <Button type="button" variant="ghost" className="h-11 gap-1.5 px-3 text-destructive" onClick={remove}>
                <Trash2 className="size-4" aria-hidden />
                {t("Delete note")}
              </Button>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
