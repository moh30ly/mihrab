import type { Metadata } from "next"
import { DonatePage } from "@/components/donate-page"

export const metadata: Metadata = {
  title: "Donate to Aid Gaza",
  description:
    "Support the people of Gaza. All donations go to Aid Gaza (aidgaza.org); Mihrab never collects or receives any money.",
  alternates: { canonical: "/donate/" },
}

export default function Page() {
  return <DonatePage />
}
