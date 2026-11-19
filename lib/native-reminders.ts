"use client"

// On the Android app the WebView has no Notification API and stops when closed,
// so reminders are scheduled as native local notifications for the coming days.
import { Capacitor } from "@capacitor/core"
import { formatPrayerTime } from "@/lib/format"
import { PRAYER_INFO } from "@/lib/methods"
import { dayTimes, timesAreOrdered, validDate } from "@/lib/prayer"
import { OBLIGATORY_KEYS, type Place, type Settings } from "@/lib/types"

export const NATIVE_DAYS_AHEAD = 7

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

async function plugin() {
  const { LocalNotifications } = await import("@capacitor/local-notifications")
  return LocalNotifications
}

export async function nativePermission(request: boolean): Promise<NotificationPermission> {
  const ln = await plugin()
  let status = await ln.checkPermissions()
  if (request && status.display !== "granted" && status.display !== "denied") {
    status = await ln.requestPermissions()
  }
  return status.display === "granted" ? "granted" : status.display === "denied" ? "denied" : "default"
}

export type NativeReminder = { id: number; at: Date; title: string; body: string }

export function buildNativeReminders(place: Place, settings: Settings, now = new Date()): NativeReminder[] {
  if (!settings.remindersEnabled) return []
  const leads = settings.leadMinutes > 0 ? [settings.leadMinutes, 0] : [0]
  const out: NativeReminder[] = []
  for (let day = 0; day < NATIVE_DAYS_AHEAD; day++) {
    const times = dayTimes(place, settings, day, now)
    if (!timesAreOrdered(times)) continue
    OBLIGATORY_KEYS.forEach((key, prayerIndex) => {
      const at = times[key]
      if (!settings.prayers[key] || !validDate(at)) return
      const name = PRAYER_INFO[key].name
      const when = formatPrayerTime(at, place.timezone)
      leads.forEach((lead) => {
        const fireAt = new Date(at.getTime() - lead * 60_000)
        if (fireAt.getTime() <= now.getTime() + 5_000) return
        out.push({
          id: 1000 + day * 100 + prayerIndex * 10 + (lead === 0 ? 0 : 1),
          at: fireAt,
          title: lead === 0 ? `It's time for ${name}` : `${name} in ${lead} minutes`,
          body: `${name} at ${when} · ${place.label}`,
        })
      })
    })
  }
  return out
}

export async function syncNativeReminders(place: Place | null, settings: Settings) {
  if (!isNativeApp()) return
  const ln = await plugin()
  const pending = await ln.getPending()
  if (pending.notifications.length > 0) {
    await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }
  if (!place) return
  const reminders = buildNativeReminders(place, settings)
  if (reminders.length === 0) return
  if ((await nativePermission(false)) !== "granted") return
  await ln.schedule({
    notifications: reminders.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      schedule: { at: r.at, allowWhileIdle: true },
    })),
  })
}
