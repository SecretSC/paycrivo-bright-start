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
// Build produces a Node SSR server AND prerenders every listed route to
// static HTML in `.output/public/` (so the folder can be uploaded to any
// static host — Apache, cPanel, Hostinger, etc.). We keep the `node-server`
// preset because TanStack Start's build always needs an SSR entry; the
// pure `static` preset conflicts with it ("rollupOptions.input should not
// be an html file when building for SSR"). Override with NITRO_PRESET if
// you need a different target.
const nitroPreset = process.env.NITRO_PRESET ?? "node-server";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Nitro prerender config isn't exposed by the wrapper's TS types, so we
  // cast. Prerender runs during `npm run build` and writes index.html plus
  // per-route HTML into `.output/public/`.
  nitro: ({
    preset: nitroPreset,
    prerender: {
      crawlLinks: true,
      failOnError: false,
      routes: [
        "/",
        "/buy",
        "/buy-crypto",
        "/exchange",
        "/swap",
        "/prices",
        "/learn",
        "/login",
        "/signup",
        "/forgot-password",
        "/verify-email",
        "/dashboard",
      ],
    },
  }) as unknown as { preset: string },
});
