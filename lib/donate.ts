"use client"

import { Capacitor } from "@capacitor/core"

// Sharing recitations to improve Mihrab's checker: strictly opt-in, off by default.
//
// When someone turns it on (components/hifz/donate-recordings.tsx) the device makes a random
// donor id and a delete key, kept only here. After each Recite with Mihrab's own checker, the
// recording, the ayah and what the checker heard are queued in IndexedDB and sent to the
// recordings service (workers/recordings) when online. No name, account, location or device id
// is sent. "Delete what I've shared" removes every clip of that donor id from the service.

/** The recordings service. Sharing is offered only when this is set. */
export const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL ?? "https://mihrab-recordings.moh10ly.workers.dev"

/** Bump when the consent text changes, so people are asked again. */
export const CONSENT_VERSION = 1

const KEY = "mihrab:donate"
const DB = "mihrab-donate"
const STORE = "queue"
const MAX_QUEUE = 40
const MAX_BYTES = 6 * 1024 * 1024
const ASK_AFTER = 3

export type DonateState = {
  on: boolean
  donor?: string
  deleteKey?: string
  consent?: number
  agreedAt?: number
  sent: number
  /** Recitations checked so far, for the one-time ask. */
  recitations: number
  /** The one-time ask was answered (yes or no). */
  asked: boolean
}

const EMPTY: DonateState = { on: false, sent: 0, recitations: 0, asked: false }
const listeners = new Set<() => void>()

/** Only the Android app records with Mihrab's own checker, so only it offers sharing (or a test build with the URL set). */
export function donateAvailable(): boolean {
  if (DONATE_URL === "" || typeof window === "undefined" || typeof indexedDB === "undefined") return false
  return Capacitor.isNativePlatform() || process.env.NEXT_PUBLIC_DONATE_URL !== undefined
}

export function readDonate(): DonateState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<DonateState>) } : EMPTY
  } catch {
    return EMPTY
  }
}

function write(next: DonateState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage refused (private window): sharing just stays off.
  }
  listeners.forEach((l) => l())
}

export function onDonateChange(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

const hex = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("")

/** Turns sharing on after the person agreed to the consent text and confirmed their age. */
export function optIn() {
  const s = readDonate()
  write({ ...s, on: true, asked: true, donor: s.donor ?? hex(), deleteKey: s.deleteKey ?? hex(), consent: CONSENT_VERSION, agreedAt: Date.now() })
  void flush()
}

/** Stops sharing; nothing already queued is sent. Clips already shared stay until deleted. */
export async function optOut() {
  write({ ...readDonate(), on: false, asked: true })
  await clearQueue()
}

export function dismissAsk() {
  write({ ...readDonate(), asked: true })
}

/** True once, after a few recitations, for people who haven't been asked yet. */
export function shouldAsk(s: DonateState = readDonate()): boolean {
  return donateAvailable() && !s.on && !s.asked && s.recitations >= ASK_AFTER
}

/** Deletes every clip this device shared from the service, then forgets the donor id. */
export async function deleteShared(): Promise<number> {
  const s = readDonate()
  await clearQueue()
  if (!s.donor || !s.deleteKey) {
    write({ ...s, on: false, sent: 0 })
    return 0
  }
  const r = await fetch(`${DONATE_URL}/v1/donors/${s.donor}`, { method: "DELETE", headers: { "X-Delete-Key": s.deleteKey } })
  if (!r.ok) throw new Error(`delete failed: ${r.status}`)
  const { deleted } = (await r.json()) as { deleted: number }
  write({ ...readDonate(), on: false, donor: undefined, deleteKey: undefined, sent: 0 })
  return deleted
}

// ---- The queue ----

type Item = { blob: Blob; meta: Record<string, unknown>; at: number }

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open()
    return await new Promise<T | null>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

const clearQueue = () => withStore("readwrite", (s) => s.clear())

export type DonateTake = {
  blob: Blob
  surah: number
  ayahFrom: number
  ayahTo: number
  /** What the checker heard, and its verdict on each expected word. */
  heard: string
  score: number
  statuses: string[]
  /** The person's own verdict, when they gave one. */
  selfConfirmed?: boolean | null
  model?: string
}

/** Counts a checked recitation, and queues it for sharing if the person opted in. */
export async function donateTake(take: DonateTake): Promise<void> {
  if (!donateAvailable()) return
  const s = readDonate()
  write({ ...s, recitations: s.recitations + 1 })
  if (!s.on || s.consent !== CONSENT_VERSION || !s.donor || !s.deleteKey) return
  if (take.blob.size < 1000 || take.blob.size > MAX_BYTES || !take.heard.trim()) return
  const meta = {
    donor: s.donor,
    deleteKey: s.deleteKey,
    surah: take.surah,
    ayahFrom: take.ayahFrom,
    ayahTo: take.ayahTo,
    score: take.score,
    heard: take.heard.slice(0, 4000),
    statuses: take.statuses,
    selfConfirmed: take.selfConfirmed ?? null,
    consent: CONSENT_VERSION,
    adult: true,
    app: process.env.NEXT_PUBLIC_APP_VERSION ?? "web",
    model: take.model ?? "quran-asr",
    seconds: Math.round(((take.blob.size - 44) / 32000) * 10) / 10,
  }
  const count = (await withStore("readonly", (st) => st.count())) ?? 0
  if (count >= MAX_QUEUE) return
  await withStore("readwrite", (st) => st.add({ blob: take.blob, meta, at: Date.now() } satisfies Item))
  void flush()
}

let flushing = false

/** Sends what's queued, oldest first; stops at the first failure and tries again later. */
export async function flush(): Promise<void> {
  if (flushing || !donateAvailable() || !readDonate().on || (typeof navigator !== "undefined" && navigator.onLine === false)) return
  flushing = true
  try {
    const keys = ((await withStore("readonly", (s) => s.getAllKeys())) ?? []) as IDBValidKey[]
    for (const key of keys) {
      if (!readDonate().on) break
      const item = (await withStore("readonly", (s) => s.get(key))) as Item | null
      if (!item) continue
      const form = new FormData()
      form.append("audio", item.blob, "take.wav")
      form.append("meta", JSON.stringify(item.meta))
      let ok = false
      let drop = false
      try {
        const r = await fetch(`${DONATE_URL}/v1/clips`, { method: "POST", body: form })
        ok = r.ok
        // Refused for good (bad data or size): don't retry it forever.
        drop = r.status === 400 || r.status === 413
      } catch {
        break
      }
      if (ok || drop) await withStore("readwrite", (s) => s.delete(key))
      if (ok) {
        const st = readDonate()
        write({ ...st, sent: st.sent + 1 })
      } else if (!drop) break
    }
  } finally {
    flushing = false
  }
}

if (typeof window !== "undefined") window.addEventListener("online", () => void flush())
