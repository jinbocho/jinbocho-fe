/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import type { Plugin } from "vite";

// Serve index.html for all non-file GET requests so that browser refreshes on
// deep routes work even when the upstream proxy strips the Accept header (which
// would otherwise prevent Vite's built-in SPA HTML-fallback from triggering).
function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? "/").split("?")[0];
        if (
          req.method === "GET" &&
          !path.startsWith("/@") &&
          !path.startsWith("/node_modules") &&
          !/\.\w+$/.test(path)
        ) {
          req.url = "/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    host: true,
    // Allow Cloudflare quick-tunnel hosts (random subdomain each run) for mobile testing.
    allowedHosts: [".trycloudflare.com"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
