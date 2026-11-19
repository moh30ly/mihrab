import type { MetadataRoute } from "next"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mihrab — Qibla, prayer times and the Quran",
    short_name: "Mihrab",
    description: "Qibla direction, salah times for where you are, and the Holy Quran.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5ead6",
    theme_color: "#6b2216",
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
