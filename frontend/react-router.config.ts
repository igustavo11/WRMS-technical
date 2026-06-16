import type { Config } from "@react-router/dev/config";

export default {
  // Config options...
  // SPA mode: client-only rendering, static build output, no Node server needed.
  ssr: false,
  future: {
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
