// Quran memorisation (hifz): comparing what someone recited or typed with the ayah,
// hiding words step by step, and keeping per-ayah progress on the device.
//
// Speech recognisers and keyboards write modern Arabic spelling, while the mushaf
// uses the Uthmani script (ٱلصَّلَوٰةَ, ٱلۡكِتَٰبُ, يَٰٓأَيُّهَا). So words are compared
// by their consonant skeleton with a little tolerance, not letter for letter.

// ---- Normalising Arabic ----

/** Vowel marks, Quranic annotation signs, the dagger alef and tatweel. */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g

/** Plain letters without marks, with the hamza seats and alef forms unified. */
export function plainArabic(text: string): string {
  return text
    .normalize("NFC")
    .replace(MARKS, "")
    .replace(/[ٱأإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[ئى]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** The word with alefs and hamzas dropped: the letters that Uthmani and modern spelling agree on. */
export function skeleton(word: string): string {
  return plainArabic(word).replace(/[اء\s]/g, "")
}

export function arabicWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => plainArabic(w) !== "")
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** 1 for the same word, 0 for nothing in common. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  const len = Math.max(a.length, b.length)
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len
}

// The disjointed letters that open some surahs are recited by their names (الٓمٓ: alif lam mim).
const LETTER_NAMES: Record<string, string> = {
  ا: "الف", ل: "لام", م: "ميم", ص: "صاد", ر: "را", ك: "كاف", ه: "ها", ي: "يا",
  ع: "عين", ط: "طا", س: "سين", ح: "حا", ق: "قاف", ن: "نون",
}
const MUQATTAAT = new Set(["الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"])

/** The ways a word may be said, as skeletons. */
function forms(word: string, opening: boolean): string[] {
  const out = [skeleton(word)]
  const plain = plainArabic(word)
  // Only at the start of an ayah, and only when written with the madda sign (or طه), as in the mushaf.
  if (opening && MUQATTAAT.has(plain) && (/ٓ/.test(word) || plain === "طه")) {
    out.push(skeleton([...plain].map((c) => LETTER_NAMES[c] ?? c).join("")))
  }
  return out
}

// ---- Comparing a recitation with the text ----

export type WordStatus = "correct" | "close" | "wrong" | "missed" | "pending"

export type WordResult = {
  status: WordStatus
  /** What was heard or typed in this word's place, when it differs. */
  heard?: string
}

export type Comparison = {
  words: WordResult[]
  /** Words said that are not in the ayah (often a repeat or the isti'adha). */
  extra: string[]
  /** Share of the expected words recited correctly or nearly so, 0–1. */
  score: number
}

const CORRECT = 0.8
const CLOSE = 0.6
const MAX_JOIN = 3

type Step = { kind: "match" | "sub" | "miss" | "extra"; take: number; sim: number }

/**
 * Lines up the expected words with what was said (an edit-distance alignment that lets one
 * written word be heard as up to three, as in يَٰٓأَيُّهَا, "يا أيها").
 *
 * When `partial` is set the person is still reciting, so expected words after the last one
 * heard are "pending" rather than "missed".
 */
export function compareRecitation(
  expected: string[],
  said: string,
  { partial = false, openings = new Set<number>([0]) }: { partial?: boolean; openings?: Set<number> } = {},
): Comparison {
  const heard = arabicWords(said)
  const exp = expected.map((w, i) => forms(w, openings.has(i)))
  const hs = heard.map(skeleton)
  const n = exp.length
  const m = hs.length
  const INF = Number.POSITIVE_INFINITY
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF))
  const back: (Step | null)[][] = Array.from({ length: n + 1 }, () => new Array<Step | null>(m + 1).fill(null))
  cost[0][0] = 0
  // Recitations stay close to the text, so only a band around the diagonal is searched;
  // that keeps a whole surah fast enough to re-check while someone is still reciting.
  const band = 60 + Math.max(0, m - n)
  // Mid-recitation the words not reached yet are free, so a wrong last word must cost less
  // than calling it extra, or it would only turn red once the next word is heard.
  const subCost = partial ? 0.9 : 1.5
  for (let i = 0; i <= n; i++) {
    for (let j = Math.max(0, i - band); j <= Math.min(m, i + band); j++) {
      const c = cost[i][j]
      if (c === INF) continue
      const relax = (ni: number, nj: number, add: number, step: Step) => {
        if (c + add < cost[ni][nj]) {
          cost[ni][nj] = c + add
          back[ni][nj] = step
        }
      }
      if (i < n) relax(i + 1, j, 1, { kind: "miss", take: 0, sim: 0 })
      if (j < m) relax(i, j + 1, 1, { kind: "extra", take: 1, sim: 0 })
      if (i < n) {
        const maxJoin = Math.max(MAX_JOIN, exp[i].length > 1 ? 4 : 0)
        let joined = ""
        for (let k = 1; k <= maxJoin && j + k <= m; k++) {
          joined += hs[j + k - 1]
          const sim = Math.max(...exp[i].map((f) => similarity(f, joined)))
          if (sim >= CLOSE) relax(i + 1, j + k, 2 * (1 - sim) + (k - 1) * 0.05, { kind: "match", take: k, sim })
          else if (k === 1) relax(i + 1, j + 1, subCost, { kind: "sub", take: 1, sim })
        }
      }
    }
  }

  // With a recitation still going, the words not reached yet cost nothing.
  let endI = n
  if (partial) {
    // The furthest point among the best-scoring ones: words beyond it are not reached yet.
    const best = Math.min(...cost.map((row) => row[m]))
    for (let i = n; i >= 0; i--) {
      if (cost[i][m] <= best + 1e-9) {
        endI = i
        break
      }
    }
  }

  const words: WordResult[] = expected.map(() => ({ status: partial ? "pending" : "missed" }))
  const extra: string[] = []
  let i = endI
  let j = m
  while (i > 0 || j > 0) {
    const step = back[i][j]
    if (!step) break
    if (step.kind === "extra") {
      extra.unshift(heard[j - 1])
      j -= 1
    } else if (step.kind === "miss") {
      words[i - 1] = { status: "missed" }
      i -= 1
    } else {
      const text = heard.slice(j - step.take, j).join(" ")
      words[i - 1] =
        step.kind === "sub"
          ? { status: "wrong", heard: text }
          : step.sim >= CORRECT
            ? { status: "correct" }
            : { status: "close", heard: text }
      i -= 1
      j -= step.take
    }
  }
  const good = words.filter((w) => w.status === "correct" || w.status === "close").length
  return { words, extra, score: n === 0 ? 0 : good / n }
}

// ---- Hiding words ----

export const HIDE_LEVELS = ["Read", "Some hidden", "Most hidden", "First word", "All hidden"] as const
export type HideLevel = 0 | 1 | 2 | 3 | 4

/** A steady pseudo-random number in [0, 1) for a word, so the same words stay hidden on each visit. */
function wordNoise(surah: number, ayah: number, index: number) {
  let h = (surah * 73856093) ^ (ayah * 19349663) ^ (index * 83492791)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function isHidden(level: HideLevel, surah: number, ayah: number, index: number, count: number): boolean {
  if (level === 0) return false
  if (level === 4) return true
  if (level === 3) return index > 0
  // Keep the first word as a cue at the lighter levels.
  if (index === 0 && count > 1) return false
  const share = level === 1 ? 0.35 : 0.7
  return wordNoise(surah, ayah, index) < share
}

// ---- Progress on this device ----

export const HIFZ_KEY = "mihrab:hifz:progress"
export const HIFZ_LAST_KEY = "mihrab:hifz:last"

export type AyahProgress = {
  /** Best score from memory (a hidden level), 0–1. */
  best: number
  /** Most recent score, 0–1. */
  last: number
  tries: number
  /** When it was last practised (ms since epoch). */
  at: number
  /** True once recited from memory with at most one slip. */
  memorized: boolean
}

export type Progress = Record<string, AyahProgress>

export const ayahKey = (surah: number, ayah: number) => `${surah}:${ayah}`

/** Recited (or typed) from memory with 90% or more right, and no peeking at the full text. */
export const MEMORIZED_SCORE = 0.9

export function recordAttempt(progress: Progress, surah: number, ayah: number, score: number, level: HideLevel, now = Date.now()): Progress {
  const key = ayahKey(surah, ayah)
  const prev = progress[key]
  const fromMemory = level >= 3
  const next: AyahProgress = {
    best: Math.max(prev?.best ?? 0, fromMemory ? score : 0),
    last: score,
    tries: (prev?.tries ?? 0) + 1,
    at: now,
    memorized: (prev?.memorized ?? false) || (fromMemory && score >= MEMORIZED_SCORE),
  }
  return { ...progress, [key]: next }
}

export type AyahState = "new" | "learning" | "memorized"

export function ayahState(progress: Progress, surah: number, ayah: number): AyahState {
  const p = progress[ayahKey(surah, ayah)]
  if (!p) return "new"
  return p.memorized ? "memorized" : "learning"
}

export function surahSummary(progress: Progress, surah: number, verses: number) {
  let memorized = 0
  let learning = 0
  for (let a = 1; a <= verses; a++) {
    const s = ayahState(progress, surah, a)
    if (s === "memorized") memorized++
    else if (s === "learning") learning++
  }
  return { memorized, learning, verses }
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as unknown
    if (!v || typeof v !== "object" || Array.isArray(v)) return {}
    const out: Progress = {}
    for (const [k, p] of Object.entries(v as Record<string, Partial<AyahProgress>>)) {
      if (!/^\d{1,3}:\d{1,3}$/.test(k) || !p || typeof p !== "object") continue
      out[k] = {
        best: typeof p.best === "number" ? p.best : 0,
        last: typeof p.last === "number" ? p.last : 0,
        tries: typeof p.tries === "number" ? p.tries : 0,
        at: typeof p.at === "number" ? p.at : 0,
        memorized: p.memorized === true,
      }
    }
    return out
  } catch {
    return {}
  }
}
