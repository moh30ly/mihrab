import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
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
            width: 18,
            height: 22,
            border: "2px solid #e6d3a3",
            borderBottom: "none",
            borderRadius: "12px 12px 0 0",
          }}
        />
      </div>
    ),
    { ...size },
  )
}
