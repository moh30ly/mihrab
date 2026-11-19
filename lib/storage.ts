import { suggestForCountry } from "@/lib/methods"
import { clampAdjustment } from "@/lib/prayer"
import {
  OBLIGATORY_KEYS,
  PRAYER_KEYS,
  type MethodId,
  type Place,
  type Settings,
} from "@/lib/types"
import { METHODS } from "@/lib/methods"
import { pruneFiredKeys } from "@/lib/reminders"

const PLACE_KEY = "mihrab.place.v1"
const SETTINGS_KEY = "mihrab.settings.v1"
const FIRED_KEY = "mihrab.fired.v1"

const METHOD_IDS = new Set(METHODS.map((method) => method.id))

export const DEFAULT_SETTINGS: Settings = {
  method: "MuslimWorldLeague",
  methodCustom: false,
  madhab: "shafi",
  madhabCustom: false,
  highLatitude: "middleofthenight",
  adjustments: {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
  },
  remindersEnabled: false,
  leadMinutes: 10,
  prayers: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  tone: false,
  extras: {
    duha: false,
    athkarMorning: false,
    athkarEvening: false,
    sadaqah: false,
    sadaqahDay: 5,
    zakat: false,
    zakatMonth: 9,
    zakatDay: 1,
    duaOfDay: false,
    quranHourly: false,
    goodDeed: false,
  },
}

function intIn(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback
}

function loadExtras(value: unknown): Settings["extras"] {
  const base = DEFAULT_SETTINGS.extras
  if (!value || typeof value !== "object") return base
  const v = value as Partial<Settings["extras"]>
  return {
    duha: Boolean(v.duha),
    athkarMorning: Boolean(v.athkarMorning),
    athkarEvening: Boolean(v.athkarEvening),
    sadaqah: Boolean(v.sadaqah),
    sadaqahDay: intIn(v.sadaqahDay, 0, 6, base.sadaqahDay),
    zakat: Boolean(v.zakat),
    zakatMonth: intIn(v.zakatMonth, 1, 12, base.zakatMonth),
    zakatDay: intIn(v.zakatDay, 1, 30, base.zakatDay),
    duaOfDay: Boolean(v.duaOfDay),
    quranHourly: Boolean(v.quranHourly),
    goodDeed: Boolean(v.goodDeed),
  }
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode and full storage still leave the session usable.
  }
}

export function loadPlace(): Place | null {
  const value = readJson(PLACE_KEY)
  if (!value || typeof value !== "object") return null
  const place = value as Partial<Place>
  if (
    typeof place.label !== "string" ||
    typeof place.timezone !== "string" ||
    typeof place.latitude !== "number" ||
    typeof place.longitude !== "number" ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude) ||
    place.latitude < -90 ||
    place.latitude > 90 ||
    place.longitude < -180 ||
    place.longitude > 180
  ) {
    return null
  }
  return {
    label: place.label,
    detail: typeof place.detail === "string" ? place.detail : "",
    country: typeof place.country === "string" ? place.country : "",
    countryName: typeof place.countryName === "string" ? place.countryName : "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
    source:
      place.source === "device" || place.source === "city" || place.source === "coordinates"
        ? place.source
        : "coordinates",
  }
}

export function savePlace(place: Place | null) {
  if (!place) {
    try {
      window.localStorage.removeItem(PLACE_KEY)
    } catch {
      // Ignore storage failures.
    }
    return
  }
  writeJson(PLACE_KEY, place)
}

export function loadSettings(): Settings {
  const value = readJson(SETTINGS_KEY)
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS
  const stored = value as Partial<Settings>
  const method = METHOD_IDS.has(stored.method as MethodId)
    ? (stored.method as MethodId)
    : DEFAULT_SETTINGS.method
  const madhab = stored.madhab === "hanafi" ? "hanafi" : "shafi"
  const highLatitude =
    stored.highLatitude === "seventhofthenight" || stored.highLatitude === "twilightangle"
      ? stored.highLatitude
      : "middleofthenight"
  const lead = stored.leadMinutes
  const leadMinutes = lead === 0 || lead === 5 || lead === 10 || lead === 15 ? lead : 10
  const adjustments = { ...DEFAULT_SETTINGS.adjustments }
  if (stored.adjustments && typeof stored.adjustments === "object") {
    for (const key of PRAYER_KEYS) {
      const minutes = stored.adjustments[key]
      if (typeof minutes === "number") adjustments[key] = clampAdjustment(minutes)
    }
  }
  const prayers = { ...DEFAULT_SETTINGS.prayers }
  if (stored.prayers && typeof stored.prayers === "object") {
    for (const key of OBLIGATORY_KEYS) {
      if (typeof stored.prayers[key] === "boolean") prayers[key] = stored.prayers[key]
    }
  }
  return {
    method,
    methodCustom: Boolean(stored.methodCustom),
    madhab,
    madhabCustom: Boolean(stored.madhabCustom),
    highLatitude,
    adjustments,
    remindersEnabled: Boolean(stored.remindersEnabled),
    leadMinutes,
    prayers,
    tone: Boolean(stored.tone),
    extras: loadExtras(stored.extras),
  }
}

export function saveSettings(settings: Settings) {
  writeJson(SETTINGS_KEY, settings)
}

export type PersistedState = {
  place: Place | null
  settings: Settings
}

let persisted: PersistedState | null = null
const persistedListeners = new Set<() => void>()

function ensurePersisted(): PersistedState {
  if (!persisted) {
    const place = loadPlace()
    const settings = loadSettings()
    persisted = {
      place,
      settings: place ? applySuggestion(settings, place.country) : settings,
    }
  }
  return persisted
}

const SERVER_PERSISTED: PersistedState = {
  place: null,
  settings: DEFAULT_SETTINGS,
}

export function subscribePersisted(listener: () => void) {
  persistedListeners.add(listener)
  return () => {
    persistedListeners.delete(listener)
  }
}

export function getPersistedSnapshot() {
  return ensurePersisted()
}

export function getPersistedServerSnapshot() {
  return SERVER_PERSISTED
}

function publish(next: PersistedState) {
  persisted = next
  savePlace(next.place)
  saveSettings(next.settings)
  for (const listener of persistedListeners) listener()
}

export function commitSettings(settings: Settings) {
  publish({ ...ensurePersisted(), settings })
}

export function commitPlace(place: Place | null) {
  const current = ensurePersisted()
  publish({
    place,
    settings: place ? applySuggestion(current.settings, place.country) : current.settings,
  })
}

export function subscribeClient(listener: () => void) {
  void listener
  return () => {}
}

export function getClientReady() {
  return true
}

export function getServerReady() {
  return false
}

export function getDeviceZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported"
  return Notification.permission
}

export function applySuggestion(settings: Settings, country: string): Settings {
  if (!country) return settings
  const suggestion = suggestForCountry(country)
  return {
    ...settings,
    method: settings.methodCustom ? settings.method : suggestion.method,
    madhab: settings.madhabCustom ? settings.madhab : suggestion.madhab,
  }
}

export function loadFired(today: string) {
  const value = readJson(FIRED_KEY)
  const keys = Array.isArray(value) ? value.filter((key) => typeof key === "string") : []
  return new Set(pruneFiredKeys(keys, today))
}

export function saveFired(keys: Set<string>, today: string) {
  writeJson(FIRED_KEY, pruneFiredKeys([...keys], today))
}
