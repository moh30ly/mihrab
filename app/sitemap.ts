import type { MetadataRoute } from "next"
import { HADITH_COLLECTIONS } from "@/lib/hadith"
import { SURAHS } from "@/lib/quran-index"
import { SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: "2026-11-19" },
    { url: `${SITE_URL}/qibla/`, lastModified: "2026-11-19" },
    { url: `${SITE_URL}/quran/`, lastModified: "2026-11-19" },
    { url: `${SITE_URL}/athkar/`, lastModified: "2026-11-19" },
    { url: `${SITE_URL}/sadaqah/`, lastModified: "2026-11-19" },
    { url: `${SITE_URL}/privacy/`, lastModified: "2026-11-19" },
    ...SURAHS.map((s) => ({ url: `${SITE_URL}/quran/${s.id}/`, lastModified: "2026-11-19" })),
    { url: `${SITE_URL}/hadith/`, lastModified: "2026-11-19" },
    ...HADITH_COLLECTIONS.map((c) => ({ url: `${SITE_URL}/hadith/${c.id}/`, lastModified: "2026-11-19" })),
  ]
}
