import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Mihrab has no accounts, no ads and no tracking. Your location is used on your device to work out prayer times and the Qibla, and is never sent to us. Recitations are shared only if you opt in.",
  alternates: { canonical: "/privacy/" },
}

const UPDATED = "21 November 2026"

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-12 sm:px-6">
      <h1 className="font-heading text-4xl tracking-tight text-grove sm:text-5xl">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-base leading-7 text-ink [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-grove [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-6">
        <section>
          <p>
            This policy covers the Mihrab website at mihrab.live and the Mihrab app for Android (package live.mihrab.app).
            In short: Mihrab has no accounts, no ads, no analytics and no tracking, and we never sell or share personal
            data. The one thing we ever receive is recordings of your Quran recitation, and only if you turn on sharing on
            the memorization page (see below). It is off unless you choose it.
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
            In the Android app, Mihrab’s own recitation checker turns your voice into text on your device; nothing is sent
            anywhere to do that. Where that checker isn’t available, your device’s speech recognition is used instead
            (Android’s speech service, or your browser’s on the website), and depending on your device that service may send
            the audio to its provider (for example Google) to turn it into text.
          </p>
          <p>
            Mihrab keeps your latest recording of each ayah on your device so you can listen back, and your score for each
            ayah. These stay on your device and are deleted if you clear the app’s data or uninstall it. You can always type
            the ayah instead.
          </p>
        </section>

        <section>
          <h2>Recitations you choose to share (optional)</h2>
          <p>
            The checker learned from professional reciters and makes more mistakes with everyday voices. To improve it, you
            can turn on “Share my recitations to improve the checker” on the memorization page. It is off by default, Mihrab
            asks you first, and you must confirm that you are 18 or older or that a parent or guardian agrees.
          </p>
          <p>When it is on, after each recitation checked by Mihrab’s own checker, the app sends us:</p>
          <ul>
            <li>the audio recording of that recitation;</li>
            <li>which surah and ayahs you recited, what the checker heard, and its score and word-by-word marks;</li>
            <li>the app version, and a random code made on your device when you turned sharing on, so that you can delete
              your recordings later.</li>
          </ul>
          <p>
            We do not receive your name, email, account, location or any device identifier. Our server (run on Cloudflare)
            notes the country a recording came from, to know which accents we have, and does not keep your IP address with
            it. Recordings are sent encrypted (HTTPS) and stored in private storage on Cloudflare R2 that only the Mihrab
            developer can read.
          </p>
          <p>
            We use these recordings only to train and test Mihrab’s recitation checker, which then ships inside the app. We
            never publish, sell or share them, and never use them for advertising, profiling or to identify you. A voice
            recording can be personal data, so we keep them for at most 3 years and delete them sooner when no longer needed.
          </p>
          <p>
            You can turn sharing off at any time; nothing more is sent after that. “Delete everything I shared” on the
            memorization page deletes all recordings sent from your device right away. If you have uninstalled the app or
            lost access to it, contact us and we will help. By turning sharing on you give your consent for this use, and
            you can withdraw it at any time.
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
            . The Android app ships with its content built in and does not send your data to any server, except the recitations you choose to share.
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
            Mihrab is suitable for all ages and does not knowingly collect information from children. Sharing recitations
            asks people to confirm they are 18 or older, or that a parent or guardian agrees. If you believe a child shared
            recordings without permission, contact us and we will delete them.
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
