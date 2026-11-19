// Writes the tafsir collections (and, later, other large texts) as small
// static JSON files under <out>/library/, which the app fetches on demand.
// They are not committed: the website workflow runs this after `next build`
// with `out` as the target, so they ship with mihrab.live but not inside the
// Android app, which reads them from mihrab.live.
//
// Downloads are pinned to a release and cached in .cache/library/, so a
// second run works offline. The texts are written unchanged.
//
// Usage: node scripts/fetch-library.mjs [out-dir]   (default: public, for `npm run dev`)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const root = process.cwd()
const outDir = join(root, process.argv[2] ?? "public", "library")
const cacheDir = join(root, ".cache", "library")

/** Fetches a URL once and keeps it in the cache folder. */
async function cached(name, url) {
  const file = join(cacheDir, name)
  if (existsSync(file)) return readFileSync(file, "utf8")
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, text)
      return text
    } catch (err) {
      if (attempt === 4) throw new Error(`${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
    }
  }
}

/** Runs `fn` over `items` with a few requests at a time. */
async function pool(items, size, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i], i)
      }
    }),
  )
  return results
}

function write(path, value) {
  const file = join(outDir, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(value))
}

const surahs = JSON.parse(readFileSync(join(root, "data", "quran", "surahs.json"), "utf8"))

// ---- Tafsir -----------------------------------------------------------------
// spa5k/tafsir_api (MIT): https://github.com/spa5k/tafsir_api
const TAFSIR_RELEASE = "v1.2.3"
const TAFSIR_CHUNK = 10

async function tafsir() {
  const src = readFileSync(join(root, "lib", "tafsir.ts"), "utf8")
  const list = [...src.matchAll(/^\s*id: "([\w-]+)",[\s\S]*?slug: "([\w-]+)"/gm)].map((m) => [m[1], m[2]])
  for (const m of src.matchAll(/mukhtasar\("(\w+)", "[^"]*", "([\w-]+)"/g)) list.push([`mukhtasar-${m[1]}`, m[2]])
  if (list.length < 2) throw new Error("No tafsir editions found in lib/tafsir.ts")

  // Ayahs the dataset left empty on purpose because the source attaches the
  // wrong commentary to them; these must not point back to an earlier ayah.
  const errorsUrl = `https://raw.githubusercontent.com/spa5k/tafsir_api/${TAFSIR_RELEASE}/data/known_source_errors.json`
  const knownErrors = JSON.parse(await cached(`tafsir/${TAFSIR_RELEASE}/known_source_errors.json`, errorsUrl))
  const noText = (slug, surah, ayah) =>
    knownErrors.some((e) => e.slugs.includes(slug) && e.ayahs.includes(`${surah}:${ayah}`))

  rmSync(join(outDir, "tafsir"), { recursive: true, force: true })
  for (const [id, slug] of list) {
    let chars = 0
    await pool(surahs, 8, async (s) => {
      const url = `https://raw.githubusercontent.com/spa5k/tafsir_api/${TAFSIR_RELEASE}/tafsir/${slug}/${s.id}.json`
      const rows = JSON.parse(await cached(`tafsir/${TAFSIR_RELEASE}/${slug}/${s.id}.json`, url))
      const byAyah = new Map()
      for (const r of rows) {
        if (r.surah !== s.id) throw new Error(`${slug} ${s.id}: row for surah ${r.surah}`)
        const text = String(r.text ?? "").trim()
        if (text) byAyah.set(r.ayah, text)
      }
      // An ayah without its own text is explained together with an earlier one;
      // 0 marks an ayah with no commentary at all.
      const entries = []
      let last = null
      for (let ayah = 1; ayah <= s.verses; ayah++) {
        if (byAyah.has(ayah)) {
          entries.push(byAyah.get(ayah))
          chars += byAyah.get(ayah).length
          last = ayah
        } else if (noText(slug, s.id, ayah)) {
          entries.push(0)
        } else {
          entries.push(last ?? 0)
        }
      }
      for (let c = 0; c * TAFSIR_CHUNK < entries.length; c++) {
        write(`tafsir/${id}/${s.id}/${c}.json`, entries.slice(c * TAFSIR_CHUNK, (c + 1) * TAFSIR_CHUNK))
      }
    })
    console.log(`tafsir ${id}: ${slug}, ${(chars / 1e6).toFixed(1)}M characters`)
  }
}

await tafsir()
