import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Mihrab has no accounts, no ads and no tracking. Your location is used on your device to work out prayer times and the Qibla, and is never sent to us.",
  alternates: { canonical: "/privacy/" },
}

const UPDATED = "20 November 2026"

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <h1 className="font-heading text-4xl tracking-tight text-grove sm:text-5xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-base leading-7 text-ink [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-grove [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-6">
        <section>
          <p>
            This policy covers the Mihrab website at mihrab.live and the Mihrab app for Android (package live.mihrab.app).
            In short: Mihrab has no accounts, no ads, no analytics and no tracking. We do not collect, store, sell or share
            any personal data.
          </p>
        </section>

        <section>
          <h2>Your location</h2>
          <p>
            If you allow it, Mihrab reads your device’s location to calculate prayer times and the Qibla direction for where
            you are. You can also pick a city from the built-in list instead. The calculation happens entirely on your
            device. Your location is never sent to us or to anyone else.
          </p>
          <p>
            The place you chose is saved on your device so the app remembers it next time. You can change it at any time,
            and you can turn off location access in your device or browser settings.
          </p>
        </section>

        <section>
          <h2>Settings saved on your device</h2>
          <p>
            Your calculation method, reminder choices, interface language, athkar counts and memorization progress are stored only in your
            browser’s or the app’s local storage. They stay on your device and are deleted if you clear the app’s data or
            uninstall it.
          </p>
        </section>

        <section>
          <h2>Notifications</h2>
          <p>
            Prayer and other reminders are scheduled locally by your device. No push server is involved, and nothing about
            your reminders leaves your device. You can turn reminders off in the app or in your device settings.
          </p>
        </section>

        <section>
          <h2>Compass and motion sensors</h2>
          <p>
            The Qibla compass reads your device’s orientation sensors while the compass is on screen. These readings are used
            only on your device and are not stored or sent anywhere.
          </p>
        </section>

        <section>
          <h2>Microphone (Quran memorization)</h2>
          <p>
            When you tap Recite on the memorization page, Mihrab asks to use the microphone so it can check your recitation.
            The listening is done by your device’s own speech recognition: Android’s speech service in the app, or your
            browser’s on the website. Depending on your device and browser, that service may send the audio to its provider
            (for example Google) to turn it into text. Mihrab itself does not record, store or send any audio; only the
            resulting score for each ayah is kept on your device. You can always type the ayah instead.
          </p>
        </section>

        <section>
          <h2>Network requests</h2>
          <p>
            On the website, the pages and Quran files are served by GitHub Pages. Like any web host, GitHub may keep standard
            server logs, such as your IP address, for security; see{" "}
            <a className="underline underline-offset-2" href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">
              GitHub’s privacy statement
            </a>
            . The Android app ships with its content built in and does not send your data to any server.
          </p>
          <p>
            When you press Listen on a surah, the recitation is streamed ayah by ayah from{" "}
            <a className="underline underline-offset-2" href="https://everyayah.com/" rel="noopener">
              everyayah.com
            </a>
            , which, like any web server, sees your IP address and which ayah file is requested. Nothing else is sent, and nothing
            is requested until you press play.
          </p>
        </section>

        <section>
          <h2>Children</h2>
          <p>
            Mihrab is suitable for all ages and does not knowingly collect information from anyone, including children.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>If this policy changes, the new version will be posted on this page with a new date at the top.</p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Questions about this policy can be sent through{" "}
            <a className="underline underline-offset-2" href="https://github.com/moh30ly/mihrab/issues" rel="noopener">
              the Mihrab issue tracker on GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
