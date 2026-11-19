// Mihrab's artwork: a horseshoe arch with alternating voussoirs (after the
// prayer hall of Córdoba), framed by an alfiz and laid over eight-pointed star
// work. Everything is drawn here as plain SVG so the same shapes feed the app,
// the favicon, the Android launcher icons and the store graphics.

export const PALETTE = {
  oxblood: "#6b2216",
  oxbloodDeep: "#3f120b",
  brick: "#b4472c",
  stone: "#f4e6c8",
  gold: "#d2a24c",
  goldBright: "#ecc97a",
  teal: "#123f3c",
  tealDeep: "#0b2b29",
  parchment: "#f5ead6",
} as const

const f = (n: number) => Math.round(n * 100) / 100

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
}

/**
 * Wedge paths for a horseshoe arch ring centred on (cx, cy). The ring spans
 * from `spread` degrees below the left horizontal, over the top, to `spread`
 * degrees below the right one; callers clip it at the springing line.
 */
export function voussoirs(cx: number, cy: number, inner: number, outer: number, count: number, spread = 26) {
  const start = 180 - spread
  const span = 180 + spread * 2
  const step = span / count
  const wedges: { d: string; odd: boolean }[] = []
  for (let i = 0; i < count; i++) {
    const a0 = start + i * step
    const a1 = a0 + step
    const [x0, y0] = polar(cx, cy, outer, a0)
    const [x1, y1] = polar(cx, cy, outer, a1)
    const [x2, y2] = polar(cx, cy, inner, a1)
    const [x3, y3] = polar(cx, cy, inner, a0)
    wedges.push({
      d: `M${f(x0)} ${f(y0)}A${outer} ${outer} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${inner} ${inner} 0 0 0 ${f(x3)} ${f(y3)}Z`,
      odd: i % 2 === 1,
    })
  }
  return wedges
}

/**
 * The intrados of a polylobed horseshoe arch: scalloped arcs between cusps on
 * a circle of radius r, from the left springing point over the top to the
 * right one. Returns path commands that continue from the left point.
 */
export function lobedIntrados(cx: number, cy: number, r: number, spring: number, count: number, depth = 0.68) {
  const half = (Math.asin((spring - cy) / r) * 180) / Math.PI
  const start = 180 - half
  const step = (180 + half * 2) / count
  const chord = 2 * r * Math.sin(((step / 2) * Math.PI) / 180)
  const lobe = chord * depth
  let d = ""
  for (let i = 1; i <= count; i++) {
    const [x, y] = polar(cx, cy, r, start + i * step)
    d += `A${f(lobe)} ${f(lobe)} 0 0 1 ${f(x)} ${f(y)}`
  }
  return d
}

/** An eight-pointed star (two squares turned 45° apart) as one outline path. */
export function star8(cx: number, cy: number, r: number, inner = 0.76) {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const rad = i % 2 === 0 ? r : r * inner
    const [x, y] = polar(cx, cy, rad, -90 + i * 22.5)
    pts.push(`${f(x)} ${f(y)}`)
  }
  return `M${pts.join("L")}Z`
}

/** A tile of interlaced eight-pointed stars, for repeating backgrounds. */
export function starTile(size: number, color: string, opacity: number, width = 1) {
  const c = size / 2
  const r = size * 0.36
  const corners = [0, size].flatMap((x) => [0, size].map((y) => star8(x, y, r * 0.55, 0.7))).join("")
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${width}">` +
    `<path d="${star8(c, c, r, 0.72)}"/><path d="${star8(c, c, r * 0.5, 0.72)}"/><path d="${corners}"/>` +
    `<path d="M${c} 0V${f(c - r)}M${c} ${size}V${f(c + r)}M0 ${c}H${f(c - r)}M${size} ${c}H${f(c + r)}"/>` +
    `</g></svg>`
  )
}

/**
 * The Mihrab emblem: a horseshoe arch with red and stone voussoirs, gold
 * edges, a deep teal niche with a gold star, and stone jambs. Drawn in a
 * 100×100 box; `x, y, s` place and scale it.
 */
export function emblem({ x = 0, y = 0, s = 1, detail = true, id = "e" }: { x?: number; y?: number; s?: number; detail?: boolean; id?: string } = {}) {
  const P = PALETTE
  const cx = 50
  const cy = 44
  const ro = 36
  const ri = 27
  const spring = 58 // springing line of the arch
  const base = 92
  const wedges = voussoirs(cx, cy, ri, ro, detail ? 13 : 9)
  const innerHalf = Math.sqrt(ri * ri - (spring - cy) ** 2)
  const outerHalf = Math.sqrt(ro * ro - (spring - cy) ** 2)
  const jambIn = cx - innerHalf
  const jambOut = cx - outerHalf
  const top = detail ? lobedIntrados(cx, cy, ri, spring, 9) : `A${ri} ${ri} 0 1 1 ${f(cx + innerHalf)} ${spring}`
  const niche = `M${f(cx - innerHalf)} ${base}V${spring}${top}V${base}Z`
  return (
    `<g transform="translate(${x} ${y}) scale(${s})">` +
    `<defs><clipPath id="${id}-c"><rect x="0" y="0" width="100" height="${spring}"/></clipPath>` +
    `<linearGradient id="${id}-n" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="92"><stop offset="0" stop-color="${P.teal}"/><stop offset="1" stop-color="${P.tealDeep}"/></linearGradient></defs>` +
    // jambs and plinth
    `<rect x="${f(jambOut)}" y="${spring}" width="${f(jambIn - jambOut)}" height="${base - spring}" fill="${P.stone}"/>` +
    `<rect x="${f(100 - jambIn)}" y="${spring}" width="${f(jambIn - jambOut)}" height="${base - spring}" fill="${P.stone}"/>` +
    `<rect x="${f(jambOut - 2)}" y="${spring - 1}" width="${f(jambIn - jambOut + 4)}" height="4" fill="${P.gold}"/>` +
    `<rect x="${f(100 - jambIn - 2)}" y="${spring - 1}" width="${f(jambIn - jambOut + 4)}" height="4" fill="${P.gold}"/>` +
    // voussoir ring
    `<g clip-path="url(#${id}-c)">` +
    wedges.map((w) => `<path d="${w.d}" fill="${w.odd ? P.stone : P.brick}"/>`).join("") +
    `<circle cx="${cx}" cy="${cy}" r="${ro}" fill="none" stroke="${P.gold}" stroke-width="2"/>` +
    `</g>` +
    `<path d="${niche}" fill="url(#${id}-n)"/>` +
    `<path d="M${f(cx - innerHalf)} ${spring}${top}" fill="none" stroke="${P.gold}" stroke-width="1.6"/>` +
    (detail
      ? `<g fill="none" stroke="${P.gold}" stroke-width="1.1"><path d="${star8(9, 12, 6, 0.7)}"/><path d="${star8(91, 12, 6, 0.7)}"/></g>` +
        `<g fill="${P.gold}"><circle cx="9" cy="12" r="1.6"/><circle cx="91" cy="12" r="1.6"/></g>`
      : "") +
    // the star in the niche, hanging like a lamp
    (detail ? `<path d="M${cx} ${cy - ri}V${cy - 6}" stroke="${P.gold}" stroke-width="1.2"/>` : "") +
    `<path d="${star8(cx, detail ? cy + 6 : cy + 4, detail ? 10.5 : 14, 0.7)}" fill="${P.goldBright}"/>` +
    (detail ? `<path d="${star8(cx, cy + 6, 4.4, 0.7)}" fill="${P.tealDeep}"/>` : "") +
    `<rect x="${f(jambOut - 4)}" y="${base}" width="${f(100 - 2 * (jambOut - 4))}" height="4" rx="1" fill="${P.gold}"/>` +
    `</g>`
  )
}

/** The oxblood field with gold star work and an alfiz frame. */
export function field({ w, h, pattern = true, frame = true, id = "f" }: { w: number; h: number; pattern?: boolean; frame?: boolean; id?: string }) {
  const P = PALETTE
  const tile = Math.max(w, h) / 6
  const inset = Math.min(w, h) * 0.06
  return (
    `<defs><radialGradient id="${id}-g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#8f3220"/><stop offset="0.6" stop-color="${P.oxblood}"/><stop offset="1" stop-color="${P.oxbloodDeep}"/></radialGradient>` +
    (pattern
      ? `<pattern id="${id}-p" width="${f(tile)}" height="${f(tile)}" patternUnits="userSpaceOnUse" x="${f(w / 2 - tile / 2)}" y="${f(h / 2 - tile / 2)}">` +
        `<g fill="none" stroke="${P.gold}" stroke-opacity="0.22" stroke-width="${f(tile / 60)}">` +
        `<path d="${star8(tile / 2, tile / 2, tile * 0.36, 0.72)}"/>` +
        `<path d="M${f(tile / 2)} 0V${f(tile * 0.14)}M${f(tile / 2)} ${f(tile)}V${f(tile * 0.86)}M0 ${f(tile / 2)}H${f(tile * 0.14)}M${f(tile)} ${f(tile / 2)}H${f(tile * 0.86)}"/>` +
        `</g></pattern>`
      : "") +
    `</defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${id}-g)"/>` +
    (pattern ? `<rect width="${w}" height="${h}" fill="url(#${id}-p)"/>` : "") +
    (frame
      ? `<rect x="${f(inset)}" y="${f(inset)}" width="${f(w - 2 * inset)}" height="${f(h - 2 * inset)}" fill="none" stroke="${P.gold}" stroke-opacity="0.75" stroke-width="${f(Math.min(w, h) / 160)}"/>`
      : "")
  )
}

export function svg(w: number, h: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
}

/** The full-bleed square app icon (web, Play Store, legacy Android). */
export function appIcon({ size = 512, detail = true, pattern = true }: { size?: number; detail?: boolean; pattern?: boolean } = {}) {
  const s = size / 100
  return svg(size, size, field({ w: size, h: size, pattern, frame: detail }) + emblem({ x: size * 0.12, y: size * 0.1, s: s * 0.76, detail }))
}

/** A one-colour silhouette of the emblem, for Android 13 themed icons. */
export function monoEmblem({ x = 0, y = 0, s = 1, color = "#ffffff" }: { x?: number; y?: number; s?: number; color?: string } = {}) {
  const cx = 50
  const cy = 44
  const ro = 36
  const ri = 27
  const spring = 58
  const base = 92
  const inH = Math.sqrt(ri * ri - (spring - cy) ** 2)
  const outH = Math.sqrt(ro * ro - (spring - cy) ** 2)
  const outer = `M${f(cx - outH)} ${base}V${spring}A${ro} ${ro} 0 1 1 ${f(cx + outH)} ${spring}V${base}Z`
  const niche = `M${f(cx - inH)} ${base}V${spring}${lobedIntrados(cx, cy, ri, spring, 9)}V${base}Z`
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">` +
    `<path fill-rule="evenodd" d="${outer}${niche}"/>` +
    `<path d="${star8(cx, cy + 6, 10.5, 0.7)}"/>` +
    `<rect x="${f(cx - outH - 4)}" y="${base}" width="${f(2 * (outH + 4))}" height="4" rx="1"/>` +
    `</g>`
  )
}
