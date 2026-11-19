import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "live.mihrab.app",
  appName: "Mihrab",
  webDir: "out",
  backgroundColor: "#14352b",
  android: {
    allowMixedContent: false,
  },
}

export default config
