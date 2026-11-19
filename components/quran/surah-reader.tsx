"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LAST_READ_KEY, QURAN_PREFS_KEY } from "@/lib/quran-index"
import { cn } from "@/lib/utils"

type Prefs = { translation: boolean; size: number }
const SIZES = ["S", "M", "L", "XL"] as const
const DEFAULT_PREFS: Prefs = { translation: true, size: 1 }

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(QURAN_PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const v = JSON.parse(raw) as Partial<Prefs>
    return {
      translation: v.translation !== false,
      size: typeof v.size === "number" && v.size >= 0 && v.size < SIZES.length ? v.size : 1,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable in private windows; reading still works.
  }
}

export function SurahReader({ surahId, children }: { surahId: number; children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Preferences live in localStorage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(loadPrefs())
  }, [])

  const update = (next: Prefs) => {
    setPrefs(next)
    save(QURAN_PREFS_KEY, next)
  }

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-ayah]"))
    const visible = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.ayah)
          if (e.isIntersecting) visible.add(n)
          else visible.delete(n)
        }
        if (visible.size > 0) save(LAST_READ_KEY, { surah: surahId, ayah: Math.min(...visible) })
      },
      { rootMargin: "-80px 0px -40% 0px" },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [surahId])

  return (
    <div ref={ref} data-size={prefs.size} data-translation={prefs.translation ? "on" : "off"} className="quran-reader mt-6">
      <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Switch
            id="show-translation"
            checked={prefs.translation}
            onCheckedChange={(checked) => update({ ...prefs, translation: checked })}
          />
          <Label htmlFor="show-translation" className="text-sm">
            English meaning
          </Label>
        </div>
        <div role="group" aria-label="Arabic text size" className="flex gap-1">
          {SIZES.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-pressed={prefs.size === i}
              onClick={() => update({ ...prefs, size: i })}
              className={cn(
                "h-9 min-w-9 rounded-full px-2 text-sm font-medium",
                prefs.size === i ? "bg-grove text-[#f6f1e6]" : "text-ink hover:bg-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  )
}
