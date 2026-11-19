import { Suspense } from "react"
import { connection } from "next/server"
import Link from "next/link"

async function RequestConnection() {
  await connection()
  return null
}

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-16">
      <Suspense fallback={null}>
        <RequestConnection />
      </Suspense>
      <p className="text-sm font-medium tracking-wide text-brass">404</p>
      <h1 className="mt-2 font-display text-5xl text-grove">This page is not here</h1>
      <p className="mt-3 text-base leading-7 text-muted-foreground">
        The Qibla and today’s prayer times are on the home page.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-grove px-5 text-sm font-medium text-[#f6f1e6]"
      >
        Back to Mihrab
      </Link>
    </main>
  )
}
