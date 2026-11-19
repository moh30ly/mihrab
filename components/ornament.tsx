import type { CSSProperties, ReactNode } from "react"
import { lobedIntrados, PALETTE as P, star8, voussoirs } from "@/lib/art"
import { cn } from "@/lib/utils"

// Crown geometry, in a box 100 units wide. The jamb columns below the crown
// are sized in percent of the same width so the two always line up.
const CX = 50
const CY = 50
const RO = 48
const RI = 41
const SPRING = 62
const IN_HALF = Math.sqrt(RI * RI - (SPRING - CY) ** 2)
const OUT_HALF = Math.sqrt(RO * RO - (SPRING - CY) ** 2)
const JAMB_OUT = CX - OUT_HALF
const JAMB = OUT_HALF - IN_HALF
const WEDGES = voussoirs(CX, CY, RI, RO, 17, 22)
const INTRADOS = `M${CX - IN_HALF} ${SPRING}${lobedIntrados(CX, CY, RI, SPRING, 11)}`

function Crown({ lamp }: { lamp: boolean }) {
  return (
    <svg viewBox={`0 0 100 ${SPRING}`} className="block w-full" aria-hidden focusable="false">
      <defs>
        <clipPath id="arch-crown-clip">
          <rect width="100" height={SPRING} />
        </clipPath>
        <radialGradient id="arch-crown-glow" cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor="#1e5a55" />
          <stop offset="1" stopColor={P.teal} />
        </radialGradient>
      </defs>
      <g fill="none" stroke={P.goldBright} strokeOpacity="0.8" strokeWidth="0.45">
        <path d={star8(7, 8, 4.2, 0.7)} />
        <path d={star8(93, 8, 4.2, 0.7)} />
      </g>
      <g clipPath="url(#arch-crown-clip)">
        {WEDGES.map((w, i) => (
          <path key={i} d={w.d} fill={w.odd ? P.stone : P.brick} />
        ))}
        <circle cx={CX} cy={CY} r={RO} fill="none" stroke={P.gold} strokeWidth="0.9" />
      </g>
      <path d={`${INTRADOS}Z`} fill="url(#arch-crown-glow)" />
      <path d={INTRADOS} fill="none" stroke={P.gold} strokeWidth="0.7" />
      {lamp && (
        <g>
          <path d={`M${CX} ${CY - RI + 3}V${CY - RI + 13}`} stroke={P.gold} strokeWidth="0.35" />
          <path d={star8(CX, CY - RI + 16, 3.4, 0.7)} fill={P.goldBright} />
          <path d={star8(CX, CY - RI + 16, 1.4, 0.7)} fill={P.teal} />
        </g>
      )}
      <rect x={JAMB_OUT - 1} y={SPRING - 1.6} width={JAMB + 2} height="1.6" fill={P.gold} />
      <rect x={100 - JAMB_OUT - JAMB - 1} y={SPRING - 1.6} width={JAMB + 2} height="1.6" fill={P.gold} />
    </svg>
  )
}

/**
 * A polylobed horseshoe arch inside an alfiz. Children sit in the niche;
 * `lift` (in percent of the arch's width) raises them up under the crown.
 */
export function ArchFrame({
  children,
  lift = 0,
  lamp = true,
  className,
  nicheClassName,
}: {
  children: ReactNode
  lift?: number
  lamp?: boolean
  className?: string
  nicheClassName?: string
}) {
  const columns: CSSProperties = {
    gridTemplateColumns: `${JAMB_OUT}% ${JAMB}% minmax(0, 1fr) ${JAMB}% ${JAMB_OUT}%`,
  }
  return (
    <section className={cn("alfiz px-3 pt-3 pb-3 sm:px-4 sm:pt-4", className)}>
      <div style={{ containerType: "inline-size" }}>
        <Crown lamp={lamp} />
        <div className="grid" style={columns}>
          <div />
          <div className="border-x border-gold/70 bg-[linear-gradient(90deg,#efdcb4,#f8ecd2_45%,#e9d3a7)]" />
          <div className="bg-teal text-[#fbf1de]">
            <div className={cn("relative", nicheClassName)} style={{ marginTop: `-${lift}cqw` }}>
              {children}
            </div>
          </div>
          <div className="border-x border-gold/70 bg-[linear-gradient(90deg,#efdcb4,#f8ecd2_45%,#e9d3a7)]" />
          <div />
        </div>
        <div className="mx-[1.5%] h-2 rounded-[2px] bg-gold shadow-[0_2px_0_rgba(63,18,11,0.35)]" />
      </div>
    </section>
  )
}

/** A running arcade of small horseshoe arches, used as a rule under headers. */
export function Frieze({ className }: { className?: string }) {
  return <div aria-hidden className={cn("frieze", className)} />
}

/** A small gold eight-pointed star, as an inline ornament. */
export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn("inline-block size-4", className)} aria-hidden focusable="false">
      <path d={star8(10, 10, 9, 0.7)} fill="currentColor" />
      <path d={star8(10, 10, 3.6, 0.7)} fill="var(--background)" />
    </svg>
  )
}

/** A number set in an eight-pointed star, for surah and dhikr counters. */
export function StarBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("relative grid size-11 shrink-0 place-items-center", className)}>
      <svg viewBox="0 0 44 44" className="absolute inset-0" aria-hidden focusable="false">
        <path d={star8(22, 22, 20.5, 0.76)} fill="var(--color-accent)" stroke={P.gold} strokeWidth="1.2" />
        <path d={star8(22, 22, 15.5, 0.76)} fill="none" stroke={P.gold} strokeOpacity="0.45" strokeWidth="0.8" />
      </svg>
      <span className="relative text-sm font-medium text-grove tabular-nums">{children}</span>
    </span>
  )
}
