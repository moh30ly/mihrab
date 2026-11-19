import { FAQ } from "@/lib/faq"

export function Guide() {
  return (
    <section id="how-mihrab-works" className="border-t border-border">
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl text-grove">How Mihrab chooses the Qibla and the salah</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Mihrab is a prayer companion. It shows the direction of the Kaaba and today’s Fajr, Dhuhr, Asr, Maghrib, and Isha for the city or coordinates you choose, in that place’s time zone.
          </p>
        </div>
        <div className="grid gap-6">
          {FAQ.map((item) => (
            <article key={item.question}>
              <h3 className="font-display text-2xl text-grove">{item.question}</h3>
              <p className="mt-2 max-w-3xl text-base leading-7 text-ink">{item.answer}</p>
            </article>
          ))}
        </div>
        <footer className="border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
          <p>
            Prayer times are calculated with the Adhan library. City names and coordinates are from GeoNames, used under Creative Commons Attribution 4.0. Your position is read by the browser and stays on this device.
          </p>
        </footer>
      </div>
    </section>
  )
}
