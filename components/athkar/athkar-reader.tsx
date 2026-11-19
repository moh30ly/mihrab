"use client"

import { useEffect, useMemo, useState } from "react"
import { HandHeart, RotateCcw, ShieldCheck, Sun, Sunset } from "lucide-react"
import { DuasList, RuqyaList } from "@/components/athkar/duas-list"
import type { Dhikr } from "@/lib/athkar"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

type Period = "morning" | "evening"
type Tab = Period | "duas" | "ruqya"
const isReading = (tab: Tab) => tab === "duas" || tab === "ruqya"

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
  const [tab, setTab] = useState<Tab>("morning")
  const period: Period = tab === "evening" ? "evening" : "morning"
  const [done, setDone] = useState<Record<number, number>>({})
  const [showEnglish, setShowEnglish] = useState(true)

  useEffect(() => {
    // Open on the evening athkar from mid-afternoon onward (or on the duas when the link asks
    // for them); read today's counts after hydration.
    const initial: Period = new Date().getHours() >= 15 ? "evening" : "morning"
    const hash = window.location.hash
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(hash.startsWith("#ruqya") ? "ruqya" : hash.startsWith("#dua") ? "duas" : initial)
    setDone(loadProgress(initial))
  }, [])

  const list = period === "morning" ? morning : evening
  const finished = useMemo(() => list.filter((d) => (done[d.id] ?? 0) >= d.count).length, [list, done])

  const choose = (next: Tab) => {
    setTab(next)
    if (!isReading(next)) setDone(loadProgress(next as Period))
    const hash = isReading(next) ? `#${next}` : ""
    if (window.location.hash !== hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`)
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
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 rounded-[1.5rem] border border-gold/50 bg-card/95 p-1.5 shadow-sm backdrop-blur">
        <div role="tablist" aria-label={t("Athkar and duas")} className="flex w-full gap-1 sm:w-auto">
          {(
            [
              ["morning", "Morning", "الصباح", Sun],
              ["evening", "Evening", "المساء", Sunset],
              ["duas", "Duas", "الأدعية", HandHeart],
              ["ruqya", "Ruqya", "الرقية", ShieldCheck],
            ] as const
          ).map(([value, label, arabic, Icon]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={tab === value}
              onClick={() => choose(value)}
              className={cn(
                "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium sm:flex-none sm:gap-2 sm:px-4",
                tab === value ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              <Icon className="size-4 shrink-0 max-[420px]:hidden" aria-hidden />
              {t(label)}
              <span lang="ar" className="font-arabic max-sm:hidden">
                {arabic}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pe-2 text-sm text-muted-foreground">
          {!isReading(tab) ? (
            <span className="tabular-nums">
              {finished}/{list.length}
            </span>
          ) : null}
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => setShowEnglish((v) => !v)}>
            {showEnglish ? t("Hide English") : t("Show English")}
          </button>
          {!isReading(tab) ? (
            <button type="button" aria-label={t("Start again")} className="rounded-full p-2 hover:bg-secondary" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {tab === "duas" ? <DuasList showEnglish={showEnglish} /> : null}
      {tab === "ruqya" ? <RuqyaList showEnglish={showEnglish} /> : null}
      <ol className={cn("mt-4 grid gap-3", isReading(tab) && "hidden")}>
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
                  "andalus-card block w-full px-5 py-5 text-start transition-colors",
                  complete ? "bg-accent opacity-80" : "hover:bg-accent/60",
                )}
              >
                {d.note ? <span className="text-xs tracking-wide text-brass uppercase">{t(d.note)}</span> : null}
                <p lang="ar" dir="rtl" className="font-arabic mt-1 text-2xl leading-[2.1] text-ink">
                  {d.arabic}
                </p>
                {showEnglish ? (
                  <p lang="en" dir="ltr" className="mt-3 text-start text-base leading-7 text-muted-foreground">
                    {d.english}
                  </p>
                ) : null}
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
