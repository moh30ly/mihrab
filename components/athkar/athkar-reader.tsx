"use client"

import { useEffect, useMemo, useState } from "react"
import { RotateCcw, Sun, Sunset } from "lucide-react"
import type { Dhikr } from "@/lib/athkar"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Period = "morning" | "evening"

function todayKey(period: Period) {
  const d = new Date()
  return `mihrab:athkar:${period}:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function loadProgress(period: Period): Record<number, number> {
  try {
    return JSON.parse(window.localStorage.getItem(todayKey(period)) ?? "{}") as Record<number, number>
  } catch {
    return {}
  }
}

function saveProgress(period: Period, value: Record<number, number>) {
  try {
    window.localStorage.setItem(todayKey(period), JSON.stringify(value))
  } catch {
    // Counting still works for this visit.
  }
}

export function AthkarReader({ morning, evening }: { morning: Dhikr[]; evening: Dhikr[] }) {
  const { t } = useT()
  const [period, setPeriod] = useState<Period>("morning")
  const [done, setDone] = useState<Record<number, number>>({})
  const [showEnglish, setShowEnglish] = useState(true)

  useEffect(() => {
    // Open on the evening athkar from mid-afternoon onward; read today's counts after hydration.
    const initial: Period = new Date().getHours() >= 15 ? "evening" : "morning"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriod(initial)
    setDone(loadProgress(initial))
  }, [])

  const list = period === "morning" ? morning : evening
  const finished = useMemo(() => list.filter((d) => (done[d.id] ?? 0) >= d.count).length, [list, done])

  const choose = (p: Period) => {
    setPeriod(p)
    setDone(loadProgress(p))
  }

  const tap = (d: Dhikr) => {
    const next = { ...done, [d.id]: Math.min(d.count, (done[d.id] ?? 0) + 1) }
    setDone(next)
    saveProgress(period, next)
  }

  const reset = () => {
    setDone({})
    saveProgress(period, {})
  }

  return (
    <div className="mt-6">
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 rounded-[1.5rem] border border-border bg-card/95 p-1.5 backdrop-blur">
        <div role="tablist" aria-label={t("Morning or evening")} className="flex gap-1">
          {(
            [
              ["morning", "Morning", "الصباح", Sun],
              ["evening", "Evening", "المساء", Sunset],
            ] as const
          ).map(([value, label, arabic, Icon]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={period === value}
              onClick={() => choose(value)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium",
                period === value ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(label)}
              <span lang="ar" className="font-arabic">
                {arabic}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pe-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {finished}/{list.length}
          </span>
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => setShowEnglish((v) => !v)}>
            {showEnglish ? t("Hide English") : t("Show English")}
          </button>
          <button type="button" aria-label={t("Start again")} className="rounded-full p-2 hover:bg-secondary" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <ol className="mt-4 grid gap-3">
        {list.map((d) => {
          const count = done[d.id] ?? 0
          const complete = count >= d.count
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => tap(d)}
                aria-label={t("Count this dhikr, {count} of {total}", { count, total: d.count })}
                className={cn(
                  "block w-full rounded-[1.5rem] border bg-card px-5 py-5 text-start transition-colors",
                  complete ? "border-grove/40 bg-[#eef2ea] opacity-80" : "border-border hover:border-brass",
                )}
              >
                {d.note ? <span className="text-xs tracking-wide text-brass uppercase">{t(d.note)}</span> : null}
                <p lang="ar" dir="rtl" className="font-arabic mt-1 text-2xl leading-[2.1] text-ink">
                  {d.arabic}
                </p>
                {showEnglish ? <p className="mt-3 text-base leading-7 text-muted-foreground">{d.english}</p> : null}
                <span className="mt-4 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex h-9 min-w-16 items-center justify-center rounded-full px-3 text-sm font-medium tabular-nums",
                      complete ? "bg-grove text-[#f6f1e6]" : "bg-secondary text-grove",
                    )}
                  >
                    {complete ? t("Done") : `${count} / ${d.count}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d.count === 1 ? t("Once") : t("{n} times", { n: d.count })}
                  </span>
                </span>
              </button>
              <details className="px-5 pt-1 text-xs leading-5 text-muted-foreground">
                <summary className="cursor-pointer py-1">{t("Source")}</summary>
                {d.reference}
              </details>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
