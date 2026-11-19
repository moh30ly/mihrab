// Renders Mihrab's icons and splash screens from the SVG artwork in lib/art.ts.
// Run: npx tsx scripts/make-icons.ts   (uses the Playwright Chromium on this machine)
import { mkdirSync, readdirSync, existsSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { appIcon, emblem, field, monoEmblem, svg, PALETTE } from "../lib/art"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("playwright")

const root = join(__dirname, "..")
const res = join(root, "android/app/src/main/res")
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 } as const

type Job = { out: string; w: number; h: number; body: string; round?: boolean }
const jobs: Job[] = []
const add = (out: string, w: number, h: number, body: string, round = false) => jobs.push({ out: join(root, out), w, h, body, round })

// Full-bleed square icon, scaled to its size. Small sizes drop the fine detail.
const icon = (size: number) => appIcon({ size, detail: size >= 96, pattern: size >= 96 })
// The emblem alone on a transparent field, sized for an adaptive-icon foreground.
const foreground = (size: number) => {
  const e = size * 0.56
  return svg(size, size, emblem({ x: (size - e) / 2, y: (size - e) / 2 - size * 0.01, s: e / 100, detail: size >= 108, id: "fg" }))
}
const background = (size: number) => svg(size, size, field({ w: size, h: size, frame: false, id: "bg" }))
const monochrome = (size: number) => {
  const e = size * 0.56
  return svg(size, size, monoEmblem({ x: (size - e) / 2, y: (size - e) / 2 - size * 0.01, s: e / 100 }))
}
const roundIcon = (size: number) => {
  const e = size * 0.66
  return svg(size, size, field({ w: size, h: size, frame: false, pattern: size >= 96, id: "r" }) + emblem({ x: (size - e) / 2, y: (size - e) / 2 - size * 0.01, s: e / 100, detail: size >= 96, id: "re" }))
}
const splash = (w: number, h: number) => {
  const e = Math.min(w, h) * 0.42
  return svg(w, h, field({ w, h, frame: false, id: "sp" }) + emblem({ x: (w - e) / 2, y: (h - e) / 2, s: e / 100, id: "spe" }))
}

// Web
add("app/icon.png", 32, 32, icon(32))
add("app/apple-icon.png", 180, 180, icon(180))
add("public/icons/icon-192.png", 192, 192, icon(192))
add("public/icons/icon-512.png", 512, 512, icon(512))
add("public/icons/maskable-512.png", 512, 512, svg(512, 512, field({ w: 512, h: 512, frame: false, id: "m" }) + emblem({ x: 512 * 0.2, y: 512 * 0.19, s: 512 * 0.6 / 100, id: "me" })))
add("public/icons/icon.svg", 512, 512, icon(512))

// Android launcher icons: legacy squares and circles, plus adaptive layers (108 dp).
for (const [d, k] of Object.entries(DENSITIES)) {
  const legacy = Math.round(48 * k)
  const layer = Math.round(108 * k)
  add(`android/app/src/main/res/mipmap-${d}/ic_launcher.png`, legacy, legacy, icon(legacy))
  add(`android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`, legacy, legacy, roundIcon(legacy), true)
  add(`android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`, layer, layer, foreground(layer))
  add(`android/app/src/main/res/mipmap-${d}/ic_launcher_background.png`, layer, layer, background(layer))
  add(`android/app/src/main/res/mipmap-${d}/ic_launcher_monochrome.png`, layer, layer, monochrome(layer))
}

// Android splash screens, at the sizes already in the project.
for (const dir of readdirSync(res).filter((n) => n.startsWith("drawable"))) {
  const file = join(res, dir, "splash.png")
  if (!existsSync(file)) continue
  const m = dir.match(/(land|port)?-?(?:night-)?(ldpi|mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)?$/)
  const sizes: Record<string, [number, number]> = { ldpi: [240, 320], mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
  let [w, h] = sizes[m?.[2] ?? "mdpi"]
  if (m?.[1] === "land" || dir === "drawable-night") [w, h] = [h, w]
  add(join("android/app/src/main/res", dir, "splash.png"), w, h, splash(w, h))
}

// Sources kept for @capacitor/assets, and store and sharing graphics.
add("resources/icon-only.png", 1024, 1024, icon(1024))
add("resources/icon-foreground.png", 1024, 1024, foreground(1024))
add("resources/icon-background.png", 1024, 1024, background(1024))
add("resources/splash.png", 2732, 2732, splash(2732, 2732))
add("resources/splash-dark.png", 2732, 2732, splash(2732, 2732))
add("resources/play-store/icon-512.png", 512, 512, icon(512))

const P = PALETTE
const banner = (w: number, h: number, id: string, title: string, sub: string, arabic: string) => {
  const e = h * 0.78
  const textX = h * 0.98
  return svg(
    w,
    h,
    field({ w, h, id }) +
      emblem({ x: h * 0.14, y: (h - e) / 2 + h * 0.02, s: e / 100, id: `${id}e` }) +
      `<text x="${textX}" y="${h * 0.37}" font-family="Amiri, 'Noto Naskh Arabic', serif" font-size="${h * 0.15}" fill="${P.goldBright}">${arabic}</text>` +
      `<text x="${textX}" y="${h * 0.58}" font-family="Fraunces, Georgia, serif" font-size="${h * 0.19}" fill="${P.stone}">${title}</text>` +
      `<text x="${textX}" y="${h * 0.72}" font-family="Outfit, Helvetica, Arial, sans-serif" font-size="${h * 0.058}" fill="${P.stone}" fill-opacity="0.85">${sub}</text>`,
  )
}
add("app/opengraph-image.png", 1200, 630, banner(1200, 630, "og", "Mihrab", "Qibla · prayer times · Quran · athkar", "محراب"))
add("resources/play-store/feature-graphic-1024x500.png", 1024, 500, banner(1024, 500, "fg2", "Mihrab", "Qibla · prayer times · Quran · athkar", "محراب"))

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Fraunces:opsz,wght@9..144,500&family=Outfit:wght@400&display=block" rel="stylesheet">`
  for (const job of jobs) {
    mkdirSync(dirname(job.out), { recursive: true })
    if (job.out.endsWith(".svg")) {
      writeFileSync(job.out, job.body)
      continue
    }
    await page.setViewportSize({ width: job.w, height: job.h })
    const clip = job.round ? "border-radius:50%;overflow:hidden;" : ""
    await page.setContent(
      `<!doctype html><html><head>${fonts}<style>html,body{margin:0;background:transparent}div{width:${job.w}px;height:${job.h}px;${clip}}svg{display:block}</style></head><body><div>${job.body}</div></body></html>`,
      { waitUntil: "networkidle" },
    )
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: job.out, omitBackground: true, clip: { x: 0, y: 0, width: job.w, height: job.h } })
  }
  await browser.close()
  console.log(`Wrote ${jobs.length} images.`)
})()
