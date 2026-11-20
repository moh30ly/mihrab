"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { LocateFixed, Search } from "lucide-react"
import { CalculationSheet } from "@/components/calculation-sheet"
import { CityPicker } from "@/components/city-picker"
import { QiblaTeaser } from "@/components/qibla-compass"
import { ArchFrame, Frieze } from "@/components/ornament"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { loadCities, placeFromDevice } from "@/lib/cities"
import {
  formatClock,
  formatCoordinates,
  formatDistance,
  formatGregorian,
  formatHijri,
  formatPrayerTime,
  formatRemaining,
  formatRemainingShort,
  hijriMonth,
  timeZoneParts,
} from "@/lib/format"
import { madhabById, methodById, PRAYER_INFO } from "@/lib/methods"
import { isNativeApp, nativePermission, syncNativeReminders } from "@/lib/native-reminders"
import { syncWidget } from "@/lib/widget"
import { primeTone, sendNotification } from "@/lib/notify"
import {
  civilKey,
  currentObligatory,
  dayTimes,
  distanceToKaabaKm,
  nextObligatory,
  previousMark,
  qiblaBearing,
  timesAreOrdered,
  validDate,
} from "@/lib/prayer"
import { isInsideReminderWindow, reminderStorageKey } from "@/lib/reminders"
import { duhaWindow, extraEventsForDay, zakatEvent, type ExtraEvent } from "@/lib/extra-reminders"
import { ExtraRemindersPanel } from "@/components/extra-reminders-panel"
import { GoodDeedCard } from "@/components/good-deed-card"
import { ContinueReading } from "@/components/quran/continue-reading"
import {
  commitPlace,
  commitSettings,
  getClientReady,
  getDeviceZone,
  getNotificationPermission,
  getPersistedServerSnapshot,
  getPersistedSnapshot,
  getServerReady,
  loadFired,
  saveFired,
  subscribeClient,
  subscribePersisted,
} from "@/lib/storage"
import { OBLIGATORY_KEYS, PRAYER_KEYS, type DayTimes, type Place, type Settings } from "@/lib/types"
import { cn } from "@/lib/utils"
import { tNow, useT } from "@/lib/i18n"
import { locationErrorMessage, readDevicePosition } from "@/lib/locate"

type Schedule =
  | { error: true }
  | { error: false; today: DayTimes; tomorrow: DayTimes; yesterday: DayTimes }

type Notice = { key: string; title: string; body: string }

const LEADS = [
  [0, "At the time"],
  [5, "5 min before"],
  [10, "10 min before"],
  [15, "15 min before"],
] as const

export function MihrabApp() {
  const { t, locale } = useT()
  const clientReady = useSyncExternalStore(subscribeClient, getClientReady, getServerReady)
  const persisted = useSyncExternalStore(subscribePersisted, getPersistedSnapshot, getPersistedServerSnapshot)
  const deviceZone = useSyncExternalStore(subscribeClient, getDeviceZone, () => null)
  const storedPermission = useSyncExternalStore(
    subscribeClient,
    getNotificationPermission,
    () => "default" as const,
  )
  const place = persisted.place
  const settings = persisted.settings
  const [now, setNow] = useState<number | null>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [permissionOverride, setPermissionOverride] = useState<NotificationPermission | "unsupported" | null>(null)
  const permission = permissionOverride ?? storedPermission
  const [dismissed, setDismissed] = useState<string | null>(null)
  const firedRef = useRef<Set<string>>(new Set())
  const contextRef = useRef({ place, settings, schedule: null as Schedule | null, extras: [] as ExtraEvent[] })

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [])

  const dayKey = place && now != null ? civilKey(place.timezone, new Date(now)) : ""

  const schedule = useMemo<Schedule | null>(() => {
    if (!place || !dayKey) return null
    try {
      const instant = new Date()
      const today = dayTimes(place, settings, 0, instant)
      const tomorrow = dayTimes(place, settings, 1, instant)
      const yesterday = dayTimes(place, settings, -1, instant)
      if (!timesAreOrdered(today) || !timesAreOrdered(tomorrow) || !timesAreOrdered(yesterday)) {
        return { error: true }
      }
      return { error: false, today, tomorrow, yesterday }
    } catch {
      return { error: true }
    }
  }, [place, settings, dayKey])

  const extras = useMemo<ExtraEvent[]>(() => {
    if (!place || !dayKey) return []
    try {
      const instant = new Date()
      const list = [...extraEventsForDay(place, settings, 0, instant), ...extraEventsForDay(place, settings, 1, instant)]
      const zakat = zakatEvent(place, settings, instant)
      if (zakat) list.push(zakat)
      return list
    } catch {
      return []
    }
  }, [place, settings, dayKey])

  useEffect(() => {
    contextRef.current = { place, settings, schedule, extras }
  }, [place, settings, schedule, extras])

  useEffect(() => {
    if (!dayKey) return
    firedRef.current = loadFired(dayKey)
  }, [dayKey])

  useEffect(() => {
    const id = window.setInterval(() => {
      const current = contextRef.current
      if (!current.place || !current.schedule || current.schedule.error || !current.settings.remindersEnabled) {
        return
      }
      const instant = Date.now()
      const todayKey = civilKey(current.place.timezone, new Date(instant))
      const events = [
        ...OBLIGATORY_KEYS.map((key) => ({ key, at: current.schedule && !current.schedule.error ? current.schedule.today[key] : null })),
        { key: "fajr" as const, at: current.schedule.tomorrow.fajr },
      ]
      const leads = current.settings.leadMinutes > 0 ? [current.settings.leadMinutes, 0] : [0]
      let changed = false
      for (const event of events) {
        if (!event.at || !validDate(event.at) || !current.settings.prayers[event.key]) continue
        for (const lead of leads) {
          const storageKey = reminderStorageKey(
            civilKey(current.place.timezone, event.at),
            event.key,
            lead,
          )
          if (!isInsideReminderWindow(instant, event.at.getTime(), lead) || firedRef.current.has(storageKey)) {
            continue
          }
          firedRef.current.add(storageKey)
          changed = true
          const name = tNow(PRAYER_INFO[event.key].name)
          const when = formatPrayerTime(event.at, current.place.timezone)
          sendNotification(
            lead === 0 ? tNow("It's time for {name}", { name }) : tNow("{name} in {n} minutes", { name, n: lead }),
            tNow("{name} at {time} · {place}", { name, time: when, place: current.place.label }),
            storageKey,
            current.settings.tone,
          )
        }
      }
      for (const extra of current.extras) {
        const storageKey = reminderStorageKey(civilKey(current.place.timezone, extra.at), extra.hour == null ? extra.key : `${extra.key}${extra.hour}`, 0)
        if (!isInsideReminderWindow(instant, extra.at.getTime(), 0) || firedRef.current.has(storageKey)) continue
        firedRef.current.add(storageKey)
        changed = true
        sendNotification(extra.title, extra.body, storageKey, current.settings.tone)
      }
      if (changed) saveFired(firedRef.current, todayKey)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      document.title = "Mihrab — Qibla and prayer times"
    }
  }, [])

  function updateSettings(next: Settings) {
    commitSettings(next)
  }

  function adopt(next: Place) {
    commitPlace(next)
    setGeoMessage(null)
  }

  async function locate() {
    setLocating(true)
    setGeoMessage(null)
    try {
      const position = await readDevicePosition()
      let cities = null
      try {
        cities = await loadCities()
      } catch {
        cities = null
      }
      adopt(
        placeFromDevice(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy,
          cities,
        ),
      )
    } catch (error) {
      setGeoMessage(locationErrorMessage(error))
    } finally {
      setLocating(false)
    }
  }

  useEffect(() => {
    if (!isNativeApp()) return
    void nativePermission(false).then(setPermissionOverride).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isNativeApp()) return
    void syncNativeReminders(place, settings).catch(() => {})
  }, [place, settings, dayKey])

  useEffect(() => {
    if (!isNativeApp() || !clientReady) return
    void syncWidget(place, settings, locale).catch(() => {})
  }, [place, settings, locale, dayKey, clientReady])

  async function toggleReminders(enabled: boolean) {
    updateSettings({ ...settings, remindersEnabled: enabled })
    if (enabled && isNativeApp()) {
      try {
        setPermissionOverride(await nativePermission(true))
      } catch {
        setPermissionOverride("unsupported")
      }
      return
    }
    if (!enabled || typeof Notification === "undefined") return
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission()
      setPermissionOverride(result)
    } else {
      setPermissionOverride(Notification.permission)
    }
  }

  const times = schedule && !schedule.error ? schedule : null
  const ready = clientReady && now != null && place && times
  const next = ready ? nextObligatory(times.today, times.tomorrow, now) : null
  const current = ready ? currentObligatory(times.today, now) : null

  useEffect(() => {
    if (!next || now == null) return
    document.title = `${tNow(PRAYER_INFO[next.key].name)} ${formatRemainingShort(next.at.getTime() - now)} · Mihrab`
  }, [next, now])

  const notice = ready && now != null ? buildNotice(times, place, settings, now) ?? extraNotice(extras, place, settings, now) : null
  const visibleNotice = notice && notice.key !== dismissed ? notice : null
  const zone = place && now != null ? timeZoneParts(place.timezone, new Date(now)) : null
  const deviceLabel = deviceZone && now != null ? timeZoneParts(deviceZone, new Date(now)) : null
  const ramadan = place && now != null && hijriMonth(new Date(now), place.timezone) === 9
  const bearing = place ? qiblaBearing(place.latitude, place.longitude) : 0
  const distance = place ? formatDistance(distanceToKaabaKm(place.latitude, place.longitude)) : ""

  let progress = 0
  if (ready && next && now != null) {
    const previous = previousMark(next.key, next.tomorrow, times.yesterday, times.today)
    const span = next.at.getTime() - previous.getTime()
    progress = span <= 0 ? 0 : Math.min(1, Math.max(0, (now - previous.getTime()) / span))
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-5 pb-10 sm:px-6">
      <header className="text-center">
        <p lang="ar" dir="rtl" className="font-arabic text-2xl text-brass sm:text-3xl">
          بسم الله الرحمن الرحيم
        </p>
        <h1 className="sr-only">Mihrab</h1>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          {t("Qibla and the five daily prayers, in the time zone of where you are.")}
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-md" />

      <div className="mt-5">
        {!clientReady || now == null ? (
          <div className="alfiz h-96 animate-pulse" />
        ) : !place ? (
          <>
            <Welcome locating={locating} message={geoMessage} onLocate={() => void locate()} onSearch={() => setCityOpen(true)} />
            <ContinueReading className="mt-4" />
          </>
        ) : !times ? (
          <section className="andalus-card p-6">
            <h2 className="font-display text-3xl text-grove">{t("These coordinates need another rule")}</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("Mihrab could not build a full day of prayer times here. Open Calculation and choose another high-latitude rule, or pick a nearby city.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" className="h-11" onClick={() => setCalcOpen(true)}>
                {t("Open calculation")}
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setCityOpen(true)}>
                {t("Search for a city")}
              </Button>
            </div>
          </section>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ArchFrame lift={30} nicheClassName="px-3 pb-7 text-center sm:px-6">
              <div className="flex items-center justify-center gap-2 text-sm text-brass-bright">
                <p>{next?.tomorrow ? t("Tomorrow") : t("Next prayer")}</p>
                <span aria-hidden>·</span>
                <p className="tabular-nums">{formatClock(new Date(now), place.timezone, true)}</p>
              </div>
              <h2 className="mt-2 font-display text-5xl leading-none text-[#fbf1de] sm:text-6xl">
                {next ? t(PRAYER_INFO[next.key].name) : "—"}
              </h2>
              {next && locale !== "ar" && (
                <p lang="ar" dir="rtl" className="font-arabic mt-1 text-3xl text-brass-bright">
                  {PRAYER_INFO[next.key].arabic}
                </p>
              )}
              <p className="mt-4 font-display text-4xl text-[#fbf1de] tabular-nums">
                {next ? formatPrayerTime(next.at, place.timezone) : "—"}
              </p>
              <p className="mt-1 text-base text-[#fbf1de]/85">
                {next ? formatRemaining(next.at.getTime() - now) : ""}
              </p>
              <div
                className="mx-auto mt-5 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-label={t("Time until the next prayer")}
              >
                <div className="h-full rounded-full bg-brass-bright" style={{ width: `${progress * 100}%` }} />
              </div>
              {current === "fajr" && (
                <p className="mt-4 text-sm text-[#fbf1de]/80">
                  {t("Fajr remains until sunrise at {time}.", { time: formatPrayerTime(times.today.sunrise, place.timezone) })}
                </p>
              )}
            </ArchFrame>

            <QiblaTeaser bearing={bearing} distanceLabel={distance} />

            <ContinueReading className="lg:col-span-2" />

            <GoodDeedCard className="lg:col-span-2" />

            {visibleNotice && (
              <div className="andalus-card px-4 py-3 lg:col-span-2" role="status">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl text-grove">{visibleNotice.title}</p>
                    <p className="text-sm text-muted-foreground">{visibleNotice.body}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setDismissed(visibleNotice.key)}>
                    {t("Dismiss")}
                  </Button>
                </div>
              </div>
            )}

            <section className="andalus-card lg:col-span-2">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                <div>
                  <h2 className="font-display text-3xl text-grove">{t("Today in {place}", { place: place.label })}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatGregorian(new Date(now), place.timezone)}
                    <span className="px-1.5">·</span>
                    {formatHijri(new Date(now), place.timezone)}
                  </p>
                </div>
                <div className="text-sm leading-6 text-muted-foreground">
                  <p>
                    {place.detail}
                    {zone ? ` · ${zone.place} · ${zone.short} (${zone.offset})` : ""}
                  </p>
                  <p className="tabular-nums">{formatCoordinates(place.latitude, place.longitude)}</p>
                </div>
              </div>
              {deviceLabel && deviceZone && deviceZone !== place.timezone && (
                <p className="border-b border-border px-4 py-3 text-sm leading-6 text-ink sm:px-5">
                  {t("Your device is on {device} ({deviceOffset}). These salah times follow {place} ({placeOffset}).", { device: deviceLabel.place, deviceOffset: deviceLabel.offset, place: place.label, placeOffset: zone?.offset ?? "" })}
                </p>
              )}
              {geoMessage && (
                <p role="alert" className="border-b border-border px-4 py-3 text-sm text-clay sm:px-5">
                  {geoMessage}
                </p>
              )}
              <ol>
                {PRAYER_KEYS.map((key) => {
                  const info = PRAYER_INFO[key]
                  const isCurrent = current === key
                  const isNext = next != null && !next.tomorrow && next.key === key
                  const shift = settings.adjustments[key]
                  const hint = [
                    isCurrent ? t("Now") : isNext ? t("Next") : t(info.role),
                    ramadan && key === "fajr" ? t("Suhoor ends") : null,
                    ramadan && key === "maghrib" ? t("Iftar") : null,
                    shift !== 0 ? t("Shifted {n} min", { n: `${shift > 0 ? "+" : ""}${shift}` }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                  return (
                    <li
                      key={key}
                      aria-current={isCurrent ? "true" : undefined}
                      className={cn(
                        "flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-5",
                        isCurrent && "bg-accent shadow-[inset_3px_0_0_var(--color-gold)] rtl:shadow-[inset_-3px_0_0_var(--color-gold)]",
                      )}
                    >
                      <div>
                        <p className="font-display text-2xl text-grove">
                          {t(info.name)}{" "}
                          {locale !== "ar" && (
                            <span lang="ar" dir="rtl" className="font-arabic text-xl text-brass">
                              {info.arabic}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{hint}</p>
                      </div>
                      <p className="font-display text-2xl text-ink tabular-nums">
                        {formatPrayerTime(times.today[key], place.timezone)}
                      </p>
                    </li>
                  )
                })}
              </ol>
              <DuhaLine times={times.today} timezone={place.timezone} />
              {ramadan && (
                <p className="px-4 py-3 text-sm leading-6 text-muted-foreground sm:px-5">
                  {t("Ramadan, by the Umm al-Qura calendar. Suhoor ends at Fajr and iftar is at Maghrib. Local moonsighting can differ by a day.")}
                </p>
              )}
              {Math.abs(place.latitude) >= 48 && (
                <p className="px-4 py-3 text-sm leading-6 text-muted-foreground sm:px-5">
                  {t("This far from the equator, Fajr and Isha follow the high-latitude rule in Calculation.")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
                <Button type="button" variant="outline" className="h-11" onClick={() => void locate()} disabled={locating}>
                  <LocateFixed />
                  {locating ? t("Finding you…") : t("Use where I am")}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setCityOpen(true)}>
                  <Search />
                  {t("Search for a city")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11"
                  onClick={() => commitPlace(null)}
                >
                  {t("Clear place")}
                </Button>
              </div>
            </section>

            <section id="reminders" className="andalus-card scroll-mt-20 px-4 py-5 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl text-grove">{t("Reminders")}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {t("While this page is open, Mihrab shows a notice at each prayer and counts down in the tab. Notifications also fire if you allow them. In the Android app they arrive even when it is closed.")}
                  </p>
                </div>
                <Switch
                  id="reminders"
                  checked={settings.remindersEnabled}
                  onCheckedChange={(checked) => void toggleReminders(checked)}
                  aria-label={t("Prayer notifications")}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LEADS.map(([minutes, label]) => (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={settings.leadMinutes === minutes}
                    className={cn(
                      "h-11 rounded-xl border text-sm",
                      settings.leadMinutes === minutes
                        ? "border-grove bg-grove text-primary-foreground"
                        : "border-border bg-transparent",
                    )}
                    onClick={() => updateSettings({ ...settings, leadMinutes: minutes })}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {OBLIGATORY_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={settings.prayers[key]}
                    className={cn(
                      "h-10 rounded-full border px-3 text-sm",
                      settings.prayers[key] ? "border-grove bg-grove text-primary-foreground" : "border-border",
                    )}
                    onClick={() =>
                      updateSettings({
                        ...settings,
                        prayers: { ...settings.prayers, [key]: !settings.prayers[key] },
                      })
                    }
                  >
                    {t(PRAYER_INFO[key].name)}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Label htmlFor="tone">{t("Play a short tone")}</Label>
                <Switch
                  id="tone"
                  checked={settings.tone}
                  onCheckedChange={(checked) => {
                    if (checked) primeTone()
                    updateSettings({ ...settings, tone: checked })
                  }}
                />
              </div>
              {settings.remindersEnabled && permission === "denied" && (
                <p className="mt-3 text-sm leading-6 text-clay">
                  {t("Notifications are blocked in this browser. The countdown and the on-page notice still run while Mihrab is open.")}
                </p>
              )}
              {settings.remindersEnabled && permission === "unsupported" && (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {t("This browser has no notification support. Leave the page open for the countdown and the notice.")}
                </p>
              )}
              {settings.remindersEnabled && !OBLIGATORY_KEYS.some((key) => settings.prayers[key]) && (
                <p className="mt-3 text-sm text-muted-foreground">{t("Choose at least one prayer to be notified.")}</p>
              )}
              <ExtraRemindersPanel place={place} settings={settings} onChange={updateSettings} />
            </section>

            <section className="andalus-card px-4 py-5 sm:px-5">
              <h2 className="font-display text-3xl text-grove">{t("Calculation")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t(methodById(settings.method).name)}. {t("{madhab} Asr", { madhab: t(madhabById(settings.madhab).name) })}.
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(methodById(settings.method).detail)}</p>
              <Button type="button" variant="outline" className="mt-4 h-11" onClick={() => setCalcOpen(true)}>
                {t("Change method")}
              </Button>
              <p className="mt-4 text-sm">
                <a className="underline decoration-brass underline-offset-4" href="#how-mihrab-works">
                  {t("How the times are chosen")}
                </a>
              </p>
            </section>
          </div>
        )}
      </div>

      <CityPicker open={cityOpen} onOpenChange={setCityOpen} onSelect={adopt} />
      <CalculationSheet
        open={calcOpen}
        onOpenChange={setCalcOpen}
        settings={settings}
        place={place}
        onChange={updateSettings}
      />
    </div>
  )
}

function DuhaLine({ times, timezone }: { times: DayTimes; timezone: string }) {
  const { t } = useT()
  const w = duhaWindow(times)
  if (!(w.end > w.start)) return null
  return (
    <p className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground sm:px-5">
      <span className="font-medium text-grove">{t("Duha")}</span>{" "}
      <span lang="ar" dir="rtl" className="font-arabic text-brass">
        الضحى
      </span>{" "}
      · {t("from {start} until about {end}. A voluntary prayer of two or more rak‘ahs.", { start: formatPrayerTime(w.start, timezone), end: formatPrayerTime(w.end, timezone) })}
    </p>
  )
}

function Welcome({
  locating,
  message,
  onLocate,
  onSearch,
}: {
  locating: boolean
  message: string | null
  onLocate: () => void
  onSearch: () => void
}) {
  const { t } = useT()
  return (
    <ArchFrame lift={28} nicheClassName="px-3 pb-8 text-center sm:px-8">
      <p className="text-xs tracking-[0.2em] text-brass-bright uppercase">{t("Assalamu alaikum")}</p>
      <h2 className="mx-auto mt-3 max-w-xl font-display text-3xl leading-tight text-[#f6f1e6] sm:text-5xl">
        {t("The Qibla, and the salah of this place.")}
      </h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#f6f1e6]/85">
        {t("Tell Mihrab where you are. It points toward the Kaaba and lays out Fajr, Dhuhr, Asr, Maghrib, and Isha in that time zone.")}
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button
          type="button"
          className="h-12 bg-brass-bright text-grove hover:bg-brass-bright/90"
          onClick={onLocate}
          disabled={locating}
        >
          <LocateFixed />
          {locating ? t("Finding you…") : t("Use where I am")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-[#f6f1e6]/35 bg-transparent text-[#f6f1e6] hover:bg-white/10"
          onClick={onSearch}
        >
          <Search />
          {t("Search for a city")}
        </Button>
      </div>
      {message && (
        <p role="alert" className="mx-auto mt-4 max-w-md text-sm leading-6 text-brass-bright">
          {message}
        </p>
      )}
      <p className="mx-auto mt-8 max-w-md text-sm leading-6 text-[#f6f1e6]/70">
        {t("Your coordinates stay in this browser. Nothing about where you are is sent to a server.")}
      </p>
    </ArchFrame>
  )
}

function buildNotice(schedule: Extract<Schedule, { error: false }>, place: Place, settings: Settings, now: number): Notice | null {
  const events = [
    ...OBLIGATORY_KEYS.map((key) => ({ key, at: schedule.today[key] })),
    { key: "fajr" as const, at: schedule.tomorrow.fajr },
  ]
  for (const event of events) {
    if (!isInsideReminderWindow(now, event.at.getTime(), 0)) continue
    const name = tNow(PRAYER_INFO[event.key].name)
    return {
      key: `${civilKey(place.timezone, event.at)}:${event.key}:0`,
      title: tNow("It's time for {name}", { name }),
      body: tNow("{name} at {time} in {place}.", { name, time: formatPrayerTime(event.at, place.timezone), place: place.label }),
    }
  }
  if (settings.remindersEnabled && settings.leadMinutes > 0) {
    for (const event of events) {
      if (!settings.prayers[event.key]) continue
      if (!isInsideReminderWindow(now, event.at.getTime(), settings.leadMinutes)) continue
      const name = tNow(PRAYER_INFO[event.key].name)
      return {
        key: `${civilKey(place.timezone, event.at)}:${event.key}:${settings.leadMinutes}`,
        title: tNow("{name} in {n} minutes", { name, n: settings.leadMinutes }),
        body: tNow("{name} at {time} in {place}.", { name, time: formatPrayerTime(event.at, place.timezone), place: place.label }),
      }
    }
  }
  return null
}

function extraNotice(extras: ExtraEvent[], place: Place, settings: Settings, now: number): Notice | null {
  if (!settings.remindersEnabled) return null
  for (const extra of extras) {
    if (!isInsideReminderWindow(now, extra.at.getTime(), 0)) continue
    return { key: `${civilKey(place.timezone, extra.at)}:${extra.key}${extra.hour ?? ""}:0`, title: extra.title, body: extra.body }
  }
  return null
}
