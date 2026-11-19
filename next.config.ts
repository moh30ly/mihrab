import type { NextConfig } from "next"

// Mihrab runs entirely in the browser, so it is exported as static files.
// The same `out/` folder is served at mihrab.live and bundled into the Android app.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
