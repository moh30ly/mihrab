import type { Metadata, Viewport } from "next"
import { Amiri, Fraunces, Outfit } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
})

const title = "Mihrab — Qibla and prayer times"
const description =
  "Find the Qibla and today’s salah times for your city. Mihrab uses your location and time zone, and can remind you before Fajr, Dhuhr, Asr, Maghrib, and Isha."

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers()
  const rawHost = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:3847"
  const host = rawHost.split(",")[0]?.trim() || "127.0.0.1:3847"
  const forwarded = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim()
  const proto = forwarded || (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https")
  return {
    metadataBase: new URL(`${proto}://${host}`),
    title,
    description,
    applicationName: "Mihrab",
    keywords: [
      "qibla",
      "prayer times",
      "salah",
      "salat",
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
      "muslim",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    category: "lifestyle",
  }
}

export const viewport: Viewport = {
  themeColor: "#14352b",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
