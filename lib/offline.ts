"use client"

// Keeps books and recitations on the phone, so they work without a connection.
// The Quran's text and its translations are part of the app and always work
// offline; this is for what is too large to ship with it: the tafsir and i‘rab
// books, the hadith collections, and the reciters' audio, surah by surah.
//
// Only the Android app can keep files (through the MihrabOffline plugin,
// android/.../offline/OfflinePlugin.java). Each download is a "pack": one folder
// per book (library/tafsir/<id>, library/hadith/<id>) or per surah of a reciter
// (audio/<reciter>/<surah>). The list of complete packs is remembered in
// localStorage, so the reader can find a downloaded file without waiting.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { LIBRARY_ORIGIN } from "@/lib/library"
import { ayahAudioUrl, hasSeparateBasmala, type Reciter } from "@/lib/recitation"
import { surahById } from "@/lib/quran-index"
import recitationSizes from "@/data/recitation-sizes.json"

type Item = { url: string; file: string }
type Progress = { id: string; done: number; total: number; bytes: number }

type NativeOffline = {
  info(): Promise<{ root: string; free: number }>
  packs(): Promise<{ packs: { path: string; bytes: number }[] }>
  download(options: { id: string; path: string; items: Item[] }): Promise<{ bytes: number }>
  cancel(options: { id: string }): Promise<void>
  remove(options: { path: string }): Promise<void>
  addListener(event: "progress", fn: (e: Progress) => void): Promise<PluginListenerHandle>
}

const Native = registerPlugin<NativeOffline>("MihrabOffline")

const STORE_KEY = "mihrab:offline"

export type JobState =
  | { status: "queued" }
  | { status: "downloading"; done: number; total: number; bytes: number }
  | { status: "error"; reason: "network" | "storage" | "other" }

export type OfflineState = {
  /** The offline folder on the phone; empty until the app has told us. */
  root: string
  /** Complete packs and their size in bytes. */
  packs: Record<string, number>
  /** Downloads waiting, running or failed, by pack path. */
  jobs: Record<string, JobState>
  /** Free space on the phone, in bytes, when known. */
  free: number | null
}

export function offlineSupported(): boolean {
  return Capacitor.isNativePlatform()
}

// ---- State ------------------------------------------------------------------

let state: OfflineState = { root: "", packs: {}, jobs: {}, free: null }
let loaded = false
const listeners = new Set<() => void>()

function emit(next: Partial<OfflineState>) {
  state = { ...state, ...next }
  for (const fn of listeners) fn()
}

function saveStore() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify({ root: state.root, packs: state.packs }))
  } catch {
    // Not kept in private windows.
  }
}

function loadStore() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const v = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Partial<OfflineState>
    state = { ...state, root: typeof v.root === "string" ? v.root : "", packs: v.packs && typeof v.packs === "object" ? v.packs : {} }
  } catch {
    // Start empty.
  }
  if (offlineSupported()) void refreshOffline()
}

export function subscribeOffline(fn: () => void) {
  loadStore()
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getOfflineState(): OfflineState {
  loadStore()
  return state
}

const SERVER_STATE: OfflineState = { root: "", packs: {}, jobs: {}, free: null }
export function getServerOfflineState(): OfflineState {
  return SERVER_STATE
}

/** Reads the complete packs from the phone itself, which is the truth (for example after a restore). */
export async function refreshOffline(): Promise<void> {
  if (!offlineSupported()) return
  try {
    const [info, list] = await Promise.all([Native.info(), Native.packs()])
    emit({ root: info.root, free: info.free, packs: Object.fromEntries(list.packs.map((p) => [p.path, p.bytes])) })
    saveStore()
  } catch {
    // An app built before the plugin existed: nothing is kept offline.
  }
}

export function isDownloaded(path: string): boolean {
  return getOfflineState().packs[path] != null
}

/** The address the web view reads a downloaded file from. */
export function localUrl(path: string): string | null {
  const { root } = getOfflineState()
  if (!root) return null
  return Capacitor.convertFileSrc(`file://${root}/${path}`)
}

// ---- Packs ------------------------------------------------------------------

export type LibraryKind = "tafsir" | "hadith"

export const bookPack = (kind: LibraryKind, id: string) => `library/${kind}/${id}`
export const audioPack = (reciter: Reciter, surah: number) => `audio/${reciter.id}/${surah}`

/** The book a library file belongs to: "tafsir/saadi/2/0.json" → "library/tafsir/saadi". */
export function packOfLibraryPath(path: string): string | null {
  const m = /^(tafsir|hadith)\/([\w-]+)\//.exec(path)
  return m ? `library/${m[1]}/${m[2]}` : null
}

/** A downloaded copy of a library file, or null to read it online. */
export function localLibraryUrl(path: string): string | null {
  const pack = packOfLibraryPath(path)
  return pack && isDownloaded(pack) ? localUrl(`library/${path}`) : null
}

const audioFile = (ayah: number) => `${ayah}.mp3`

/** Where to play an ayah from: the downloaded file first, then EveryAyah. Ayah 0 is the basmala. */
export function ayahSources(reciter: Reciter, surah: number, ayah: number): string[] {
  const online = ayahAudioUrl(reciter, surah, ayah)
  const pack = audioPack(reciter, surah)
  const local = offlineSupported() && isDownloaded(pack) ? localUrl(`${pack}/${audioFile(ayah)}`) : null
  return local ? [local, online] : [online]
}

/** Approximate size of one surah's recitation, in bytes, from EveryAyah's listing. */
export function audioSize(reciter: Reciter, surah: number): number {
  const sizes = (recitationSizes as Record<string, number[]>)[reciter.folder]
  const kb = sizes?.[surah - 1] ?? 0
  // The basmala is downloaded with each surah; about one seventh of Al-Fatihah.
  const basmala = hasSeparateBasmala(surah) && sizes ? sizes[0] / 7 : 0
  return Math.round((kb + basmala) * 1024)
}

export function totalAudioSize(reciter: Reciter): number {
  let total = 0
  for (let s = 1; s <= 114; s++) total += audioSize(reciter, s)
  return total
}

function audioItems(reciter: Reciter, surah: number): Item[] {
  const info = surahById(surah)
  if (!info) return []
  const ayahs = Array.from({ length: info.verses }, (_, i) => i + 1)
  if (hasSeparateBasmala(surah)) ayahs.unshift(0)
  return ayahs.map((a) => ({ url: ayahAudioUrl(reciter, surah, a), file: audioFile(a) }))
}

async function libraryItems(kind: LibraryKind, id: string): Promise<Item[]> {
  const base = `${LIBRARY_ORIGIN}/library/${kind}/${id}/`
  const r = await fetch(`${base}files.json`, { cache: "no-store" })
  if (!r.ok) throw new Error(`files.json: HTTP ${r.status}`)
  const files = (await r.json()) as string[]
  return files.map((f) => ({ url: base + f, file: f }))
}

export type BookSizes = Record<string, { files: number; bytes: number }>

let manifest: Promise<BookSizes> | null = null
/** The size of every book, from mihrab.live; empty when offline. */
export function bookSizes(): Promise<BookSizes> {
  manifest ??= fetch(`${LIBRARY_ORIGIN}/library/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<BookSizes>) : {}))
    .catch(() => {
      manifest = null
      return {}
    })
  return manifest
}

// ---- Downloads ----------------------------------------------------------------

type Request = { path: string; items: () => Promise<Item[]> }
const queue: Request[] = []
let running: string | null = null
let progressHandle: Promise<PluginListenerHandle> | null = null

function setJob(path: string, job: JobState | null) {
  const jobs = { ...state.jobs }
  if (job) jobs[path] = job
  else delete jobs[path]
  emit({ jobs })
}

function enqueue(req: Request) {
  if (state.packs[req.path] != null) return
  const job = state.jobs[req.path]
  if (job && job.status !== "error") return
  queue.push(req)
  setJob(req.path, { status: "queued" })
  void pump()
}

async function pump() {
  if (running) return
  const next = queue.shift()
  if (!next) return
  running = next.path
  progressHandle ??= Native.addListener("progress", (p) => {
    if (p.id === running) setJob(p.id, { status: "downloading", done: p.done, total: p.total, bytes: p.bytes })
  })
  try {
    await progressHandle
    setJob(next.path, { status: "downloading", done: 0, total: 0, bytes: 0 })
    const items = await next.items()
    const { bytes } = await Native.download({ id: next.path, path: next.path, items })
    if (!state.root) {
      const info = await Native.info()
      emit({ root: info.root, free: info.free })
    }
    emit({ packs: { ...state.packs, [next.path]: bytes } })
    saveStore()
    setJob(next.path, null)
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code === "cancelled") setJob(next.path, null)
    else setJob(next.path, { status: "error", reason: code === "storage" ? "storage" : code === "network" ? "network" : navigator.onLine ? "other" : "network" })
  } finally {
    running = null
    void pump()
  }
}

/** Downloads any set of files into one pack. */
export function downloadPack(path: string, items: () => Promise<Item[]>) {
  enqueue({ path, items })
}

export function downloadBook(kind: LibraryKind, id: string) {
  enqueue({ path: bookPack(kind, id), items: () => libraryItems(kind, id) })
}

export function downloadSurahAudio(reciter: Reciter, surah: number) {
  enqueue({ path: audioPack(reciter, surah), items: async () => audioItems(reciter, surah) })
}

export function downloadAllAudio(reciter: Reciter) {
  for (let s = 1; s <= 114; s++) downloadSurahAudio(reciter, s)
}

/** Stops a download, or takes it off the queue. */
export async function cancelDownload(path: string) {
  const i = queue.findIndex((q) => q.path === path)
  if (i >= 0) {
    queue.splice(i, 1)
    setJob(path, null)
  } else if (running === path) {
    await Native.cancel({ id: path }).catch(() => {})
  } else {
    setJob(path, null)
  }
}

/** Stops every queued and running download whose path starts with `prefix`. */
export async function cancelAll(prefix: string) {
  for (const q of queue.filter((q) => q.path.startsWith(prefix))) await cancelDownload(q.path)
  if (running?.startsWith(prefix)) await cancelDownload(running)
}

export async function removePack(path: string) {
  await cancelDownload(path)
  const packs = { ...state.packs }
  delete packs[path]
  emit({ packs })
  saveStore()
  await Native.remove({ path }).catch(() => {})
  void refreshOffline()
}

export async function removeAllAudio(reciter: Reciter) {
  await cancelAll(`audio/${reciter.id}/`)
  const packs = Object.fromEntries(Object.entries(state.packs).filter(([p]) => !p.startsWith(`audio/${reciter.id}/`)))
  emit({ packs })
  saveStore()
  await Native.remove({ path: `audio/${reciter.id}` }).catch(() => {})
  void refreshOffline()
}

/** Bytes used by downloads whose path starts with `prefix`. */
export function usedBytes(s: OfflineState, prefix = ""): number {
  let total = 0
  for (const [p, b] of Object.entries(s.packs)) if (p.startsWith(prefix)) total += b
  return total
}

export function downloadedSurahs(s: OfflineState, reciter: Reciter): number {
  return Object.keys(s.packs).filter((p) => p.startsWith(`audio/${reciter.id}/`)).length
}

