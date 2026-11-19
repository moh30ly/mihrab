import tzLookup from "tz-lookup"
import { haversineKm } from "@/lib/prayer"
import type { CityRecord, Place } from "@/lib/types"
import { formatDistance } from "@/lib/format"

type RawCity = [string, string, string, number, number, number, number]

type CityFile = {
  timezones: string[]
  countries: Record<string, string>
  cities: RawCity[]
}

const EXTRA_TOKENS: Record<string, string> = {
  "SA|Makkah": "mecca mekkah makka",
  "SA|Madinah": "medina madina medinah al-madinah",
  "IL|Jerusalem": "quds al-quds alquds",
  "IN|Mumbai": "bombay",
  "IN|Kolkata": "calcutta",
  "TR|Istanbul": "constantinople",
  "US|New York City": "new york nyc",
}

export const FEATURED_CITIES: [string, string][] = [
  ["Makkah", "SA"],
  ["Madinah", "SA"],
  ["Jerusalem", "IL"],
  ["Cairo", "EG"],
  ["Istanbul", "TR"],
  ["Dubai", "AE"],
  ["Jakarta", "ID"],
  ["Karachi", "PK"],
  ["Dhaka", "BD"],
  ["Kuala Lumpur", "MY"],
  ["Singapore", "SG"],
  ["Lagos", "NG"],
  ["London", "GB"],
  ["Paris", "FR"],
  ["New York City", "US"],
  ["Chicago", "US"],
  ["Toronto", "CA"],
]

let cache: Promise<CityRecord[]> | null = null

export function loadCities() {
  if (!cache) {
    cache = import("@/data/cities.json").then((mod) => {
      const file = mod.default as unknown as CityFile
      return file.cities.map((row) => toCity(row, file))
    })
  }
  return cache
}

function toCity(row: RawCity, file: CityFile): CityRecord {
  const [name, ascii, country, latitude, longitude, tzIndex, population] = row
  return {
    name,
    ascii,
    country,
    countryName: file.countries[country] ?? country,
    latitude,
    longitude,
    timezone: file.timezones[tzIndex] ?? "UTC",
    population,
    extra: EXTRA_TOKENS[`${country}|${name}`] ?? "",
  }
}

export function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function searchCities(cities: CityRecord[], query: string, limit = 18) {
  const needle = fold(query)
  if (needle.length < 2) return []
  const scored: { city: CityRecord; score: number }[] = []
  for (const city of cities) {
    const name = fold(city.name)
    const ascii = fold(city.ascii || city.name)
    const extra = city.extra
    let score = 0
    if (name === needle || ascii === needle) score = 100
    else if (name.startsWith(needle) || ascii.startsWith(needle)) score = 80
    else if (name.split(/[\s-]/).some((word) => word.startsWith(needle))) score = 70
    else if (name.includes(needle) || ascii.includes(needle) || extra.includes(needle)) score = 50
    if (score > 0) scored.push({ city, score })
  }
  scored.sort((a, b) => b.score - a.score || b.city.population - a.city.population)
  return scored.slice(0, limit).map((item) => item.city)
}

export function featuredCities(cities: CityRecord[]) {
  return FEATURED_CITIES.flatMap(([name, country]) => {
    const match = cities.find((city) => city.name === name && city.country === country)
    return match ? [match] : []
  })
}

export function nearestCity(cities: CityRecord[], latitude: number, longitude: number) {
  let best: CityRecord | null = null
  let bestKm = Infinity
  for (const city of cities) {
    const km = haversineKm(latitude, longitude, city.latitude, city.longitude)
    if (km < bestKm) {
      best = city
      bestKm = km
    }
  }
  return best ? { city: best, distanceKm: bestKm } : null
}

export function timezoneAt(latitude: number, longitude: number) {
  try {
    return tzLookup(latitude, longitude)
  } catch {
    return "UTC"
  }
}

export function placeFromCity(city: CityRecord): Place {
  return {
    label: city.name,
    detail: city.countryName,
    country: city.country,
    countryName: city.countryName,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone,
    source: "city",
  }
}

export function placeFromCoordinates(
  latitude: number,
  longitude: number,
  cities: CityRecord[] | null,
): Place {
  const timezone = timezoneAt(latitude, longitude)
  const nearest = cities ? nearestCity(cities, latitude, longitude) : null
  const nearby = nearest && nearest.distanceKm <= 80 ? nearest : null
  return {
    label: nearby && nearby.distanceKm <= 25 ? nearby.city.name : "Chosen coordinates",
    detail: nearby
      ? `${formatDistance(nearby.distanceKm)} from ${nearby.city.name}, ${nearby.city.countryName}`
      : "Coordinates you entered",
    country: nearby ? nearby.city.country : "",
    countryName: nearby ? nearby.city.countryName : "",
    latitude,
    longitude,
    timezone,
    source: "coordinates",
  }
}

export function placeFromDevice(
  latitude: number,
  longitude: number,
  accuracy: number | null,
  cities: CityRecord[] | null,
): Place {
  const timezone = timezoneAt(latitude, longitude)
  const nearest = cities ? nearestCity(cities, latitude, longitude) : null
  const nearby = nearest && nearest.distanceKm <= 80 ? nearest : null
  const label = !nearby
    ? "Your location"
    : nearby.distanceKm <= 20
      ? nearby.city.name
      : `Near ${nearby.city.name}`
  const detail = [
    nearby ? nearby.city.countryName : null,
    "From this device",
    accuracy != null && accuracy > 5000 ? "approximate fix" : null,
  ]
    .filter(Boolean)
    .join(" · ")
  return {
    label,
    detail,
    country: nearby ? nearby.city.country : "",
    countryName: nearby ? nearby.city.countryName : "",
    latitude,
    longitude,
    timezone,
    source: "device",
  }
}
