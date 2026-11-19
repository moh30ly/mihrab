"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

export type CompassStatus = "idle" | "live" | "needs-permission" | "denied" | "unavailable"

type OrientationWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number }

function supportsPermissionRequest() {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission ===
      "function"
  )
}

function readHeading(event: OrientationWithCompass) {
  if (typeof event.webkitCompassHeading === "number" && Number.isFinite(event.webkitCompassHeading)) {
    return event.webkitCompassHeading
  }
  if (event.absolute && event.alpha != null && Number.isFinite(event.alpha)) {
    return (360 - event.alpha) % 360
  }
  return null
}

type CompassCapability = "missing" | "gesture" | "listen"

function subscribeCapability() {
  return () => {}
}

function compassCapability(): CompassCapability {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return "missing"
  return supportsPermissionRequest() ? "gesture" : "listen"
}

function smooth(previous: number | null, next: number) {
  if (previous == null) return next
  const delta = ((next - previous + 540) % 360) - 180
  return (previous + delta * 0.35 + 360) % 360
}

export function useCompass() {
  const capability = useSyncExternalStore(subscribeCapability, compassCapability, () => "missing" as const)
  const [heading, setHeading] = useState<number | null>(null)
  const [status, setStatus] = useState<CompassStatus>("idle")
  const handlerRef = useRef<((event: Event) => void) | null>(null)
  const listeningRef = useRef(false)

  useEffect(() => {
    const onOrientation = (event: Event) => {
      const next = readHeading(event as OrientationWithCompass)
      if (next == null) return
      setStatus("live")
      setHeading((current) => smooth(current, next))
    }
    handlerRef.current = onOrientation

    if (capability !== "listen") {
      return () => {
        window.removeEventListener("deviceorientationabsolute", onOrientation)
        window.removeEventListener("deviceorientation", onOrientation)
      }
    }

    let sawHeading = false
    const watch = (event: Event) => {
      sawHeading = true
      onOrientation(event)
    }
    window.addEventListener("deviceorientationabsolute", watch)
    window.addEventListener("deviceorientation", watch)
    const timer = window.setTimeout(() => {
      if (!sawHeading) setStatus("unavailable")
    }, 2500)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("deviceorientationabsolute", watch)
      window.removeEventListener("deviceorientation", watch)
    }
  }, [capability])

  async function requestAccess() {
    const requestPermission = (
      DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">
      }
    ).requestPermission
    const onOrientation = handlerRef.current
    if (!requestPermission || !onOrientation) return
    try {
      const result = await requestPermission()
      if (result !== "granted") {
        setStatus("denied")
        return
      }
      if (listeningRef.current) return
      listeningRef.current = true
      window.addEventListener("deviceorientationabsolute", onOrientation)
      window.addEventListener("deviceorientation", onOrientation)
    } catch {
      setStatus("denied")
    }
  }

  const shown: CompassStatus =
    status === "live" || status === "denied" || status === "unavailable"
      ? status
      : capability === "missing"
        ? "unavailable"
        : capability === "gesture"
          ? "needs-permission"
          : status

  return { heading, status: shown, requestAccess }
}
