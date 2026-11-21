import type { Metadata } from "next"
import { AboutPage } from "@/components/about-page"

export const metadata: Metadata = {
  title: "About us",
  description: "Mihrab, the website and app, was made by Mohammed Hamada, founder of Aid Gaza (aidgaza.org).",
  alternates: { canonical: "/about/" },
}

export default function Page() {
  return <AboutPage />
}
