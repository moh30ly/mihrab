"use client"

import { useState, useSyncExternalStore } from "react"
import { LocateFixed, Search } from "lucide-react"
import { CityPicker } from "@/components/city-picker"
import { Frieze } from "@/components/ornament"
import { QiblaCompass } from "@/components/qibla-compass"
import { Button } from "@/components/ui/button"
import { loadCities, placeFromDevice } from "@/lib/cities"
import { formatCoordinates, formatDistance } from "@/lib/format"
import { useT } from "@/lib/i18n"
import { locationErrorMessage, readDevicePosition } from "@/lib/locate"
import { distanceToKaabaKm, qiblaBearing } from "@/lib/prayer"
import {
  commitPlace,
  getClientReady,
  getPersistedServerSnapshot,
  getPersistedSnapshot,
  getServerReady,
  subscribeClient,
  subscribePersisted,
} from "@/lib/storage"
import type { Place } from "@/lib/types"
import { ArabicTitle } from "@/components/arabic-title"

export function QiblaPage() {
  const { t } = useT()
  const clientReady = useSyncExternalStore(subscribeClient, getClientReady, getServerReady)
  const { place } = useSyncExternalStore(subscribePersisted, getPersistedSnapshot, getPersistedServerSnapshot)
  const [cityOpen, setCityOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function adopt(next: Place) {
    commitPlace(next)
    setMessage(null)
  }

  async function locate() {
    setLocating(true)
    setMessage(null)
    try {
      const position = await readDevicePosition()
      const cities = await loadCities().catch(() => null)
      adopt(placeFromDevice(position.coords.latitude, position.coords.longitude, position.coords.accuracy, cities))
    } catch (error) {
      setMessage(locationErrorMessage(error))
    } finally {
      setLocating(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <header className="text-center">
        <ArabicTitle>القبلة</ArabicTitle>
        <h1 className="font-heading text-4xl tracking-tight text-grove">{t("Qibla")}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          {t("The direction of the Kaaba in Makkah from where you are.")}
        </p>
      </header>
      <Frieze className="mx-auto mt-4 max-w-sm" />

      <div className="mt-5">
        {!clientReady ? (
          <div className="alfiz h-[30rem] animate-pulse" />
        ) : place ? (
          <>
            <QiblaCompass
              bearing={qiblaBearing(place.latitude, place.longitude)}
              distanceLabel={formatDistance(distanceToKaabaKm(place.latitude, place.longitude))}
            />
            <div className="andalus-card mt-4 px-4 py-4 text-center">
              <p className="font-display text-xl text-grove">{place.label}</p>
              <p className="text-sm text-muted-foreground tabular-nums">{formatCoordinates(place.latitude, place.longitude)}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" className="h-11" onClick={() => void locate()} disabled={locating}>
                  <LocateFixed />
                  {locating ? t("Finding you…") : t("Use where I am")}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={() => setCityOpen(true)}>
                  <Search />
                  {t("Search for a city")}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="andalus-card px-5 py-8 text-center">
            <p className="font-display text-2xl text-grove">{t("Where are you?")}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              {t("Tell Mihrab where you are. It points toward the Kaaba and lays out Fajr, Dhuhr, Asr, Maghrib, and Isha in that time zone.")}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button type="button" className="h-11" onClick={() => void locate()} disabled={locating}>
                <LocateFixed />
                {locating ? t("Finding you…") : t("Use where I am")}
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setCityOpen(true)}>
                <Search />
                {t("Search for a city")}
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p role="alert" className="mt-3 text-center text-sm text-clay">
            {message}
          </p>
        )}
      </div>
      <CityPicker open={cityOpen} onOpenChange={setCityOpen} onSelect={adopt} />
    </main>
  )
}
