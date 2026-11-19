import athkar from "@/data/athkar.json"

export type Dhikr = {
  id: number
  when: "morning" | "evening" | "both"
  count: number
  note: string | null
  arabic: string
  english: string
  reference: string
}

export const ATHKAR = athkar as Dhikr[]

export function athkarFor(period: "morning" | "evening") {
  return ATHKAR.filter((d) => d.when === "both" || d.when === period)
}
