"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"
import { HIFZ_KEY, HIFZ_LAST_KEY, parseProgress, type Progress } from "@/lib/hifz"

// Progress lives in localStorage; this event tells other components on the same page that it changed.
const CHANGED = "mihrab:hifz-changed"

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
    // Private windows may refuse storage; practice still works, it just isn't kept.
  }
  window.dispatchEvent(new Event(CHANGED))
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(CHANGED, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(CHANGED, callback)
  }
}

export function useHifzProgress() {
  const raw = useSyncExternalStore(subscribe, () => read(HIFZ_KEY), () => null)
  const progress = useMemo(() => parseProgress(raw), [raw])
  const update = useCallback((fn: (p: Progress) => Progress) => {
    write(HIFZ_KEY, fn(parseProgress(read(HIFZ_KEY))))
  }, [])
  return { progress, update }
}

export type LastSession = { surah: number; from: number; to: number; ayah: number }

export function useLastSession(): LastSession | null {
  const raw = useSyncExternalStore(subscribe, () => read(HIFZ_LAST_KEY), () => null)
  return useMemo(() => {
    if (!raw) return null
    try {
      const v = JSON.parse(raw) as LastSession
      return v.surah >= 1 && v.surah <= 114 && v.from >= 1 && v.to >= v.from ? v : null
    } catch {
      return null
    }
  }, [raw])
}

export function saveLastSession(s: LastSession) {
  write(HIFZ_LAST_KEY, s)
}

export function readLastSession(): LastSession | null {
  try {
    const v = JSON.parse(read(HIFZ_LAST_KEY) ?? "null") as LastSession | null
    return v && v.surah >= 1 && v.from >= 1 && v.to >= v.from ? v : null
  } catch {
    return null
  }
}
