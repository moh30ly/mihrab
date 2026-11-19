# Mihrab

Mihrab shows the Qibla and the five daily prayers for the place you are in. Times follow that city’s time zone. A countdown, an on-page notice, and optional browser notifications remind you while the page stays open.

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

Reminders need the page to stay open. Closing it stops the countdown and the notifications.

## Sources

Prayer times and the Qibla bearing come from the [Adhan](https://github.com/batoulapps/adhan-js) library (MIT). City names and coordinates come from [GeoNames](https://www.geonames.org/) `cities15000`, used under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Time zones for a raw coordinate come from `tz-lookup` (CC0).
