import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Mihrab, Qibla and prayer times for where you are"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f3eee4",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 110,
            border: "6px solid #14352b",
            borderBottom: "none",
            borderRadius: "60px 60px 0 0",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, color: "#14352b", lineHeight: 1 }}>Mihrab</div>
          <div style={{ marginTop: 18, fontSize: 36, color: "#5c675f" }}>
            Qibla and prayer times for where you are
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
