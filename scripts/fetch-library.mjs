// Writes the tafsir and hadith collections as small
// static JSON files under <out>/library/, which the app fetches on demand.
// They are not committed: the website workflow runs this after `next build`
// with `out` as the target, so they ship with mihrab.live but not inside the
// Android app, which reads them from mihrab.live.
//
// Downloads are pinned to a release and cached in .cache/library/, so a
// second run works offline. The texts are written unchanged.
//
// Usage: node scripts/fetch-library.mjs [out-dir] [tafsir|hadith]   (default: public, both)
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

// ---- Hadith -----------------------------------------------------------------
// fawazahmed0/hadith-api (Unlicense): https://github.com/fawazahmed0/hadith-api
const HADITH_REF = "1"
const HADITH_LANGS = { en: "eng", tr: "tur" }

/** Same rules as normalizeForSearch in lib/hadith.ts. */
function normalizeForSearch(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

async function edition(name) {
  const url = `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@${HADITH_REF}/editions/${name}.min.json`
  const raw = `https://raw.githubusercontent.com/fawazahmed0/hadith-api/${HADITH_REF}/editions/${name}.min.json`
  try {
    return JSON.parse(await cached(`hadith/${HADITH_REF}/${name}.json`, raw))
  } catch {
    return JSON.parse(await cached(`hadith/${HADITH_REF}/${name}.json`, url))
  }
}

async function hadith() {
  const src = readFileSync(join(root, "lib", "hadith.ts"), "utf8")
  const list = [...src.matchAll(/\{ id: "(\w+)", key: "(\w+)",[^\n]*extra: \[([^\]]*)\] \}/g)].map((m) => ({
    id: m[1],
    key: m[2],
    extra: [...m[3].matchAll(/"(\w+)"/g)].map((x) => x[1]),
  }))
  if (list.length === 0) throw new Error("No hadith collections found in lib/hadith.ts")

  rmSync(join(outDir, "hadith"), { recursive: true, force: true })
  for (const c of list) {
    const ara = await edition(`ara-${c.key}`)
    const langs = { en: await edition(`${HADITH_LANGS.en}-${c.key}`) }
    for (const l of c.extra) langs[l] = await edition(`${HADITH_LANGS[l]}-${c.key}`)

    const byNumber = (e) => new Map(e.hadiths.map((h) => [h.hadithnumber, h]))
    const maps = Object.fromEntries(Object.entries(langs).map(([l, e]) => [l, byNumber(e)]))
    const books = new Map()
    const search = { ar: [], en: [] }
    // Some hadiths have no reference ({ book: 0, hadith: 0 }); they belong to
    // the book of the hadith numbered just before them.
    let lastBook = 0
    const placed = []
    const sorted = [...ara.hadiths].sort((a, b) => a.hadithnumber - b.hadithnumber)
    for (const h of sorted) {
      const en = maps.en.get(h.hadithnumber)
      const row = { n: h.hadithnumber, ar: h.text.trim(), en: (en?.text ?? "").trim() }
      for (const l of c.extra) {
        const t = (maps[l].get(h.hadithnumber)?.text ?? "").trim()
        if (t) row[l] = t
      }
      if (!row.ar && !row.en) continue
      const grades = (en?.grades?.length ? en.grades : h.grades) ?? []
      if (grades.length) row.g = grades.map((g) => [g.name, g.grade])
      const ref = h.reference ?? { book: 0, hadith: 0 }
      const book = ref.book === 0 && ref.hadith === 0 ? lastBook : ref.book
      lastBook = book
      placed.push([row.n, book])
      if (!books.has(book)) books.set(book, [])
      books.get(book).push(row)
      if (row.ar) search.ar.push([row.n, normalizeForSearch(row.ar), book])
      if (row.en) search.en.push([row.n, normalizeForSearch(row.en), book])
    }

    const names = langs.en.metadata.sections
    // Runs of consecutive numbers in the same book, to find a hadith by number.
    const runs = []
    for (const [n, book] of placed) {
      const last = runs.at(-1)
      if (last && last[2] === book) last[1] = n
      else runs.push([n, n, book])
    }
    const index = { name: langs.en.metadata.name, total: 0, books: [], runs }
    for (const [n, rows] of [...books].sort((a, b) => a[0] - b[0])) {
      write(`hadith/${c.id}/${n}.json`, rows)
      const nums = rows.map((r) => r.n)
      index.books.push({ n, name: (names[n] ?? "").trim(), first: Math.min(...nums), last: Math.max(...nums), count: rows.length })
      index.total += rows.length
    }
    write(`hadith/${c.id}/index.json`, index)
    write(`hadith/${c.id}/search-ar.json`, search.ar)
    write(`hadith/${c.id}/search-en.json`, search.en)
    console.log(`hadith ${c.id}: ${index.total} hadiths in ${index.books.length} books`)
  }
}

const only = process.argv[3]
if (!only || only === "tafsir") await tafsir()
if (!only || only === "hadith") await hadith()
