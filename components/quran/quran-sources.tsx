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
        Other translations: Arabic (Tafsir al-Muyassar, King Fahd Complex), German (Bubenheim &amp; Elyas), Italian (Piccardo), Chinese
        (Makin), Japanese (Mita), Turkish (Shaban Britch), Portuguese (Helmi Nasr) and Spanish (Isa García), from quranenc.com and
        Tanzil.net through the{" "}
        <a className="underline underline-offset-2" href="https://github.com/fawazahmed0/quran-api" rel="noopener">
          quran-api
        </a>{" "}
        mirror. Translations render the meaning; only the Arabic is the Quran.
      </p>
      <p>
        Tafsir: al-Mukhtasar by the Tafsir Center for Quranic Studies (Arabic, English, Italian, Spanish, Turkish, Chinese and
        Japanese), and in Arabic Tafsir al-Sa‘di, Tafsir Ibn Kathir, Tafsir al-Jalalayn and Tafsir al-Baghawi, from the{" "}
        <a className="underline underline-offset-2" href="https://qul.tarteel.ai/resources/tafsir" rel="noopener">
          Quranic Universal Library
        </a>{" "}
        through the{" "}
        <a className="underline underline-offset-2" href="https://github.com/spa5k/tafsir_api" rel="noopener">
          tafsir_api
        </a>{" "}
        dataset. The commentaries are shown as published and are loaded only when you open one.
      </p>
      <p>
        I‘rab (grammatical analysis), in Arabic: al-I‘rab al-Muyassar, al-Jadwal fi I‘rab al-Quran by Mahmud Safi, I‘rab al-Quran wa
        Bayanuh by Muhyi al-Din Darwish, I‘rab al-Quran al-Karim by al-Da‘‘as, Hamidan and al-Qasim, and al-Durr al-Masun by
        al-Samin al-Halabi, from the same library and dataset. They are shown as published. In the Android app, al-I‘rab
        al-Muyassar is included and works without a connection; the others are loaded when you open them.
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
