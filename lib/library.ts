// The tafsir and hadith collections are large, so they are not part of the
// app's bundle. scripts/fetch-library.mjs writes them as small static JSON
// files under /library/ on mihrab.live, and the app fetches only the piece a
// reader opens. The website reads them from its own origin; the Android app,
// whose pages are served from the device, reads them from mihrab.live.
import { Capacitor } from "@capacitor/core"

export const LIBRARY_ORIGIN = "https://mihrab.live"

/**
 * Books that the Android workflows bundle inside the app (see
 * scripts/fetch-library.mjs), so they open without a connection.
 */
export const OFFLINE_BOOKS = ["irab-muyassar"]

export function isBundled(path: string): boolean {
  return OFFLINE_BOOKS.some((id) => path.startsWith(`tafsir/${id}/`))
}

export function libraryUrl(path: string, local = false): string {
  const base = Capacitor.isNativePlatform() && !local ? LIBRARY_ORIGIN : ""
  return `${base}/library/${path}`
}

async function getJson<T>(url: string, path: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
  return (await r.json()) as T
}

/** Reads a bundled file from the app itself, falling back to mihrab.live for a build without it. */
async function load<T>(path: string): Promise<T> {
  if (Capacitor.isNativePlatform() && isBundled(path)) {
    try {
      return await getJson<T>(libraryUrl(path, true), path)
    } catch {
      // A local build made without the bundled books reads them online.
    }
  }
  return getJson<T>(libraryUrl(path), path)
}

const cache = new Map<string, Promise<unknown>>()

/** Fetches one library file once per page load; a failed request can be retried. */
export function fetchLibrary<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined
  if (!p) {
    p = load<T>(path)
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p
}
