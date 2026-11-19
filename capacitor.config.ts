import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "live.mihrab.app",
  appName: "Mihrab",
  webDir: "out",
  backgroundColor: "#6b2216",
  android: {
    allowMixedContent: false,
  },
}

export default config
