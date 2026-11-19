// The tafsir and hadith collections are large, so they are not part of the
// app's bundle. scripts/fetch-library.mjs writes them as small static JSON
// files under /library/ on mihrab.live, and the app fetches only the piece a
// reader opens. The website reads them from its own origin; the Android app,
// whose pages are served from the device, reads them from mihrab.live.
import { Capacitor } from "@capacitor/core"

export const LIBRARY_ORIGIN = "https://mihrab.live"

export function libraryUrl(path: string): string {
  const base = Capacitor.isNativePlatform() ? LIBRARY_ORIGIN : ""
  return `${base}/library/${path}`
}

const cache = new Map<string, Promise<unknown>>()

/** Fetches one library file once per page load; a failed request can be retried. */
export function fetchLibrary<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined
  if (!p) {
    p = fetch(libraryUrl(path)).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}
