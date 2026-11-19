"use client"

import { HIGH_LATITUDES, MADHHABS, METHODS, PRAYER_INFO, methodById, suggestForCountry } from "@/lib/methods"
import { formatSignedMinutes } from "@/lib/format"
import { PRAYER_KEYS, type Place, type PrayerKey, type Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

export function CalculationSheet({
  open,
  onOpenChange,
  settings,
  place,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  place: Place | null
  onChange: (settings: Settings) => void
}) {
  const { t } = useT()
  const suggestion = place?.country ? suggestForCountry(place.country) : null
  const usingSuggestion =
    suggestion != null &&
    !settings.methodCustom &&
    !settings.madhabCustom &&
    settings.method === suggestion.method &&
    settings.madhab === suggestion.madhab

  function bump(key: PrayerKey, delta: number) {
    onChange({
      ...settings,
      adjustments: {
        ...settings.adjustments,
        [key]: Math.max(-45, Math.min(45, settings.adjustments[key] + delta)),
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[1.75rem]">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{t("Calculation")}</SheetTitle>
          <SheetDescription>
            {t("Methods differ by the sun angles for Fajr and Isha, and by when Asr begins.")}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4 pb-6">
          {suggestion && place?.countryName && (
            <div className="rounded-2xl bg-accent px-4 py-3 text-sm leading-6">
              {usingSuggestion ? (
                <p>{t("Suggested for {country}: {method}, {madhab} Asr.", { country: place.countryName, method: t(methodById(suggestion.method).name), madhab: suggestion.madhab === "hanafi" ? t("Hanafi") : t("standard") })}</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {t("Suggested for {country}: {method}, {madhab} Asr.", { country: place.countryName, method: t(methodById(suggestion.method).name), madhab: suggestion.madhab === "hanafi" ? t("Hanafi") : t("standard") })}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0"
                    onClick={() =>
                      onChange({
                        ...settings,
                        method: suggestion.method,
                        methodCustom: false,
                        madhab: suggestion.madhab,
                        madhabCustom: false,
                      })
                    }
                  >
                    {t("Use suggestion")}
                  </Button>
                </div>
              )}
            </div>
          )}

          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">{t("Method")}</legend>
            {METHODS.map((method) => (
              <label
                key={method.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border px-3 py-3",
                  settings.method === method.id ? "border-brass bg-[#f8f1e2]" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  className="mt-1 accent-grove"
                  checked={settings.method === method.id}
                  onChange={() => onChange({ ...settings, method: method.id, methodCustom: true })}
                />
                <span>
                  <span className="block font-medium">{t(method.name)}</span>
                  <span className="block text-sm leading-5 text-muted-foreground">{t(method.detail)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">Asr</legend>
            {MADHHABS.map((madhab) => (
              <label
                key={madhab.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border px-3 py-3",
                  settings.madhab === madhab.id ? "border-brass bg-[#f8f1e2]" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="madhab"
                  className="mt-1 accent-grove"
                  checked={settings.madhab === madhab.id}
                  onChange={() => onChange({ ...settings, madhab: madhab.id, madhabCustom: true })}
                />
                <span>
                  <span className="block font-medium">{t(madhab.name)}</span>
                  <span className="block text-sm leading-5 text-muted-foreground">{t(madhab.detail)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">{t("High latitudes")}</legend>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("This changes Fajr and Isha where twilight lasts through the night. Inside the polar circles, Mihrab uses the nearest latitude that still has a normal sunrise and sunset.")}
            </p>
            {HIGH_LATITUDES.map((rule) => (
              <label
                key={rule.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border px-3 py-3",
                  settings.highLatitude === rule.id ? "border-brass bg-[#f8f1e2]" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="high-latitude"
                  className="mt-1 accent-grove"
                  checked={settings.highLatitude === rule.id}
                  onChange={() => onChange({ ...settings, highLatitude: rule.id })}
                />
                <span>
                  <span className="block font-medium">{t(rule.name)}</span>
                  <span className="block text-sm leading-5 text-muted-foreground">{t(rule.detail)}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <Label>{t("Match a mosque timetable")}</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("Positive minutes move a time later. Each step is one minute, up to 45.")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...settings,
                    adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
                  })
                }
              >
                {t("Reset")}
              </Button>
            </div>
            {PRAYER_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-3 border-b border-border py-2">
                <span className="font-medium">{t(PRAYER_INFO[key].name)}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("{name} one minute earlier", { name: t(PRAYER_INFO[key].name) })}
                    onClick={() => bump(key, -1)}
                  >
                    −
                  </Button>
                  <span className="w-16 text-center text-sm tabular-nums">
                    {formatSignedMinutes(settings.adjustments[key])}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("{name} one minute later", { name: t(PRAYER_INFO[key].name) })}
                    onClick={() => bump(key, 1)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
