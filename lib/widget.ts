"use client"

// The Android home-screen widget is native, so it can't run this app's code.
// Instead the app hands it a snapshot: the prayer times for the coming weeks,
// already formatted in the chosen language, with the Hijri date and the
// good deed of each day. The widget picks the next prayer from it on its own
// and only needs the app again when the snapshot runs out.
import { Capacitor, registerPlugin } from "@capacitor/core"
import { formatHijri, formatPrayerTime } from "@/lib/format"
import { goodDeedFor } from "@/lib/good-deeds"
import { localeInfo, type Locale } from "@/lib/i18n/locales"
import { translate } from "@/lib/i18n/translate"
import { PRAYER_INFO } from "@/lib/methods"
import { civilKey, dateForCivilDay, dayTimes, timesAreOrdered } from "@/lib/prayer"
import { OBLIGATORY_KEYS, type Place, type Settings } from "@/lib/types"

/** How many days of times the widget gets. It asks for the app after that. */
export const WIDGET_DAYS = 30

export type WidgetDay = {
  /** Civil date in the place's time zone, yyyy-mm-dd. */
  date: string
  hijri: string
  /** Fajr, Dhuhr, Asr, Maghrib and Isha as epoch milliseconds. */
  at: number[]
  /** The same five times as shown in the app. */
  times: string[]
  deed: string
}

export type WidgetSnapshot = {
  version: 1
  locale: Locale
  rtl: boolean
  place: string
  timezone: string
  names: string[]
  labels: { next: string; tomorrow: string; deed: string; stale: string }
  days: WidgetDay[]
}

export function buildWidgetSnapshot(place: Place, settings: Settings, locale: Locale, now = new Date()): WidgetSnapshot {
  const t = (key: string) => translate(locale, key)
  const days: WidgetDay[] = []
  for (let day = 0; day < WIDGET_DAYS; day++) {
    const times = dayTimes(place, settings, day, now)
    if (!timesAreOrdered(times)) continue
    const noon = dateForCivilDay(place.timezone, day, now)
    days.push({
      date: civilKey(place.timezone, times.dhuhr),
      hijri: formatHijri(times.dhuhr, place.timezone),
      at: OBLIGATORY_KEYS.map((key) => times[key].getTime()),
      times: OBLIGATORY_KEYS.map((key) => formatPrayerTime(times[key], place.timezone)),
      // The same nudge the Prayer page shows that day.
      deed: t(goodDeedFor(noon).question),
    })
  }
  return {
    version: 1,
    locale,
    rtl: localeInfo(locale).dir === "rtl",
    place: place.label,
    timezone: place.timezone,
    names: OBLIGATORY_KEYS.map((key) => t(PRAYER_INFO[key].name)),
    labels: {
      next: t("Next prayer"),
      tomorrow: t("Tomorrow"),
      deed: t("A good deed for today"),
      stale: t("Open Mihrab to update the prayer times."),
    },
    days,
  }
}

type WidgetPlugin = { update(options: { data: string }): Promise<void> }

const MihrabWidget = registerPlugin<WidgetPlugin>("MihrabWidget")

let last = ""

/** Sends the snapshot to the widget. Does nothing on the website or when nothing changed. */
export async function syncWidget(place: Place | null, settings: Settings, locale: Locale) {
  // Without a place the widget keeps what it last had, or asks for one.
  if (!place || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return
  const data = JSON.stringify(buildWidgetSnapshot(place, settings, locale))
  if (data === last) return
  await MihrabWidget.update({ data })
  last = data
}
