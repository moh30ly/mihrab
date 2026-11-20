"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronLeft, ChevronRight, Eye, Keyboard, Lightbulb, Mic, RotateCcw, Square, Volume2 } from "lucide-react"
import { readLastSession, saveLastSession, useHifzProgress } from "@/components/hifz/use-hifz"
import {
  HIDE_LEVELS,
  MEMORIZED_SCORE,
  arabicWords,
  ayahState,
  compareRecitation,
  isHidden,
  recordAttempt,
  type Comparison,
  type HideLevel,
  type WordResult,
} from "@/lib/hifz"
import { canListen, listen, type ListenError, type Listening } from "@/lib/listen"
import { ReciterSelect } from "@/components/quran/recitation-bar"
import { ayahSources, offlineSupported } from "@/lib/offline"
import { SpeechModel } from "@/components/offline/downloads"
import { loadRecitationPrefs, playAyahOnce, reciterById, saveRecitationPrefs } from "@/lib/recitation"
import { NoArabicVoiceError, speakArabic, stopSpeaking } from "@/lib/speak"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Verse = { number: number; arabic: string; english: string }
type Scope = "ayah" | "range"
type Mode = "idle" | "listening" | "typing" | "result"
type Prefs = { level: HideLevel; scope: Scope; repeat: number; meaning: boolean }

const PREFS_KEY = "mihrab:hifz:prefs"
const DEFAULT_PREFS: Prefs = { level: 0, scope: "ayah", repeat: 3, meaning: true }
const REPEATS = [1, 3, 5, 7]

function loadPrefs(): Prefs {
  try {
    const v = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<Prefs>
    return {
      level: typeof v.level === "number" && v.level >= 0 && v.level <= 4 ? (v.level as HideLevel) : 0,
      scope: v.scope === "range" ? "range" : "ayah",
      repeat: REPEATS.includes(v.repeat as number) ? (v.repeat as number) : 3,
      meaning: v.meaning !== false,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function savePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  } catch {
    // Not kept in private windows.
  }
}

const arabicNumber = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false })

type Word = { text: string; ayah: number; index: number; count: number }

/** A default range a person can manage in one sitting. */
function defaultRange(verses: number) {
  return { from: 1, to: Math.min(verses, 5) }
}

export function HifzSession({ surahId, verses }: { surahId: number; verses: Verse[] }) {
  const { t } = useT()
  const total = verses.length
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [range, setRange] = useState(() => defaultRange(total))
  const [ayah, setAyah] = useState(1)
  const [mode, setMode] = useState<Mode>("idle")
  const [heard, setHeard] = useState("")
  const [typed, setTyped] = useState("")
  const [result, setResult] = useState<Comparison | null>(null)
  const [peeked, setPeeked] = useState<Set<string>>(new Set())
  const [peekedThisTry, setPeekedThisTryState] = useState(false)
  // Read when a recitation ends, which happens in a callback set up before any peeking.
  const peekedRef = useRef(false)
  const setPeekedThisTry = (v: boolean) => {
    peekedRef.current = v
    setPeekedThisTryState(v)
  }
  const [listenSupported, setListenSupported] = useState<boolean | null>(null)
  const [listenError, setListenError] = useState<{ code: ListenError; detail?: string } | null>(null)
  const [playing, setPlaying] = useState(false)
  const [voiceError, setVoiceError] = useState(false)
  const listening = useRef<Listening | null>(null)
  const playRun = useRef(0)
  const [reciter, setReciterState] = useState<string>(() => reciterById(null).id)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { progress, update: updateProgress } = useHifzProgress()

  useEffect(() => {
    // Saved choices and the ?from=&to= of a "continue" link exist only in the browser.
    const p = loadPrefs()
    const q = new URLSearchParams(window.location.search)
    const last = readLastSession()
    let from = Number(q.get("from"))
    let to = Number(q.get("to"))
    let at = 0
    if (!(from >= 1 && to >= from && to <= total)) {
      if (last && last.surah === surahId && last.to <= total) {
        from = last.from
        to = last.to
        at = last.ayah
      } else {
        ;({ from, to } = defaultRange(total))
      }
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setPrefs(p)
    setRange({ from, to })
    setAyah(at >= from && at <= to ? at : from)
    /* eslint-enable react-hooks/set-state-in-effect */
    setReciterState(loadRecitationPrefs().reciter)
    void canListen().then(setListenSupported)
  }, [surahId, total])

  useEffect(() => {
    saveLastSession({ surah: surahId, from: range.from, to: range.to, ayah })
  }, [surahId, range.from, range.to, ayah])

  // Stop the microphone and the voice when leaving the page.
  useEffect(
    () => () => {
      listening.current?.stop()
      playRun.current++
      abortRef.current?.abort()
      void stopSpeaking()
    },
    [],
  )

  const setPref = (next: Partial<Prefs>) => {
    const p = { ...prefs, ...next }
    setPrefs(p)
    savePrefs(p)
  }

  const shown = useMemo(
    () => (prefs.scope === "ayah" ? verses.slice(ayah - 1, ayah) : verses.slice(range.from - 1, range.to)),
    [prefs.scope, verses, ayah, range.from, range.to],
  )
  const words: Word[] = useMemo(
    () =>
      shown.flatMap((v) => {
        const list = arabicWords(v.arabic)
        return list.map((text, index) => ({ text, ayah: v.number, index, count: list.length }))
      }),
    [shown],
  )
  const openings = useMemo(() => new Set(words.flatMap((w, i) => (w.index === 0 ? [i] : []))), [words])

  // While reciting, words light up as they are heard.
  const live = useMemo(
    () => (mode === "listening" && heard ? compareRecitation(words.map((w) => w.text), heard, { partial: true, openings }) : null),
    [mode, heard, words, openings],
  )
  const marks: WordResult[] | null = mode === "result" && result ? result.words : live ? live.words : null

  const resetTry = () => {
    setResult(null)
    setHeard("")
    setPeeked(new Set())
    setPeekedThisTry(false)
    setListenError(null)
  }

  const goTo = (n: number) => {
    listening.current?.stop()
    listening.current = null
    setMode("idle")
    resetTry()
    setTyped("")
    setAyah(Math.min(Math.max(n, range.from), range.to))
  }

  const changeRange = (from: number, to: number) => {
    const r = { from: Math.min(from, to), to: Math.max(from, to) }
    setRange(r)
    if (ayah < r.from || ayah > r.to) setAyah(r.from)
    setMode("idle")
    resetTry()
  }

  // ---- Checking ----

  const finish = (said: string) => {
    const cmp = compareRecitation(
      words.map((w) => w.text),
      said,
      { openings },
    )
    setResult(cmp)
    setMode("result")
    // Peeking during the try means it was not fully from memory.
    const level: HideLevel = peekedRef.current ? (Math.min(prefs.level, 2) as HideLevel) : prefs.level
    updateProgress((p) => {
      let next = p
      for (const v of shown) {
        const own = cmp.words.filter((_, i) => words[i].ayah === v.number)
        const good = own.filter((w) => w.status === "correct" || w.status === "close").length
        next = recordAttempt(next, surahId, v.number, own.length ? good / own.length : 0, level)
      }
      return next
    })
  }

  const startListening = () => {
    void stopPlaying()
    resetTry()
    setMode("listening")
    let latest = ""
    listening.current = listen({
      onText: (text) => {
        latest = text
        setHeard(text)
      },
      onEnd: (error, detail) => {
        listening.current = null
        if (error) {
          setListenError({ code: error, detail })
          setMode("idle")
          if (error === "unsupported") setListenSupported(false)
          return
        }
        if (latest.trim()) finish(latest)
        else {
          setMode("idle")
          setListenError({ code: "other", detail: t("Nothing was heard. Check the microphone and try again.") })
        }
      },
    })
  }

  const stopListening = () => {
    listening.current?.stop()
  }

  const selfCheck = (right: boolean) => {
    const level: HideLevel = peekedRef.current ? (Math.min(prefs.level, 2) as HideLevel) : prefs.level
    updateProgress((p) => shown.reduce((next, v) => recordAttempt(next, surahId, v.number, right ? 1 : 0.5, level), p))
    if (right && prefs.scope === "ayah" && ayah < range.to) goTo(ayah + 1)
    else resetTry()
  }

  // ---- Listening to the ayah, repeated ----

  const stopPlaying = async () => {
    playRun.current++
    abortRef.current?.abort()
    setPlaying(false)
    await stopSpeaking()
  }

  const setReciter = (id: string) => {
    setReciterState(id)
    saveRecitationPrefs({ ...loadRecitationPrefs(), reciter: id })
    if (playing) void stopPlaying()
  }

  /**
   * The reciter's recording of the ayah: downloaded on the phone, else from EveryAyah;
   * the device's voice if neither can be played (offline without a download).
   */
  const recite = async (n: number, text: string, run: number) => {
    const audio = (audioRef.current ??= new Audio())
    const abort = new AbortController()
    abortRef.current = abort
    for (const src of ayahSources(reciterById(reciter), surahId, n)) {
      try {
        await playAyahOnce(audio, src, abort.signal)
        return
      } catch {
        if (run !== playRun.current) return
      }
    }
    if (run === playRun.current) await speakArabic(text)
  }

  const play = async () => {
    if (playing) return stopPlaying()
    const run = ++playRun.current
    setVoiceError(false)
    setPlaying(true)
    try {
      for (let i = 0; i < prefs.repeat && run === playRun.current; i++) {
        for (const v of shown) {
          if (run !== playRun.current) break
          await recite(v.number, v.arabic, run)
        }
      }
    } catch (e) {
      if (e instanceof NoArabicVoiceError || run === playRun.current) setVoiceError(true)
    } finally {
      if (run === playRun.current) setPlaying(false)
    }
  }

  // ---- Showing the words ----

  const hintNext = () => {
    const i = words.findIndex((w, i) => wordHidden(w, i))
    if (i >= 0) peek(i)
  }

  const wordId = (w: Word) => `${w.ayah}:${w.index}`
  const peek = (i: number) => {
    const id = wordId(words[i])
    setPeeked((s) => new Set(s).add(id))
    if (mode !== "result") setPeekedThisTry(true)
  }
  const wordHidden = (w: Word, i: number) => {
    if (mode === "result") return false
    if (peeked.has(wordId(w))) return false
    const m = marks?.[i]
    if (m && m.status !== "pending" && m.status !== "missed") return false
    return isHidden(prefs.level, surahId, w.ayah, w.index, w.count)
  }

  const counts = result
    ? {
        correct: result.words.filter((w) => w.status === "correct").length,
        close: result.words.filter((w) => w.status === "close").length,
        wrong: result.words.filter((w) => w.status === "wrong").length,
        missed: result.words.filter((w) => w.status === "missed").length,
      }
    : null
  const mistakes = result
    ? result.words.flatMap((w, i) => (w.status === "wrong" || w.status === "missed" ? [{ ...w, word: words[i] }] : []))
    : []
  const passed = result ? result.score >= MEMORIZED_SCORE : false
  const fromMemory = prefs.level >= 3 && !peekedThisTry

  const rangeOptions = verses.map((v) => v.number)
  const meaningShown = prefs.meaning && prefs.scope === "ayah"

  return (
    <div className="mt-6 grid gap-4">
      {/* Range and the ayah dots */}
      <section className="andalus-card grid gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">{t("From ayah")}</span>
            <select
              value={range.from}
              onChange={(e) => changeRange(Number(e.target.value), range.to)}
              className="h-9 rounded-full border border-border bg-card px-3 text-ink"
            >
              {rangeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <span className="text-muted-foreground">{t("to")}</span>
            <select
              value={range.to}
              onChange={(e) => changeRange(range.from, Number(e.target.value))}
              className="h-9 rounded-full border border-border bg-card px-3 text-ink"
            >
              {rangeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label={t("Practise")} className="ms-auto flex gap-0.5 rounded-full border border-border p-0.5">
            {(
              [
                ["ayah", t("One ayah")],
                ["range", t("All together")],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                aria-pressed={prefs.scope === s}
                onClick={() => {
                  setPref({ scope: s })
                  setMode("idle")
                  resetTry()
                }}
                className={cn(
                  "h-8 rounded-full px-3 text-sm font-medium",
                  prefs.scope === s ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol className="flex flex-wrap gap-1.5" aria-label={t("Ayahs in this range")}>
          {verses.slice(range.from - 1, range.to).map((v) => {
            const state = ayahState(progress, surahId, v.number)
            const current = prefs.scope === "ayah" && v.number === ayah
            return (
              <li key={v.number}>
                <button
                  type="button"
                  onClick={() => {
                    if (prefs.scope === "range") setPref({ scope: "ayah" })
                    goTo(v.number)
                  }}
                  aria-current={current ? "step" : undefined}
                  title={t(state === "memorized" ? "Memorized" : state === "learning" ? "Learning" : "Not started")}
                  className={cn(
                    "grid size-8 place-items-center rounded-full border text-xs font-medium",
                    state === "memorized" && "border-teal bg-teal text-[#f6f1e6]",
                    state === "learning" && "border-gold bg-gold/25 text-ink",
                    state === "new" && "border-border bg-card text-muted-foreground",
                    current && "ring-2 ring-grove ring-offset-2 ring-offset-background",
                  )}
                >
                  {v.number}
                </button>
              </li>
            )
          })}
        </ol>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-teal" />{t("Memorized")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-gold bg-gold/25" />{t("Learning")}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full border border-border bg-card" />{t("Not started")}</span>
        </p>
      </section>

      {/* Hiding level */}
      <section aria-label={t("How much to hide")} className="grid gap-2">
        <div role="group" className="grid grid-cols-5 gap-1 rounded-[1.25rem] border border-gold/50 bg-card p-1">
          {HIDE_LEVELS.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={prefs.level === i}
              onClick={() => {
                setPref({ level: i as HideLevel })
                if (mode === "result") setMode("idle")
                resetTry()
              }}
              className={cn(
                "min-h-10 rounded-[1rem] px-1 text-xs leading-tight font-medium sm:text-sm",
                prefs.level === i ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              <span className="block text-[10px] opacity-70">{i + 1}</span>
              {t(label)}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {prefs.level === 0
            ? t("Read the ayah several times, with the meaning, until it feels familiar.")
            : prefs.level < 3
              ? t("Some words are hidden. Recite the ayah and fill them in from memory; tap a hidden word to peek.")
              : prefs.level === 3
                ? t("Only the first word is shown as a cue. Recite the rest from memory.")
                : t("Everything is hidden. Recite from memory; the words appear as you say them.")}
        </p>
      </section>

      {/* The text */}
      <section className="arch-panel !rounded-[1.5rem] px-4 py-6 sm:px-8" aria-live="polite">
        <p lang="ar" dir="rtl" className="text-center font-quran text-[1.9rem] leading-[2.4] text-[#f6f1e6] sm:text-[2.2rem]">
          {words.map((w, i) => {
            const hidden = wordHidden(w, i)
            const m = marks?.[i]
            const endOfAyah = w.index === w.count - 1
            return (
              <span key={wordId(w)}>
                {hidden ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => peek(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        peek(i)
                      }
                    }}
                    aria-label={t("Show this word")}
                    className="mx-0.5 cursor-pointer rounded-lg bg-[#f6f1e6]/15 text-transparent outline-1 outline-dashed outline-brass-bright/50 select-none hover:bg-[#f6f1e6]/25"
                  >
                    {w.text}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "rounded-lg px-0.5",
                      m?.status === "correct" && "text-[#9fe0c6]",
                      m?.status === "close" && "text-brass-bright",
                      m?.status === "wrong" && "bg-[#b4472c]/40 text-[#ffd2c4] underline decoration-wavy decoration-[#ff9b80] underline-offset-8",
                      m?.status === "missed" && "text-[#ffb4a1] underline decoration-dashed decoration-[#ff9b80] underline-offset-8",
                    )}
                    title={m?.heard ? t("Heard: {text}", { text: m.heard }) : undefined}
                  >
                    {w.text}
                  </span>
                )}
                {endOfAyah ? (
                  <span className="mx-1 inline-grid size-9 place-items-center rounded-full border border-brass-bright/60 align-middle font-sans text-sm text-brass-bright">
                    {arabicNumber(w.ayah)}
                  </span>
                ) : null}{" "}
              </span>
            )
          })}
        </p>
        {meaningShown && prefs.level === 0 ? (
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[#f6f1e6]/80">{shown[0]?.english}</p>
        ) : null}
        {mode === "listening" ? (
          <p className="mt-4 text-center text-sm text-[#f6f1e6]/80">
            <span className="me-2 inline-block size-2.5 animate-pulse rounded-full bg-[#ff6b4a] align-middle" aria-hidden />
            {heard ? (
              <>
                {t("Heard:")}{" "}
                <span lang="ar" dir="rtl" className="font-arabic">
                  {heard}
                </span>
              </>
            ) : (
              t("Listening… recite now.")
            )}
          </p>
        ) : null}
      </section>

      {/* Actions */}
      <section className="grid gap-3">
        {mode === "typing" ? (
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              if (typed.trim()) finish(typed)
            }}
          >
            <label className="text-sm text-muted-foreground" htmlFor="hifz-typed">
              {t("Type the ayah from memory. Vowel marks are not needed.")}
            </label>
            <textarea
              id="hifz-typed"
              lang="ar"
              dir="rtl"
              rows={3}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="rounded-2xl border border-border bg-card px-4 py-3 font-arabic text-xl text-ink"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-full bg-grove px-5 text-sm font-medium text-[#f6f1e6]">
                <Check className="size-4" aria-hidden /> {t("Check")}
              </button>
              <button type="button" onClick={() => setMode("idle")} className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm">
                {t("Cancel")}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {mode === "listening" ? (
              <button
                type="button"
                onClick={stopListening}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#b4472c] px-6 text-base font-medium text-white"
              >
                <Square className="size-4 fill-current" aria-hidden /> {t("Stop and check")}
              </button>
            ) : (
              <button
                type="button"
                onClick={startListening}
                disabled={listenSupported === false}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-grove px-6 text-base font-medium text-[#f6f1e6] disabled:opacity-50"
              >
                <Mic className="size-5" aria-hidden /> {t("Recite")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                resetTry()
                setTyped("")
                setMode("typing")
              }}
              disabled={mode === "listening"}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium disabled:opacity-50"
            >
              <Keyboard className="size-4" aria-hidden /> {t("Type it")}
            </button>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => void play()}
                disabled={mode === "listening"}
                className="inline-flex h-12 items-center gap-2 rounded-s-full border border-border bg-card ps-5 pe-3 text-sm font-medium disabled:opacity-50"
              >
                {playing ? <Square className="size-4 fill-current" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
                {playing ? t("Stop") : t("Listen")}
              </button>
              <select
                aria-label={t("Times to repeat")}
                value={prefs.repeat}
                onChange={(e) => setPref({ repeat: Number(e.target.value) })}
                className="h-12 rounded-e-full border border-border bg-card ps-2 pe-3 text-sm"
              >
                {REPEATS.map((n) => (
                  <option key={n} value={n}>
                    ×{n}
                  </option>
                ))}
              </select>
            </span>
            <ReciterSelect value={reciter} onChange={setReciter} className="h-12 max-w-[14rem]" />
            {prefs.level > 0 && mode !== "result" ? (
              <button
                type="button"
                onClick={hintNext}
                className="inline-flex h-12 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-secondary"
              >
                <Lightbulb className="size-4" aria-hidden /> {t("Hint")}
              </button>
            ) : null}
          </div>
        )}

        {listenSupported === false ? (
          <p className="text-sm text-muted-foreground">
            {t("This browser can’t listen to recitation. Type the ayah instead, or use Chrome, Edge, Safari or the Android app.")}
          </p>
        ) : null}
        {listenError ? (
          <p className="text-sm text-[#b4472c]">
            {listenError.code === "permission"
              ? t("Mihrab needs the microphone to hear your recitation. Allow it in your browser or phone settings, or type the ayah instead.")
              : listenError.code === "network"
                ? t("Speech recognition needs a connection on this device. Type the ayah instead, or try again online.")
                : listenError.code === "language"
                  ? t("Arabic speech recognition is not installed on this device. Add Arabic in your phone’s voice typing settings, or type the ayah instead.")
                  : listenError.detail ?? t("Listening stopped unexpectedly. Try again.")}
          </p>
        ) : null}
        {listenError && (listenError.code === "network" || listenError.code === "language") && offlineSupported() ? <SpeechModel /> : null}
        {voiceError ? <p className="text-sm text-[#b4472c]">{t("No Arabic voice is available on this device.")}</p> : null}

        {mode === "idle" && prefs.level > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("Recited without the microphone?")}</span>
            <button type="button" onClick={() => selfCheck(true)} className="rounded-full border border-border bg-card px-3 py-1.5 text-ink hover:bg-secondary">
              {t("I got it right")}
            </button>
            <button type="button" onClick={() => selfCheck(false)} className="rounded-full border border-border bg-card px-3 py-1.5 text-ink hover:bg-secondary">
              {t("I made mistakes")}
            </button>
          </div>
        ) : null}
      </section>

      {/* The checker's verdict */}
      {mode === "result" && result && counts ? (
        <section className="andalus-card grid gap-3 px-5 py-4" aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-heading text-3xl text-grove">{Math.round(result.score * 100)}%</p>
            <p className="text-sm">
              {passed
                ? fromMemory
                  ? t("Excellent! Recited from memory.")
                  : prefs.level >= 3
                    ? t("Well done. You peeked, so try once more without help to count it as memorized.")
                    : t("Well done. Hide more words next.")
                : result.score >= 0.6
                  ? t("Close. Look at the marked words and try again.")
                  : t("Keep going. Read it a few more times, then try again.")}
            </p>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-teal">{t("{n} right", { n: counts.correct + counts.close })}</span>
            {counts.wrong ? <span className="text-[#b4472c]">{t("{n} wrong", { n: counts.wrong })}</span> : null}
            {counts.missed ? <span className="text-[#b4472c]">{t("{n} missed", { n: counts.missed })}</span> : null}
            {result.extra.length ? <span className="text-muted-foreground">{t("{n} extra", { n: result.extra.length })}</span> : null}
          </p>
          {mistakes.length ? (
            <ul className="grid gap-1.5 text-sm">
              {mistakes.slice(0, 12).map((m) => (
                <li key={`${m.word.ayah}:${m.word.index}`} className="flex flex-wrap items-baseline gap-x-2">
                  {prefs.scope === "range" ? <span className="text-xs text-muted-foreground">{t("Ayah {n}", { n: m.word.ayah })}</span> : null}
                  {m.status === "wrong" ? (
                    <>
                      <span>{t("You said")}</span>
                      <span lang="ar" dir="rtl" className="font-arabic text-lg text-[#b4472c] line-through">
                        {m.heard}
                      </span>
                      <span>{t("instead of")}</span>
                      <span lang="ar" dir="rtl" className="font-quran text-xl text-teal">
                        {m.word.text}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{t("You missed")}</span>
                      <span lang="ar" dir="rtl" className="font-quran text-xl text-teal">
                        {m.word.text}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {heard || typed ? (
            <p className="text-xs text-muted-foreground">
              {t("Heard:")}{" "}
              <span lang="ar" dir="rtl" className="font-arabic text-sm">
                {heard || typed}
              </span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("idle")
                resetTry()
              }}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium"
            >
              <RotateCcw className="size-4" aria-hidden /> {t("Try again")}
            </button>
            {passed && prefs.level < 4 ? (
              <button
                type="button"
                onClick={() => {
                  setPref({ level: (prefs.level + 1) as HideLevel })
                  setMode("idle")
                  resetTry()
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium"
              >
                <Eye className="size-4" aria-hidden /> {t("Hide more")}
              </button>
            ) : null}
            {prefs.scope === "ayah" && ayah < range.to ? (
              <button
                type="button"
                onClick={() => goTo(ayah + 1)}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-grove px-5 text-sm font-medium text-[#f6f1e6]"
              >
                {t("Next ayah")} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Moving between ayahs */}
      {prefs.scope === "ayah" ? (
        <nav aria-label={t("Ayahs")} className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(ayah - 1)}
            disabled={ayah <= range.from}
            className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm disabled:opacity-40"
          >
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("Previous")}
          </button>
          <span className="text-sm text-muted-foreground">{t("Ayah {n} of {total}", { n: ayah, total })}</span>
          <button
            type="button"
            onClick={() => goTo(ayah + 1)}
            disabled={ayah >= range.to}
            className="inline-flex h-11 items-center gap-1 rounded-full border border-border bg-card px-4 text-sm disabled:opacity-40"
          >
            {t("Next")} <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </button>
        </nav>
      ) : null}

      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{t("How the checker works")}</summary>
        <div className="mt-2 grid gap-2 leading-6">
          <p>
            {t("When you tap Recite, your device’s speech recognition turns your voice into text, and Mihrab compares it with the ayah word by word. Words you got right turn green, wrong words are marked red with what was heard, and skipped words are underlined.")}
          </p>
          <p>
            {t("It checks the words, not tajweed: it can’t judge elongation, nasalisation or how letters are pronounced. Recognition can also mishear a word now and then, so treat it as a helper alongside a teacher.")}
          </p>
          <p>
            {t("Depending on your device, the speech service may send the audio to its provider (such as Google) to recognise it. Mihrab doesn’t keep any audio; only your score for each ayah is saved on this device.")}
          </p>
        </div>
      </details>
    </div>
  )
}
