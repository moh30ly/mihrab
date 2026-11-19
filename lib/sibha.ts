// The electronic sibha (tasbih counter): what can be counted and how the count is kept.

export type SibhaPhrase = {
  id: string
  arabic: string
  /** Transliteration, translated with t() where a language has its own spelling. */
  name: string
  english: string
}

export const SIBHA_PHRASES: SibhaPhrase[] = [
  { id: "subhanallah", arabic: "سُبْحَانَ اللَّهِ", name: "SubhanAllah", english: "Glory be to Allah" },
  { id: "alhamdulillah", arabic: "الْحَمْدُ لِلَّهِ", name: "Alhamdulillah", english: "All praise is for Allah" },
  { id: "allahuakbar", arabic: "اللَّهُ أَكْبَرُ", name: "Allahu Akbar", english: "Allah is the Greatest" },
  { id: "tahlil", arabic: "لَا إِلَهَ إِلَّا اللَّهُ", name: "La ilaha illa Allah", english: "None has the right to be worshipped but Allah" },
  { id: "istighfar", arabic: "أَسْتَغْفِرُ اللَّهَ", name: "Astaghfirullah", english: "I seek Allah's forgiveness" },
  { id: "hawqala", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", name: "La hawla wa la quwwata illa billah", english: "There is no might and no power except with Allah" },
  { id: "subhanallahi-wa-bihamdihi", arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", name: "SubhanAllahi wa bihamdihi", english: "Glory and praise be to Allah" },
  { id: "salawat", arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", name: "Salawat on the Prophet ﷺ", english: "O Allah, send blessings and peace upon our Prophet Muhammad" },
]

/** After each obligatory prayer: SubhanAllah 33, Alhamdulillah 33, Allahu Akbar 34 (Muslim 596). */
export const AFTER_PRAYER_SEQUENCE: { phrase: string; count: number }[] = [
  { phrase: "subhanallah", count: 33 },
  { phrase: "alhamdulillah", count: 33 },
  { phrase: "allahuakbar", count: 34 },
]

export const TARGETS = [33, 99, 100, 0] as const // 0 = no target

export type SibhaState = {
  /** A phrase id, or "after-prayer" for the 33·33·34 sequence. */
  mode: string
  target: number
  count: number
  /** Completed rounds of the target (or steps of the after-prayer sequence). */
  rounds: number
  /** All taps ever, across phrases. */
  total: number
  vibrate: boolean
}

export const DEFAULT_SIBHA: SibhaState = { mode: "subhanallah", target: 33, count: 0, rounds: 0, total: 0, vibrate: true }

const KEY = "mihrab:sibha"

const nonNegativeInt = (v: unknown, fallback: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback)

export function loadSibha(): SibhaState {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Partial<SibhaState> | null
    if (!raw || typeof raw !== "object") return DEFAULT_SIBHA
    const mode = raw.mode === "after-prayer" || SIBHA_PHRASES.some((p) => p.id === raw.mode) ? (raw.mode as string) : DEFAULT_SIBHA.mode
    return {
      mode,
      target: Math.min(nonNegativeInt(raw.target, DEFAULT_SIBHA.target), 100_000),
      count: nonNegativeInt(raw.count, 0),
      rounds: nonNegativeInt(raw.rounds, 0),
      total: nonNegativeInt(raw.total, 0),
      vibrate: raw.vibrate !== false,
    }
  } catch {
    return DEFAULT_SIBHA
  }
}

export function saveSibha(state: SibhaState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // The count still works for this visit.
  }
}

/** The phrase and target in force for the current state. */
export function currentStep(state: SibhaState): { phrase: SibhaPhrase; target: number } {
  if (state.mode === "after-prayer") {
    const step = AFTER_PRAYER_SEQUENCE[state.rounds % AFTER_PRAYER_SEQUENCE.length]
    return { phrase: SIBHA_PHRASES.find((p) => p.id === step.phrase)!, target: step.count }
  }
  return { phrase: SIBHA_PHRASES.find((p) => p.id === state.mode) ?? SIBHA_PHRASES[0], target: state.target }
}

/** One tap. `reached` is true when this tap completes the target. */
export function tapSibha(state: SibhaState): { next: SibhaState; reached: boolean } {
  const { target } = currentStep(state)
  const count = state.count + 1
  const total = state.total + 1
  if (target > 0 && count >= target) {
    return { next: { ...state, count: 0, rounds: state.rounds + 1, total }, reached: true }
  }
  return { next: { ...state, count, total }, reached: false }
}
