import type { Locale } from "@/lib/i18n/locales"
import ar from "./ar.json"
import de from "./de.json"
import es from "./es.json"
import it from "./it.json"
import ja from "./ja.json"
import pt from "./pt.json"
import tr from "./tr.json"
import zh from "./zh.json"

/** English strings are the keys. A missing entry falls back to English. */
export const MESSAGES: Partial<Record<Locale, Record<string, string>>> = { ar, de, es, it, ja, pt, tr, zh }
