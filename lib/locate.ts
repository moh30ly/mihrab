import { tNow } from "@/lib/i18n/translate"

export function readDevicePosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    })
  })
}

export function locationErrorMessage(error: unknown) {
  if (error instanceof GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) {
      return tNow("Location access is off in this browser. Search for your city, or enter coordinates.")
    }
    if (error.code === error.TIMEOUT) {
      return tNow("Finding your position took too long. Try again, or search for your city.")
    }
    return tNow("Your position could not be read. Search for your city instead.")
  }
  return tNow("This browser has no location service. Search for your city, or enter coordinates.")
}
