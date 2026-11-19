// Lists every English string that the interface translates, for lib/i18n/messages.
// Usage: node scripts/extract-i18n-keys.mjs [--check]  (--check fails if a locale is missing a key)
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const root = new URL("..", import.meta.url).pathname
const str = `"((?:[^"\\\\]|\\\\.)*)"`
const unq = (s) => JSON.parse(`"${s}"`)
const keys = new Set()

function walk(dir) {
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name)
    if (statSync(join(root, path)).isDirectory()) {
      if (!["i18n", "node_modules"].includes(name)) walk(path)
    } else if (/\.(tsx?)$/.test(name) && !name.endsWith(".test.ts")) {
      const src = readFileSync(join(root, path), "utf8")
      for (const re of [new RegExp(`\\b(?:t|tNow)\\(\\s*${str}`, "g"), new RegExp(`<T\\s+k=${str}`, "g")]) {
        for (const m of src.matchAll(re)) keys.add(unq(m[1]))
      }
    }
  }
}
for (const dir of ["app", "components", "lib"]) walk(dir)

// Strings passed to t() through data tables.
const fields = (file, names) => {
  const src = readFileSync(join(root, file), "utf8")
  for (const n of names) for (const m of src.matchAll(new RegExp(`\\b${n}:\\s*${str}`, "g"))) keys.add(unq(m[1]))
}
fields("lib/methods.ts", ["name", "role", "detail"])
fields("lib/faq.ts", ["question", "answer"])
fields("lib/translations.ts", ["language"])
fields("components/site-nav.tsx", ["label"])
const arrays = (file, name) => {
  const src = readFileSync(join(root, file), "utf8")
  const body = src.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:as const)?\\n`))[1]
  for (const m of body.matchAll(new RegExp(str, "g"))) keys.add(unq(m[1]))
}
arrays("lib/extra-reminders.ts", "HIJRI_MONTHS")
arrays("lib/prayer.ts", "CARDINALS")
arrays("components/mihrab-app.tsx", "LEADS")
for (const k of ["Morning", "Evening"]) keys.add(k)
for (const d of JSON.parse(readFileSync(join(root, "data/athkar.json"), "utf8"))) if (d.note) keys.add(d.note)

const list = [...keys].sort()
if (process.argv.includes("--check")) {
  const dir = join(root, "lib/i18n/messages")
  let missing = 0
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const dict = JSON.parse(readFileSync(join(dir, f), "utf8"))
    const gaps = list.filter((k) => !dict[k])
    const extra = Object.keys(dict).filter((k) => !keys.has(k))
    if (gaps.length) console.log(`${f}: ${gaps.length} missing\n  ${gaps.join("\n  ")}`)
    if (extra.length) console.log(`${f}: ${extra.length} unused\n  ${extra.join("\n  ")}`)
    missing += gaps.length
  }
  process.exit(missing ? 1 : 0)
} else {
  console.log(JSON.stringify(list, null, 2))
}
