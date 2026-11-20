"use client"

import { useSyncExternalStore } from "react"
import { getOfflineState, getServerOfflineState, offlineSupported, subscribeOffline, type OfflineState } from "@/lib/offline"

/** The downloads kept on the phone, and those in progress. */
export function useOfflineState(): OfflineState {
  return useSyncExternalStore(subscribeOffline, getOfflineState, getServerOfflineState)
}

function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn)
  window.addEventListener("offline", fn)
  return () => {
    window.removeEventListener("online", fn)
    window.removeEventListener("offline", fn)
  }
}

/** False while the device has no connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}

/** "12 MB", "1.4 GB", "820 KB", in the reader's language. */
export function formatBytes(bytes: number, locale: string): string {
  const units = ["kilobyte", "megabyte", "gigabyte"] as const
  let value = bytes / 1024
  let i = 0
  while (value >= 1000 && i < units.length - 1) {
    value /= 1024
    i++
  }
  const digits = value < 10 && i > 0 ? 1 : 0
  try {
    return new Intl.NumberFormat(locale, { style: "unit", unit: units[i], unitDisplay: "short", maximumFractionDigits: digits }).format(value)
  } catch {
    return `${value.toFixed(digits)} ${["KB", "MB", "GB"][i]}`
  }
}

const noop = () => () => {}

/** True in the Android app, which can keep downloads; false on the website and while rendering the page. */
export function useCanDownload(): boolean {
  return useSyncExternalStore(noop, offlineSupported, () => false)
}
