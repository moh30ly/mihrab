// Zakat on savings, gold, silver and trade goods, measured against the nisab.
export const NISAB_GOLD_GRAMS = 85
export const NISAB_SILVER_GRAMS = 595
export const ZAKAT_RATE = 0.025

export type ZakatFields = {
  cash: string
  gold: string
  silver: string
  goldPrice: string
  silverPrice: string
  business: string
  debts: string
  basis: "silver" | "gold"
}

export const EMPTY_ZAKAT: ZakatFields = { cash: "", gold: "", silver: "", goldPrice: "", silverPrice: "", business: "", debts: "", basis: "silver" }

function num(value: string) {
  const n = Number(value.replace(",", "."))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function zakatFor(f: ZakatFields) {
  const metals = num(f.gold) * num(f.goldPrice) + num(f.silver) * num(f.silverPrice)
  const wealth = Math.max(0, num(f.cash) + metals + num(f.business) - num(f.debts))
  const nisab = f.basis === "gold" ? NISAB_GOLD_GRAMS * num(f.goldPrice) : NISAB_SILVER_GRAMS * num(f.silverPrice)
  const due = nisab > 0 && wealth >= nisab ? wealth * ZAKAT_RATE : 0
  return { wealth, nisab, due }
}
