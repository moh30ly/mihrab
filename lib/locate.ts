import { Capacitor } from "@capacitor/core"
import { tNow } from "@/lib/i18n/translate"

export type DevicePosition = { coords: { latitude: number; longitude: number; accuracy: number } }

type LocateFailure = "denied" | "timeout" | "off" | "unavailable" | "unsupported"

class LocateError extends Error {
  constructor(readonly kind: LocateFailure) {
    super(kind)
  }
}

export function readDevicePosition(): Promise<DevicePosition> {
  return Capacitor.isNativePlatform() ? readNativePosition() : readBrowserPosition()
}

// In the Android app the WebView's own geolocation often never answers, so the
// app asks the phone's location service through the native plugin instead.
// City-level accuracy is plenty for prayer times and works indoors, quickly.
async function readNativePosition(): Promise<DevicePosition> {
  const { Geolocation } = await import("@capacitor/geolocation")
  let status = await Geolocation.checkPermissions().catch(() => null)
  if (!status || (status.location !== "granted" && status.coarseLocation !== "granted")) {
    try {
      status = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] })
    } catch (error) {
      throw nativeError(error)
    }
    if (status.location !== "granted" && status.coarseLocation !== "granted") throw new LocateError("denied")
  }
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 20_000,
      maximumAge: 10 * 60_000,
    })
    const { latitude, longitude, accuracy } = position.coords
    return { coords: { latitude, longitude, accuracy } }
  } catch (error) {
    throw nativeError(error)
  }
}

/** The plugin reports failures as OS-PLUG-GLOC-#### codes. */
function nativeError(error: unknown) {
  const code = (error as { code?: string } | null)?.code ?? ""
  const n = Number(code.match(/(\d+)$/)?.[1])
  if (n === 3) return new LocateError("denied")
  if (n === 10) return new LocateError("timeout")
  if (n === 7 || n === 9 || n === 16 || n === 17) return new LocateError("off")
  return new LocateError("unavailable")
}

function readBrowserPosition() {
  return new Promise<DevicePosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new LocateError("unsupported"))
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
  if (error instanceof LocateError) {
    if (error.kind === "denied") {
      return tNow("Mihrab is not allowed to use your location. Allow it in the phone's settings, or search for your city.")
    }
    if (error.kind === "off") {
      return tNow("Location is turned off on this phone. Turn it on, or search for your city.")
    }
    if (error.kind === "timeout") {
      return tNow("Finding your position took too long. Try again, or search for your city.")
    }
    if (error.kind === "unavailable") return tNow("Your position could not be read. Search for your city instead.")
  }
  if (typeof GeolocationPositionError !== "undefined" && error instanceof GeolocationPositionError) {
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
