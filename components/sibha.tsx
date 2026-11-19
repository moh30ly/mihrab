"use client"

import { useEffect, useState } from "react"
import { RotateCcw, Vibrate, VibrateOff } from "lucide-react"
import { SpeakButton } from "@/components/speak-button"
import { AFTER_PRAYER_SEQUENCE, DEFAULT_SIBHA, SIBHA_PHRASES, TARGETS, currentStep, loadSibha, saveSibha, tapSibha, type SibhaState } from "@/lib/sibha"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Vibration isn't available here.
  }
}

const chip = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center rounded-full border px-3 text-sm whitespace-nowrap",
    active ? "border-grove bg-grove text-[#f6f1e6]" : "border-border bg-card text-ink hover:border-gold hover:bg-secondary",
  )

export function Sibha() {
  const { t, locale } = useT()
  const [state, setState] = useState<SibhaState>(DEFAULT_SIBHA)
  const [ready, setReady] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    // The count lives in this browser; read it after hydration.
    const saved = loadSibha()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(saved)
    setCustomOpen(!TARGETS.includes(saved.target as (typeof TARGETS)[number]))
    setReady(true)
  }, [])

  const update = (next: SibhaState) => {
    setState(next)
    saveSibha(next)
  }

  const { phrase, target } = currentStep(state)
  const afterPrayer = state.mode === "after-prayer"
  const sequenceDone = afterPrayer && state.rounds > 0 && state.rounds % AFTER_PRAYER_SEQUENCE.length === 0 && state.count === 0

  const tap = () => {
    const { next, reached } = tapSibha(state)
    update(next)
    if (state.vibrate) buzz(reached ? [90, 60, 90] : 12)
    if (reached) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 450)
    }
  }

  const choose = (mode: string) => update({ ...state, mode, count: 0, rounds: 0 })
  const setTarget = (value: number) => update({ ...state, target: value, count: 0, rounds: 0 })
  const reset = () => update({ ...state, count: 0, rounds: 0 })

  return (
    <div className="mt-6">
      <nav aria-label={t("What to count")} className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap sm:justify-center">
          <li>
            <button type="button" className={chip(afterPrayer)} aria-pressed={afterPrayer} onClick={() => choose("after-prayer")}>
              {t("After prayer 33·33·34")}
            </button>
          </li>
          {SIBHA_PHRASES.map((p) => (
            <li key={p.id}>
              <button type="button" className={chip(state.mode === p.id)} aria-pressed={state.mode === p.id} onClick={() => choose(p.id)}>
                {t(p.name)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {!afterPrayer ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t("Target")}>
          <span className="text-sm text-muted-foreground">{t("Target")}</span>
          {TARGETS.map((n) => (
            <button
              key={n}
              type="button"
              className={chip(!customOpen && state.target === n)}
              aria-pressed={!customOpen && state.target === n}
              onClick={() => {
                setCustomOpen(false)
                setTarget(n)
              }}
            >
              {n === 0 ? t("No limit") : n}
            </button>
          ))}
          <button type="button" className={chip(customOpen)} aria-pressed={customOpen} onClick={() => setCustomOpen(true)}>
            {t("Custom")}
          </button>
          {customOpen ? (
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              aria-label={t("Custom target")}
              className="h-9 w-24 rounded-full border border-border bg-card px-3 text-center text-sm text-ink tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
              value={state.target || ""}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value))
                if (Number.isFinite(n) && n >= 1 && n <= 100000) setTarget(n)
              }}
            />
          ) : null}
        </div>
      ) : (
        <ol className="mt-3 flex justify-center gap-2 text-sm" aria-label={t("After prayer 33·33·34")}>
          {AFTER_PRAYER_SEQUENCE.map((s, i) => {
            const active = state.rounds % AFTER_PRAYER_SEQUENCE.length === i
            const p = SIBHA_PHRASES.find((x) => x.id === s.phrase)!
            return (
              <li key={s.phrase} className={cn("rounded-full px-3 py-1", active ? "bg-accent text-grove" : "text-muted-foreground")}>
                {t(p.name)} {s.count}
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={tap}
          disabled={!ready}
          aria-label={t("Count {phrase}. {count} so far.", { phrase: t(phrase.name), count: state.count })}
          className={cn(
            "relative flex aspect-square w-[min(70vw,18rem)] touch-manipulation flex-col items-center justify-center rounded-full border-[6px] border-gold/70 bg-grove text-[#f6f1e6] shadow-lg select-none transition-transform active:scale-[0.97]",
            flash && "ring-8 ring-gold/60",
          )}
        >
          <span lang="ar" dir="rtl" className="font-arabic px-6 text-center text-2xl leading-snug text-brass-bright">
            {phrase.arabic}
          </span>
          <span className="mt-2 font-display text-7xl leading-none tabular-nums">{state.count}</span>
          <span className="mt-2 text-sm text-[#f6f1e6]/80 tabular-nums">
            {target > 0 ? t("of {n}", { n: target }) : t("Tap to count")}
          </span>
        </button>
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground" aria-live="polite">
        {sequenceDone
          ? t("Tasbih after prayer complete. May Allah accept it.")
          : target > 0 && state.rounds > 0 && !afterPrayer
            ? t("{n} rounds completed", { n: state.rounds })
            : locale === "ar"
              ? null
              : phrase.english}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-grove hover:border-gold hover:bg-secondary"
        >
          <RotateCcw className="size-4" aria-hidden />
          {t("Reset")}
        </button>
        <button
          type="button"
          aria-pressed={state.vibrate}
          onClick={() => update({ ...state, vibrate: !state.vibrate })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm text-grove hover:border-gold hover:bg-secondary"
        >
          {state.vibrate ? <Vibrate className="size-4" aria-hidden /> : <VibrateOff className="size-4" aria-hidden />}
          {state.vibrate ? t("Vibration on") : t("Vibration off")}
        </button>
        <SpeakButton text={phrase.arabic} />
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground tabular-nums">{t("All-time count: {n}", { n: state.total })}</p>
    </div>
  )
}
