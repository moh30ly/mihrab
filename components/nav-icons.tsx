// Mihrab's own tab icons, drawn on a 24 grid in the line weight of the app.
import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Prayer times: a horseshoe-arched mihrab niche with a hanging lamp. */
export function MihrabIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.6 20.5V12.6A6.2 6.2 0 1 1 17.4 12.6V20.5" />
      <path d="M3.5 20.5h17" />
      <path d="M12 4.6v3.2" />
      <path d="M12 7.8l1.6 1.6L12 11l-1.6-1.6z" fill="currentColor" />
      <path d="M9.6 20.5v-3.4a2.4 2.4 0 0 1 4.8 0v3.4" strokeWidth={1.3} />
    </Svg>
  )
}

/** Qibla: the Kaaba with its kiswa band, inside a compass ring. */
export function QiblaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12.5" r="8.8" />
      <path d="M12 1.6l1.5 2.4h-3z" fill="currentColor" stroke="none" />
      <path d="M8.4 10.2l3.6-1.6 3.6 1.6v5.6L12 17.4l-3.6-1.6z" fill="currentColor" fillOpacity={0.18} />
      <path d="M8.4 10.2L12 11.8l3.6-1.6M12 11.8v5.6" />
      <path d="M8.4 12.2L12 13.8l3.6-1.6" strokeWidth={1.2} />
    </Svg>
  )
}

/** Quran: an open mushaf resting on a folding rehal stand. */
export function QuranIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 7.2C9.6 5.4 6.6 5 3.5 5.8v8.8c3.1-.8 6.1-.4 8.5 1.4 2.4-1.8 5.4-2.2 8.5-1.4V5.8c-3.1-.8-6.1-.4-8.5 1.4z" />
      <path d="M12 7.2V16" />
      <path d="M6 8.4c1.4-.2 2.7 0 3.8.5M6 11c1.4-.2 2.7 0 3.8.5M14.2 8.9c1.1-.5 2.4-.7 3.8-.5M14.2 11.5c1.1-.5 2.4-.7 3.8-.5" strokeWidth={1.1} />
      <path d="M7 16.4l10 5M17 16.4l-10 5" />
    </Svg>
  )
}

/** Athkar: a loop of tasbih beads with a tassel. */
export function TasbihIcon(props: IconProps) {
  const beads = Array.from({ length: 11 }, (_, i) => {
    const a = (-90 + 18 + i * 29.5) * (Math.PI / 180)
    return [12 + 6.6 * Math.cos(a), 9.6 + 6.6 * Math.sin(a)]
  })
  return (
    <Svg {...props}>
      {beads.map(([x, y], i) => (
        <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.25" fill="currentColor" stroke="none" />
      ))}
      <path d="M12 2.6v0" />
      <circle cx="12" cy="2.9" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 16.4v2.2" />
      <path d="M10.4 22.4L12 18.6l1.6 3.8z" fill="currentColor" />
    </Svg>
  )
}

/** Sadaqah and zakat: an open hand giving a coin. */
export function GivingIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="15.5" cy="6.2" r="3.6" />
      <path d="M15.5 4.4v3.6M14 6.2h3" strokeWidth={1.2} />
      <path d="M2.5 13.6h2.9l3-1c.9-.3 1.9-.2 2.7.3l2.3 1.4a1.4 1.4 0 0 1-1.4 2.5l-2.6-1" />
      <path d="M5.4 20.2h7.4c.9 0 1.8-.3 2.5-.8l5.5-4.1a1.5 1.5 0 0 0-1.8-2.4l-3.9 2.6" />
      <path d="M2.5 13v7.8" />
    </Svg>
  )
}
