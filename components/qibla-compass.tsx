"use client"

import Link from "next/link"
import { cardinal, normalizeBearing, turnToward } from "@/lib/prayer"
import { useCompass } from "@/components/use-compass"
import { ArchFrame } from "@/components/ornament"
import { QiblaIcon } from "@/components/nav-icons"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n"
import { PALETTE as P, star8 } from "@/lib/art"

const SIZE = 292
const CENTER = SIZE / 2
const RADIUS = 118

function point(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)]
}

export function QiblaCompass({
  bearing,
  distanceLabel,
}: {
  bearing: number
  distanceLabel: string
}) {
  const { heading, status, requestAccess } = useCompass()
  const { t } = useT()
  const dial = heading == null ? 0 : -heading
  const rounded = Math.round(normalizeBearing(bearing))
  const direction = cardinal(bearing)
  const turn = heading == null ? null : turnToward(bearing, heading)
  const facing =
    turn == null
      ? t("North is at the top. The Qibla is {deg}° {dir}.", { deg: rounded, dir: t(direction) })
      : Math.abs(turn) < 4
        ? t("You are facing the Qibla.")
        : turn > 0
          ? t("Turn right {deg}°.", { deg: Math.round(turn) })
          : t("Turn left {deg}°.", { deg: Math.round(Math.abs(turn)) })

  const ticks = []
  for (let degree = 0; degree < 360; degree += 5) {
    const major = degree % 30 === 0
    const [x1, y1] = point(degree, major ? RADIUS - 16 : RADIUS - 8)
    const [x2, y2] = point(degree, RADIUS)
    ticks.push(
      <line
        key={degree}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={major ? P.oxblood : "#c2a878"}
        strokeWidth={major ? 1.6 : 1}
      />,
    )
  }

  return (
    <ArchFrame lift={44} lamp={false} nicheClassName="px-2 pb-7 sm:px-6">
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px]"
          role="img"
          aria-label={`${facing} ${t("{distance} to the Kaaba", { distance: distanceLabel })}.`}
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 14} fill={P.gold} />
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 11} fill="#fbf3e2" stroke={P.oxblood} strokeWidth="1" />
          <path d={star8(CENTER, CENTER, RADIUS - 44, 0.72)} fill="none" stroke={P.gold} strokeOpacity="0.55" strokeWidth="1.2" />
          <g
            transform={`rotate(${dial} ${CENTER} ${CENTER})`}
          >
            {ticks}
            {["N", "E", "S", "W"].map((label, index) => {
              const [x, y] = point(index * 90, RADIUS - 32)
              return (
                <text
                  key={label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={label === "N" ? P.brick : P.oxblood}
                  fontSize={label === "N" ? 16 : 13}
                  fontFamily="Georgia, serif"
                >
                  {t(label)}
                </text>
              )
            })}
            <g transform={`rotate(${bearing} ${CENTER} ${CENTER})`}>
              <polygon
                points={`${CENTER},${CENTER - RADIUS + 6} ${CENTER - 8},${CENTER - RADIUS + 26} ${CENTER + 8},${CENTER - RADIUS + 26}`}
                fill={P.brick}
                stroke={P.oxblood}
                strokeWidth="1"
              />
            </g>
          </g>
          {heading != null && (
            <polygon
              points={`${CENTER},${CENTER - RADIUS - 2} ${CENTER - 6},${CENTER - RADIUS + 8} ${CENTER + 6},${CENTER - RADIUS + 8}`}
              fill={P.teal}
            />
          )}
          <g>
            <rect x={CENTER - 16} y={CENTER - 20} width="32" height="38" rx="1.5" fill="#1c1916" />
            <rect x={CENTER - 16} y={CENTER - 6} width="32" height="7" fill="#c6a15a" />
            <rect x={CENTER - 5} y={CENTER - 4} width="10" height="16" fill="#3d3428" />
          </g>
        </svg>
      </div>
      <p className="mt-2 text-center font-display text-4xl text-[#fbf1de] tabular-nums">
        {rounded}° <span className="text-2xl text-brass-bright">{t(direction)}</span>
      </p>
      <p className="mt-1 text-center text-sm text-brass-bright">{t("{distance} to the Kaaba", { distance: distanceLabel })}</p>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-[#fbf1de]/85">{facing}</p>
      {status === "needs-permission" && (
        <div className="mt-4 flex justify-center">
          <Button type="button" className="h-11 bg-brass-bright px-4 text-grove-deep hover:bg-brass-bright/90" onClick={() => void requestAccess()}>
            {t("Use the phone compass")}
          </Button>
        </div>
      )}
      {status === "denied" && (
        <p className="mt-3 text-center text-sm text-brass-bright">
          {t("Compass access is off. The dial keeps north at the top.")}
        </p>
      )}
      {status === "unavailable" && (
        <p className="mt-3 text-center text-sm text-[#fbf1de]/75">
          {t("This device has no compass reading. North stays at the top.")}
        </p>
      )}
      {status === "live" && (
        <p className="mt-3 text-center text-sm text-[#fbf1de]/75">{t("Hold the phone flat, away from metal.")}</p>
      )}
    </ArchFrame>
  )
}

/** A small card on the prayer page that points the way and opens the compass. */
export function QiblaTeaser({ bearing, distanceLabel }: { bearing: number; distanceLabel: string }) {
  const { t } = useT()
  const rounded = Math.round(normalizeBearing(bearing))
  return (
    <Link href="/qibla/" className="andalus-card group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent sm:px-5">
      <svg viewBox="0 0 64 64" className="size-16 shrink-0" aria-hidden>
        <circle cx="32" cy="32" r="30" fill={P.gold} />
        <circle cx="32" cy="32" r="27.5" fill="#fbf3e2" stroke={P.oxblood} strokeWidth="0.8" />
        <path d={star8(32, 32, 16, 0.72)} fill="none" stroke={P.gold} strokeOpacity="0.6" />
        <text x="32" y="12.5" textAnchor="middle" fontSize="7" fill={P.brick} fontFamily="Georgia, serif">N</text>
        <g transform={`rotate(${bearing} 32 32)`}>
          <path d="M32 8l4.5 9h-9z" fill={P.brick} />
          <path d="M32 17v10" stroke={P.oxblood} strokeWidth="1.4" />
        </g>
        <rect x="27" y="27" width="10" height="10" rx="0.8" fill="#1c1916" />
        <rect x="27" y="29.6" width="10" height="1.8" fill="#c6a15a" />
      </svg>
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-1.5 font-display text-2xl text-grove">
          <QiblaIcon className="size-5 text-brass" />
          {t("Qibla")}
        </h2>
        <p className="font-display text-xl text-ink tabular-nums">
          {rounded}° <span className="text-brass">{t(cardinal(bearing))}</span>
        </p>
        <p className="text-sm text-muted-foreground">{t("{distance} to the Kaaba", { distance: distanceLabel })}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-grove underline decoration-brass underline-offset-4 group-hover:decoration-2">
        {t("Open the compass")}
      </span>
    </Link>
  )
}
