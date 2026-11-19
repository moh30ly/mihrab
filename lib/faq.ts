export const FAQ = [
  {
    question: "How does Mihrab find the Qibla?",
    answer:
      "Mihrab computes the great-circle bearing from your coordinates to the Kaaba in Makkah, at 21.4225° N, 39.8262° E. On a phone with a compass, hold the device flat and turn until the gold mark sits at the top of the dial. On a computer, north stays at the top and the mark shows the bearing clockwise from north.",
  },
  {
    question: "How are the prayer times calculated?",
    answer:
      "Fajr, sunrise, Dhuhr, Asr, Maghrib, and Isha come from the sun’s position at your latitude and longitude. Mihrab uses the open-source Adhan library and the calculation method you choose, then shows each time in the time zone of that place, including daylight saving when the zone observes it. The result is a guide. A mosque timetable can differ by a few minutes, and Calculation lets you shift any prayer to match it.",
  },
  {
    question: "Which calculation method should I choose?",
    answer:
      "Methods differ mainly in the sun angles used for Fajr and Isha. Mihrab suggests one that is widely used in the country of the city you pick: Umm al-Qura in Saudi Arabia, ISNA in the United States and Canada, the Egyptian General Authority in Egypt, Diyanet in Turkey, and others. Standard Asr follows the Shafi‘i, Maliki, and Hanbali schools. Hanafi Asr is later. When you are unsure, follow the timetable of the mosque where you pray.",
  },
  {
    question: "Will Mihrab remind me if I close the page?",
    answer:
      "The countdown, the tab title, and the on-page notice run while Mihrab stays open, including in a background tab. A system notification is sent only after you turn reminders on and allow notifications. Closing the page stops both. Leave Mihrab open, or add it to your home screen and keep it open, for the reminder to fire.",
  },
  {
    question: "Does Mihrab send my location anywhere?",
    answer:
      "No. The browser reads your coordinates on this device, and the Qibla and prayer times are calculated here. Searching for a city uses a list stored in the app. Mihrab does not send your position to a server.",
  },
  {
    question: "Why might Ramadan dates differ from my mosque?",
    answer:
      "When the Umm al-Qura calendar says the month is Ramadan, Mihrab marks Fajr as the end of suhoor and Maghrib as iftar. Local moonsighting can start or end the month a day earlier or later. Follow your mosque for fasting and for Eid.",
  },
] as const
