"use client"

let audioContext: AudioContext | null = null

export function primeTone() {
  if (typeof window === "undefined") return
  if (!audioContext) audioContext = new window.AudioContext()
  void audioContext.resume()
}

export function playTone() {
  if (!audioContext) return
  const start = audioContext.currentTime
  const notes = [392, 523.25]
  for (const [index, frequency] of notes.entries()) {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = "sine"
    oscillator.frequency.value = frequency
    const noteStart = start + index * 0.16
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.05, noteStart + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.7)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.72)
  }
}

export function sendNotification(title: string, body: string, tag: string, tone: boolean) {
  if (tone) playTone()
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return
  try {
    const notification = new Notification(title, { body, tag, silent: true })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    // The page notice still carries the reminder.
  }
}
