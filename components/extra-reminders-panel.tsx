"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { HIJRI_MONTHS, WEEKDAYS, nextZakatDate } from "@/lib/extra-reminders"
import { formatGregorian } from "@/lib/format"
import type { ExtraReminders, Place, Settings } from "@/lib/types"

const selectClass =
  "h-10 rounded-xl border border-border bg-card px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-ring"

export function ExtraRemindersPanel({
  place,
  settings,
  onChange,
}: {
  place: Place
  settings: Settings
  onChange: (next: Settings) => void
}) {
  const x = settings.extras
  const set = (patch: Partial<ExtraReminders>) => onChange({ ...settings, extras: { ...x, ...patch } })
  const nextZakat = useMemo(
    () => (x.zakat ? nextZakatDate(place, x.zakatMonth, x.zakatDay) : null),
    [place, x.zakat, x.zakatMonth, x.zakatDay],
  )

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="font-heading text-xl text-grove">Also remind me</h3>
      <ul className="mt-2 divide-y divide-border">
        <Row id="duha" label="Duha prayer" hint="About 20 minutes after sunrise." checked={x.duha} onChange={(v) => set({ duha: v })} />
        <Row
          id="athkar-morning"
          label="Morning athkar"
          hint={
            <>
              20 minutes after Fajr. <Link className="underline underline-offset-2" href="/athkar/">Read them</Link>
            </>
          }
          checked={x.athkarMorning}
          onChange={(v) => set({ athkarMorning: v })}
        />
        <Row
          id="athkar-evening"
          label="Evening athkar"
          hint="20 minutes after Asr."
          checked={x.athkarEvening}
          onChange={(v) => set({ athkarEvening: v })}
        />
        <Row id="sadaqah" label="Weekly sadaqah" hint="At 10:00 on the day you choose." checked={x.sadaqah} onChange={(v) => set({ sadaqah: v })}>
          {x.sadaqah ? (
            <select
              aria-label="Sadaqah day"
              className={selectClass}
              value={x.sadaqahDay}
              onChange={(e) => set({ sadaqahDay: Number(e.target.value) })}
            >
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          ) : null}
        </Row>
        <Row
          id="zakat"
          label="Yearly zakat"
          hint="On the Hijri date your zakat year (hawl) ends, at 10:00."
          checked={x.zakat}
          onChange={(v) => set({ zakat: v })}
        >
          {x.zakat ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Zakat day"
                className={selectClass}
                value={x.zakatDay}
                onChange={(e) => set({ zakatDay: Number(e.target.value) })}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                aria-label="Zakat month"
                className={selectClass}
                value={x.zakatMonth}
                onChange={(e) => set({ zakatMonth: Number(e.target.value) })}
              >
                {HIJRI_MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              {nextZakat ? (
                <span className="text-sm text-muted-foreground">Next: {formatGregorian(nextZakat, place.timezone)}</span>
              ) : null}
            </div>
          ) : null}
        </Row>
      </ul>
      {!settings.remindersEnabled && (x.duha || x.athkarMorning || x.athkarEvening || x.sadaqah || x.zakat) ? (
        <p className="mt-2 text-sm text-muted-foreground">Turn on reminders above for these to arrive.</p>
      ) : null}
    </div>
  )
}

function Row({
  id,
  label,
  hint,
  checked,
  onChange,
  children,
}: {
  id: string
  label: string
  hint: React.ReactNode
  checked: boolean
  onChange: (value: boolean) => void
  children?: React.ReactNode
}) {
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label htmlFor={`extra-${id}`} className="text-sm font-medium text-ink">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <Switch id={`extra-${id}`} checked={checked} onCheckedChange={onChange} />
      </div>
      {children ? <div className="mt-2">{children}</div> : null}
    </li>
  )
}
