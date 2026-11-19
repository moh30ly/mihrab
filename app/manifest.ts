import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mihrab — Qibla and prayer times",
    short_name: "Mihrab",
    description: "Qibla direction and salah times for where you are.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#14352b",
    lang: "en",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  }
}
