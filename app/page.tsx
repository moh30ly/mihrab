import { Suspense } from "react"
import { connection } from "next/server"
import { Guide } from "@/components/guide"
import { MihrabApp } from "@/components/mihrab-app"
import { FAQ } from "@/lib/faq"

async function RequestConnection() {
  await connection()
  return null
}

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Mihrab",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Any",
  description:
    "Mihrab shows the Qibla and the five daily prayers for a Muslim’s location and time zone, and reminds them while the page is open.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
}

export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <RequestConnection />
      </Suspense>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(appJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MihrabApp />
      <Guide />
    </>
  )
}
