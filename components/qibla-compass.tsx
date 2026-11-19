"use client"

import { cardinal, normalizeBearing, turnToward } from "@/lib/prayer"
import { useCompass } from "@/components/use-compass"
import { Button } from "@/components/ui/button"

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
  const dial = heading == null ? 0 : -heading
  const rounded = Math.round(normalizeBearing(bearing))
  const direction = cardinal(bearing)
  const turn = heading == null ? null : turnToward(bearing, heading)
  const facing =
    turn == null
      ? `North is at the top. The Qibla is ${rounded}° ${direction}.`
      : Math.abs(turn) < 4
        ? "You are facing the Qibla."
        : turn > 0
          ? `Turn right ${Math.round(turn)}°.`
          : `Turn left ${Math.round(Math.abs(turn))}°.`

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
        stroke={major ? "#14352b" : "#b7aa94"}
        strokeWidth={major ? 1.6 : 1}
      />,
    )
  }

  return (
    <section className="rounded-[1.75rem] border border-border bg-card px-4 py-5 shadow-[0_1px_0_rgba(20,53,43,0.04)] sm:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl text-grove">Qibla</h2>
        <p className="text-sm text-muted-foreground">{distanceLabel} to the Kaaba</p>
      </div>
      <div className="mt-4 flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full max-w-[320px]"
          role="img"
          aria-label={`${facing} ${distanceLabel} to the Kaaba.`}
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="#f7f1e6" stroke="#14352b" strokeWidth="1.25" />
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
                  fill={label === "N" ? "#8c3d2f" : "#14352b"}
                  fontSize={label === "N" ? 16 : 13}
                  fontFamily="Georgia, serif"
                >
                  {label}
                </text>
              )
            })}
            <g transform={`rotate(${bearing} ${CENTER} ${CENTER})`}>
              <polygon
                points={`${CENTER},${CENTER - RADIUS + 6} ${CENTER - 8},${CENTER - RADIUS + 26} ${CENTER + 8},${CENTER - RADIUS + 26}`}
                fill="#8d6832"
              />
            </g>
          </g>
          {heading != null && (
            <polygon
              points={`${CENTER},${CENTER - RADIUS - 2} ${CENTER - 6},${CENTER - RADIUS + 8} ${CENTER + 6},${CENTER - RADIUS + 8}`}
              fill="#8c3d2f"
            />
          )}
          <g>
            <rect x={CENTER - 16} y={CENTER - 20} width="32" height="38" rx="1.5" fill="#1c1916" />
            <rect x={CENTER - 16} y={CENTER - 6} width="32" height="7" fill="#c6a15a" />
            <rect x={CENTER - 5} y={CENTER - 4} width="10" height="16" fill="#3d3428" />
          </g>
        </svg>
      </div>
      <p className="text-center font-display text-4xl text-grove tabular-nums">
        {rounded}° <span className="text-2xl text-brass">{direction}</span>
      </p>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-muted-foreground">{facing}</p>
      {status === "needs-permission" && (
        <div className="mt-4 flex justify-center">
          <Button type="button" className="h-11 px-4" onClick={() => void requestAccess()}>
            Use the phone compass
          </Button>
        </div>
      )}
      {status === "denied" && (
        <p className="mt-3 text-center text-sm text-clay">
          Compass access is off. The dial keeps north at the top.
        </p>
      )}
      {status === "unavailable" && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          This device has no compass reading. North stays at the top.
        </p>
      )}
      {status === "live" && (
        <p className="mt-3 text-center text-sm text-muted-foreground">Hold the phone flat, away from metal.</p>
      )}
    </section>
  )
}
