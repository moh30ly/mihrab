import type { MetadataRoute } from "next"
import { headers } from "next/headers"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3847"
  const proto = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")
  return [
    {
      url: `${proto}://${host}/`,
      lastModified: "2026-11-19",
    },
  ]
}
