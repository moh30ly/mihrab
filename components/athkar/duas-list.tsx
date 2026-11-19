"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { DUA_GROUPS, RUQYA, duaOfTheDayFor, duasIn, type Dua } from "@/lib/duas"
import { useT } from "@/lib/i18n"

export function DuasList({ showEnglish }: { showEnglish: boolean }) {
  const { t, locale } = useT()
  // The Arabic names beside each heading only add something when the interface isn't Arabic.
  const arabicAside = locale !== "ar"
  const [today, setToday] = useState<Dua | null>(null)

  useEffect(() => {
    // The dua of the day depends on the visitor's date, so pick it after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(duaOfTheDayFor(new Date()))
  }, [])

  return (
    <div className="mt-4">
      {today ? (
        <section aria-labelledby="dua-of-the-day" className="andalus-card border-gold/70 bg-accent/50 px-5 py-5">
          <h2 id="dua-of-the-day" className="flex items-center gap-2 font-heading text-xl text-grove">
            <Sparkles className="size-4 text-brass" aria-hidden />
            {t("Dua of the day")}
            {arabicAside ? (
              <span lang="ar" className="font-arabic text-base text-brass">
                دعاء اليوم
              </span>
            ) : null}
          </h2>
          <DuaBody dua={today} showEnglish={showEnglish} />
        </section>
      ) : null}

      <nav aria-label={t("Occasions")} className="-mx-4 mt-5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {DUA_GROUPS.map((g) => (
            <li key={g.id}>
              <a
                href={`#duas-${g.id}`}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-sm whitespace-nowrap text-ink hover:border-gold hover:bg-secondary"
              >
                {t(g.title)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {DUA_GROUPS.map((g) => (
        <section key={g.id} id={`duas-${g.id}`} aria-labelledby={`duas-${g.id}-title`} className="mt-8 scroll-mt-44">
          <h2 id={`duas-${g.id}-title`} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-gold/40 pb-1">
            <span className="font-heading text-2xl text-grove">{t(g.title)}</span>
            {arabicAside ? (
              <span lang="ar" dir="rtl" className="font-arabic text-lg text-brass">
                {g.arabic}
              </span>
            ) : null}
          </h2>
          <ol className="mt-3 grid gap-3">
            {duasIn(g.id).map((d) => (
              <li key={d.id} id={`dua-${d.id}`} className="andalus-card px-5 py-5">
                <DuaBody dua={d} showEnglish={showEnglish} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

export function RuqyaList({ showEnglish }: { showEnglish: boolean }) {
  const { t, locale } = useT()
  return (
    <div className="mt-4">
      <div className="andalus-card border-gold/70 bg-accent/50 px-5 py-4 text-sm leading-6 text-muted-foreground">
        <h2 className="flex items-center gap-2 font-heading text-xl text-grove">
          {t("Ruqya")}
          {locale !== "ar" ? (
            <span lang="ar" className="font-arabic text-base text-brass">
              الرقية الشرعية
            </span>
          ) : null}
        </h2>
        <p className="mt-1">
          {t(
            "Recite these over yourself or over someone who is ill, then blow lightly into your hands and wipe over the body, as the Prophet ﷺ did. Ruqya is from the Quran and the Sunnah only, with trust in Allah alone.",
          )}
        </p>
      </div>
      <ol className="mt-4 grid gap-3">
        {RUQYA.map((d) => (
          <li key={d.id} id={`dua-${d.id}`} className="andalus-card px-5 py-5">
            <DuaBody dua={d} showEnglish={showEnglish} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function DuaBody({ dua, showEnglish }: { dua: Dua; showEnglish: boolean }) {
  const { t } = useT()
  return (
    <>
      <h3 className="mt-1 text-xs tracking-wide text-brass uppercase">{t(dua.title)}</h3>
      <p lang="ar" dir="rtl" className="font-arabic mt-2 text-2xl leading-[2.1] whitespace-pre-line text-ink">
        {dua.arabic}
      </p>
      {showEnglish ? (
        <p lang="en" dir="ltr" className="mt-3 text-start text-base leading-7 text-muted-foreground">
          {dua.english}
        </p>
      ) : null}
      {dua.note || dua.count > 1 ? (
        <p className="mt-3 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          {dua.note ? <span>{t(dua.note)}</span> : null}
          {dua.count > 1 ? <span className="text-grove">{t("{n} times", { n: dua.count })}</span> : null}
        </p>
      ) : null}
      <details className="mt-2 text-xs leading-5 text-muted-foreground">
        <summary className="cursor-pointer py-1">{t("Source")}</summary>
        {dua.reference}
      </details>
    </>
  )
}
