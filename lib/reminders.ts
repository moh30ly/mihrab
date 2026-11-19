export const REMINDER_WINDOW_MS = 3 * 60 * 1000

export function isInsideReminderWindow(
  now: number,
  prayerAt: number,
  leadMinutes: number,
  windowMs = REMINDER_WINDOW_MS,
) {
  const start = prayerAt - leadMinutes * 60_000
  return now >= start && now < start + windowMs
}

export function reminderStorageKey(civilDate: string, prayer: string, leadMinutes: number) {
  return `${civilDate}:${prayer}:${leadMinutes}`
}

export function pruneFiredKeys(keys: string[], today: string) {
  const cutoff = shiftCivilDate(today, -2)
  return keys.filter((key) => key.slice(0, 10) >= cutoff)
}

function shiftCivilDate(civilDate: string, days: number) {
  const [year, month, day] = civilDate.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  const y = shifted.getUTCFullYear()
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0")
  const d = String(shifted.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
