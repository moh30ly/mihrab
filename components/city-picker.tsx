"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  featuredCities,
  loadCities,
  placeFromCity,
  placeFromCoordinates,
  searchCities,
} from "@/lib/cities"
import { formatPopulation } from "@/lib/format"
import type { CityRecord, Place } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export function CityPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (place: Place) => void
}) {
  const [cities, setCities] = useState<CityRecord[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [coordError, setCoordError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || cities || failed) return
    let cancelled = false
    loadCities()
      .then((loaded) => {
        if (!cancelled) setCities(loaded)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open, cities, failed])

  const results = useMemo(() => {
    if (!cities) return []
    if (query.trim().length < 2) return featuredCities(cities)
    return searchCities(cities, query)
  }, [cities, query])

  function choose(city: CityRecord) {
    onSelect(placeFromCity(city))
    onOpenChange(false)
    setQuery("")
  }

  function submitCoordinates(event: FormEvent) {
    event.preventDefault()
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setCoordError("Enter a latitude from -90 to 90 and a longitude from -180 to 180.")
      return
    }
    setCoordError(null)
    onSelect(placeFromCoordinates(lat, lng, cities))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,88vh)] flex-col gap-3 overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Choose a city</DialogTitle>
          <DialogDescription>
            Prayer times follow that city’s time zone. The search stays on this device.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Makkah, Chicago, Jakarta…"
          aria-label="Search cities"
          className="h-11 text-base md:text-base"
          autoFocus
        />
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border">
          {failed && (
            <p className="p-4 text-sm text-clay">The city list did not load. Enter coordinates below.</p>
          )}
          {!failed && !cities && <p className="p-4 text-sm text-muted-foreground">Loading cities…</p>}
          {cities && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No city matches “{query.trim()}”. Try another spelling, or enter coordinates below.
            </p>
          )}
          {cities && query.trim().length < 2 && results.length > 0 && (
            <p className="px-3 pt-3 text-xs tracking-[0.14em] text-brass uppercase">Start with a city</p>
          )}
          <ul>
            {results.map((city) => {
              const population = formatPopulation(city.population)
              return (
                <li key={`${city.country}-${city.name}-${city.latitude}`}>
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-3 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-accent"
                    onClick={() => choose(city)}
                  >
                    <span>
                      <span className="block font-medium text-ink">{city.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {city.countryName}
                        {population ? ` · ${population}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {city.timezone.split("/").pop()?.replaceAll("_", " ")}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <form onSubmit={submitCoordinates} className="grid gap-2">
          <p className="text-sm font-medium">Or enter coordinates</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="Latitude"
              aria-label="Latitude"
              className="h-11 text-base md:text-base"
            />
            <Input
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="Longitude"
              aria-label="Longitude"
              className="h-11 text-base md:text-base"
            />
          </div>
          {coordError && (
            <p role="alert" className="text-sm text-clay">
              {coordError}
            </p>
          )}
          <Button type="submit" variant="outline" className="h-11">
            Use these coordinates
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
