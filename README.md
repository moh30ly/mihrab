# Mihrab

Mihrab shows the Qibla and the five daily prayers for the place you are in, and the full Quran to read. Times follow that city’s time zone. A countdown, an on-page notice, and optional browser notifications remind you while the page stays open.

Your coordinates are read by the browser and calculated on the device. City search uses a list shipped with the app. Location is not sent to a server.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:3847

```bash
npm test
npm run lint
npm run build
```

## What you can do

- Use your current position, search a city, or enter coordinates.
- Read Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha in that place’s time zone.
- Turn the phone until the gold mark is at the top of the Qibla dial. On a computer, north stays at the top.
- Choose a calculation method, standard or Hanafi Asr, a high-latitude rule, and minute adjustments so the times can match a mosque timetable.
- Turn on reminders for any of the five prayers, at the time or 5, 10, or 15 minutes before.
- Read all 114 surahs of the Quran in Arabic, with the meaning in English, Arabic (Tafsir al-Muyassar), German, Italian, Chinese, Japanese, Turkish, Portuguese or Spanish, a text-size control, and “continue reading” from the last ayah you reached.

On the website, reminders need the page to stay open. The Android app schedules them as phone notifications for the next seven days, so they arrive with the app closed.
- Read the morning and evening athkar from Hisn al-Muslim, with a tap counter.
- Get reminders for Duha, the morning and evening athkar, a weekly sadaqah day, and your yearly zakat date on the Hijri calendar.

## Website

`npm run build` writes a static site to `out/`. The **Website** GitHub Action builds every push and deploys `main` to GitHub Pages, served at https://mihrab.live (see `public/CNAME`).

DNS at the registrar for `mihrab.live`:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | moh30ly.github.io. |

## Android app

The Android app wraps the same static site with [Capacitor](https://capacitorjs.com/) (`android/`, app id `live.mihrab.app`).

- The **Android** GitHub Action builds a debug APK on every push. Download it from the run's artifacts. Pushing a tag such as `v1.0.0` also attaches the APK to a GitHub release.
- Locally, with Android Studio installed: `npm run android`.
- Icons and splash screens come from `resources/` (`python3 scripts/make-icons.py`, then `npx @capacitor/assets generate --android`).

A Play Store release needs a signed bundle (`./gradlew bundleRelease`) with your own upload key.

## Sources

Prayer times and the Qibla bearing come from the [Adhan](https://github.com/batoulapps/adhan-js) library (MIT). City names and coordinates come from [GeoNames](https://www.geonames.org/) `cities15000`, used under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Time zones for a raw coordinate come from `tz-lookup` (CC0).

The Quran’s Arabic text is the Uthmani script of the King Fahd Glorious Qur’an Printing Complex, published by [The Noble Qur’an Encyclopedia](https://quranenc.com/). The English meaning is Saheeh International, from [Tanzil.net](https://tanzil.net/trans/en.sahih). Both come through the [quran-json](https://github.com/risan/quran-json) dataset (CC BY-SA 4.0). See `data/quran/README.md`.

Other Quran translations (see `lib/translations.ts`) come from quranenc.com and Tanzil.net through the [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api) mirror, imported unchanged by `scripts/import-translations.mjs`. The athkar are the morning and evening chapter of *Hisn al-Muslim* by Sa‘id al-Qahtani, with English and references from [@kazishariar/morning-evening-adhkar-data](https://www.npmjs.com/package/@kazishariar/morning-evening-adhkar-data) (CC BY 4.0), imported by `scripts/import-athkar.mjs`.
