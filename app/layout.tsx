import type { Metadata, Viewport } from "next"
import { Amiri, Amiri_Quran, Fraunces, Outfit } from "next/font/google"
import { SiteNav } from "@/components/site-nav"
import { SITE_URL } from "@/lib/site"
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

const amiriQuran = Amiri_Quran({
  subsets: ["arabic", "latin"],
  weight: "400",
  variable: "--font-amiri-quran",
})

const title = "Mihrab — Qibla, prayer times and the Quran"
const description =
  "Find the Qibla and today’s salah times for your city. Mihrab uses your location and time zone, and can remind you before Fajr, Dhuhr, Asr, Maghrib, and Isha."

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · Mihrab" },
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
      "quran",
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

export const viewport: Viewport = {
  themeColor: "#6b2216",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${fraunces.variable} ${amiri.variable} ${amiriQuran.variable} h-full antialiased`}
    >
      <body className="pb-nav flex min-h-full flex-col">
        <SiteNav />
        {children}
      </body>
    </html>
  )
}
