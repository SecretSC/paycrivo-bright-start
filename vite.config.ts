// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Production deployment target: a standard Node.js server (Debian + Apache reverse proxy).
//
// We force the Nitro `node-server` preset so `npm run build` always produces
// `.output/server/index.mjs` that starts a persistent HTTP server listening on
// process.env.PORT. Cloudflare Workers is NOT the default target.
//
// Override at build time if you ever need a different target, e.g.:
//   NITRO_PRESET=cloudflare-module npm run build
//
// Note: inside the Lovable preview sandbox the config package always uses the
// cloudflare-module preset for the live preview; this `preset` only takes effect
// for real production builds (e.g. on your VPS), which is exactly what we want.
// Static hosting build: emit prerendered HTML (including a root index.html)
// into `.output/public/`. Override at build time with NITRO_PRESET if needed.
const nitroPreset = process.env.NITRO_PRESET ?? "static";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Prerender all app routes to static HTML so the `static` Nitro preset
    // emits index.html + per-route HTML into `.output/public/` for static hosts.
    prerender: {
      enabled: true,
      crawlLinks: true,
      failOnError: false,
      autoSubfolderIndex: true,
    },
    pages: [
      { path: "/" },
      { path: "/buy" },
      { path: "/buy-crypto" },
      { path: "/exchange" },
      { path: "/swap" },
      { path: "/prices" },
      { path: "/learn" },
      { path: "/login" },
      { path: "/signup" },
      { path: "/forgot-password" },
      { path: "/verify-email" },
      { path: "/dashboard" },
    ],
  },
  nitro: {
    preset: nitroPreset,
  },
});
