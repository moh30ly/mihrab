/**
 * Personal notes on ayahs, and the place the reader left off. Both stay on this device in localStorage.
 */
import { useSyncExternalStore } from "react"
import { LAST_READ_KEY, surahById } from "@/lib/quran-index"

export const NOTES_KEY = "mihrab:quran:notes"
export const NOTE_MAX = 4000

export type AyahNote = { surah: number; ayah: number; text: string; updated: number }
export type LastRead = { surah: number; ayah: number; at: number | null }

const CHANGE = "mihrab:quran-store"

export function noteId(surah: number, ayah: number) {
  return `${surah}:${ayah}`
}

function validAyah(surah: unknown, ayah: unknown): boolean {
  if (typeof surah !== "number" || typeof ayah !== "number" || !Number.isInteger(ayah)) return false
  const info = surahById(surah)
  return Boolean(info && ayah >= 1 && ayah <= info.verses)
}

/** Reads the saved notes, dropping anything malformed. Keyed by "surah:ayah". */
export function parseNotes(raw: string | null): Record<string, AyahNote> {
  if (!raw) return {}
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {}
  const out: Record<string, AyahNote> = {}
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue
    const { surah, ayah, text, updated } = value as Partial<AyahNote>
    if (!validAyah(surah, ayah) || typeof text !== "string" || !text.trim()) continue
    out[noteId(surah!, ayah!)] = {
      surah: surah!,
      ayah: ayah!,
      text: text.slice(0, NOTE_MAX),
      updated: typeof updated === "number" ? updated : 0,
    }
  }
  return out
}

/** Adds, replaces or (with empty text) removes one ayah's note. */
export function withNote(notes: Record<string, AyahNote>, surah: number, ayah: number, text: string, now = Date.now()) {
  const next = { ...notes }
  const id = noteId(surah, ayah)
  const clean = text.replace(/\s+$/, "").slice(0, NOTE_MAX)
  if (clean.trim()) next[id] = { surah, ayah, text: clean, updated: now }
  else delete next[id]
  return next
}

/** Notes in the order of the mushaf. */
export function sortNotes(notes: Record<string, AyahNote>): AyahNote[] {
  return Object.values(notes).sort((a, b) => a.surah - b.surah || a.ayah - b.ayah)
}

export function parseLastRead(raw: string | null): LastRead | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<LastRead>
    if (!validAyah(v.surah, v.ayah)) return null
    return { surah: v.surah!, ayah: v.ayah!, at: typeof v.at === "number" ? v.at : null }
  } catch {
    return null
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private windows; reading still works.
  }
  window.dispatchEvent(new Event(CHANGE))
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(CHANGE, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(CHANGE, callback)
  }
}

let notesCache: { raw: string | null; notes: Record<string, AyahNote> } = { raw: null, notes: {} }
const EMPTY: Record<string, AyahNote> = {}

function notesSnapshot() {
  const raw = read(NOTES_KEY)
  if (raw !== notesCache.raw) notesCache = { raw, notes: parseNotes(raw) }
  return notesCache.notes
}

export function useNotes(): Record<string, AyahNote> {
  return useSyncExternalStore(subscribe, notesSnapshot, () => EMPTY)
}

export function saveNote(surah: number, ayah: number, text: string) {
  write(NOTES_KEY, withNote(notesSnapshot(), surah, ayah, text))
}

export function deleteNote(surah: number, ayah: number) {
  saveNote(surah, ayah, "")
}

export function readLastRead(): LastRead | null {
  return parseLastRead(read(LAST_READ_KEY))
}

export function saveLastRead(surah: number, ayah: number) {
  const prev = readLastRead()
  if (prev && prev.surah === surah && prev.ayah === ayah) return
  write(LAST_READ_KEY, { surah, ayah, at: Date.now() })
}

let lastCache: { raw: string | null; value: LastRead | null } = { raw: null, value: null }
function lastSnapshot() {
  const raw = read(LAST_READ_KEY)
  if (raw !== lastCache.raw) lastCache = { raw, value: parseLastRead(raw) }
  return lastCache.value
}

export function useLastRead(): LastRead | null {
  return useSyncExternalStore(subscribe, lastSnapshot, () => null)
}
