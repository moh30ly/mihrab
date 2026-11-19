"use client"

import { useEffect, useState } from "react"
import { Check, HeartHandshake, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { goodDeedFor, loadDone, markDone, type GoodDeed } from "@/lib/good-deeds"
import { useT } from "@/lib/i18n"

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** A daily nudge toward a good deed, with the hadith or verse behind it. */
export function GoodDeedCard({ className }: { className?: string }) {
  const { t } = useT()
  const [skip, setSkip] = useState(0)
  const [deed, setDeed] = useState<GoodDeed | null>(null)
  const [done, setDone] = useState<string[]>([])

  useEffect(() => {
    // Today's nudge depends on the visitor's date; pick it after hydration.
    const now = new Date()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeed(goodDeedFor(now, skip))
    setDone(loadDone()[dateKey(now)] ?? [])
  }, [skip])

  if (!deed) return null
  const isDone = done.includes(deed.id)

  return (
    <section aria-labelledby="good-deed-title" className={`andalus-card px-4 py-4 sm:px-5 ${className ?? ""}`}>
      <p className="flex items-center gap-2 text-xs tracking-wide text-brass uppercase">
        <HeartHandshake className="size-4" aria-hidden />
        {t("A good deed for today")}
      </p>
      <h2 id="good-deed-title" className="mt-1 font-display text-2xl leading-tight text-grove">
        {t(deed.question)}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        “{t(deed.reason)}” <span className="whitespace-nowrap">({deed.reference})</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isDone ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-grove" role="status">
            <Check className="size-4" aria-hidden />
            {t("Alhamdulillah. May Allah accept it from you.")}
          </p>
        ) : (
          <Button type="button" className="h-10" onClick={() => setDone(markDone(dateKey(new Date()), deed.id)[dateKey(new Date())] ?? [])}>
            <Check className="size-4" aria-hidden />
            {t("I did it")}
          </Button>
        )}
        <Button type="button" variant="ghost" className="h-10" onClick={() => setSkip((s) => s + 1)}>
          <RefreshCw className="size-4" aria-hidden />
          {t("Show another")}
        </Button>
      </div>
    </section>
  )
}
