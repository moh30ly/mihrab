"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ayahAudioUrl,
  DEFAULT_RECITATION_PREFS,
  loadRecitationPrefs,
  nextAyah,
  reciterById,
  saveRecitationPrefs,
  startAyah,
  type PlayMode,
  type RecitationPrefs,
} from "@/lib/recitation"

export type RecitationStatus = "idle" | "loading" | "playing" | "paused" | "error"

export type Recitation = {
  status: RecitationStatus
  /** The ayah being recited; 0 is the basmala; null when stopped. */
  ayah: number | null
  prefs: RecitationPrefs
  play: (ayah: number) => void
  toggle: () => void
  stop: () => void
  skip: (dir: 1 | -1) => void
  setReciter: (id: string) => void
  setMode: (mode: PlayMode) => void
}

/**
 * Plays a surah's recitation ayah by ayah through one audio element, so a phone that
 * allows sound only after a tap keeps playing from one ayah to the next.
 */
export function useRecitation({ surahId, surahName, total }: { surahId: number; surahName: string; total: number }): Recitation {
  const [prefs, setPrefs] = useState<RecitationPrefs>(DEFAULT_RECITATION_PREFS)
  const [status, setStatus] = useState<RecitationStatus>("idle")
  const [ayah, setAyah] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const warmRef = useRef<HTMLAudioElement | null>(null)
  // Read inside the audio element's callbacks, which outlive a render.
  const state = useRef({ ayah: null as number | null, prefs: DEFAULT_RECITATION_PREFS })

  useEffect(() => {
    const p = loadRecitationPrefs()
    state.current.prefs = p
    // The saved reciter lives in localStorage, which only exists after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(p)
  }, [])

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio()
      a.preload = "auto"
      audioRef.current = a
    }
    return audioRef.current
  }, [])

  const load = useCallback(
    (n: number) => {
      const a = audio()
      const reciter = reciterById(state.current.prefs.reciter)
      state.current.ayah = n
      setAyah(n)
      setStatus("loading")
      a.src = ayahAudioUrl(reciter, surahId, n)
      a.play().catch(() => {
        // A failed load also fires "error", which shows the message.
        if (a.error == null && state.current.ayah === n) setStatus("paused")
      })
      // Fetch the next ayah ahead so it starts without a pause.
      const after = nextAyah(n, total, state.current.prefs.mode)
      if (after != null && after !== n) {
        warmRef.current ??= new Audio()
        warmRef.current.preload = "auto"
        warmRef.current.src = ayahAudioUrl(reciter, surahId, after)
      }
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: n === 0 ? surahName : `${surahName} · ${surahId}:${n}`,
          artist: reciter.name,
          album: "Mihrab",
        })
      }
    },
    [audio, surahId, surahName, total],
  )

  const stop = useCallback(() => {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.removeAttribute("src")
      a.load()
    }
    state.current.ayah = null
    setAyah(null)
    setStatus("idle")
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none"
  }, [])

  const play = useCallback((n: number) => load(startAyah(surahId, n, state.current.prefs.mode)), [load, surahId])

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (state.current.ayah == null || !a) return play(1)
    if (a.paused) {
      setStatus("loading")
      void a.play().catch(() => setStatus("paused"))
    } else a.pause()
  }, [play])

  const skip = useCallback(
    (dir: 1 | -1) => {
      load(Math.min(Math.max(1, (state.current.ayah ?? 0) + dir), total))
    },
    [load, total],
  )

  // The element's events drive the status and move on to the next ayah.
  useEffect(() => {
    const a = audio()
    const onPlaying = () => setStatus("playing")
    const onWaiting = () => setStatus("loading")
    const onPause = () => {
      if (state.current.ayah != null && !a.ended) setStatus("paused")
    }
    const onEnded = () => {
      const now = state.current.ayah
      const after = now == null ? null : nextAyah(now, total, state.current.prefs.mode)
      if (after == null) stop()
      else load(after)
    }
    const onError = () => {
      if (state.current.ayah != null) setStatus("error")
    }
    a.addEventListener("playing", onPlaying)
    a.addEventListener("waiting", onWaiting)
    a.addEventListener("pause", onPause)
    a.addEventListener("ended", onEnded)
    a.addEventListener("error", onError)
    return () => {
      a.removeEventListener("playing", onPlaying)
      a.removeEventListener("waiting", onWaiting)
      a.removeEventListener("pause", onPause)
      a.removeEventListener("ended", onEnded)
      a.removeEventListener("error", onError)
    }
  }, [audio, load, stop, total])

  // Lock-screen and headset buttons.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return
    const ms = navigator.mediaSession
    const set = (action: MediaSessionAction, fn: (() => void) | null) => {
      try {
        ms.setActionHandler(action, fn)
      } catch {
        // Not every browser knows every action.
      }
    }
    set("play", toggle)
    set("pause", toggle)
    set("stop", stop)
    set("nexttrack", () => skip(1))
    set("previoustrack", () => skip(-1))
    return () => {
      for (const action of ["play", "pause", "stop", "nexttrack", "previoustrack"] as const) set(action, null)
    }
  }, [toggle, stop, skip])

  useEffect(() => {
    if ("mediaSession" in navigator && status !== "idle") {
      navigator.mediaSession.playbackState = status === "paused" || status === "error" ? "paused" : "playing"
    }
  }, [status])

  // Leaving the surah stops the recitation.
  useEffect(
    () => () => {
      const a = audioRef.current
      if (a) {
        a.pause()
        a.removeAttribute("src")
      }
      if (warmRef.current) warmRef.current.removeAttribute("src")
    },
    [],
  )

  const update = (next: RecitationPrefs) => {
    state.current.prefs = next
    setPrefs(next)
    saveRecitationPrefs(next)
  }

  const setReciter = (id: string) => {
    const was = state.current.ayah
    const playing = audioRef.current && !audioRef.current.paused
    update({ ...state.current.prefs, reciter: reciterById(id).id })
    // Switching voices mid-ayah starts that ayah again in the new voice.
    if (was != null && playing) load(was)
  }

  const setMode = (mode: PlayMode) => update({ ...state.current.prefs, mode })

  return { status, ayah, prefs, play, toggle, stop, skip, setReciter, setMode }
}
