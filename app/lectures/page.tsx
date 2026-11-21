import type { Metadata } from "next"
import { LecturesPage } from "@/components/lectures-page"

export const metadata: Metadata = {
  title: "Lectures by Sheikh Said El Kamali",
  description:
    "Lessons on the Muwatta, the life of the Prophet ﷺ, Ramadan talks and more by Sheikh Said El Kamali, played from his official YouTube channel with subtitles in your language where available.",
  alternates: { canonical: "/lectures/" },
}

export default function Page() {
  return <LecturesPage />
}
