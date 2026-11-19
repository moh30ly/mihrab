import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#14352b",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 92,
            height: 120,
            border: "8px solid #e6d3a3",
            borderBottom: "none",
            borderRadius: "64px 64px 0 0",
          }}
        />
      </div>
    ),
    { ...size },
  )
}
