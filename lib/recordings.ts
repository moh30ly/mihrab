"use client"

// Records the person's own recitation on the memorisation page so they can listen back,
// and keeps the latest take for each ayah (or range) in IndexedDB on this device only.
// The microphone is released as soon as recording stops, so the checker can use it next.

const DB = "mihrab-hifz"
const STORE = "recordings"

export type Recorder = { stop: () => Promise<Blob | null>; cancel: () => void }

export function canRecord(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"
}

function pickType(): string | undefined {
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return undefined
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const type = pickType()
  const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const release = () => stream.getTracks().forEach((t) => t.stop())
  rec.start(500)
  return {
    stop: () =>
      new Promise((resolve) => {
        if (rec.state === "inactive") {
          release()
          return resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || type }) : null)
        }
        rec.onstop = () => {
          release()
          resolve(chunks.length ? new Blob(chunks, { type: rec.mimeType || type }) : null)
        }
        rec.stop()
      }),
    cancel: () => {
      try {
        rec.stop()
      } catch {
        // Already stopped.
      }
      release()
    },
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open()
    return await new Promise<T | null>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve((req.result as T) ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    // Private windows may refuse IndexedDB; the take still plays until the page closes.
    return null
  }
}

export type Take = { blob: Blob; at: number }

export const saveTake = (key: string, blob: Blob) => tx("readwrite", (s) => s.put({ blob, at: Date.now() } satisfies Take, key))
export const loadTake = (key: string) => tx<Take>("readonly", (s) => s.get(key) as IDBRequest<Take>)
export const deleteTake = (key: string) => tx("readwrite", (s) => s.delete(key))
