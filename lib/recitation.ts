// Recorded recitations of the Quran, ayah by ayah, streamed from EveryAyah (everyayah.com).
// Each ayah is its own MP3 named SSSAAA.mp3 (surah and ayah, three digits each), so an
// ayah can be played on its own, repeated, or followed by the next to read a whole surah.

export type Reciter = {
  id: string
  /** Name in English and in Arabic. */
  name: string
  nameAr: string
  style: "murattal" | "mujawwad"
  /** Folder on everyayah.com/data/. */
  folder: string
}

export const RECITERS: readonly Reciter[] = [
  { id: "ghamdi", name: "Saad Al-Ghamdi", nameAr: "سعد الغامدي", style: "murattal", folder: "Ghamadi_40kbps" },
  { id: "minshawi", name: "Muhammad Siddiq Al-Minshawi", nameAr: "محمد صديق المنشاوي", style: "murattal", folder: "Minshawy_Murattal_128kbps" },
  { id: "minshawi-mujawwad", name: "Muhammad Siddiq Al-Minshawi", nameAr: "محمد صديق المنشاوي", style: "mujawwad", folder: "Minshawy_Mujawwad_64kbps" },
  { id: "abdulbasit", name: "Abdul Basit Abdul Samad", nameAr: "عبد الباسط عبد الصمد", style: "murattal", folder: "Abdul_Basit_Murattal_64kbps" },
  { id: "abdulbasit-mujawwad", name: "Abdul Basit Abdul Samad", nameAr: "عبد الباسط عبد الصمد", style: "mujawwad", folder: "Abdul_Basit_Mujawwad_128kbps" },
]

export const DEFAULT_RECITER = RECITERS[0]
export const RECITER_KEY = "mihrab:quran:reciter"
export const AUDIO_SOURCE = { name: "EveryAyah", url: "https://everyayah.com/" }

export function reciterById(id: string | null | undefined): Reciter {
  return RECITERS.find((r) => r.id === id) ?? DEFAULT_RECITER
}

const pad = (n: number) => String(n).padStart(3, "0")

/** The MP3 of one ayah. Ayah 0 stands for the basmala, read before a surah's first ayah. */
export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number) {
  const [s, a] = ayah === 0 ? [1, 1] : [surah, ayah]
  return `https://everyayah.com/data/${reciter.folder}/${pad(s)}${pad(a)}.mp3`
}

/** Al-Fatihah opens with the basmala as its first ayah and At-Tawbah has none. */
export function hasSeparateBasmala(surah: number) {
  return surah !== 1 && surah !== 9
}

/** How the player goes on when an ayah ends. */
export type PlayMode = "surah" | "ayah" | "repeat"
export const PLAY_MODES: readonly PlayMode[] = ["surah", "ayah", "repeat"]

/**
 * The ayah to play after `ayah` ends, or null to stop.
 * Ayah 0 is the basmala, which always leads into ayah 1.
 */
export function nextAyah(ayah: number, total: number, mode: PlayMode): number | null {
  if (ayah === 0) return 1
  if (mode === "repeat") return ayah
  if (mode === "ayah") return null
  return ayah < total ? ayah + 1 : null
}

/** Where to start when someone presses play on an ayah: the basmala first when reading a surah from its start. */
export function startAyah(surah: number, ayah: number, mode: PlayMode) {
  return ayah === 1 && mode === "surah" && hasSeparateBasmala(surah) ? 0 : ayah
}

export type RecitationPrefs = { reciter: string; mode: PlayMode }
export const DEFAULT_RECITATION_PREFS: RecitationPrefs = { reciter: DEFAULT_RECITER.id, mode: "surah" }

export function parseRecitationPrefs(raw: string | null): RecitationPrefs {
  try {
    const v = JSON.parse(raw ?? "{}") as Partial<RecitationPrefs>
    return {
      reciter: reciterById(v.reciter).id,
      mode: PLAY_MODES.includes(v.mode as PlayMode) ? (v.mode as PlayMode) : "surah",
    }
  } catch {
    return DEFAULT_RECITATION_PREFS
  }
}

export function loadRecitationPrefs(): RecitationPrefs {
  try {
    return parseRecitationPrefs(window.localStorage.getItem(RECITER_KEY))
  } catch {
    return DEFAULT_RECITATION_PREFS
  }
}

export function saveRecitationPrefs(p: RecitationPrefs) {
  try {
    window.localStorage.setItem(RECITER_KEY, JSON.stringify(p))
  } catch {
    // Not kept in private windows.
  }
}

/** Plays one ayah to its end. Resolves when it finishes or `signal` aborts; rejects if it can't be loaded. */
export function playAyahOnce(audio: HTMLAudioElement, url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve()
    const done = (fn: () => void) => () => {
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
      signal.removeEventListener("abort", onAbort)
      fn()
    }
    const onEnded = done(resolve)
    const onError = done(() => reject(new Error(`Could not play ${url}`)))
    const onAbort = done(() => {
      audio.pause()
      resolve()
    })
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)
    signal.addEventListener("abort", onAbort)
    audio.src = url
    audio.play().catch((e: unknown) => {
      if (signal.aborted) return
      onError()
      void e
    })
  })
}
