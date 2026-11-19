import { QURAN_SOURCES } from "@/lib/quran-index"

export function QuranSources() {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
      <p>
        {QURAN_SOURCES.arabic} See{" "}
        <a className="underline underline-offset-2" href="https://quranenc.com/" rel="noopener">
          quranenc.com
        </a>
        .
      </p>
      <p>
        {QURAN_SOURCES.translation} See{" "}
        <a className="underline underline-offset-2" href="https://tanzil.net/trans/en.sahih" rel="noopener">
          tanzil.net
        </a>
        . The translation is a rendering of the meaning, not the Quran itself.
      </p>
      <p>
        {QURAN_SOURCES.dataset}{" "}
        <a className="underline underline-offset-2" href="https://github.com/risan/quran-json" rel="noopener">
          github.com/risan/quran-json
        </a>
        . The text is shown exactly as published and is not altered.
      </p>
    </footer>
  )
}
