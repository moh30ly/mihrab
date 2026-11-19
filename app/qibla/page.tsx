import type { Metadata } from "next"
import { QiblaPage } from "@/components/qibla-page"

export const metadata: Metadata = {
  title: "Qibla direction — find the Kaaba from where you are",
  description:
    "A Qibla compass that points toward the Kaaba in Makkah from your city or your phone’s location, with the bearing and distance.",
  alternates: { canonical: "/qibla/" },
}

export default function Page() {
  return <QiblaPage />
}
