"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n"
import { intlLocale } from "@/lib/i18n/store"
import { cn } from "@/lib/utils"
import { EMPTY_ZAKAT, NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, zakatFor, type ZakatFields } from "@/lib/zakat"

const KEY = "mihrab.zakat.v1"
type Fields = ZakatFields
const EMPTY = EMPTY_ZAKAT

export function ZakatCalculator() {
  const { t } = useT()
  const [f, setF] = useState<Fields>(EMPTY)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from this device after hydration
      if (raw) setF({ ...EMPTY, ...(JSON.parse(raw) as Partial<Fields>) })
    } catch {
      // Start empty.
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify(f))
    } catch {
      // The figures still work for this visit.
    }
  }, [f, loaded])

  const set = (patch: Partial<Fields>) => setF((prev) => ({ ...prev, ...patch }))
  const { wealth, nisab, due } = zakatFor(f)
  const money = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 2 })
  const needsPrice = nisab === 0

  const field = (key: keyof Omit<Fields, "basis">, label: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`zakat-${key}`} className="text-sm text-ink">
        {label}
      </Label>
      <Input
        id={`zakat-${key}`}
        inputMode="decimal"
        placeholder="0"
        value={f[key]}
        onChange={(e) => set({ [key]: e.target.value.replace(/[^\d.,]/g, "") })}
        className="h-11 bg-card text-base tabular-nums"
      />
    </div>
  )

  return (
    <section className="andalus-card mt-6 px-5 py-6 sm:px-6" aria-labelledby="zakat-title">
      <h2 id="zakat-title" className="font-display text-3xl text-grove">
        {t("Zakat calculator")}
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t("Zakat is 2.5% of the wealth you have held for a full lunar year (hawl), once it reaches the nisab.")}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {field("cash", t("Cash and bank balances"))}
        {field("business", t("Trade goods and money owed to you"))}
        {field("gold", t("Gold, in grams"))}
        {field("goldPrice", t("Price of 1 g of gold"))}
        {field("silver", t("Silver, in grams"))}
        {field("silverPrice", t("Price of 1 g of silver"))}
        {field("debts", t("Debts due now"))}
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-ink">{t("Measure the nisab by")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["silver", t("Silver ({g} g)", { g: NISAB_SILVER_GRAMS })],
              ["gold", t("Gold ({g} g)", { g: NISAB_GOLD_GRAMS })],
            ] as const
          ).map(([basis, label]) => (
            <button
              key={basis}
              type="button"
              aria-pressed={f.basis === basis}
              onClick={() => set({ basis })}
              className={cn(
                "h-11 rounded-xl border text-sm",
                f.basis === basis ? "border-grove bg-grove text-primary-foreground" : "border-border bg-card",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gold/50 bg-gold/40 text-center">
        <div className="bg-card px-3 py-3">
          <dt className="text-xs text-muted-foreground">{t("Zakatable wealth")}</dt>
          <dd className="font-display text-2xl text-ink tabular-nums">{money.format(wealth)}</dd>
        </div>
        <div className="bg-card px-3 py-3">
          <dt className="text-xs text-muted-foreground">{t("Nisab")}</dt>
          <dd className="font-display text-2xl text-ink tabular-nums">{needsPrice ? "—" : money.format(nisab)}</dd>
        </div>
        <div className="col-span-2 bg-grove px-3 py-4 text-[#fbf1de]" aria-live="polite">
          <dt className="text-sm text-brass-bright">{t("Zakat due")}</dt>
          <dd className="font-display text-4xl tabular-nums">{money.format(due)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {needsPrice
          ? f.basis === "gold"
            ? t("Enter today’s price of a gram of gold to find the nisab.")
            : t("Enter today’s price of a gram of silver to find the nisab.")
          : wealth < nisab
            ? t("This is below the nisab, so no zakat is due on it.")
            : t("This has reached the nisab. Zakat is due once a full lunar year has passed over it.")}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {t("Use one currency for every amount. Mihrab does not fetch prices, so take them from a local jeweller or market. Scholars differ on details such as jewellery that is worn, so ask someone knowledgeable about your own case. Your figures stay on this device.")}
      </p>
    </section>
  )
}
