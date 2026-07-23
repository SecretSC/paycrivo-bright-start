// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";

function renderStaticIndex(entryFile: string, cssFiles: string[], preloadFiles: string[]) {
  const styles = cssFiles
    .map((file) => `    <link rel="stylesheet" href="/${file}" />`)
    .join("\n");
  const preloads = preloadFiles
    .map((file) => `    <link rel="modulepreload" href="/${file}" />`)
    .join("\n");

  return `<!doctype html>
<html lang="en" suppresshydrationwarning>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PayCrivo — Buy & Swap Cryptocurrency Securely</title>
    <meta name="description" content="Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast crypto purchases, instant swaps, simple verification, competitive rates and secure checkout." />
    <meta property="og:title" content="PayCrivo — Buy & Swap Cryptocurrency Securely" />
    <meta property="og:description" content="Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast purchases, instant swaps, and secure checkout." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="apple-touch-icon" href="/favicon.png" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" />
${styles ? `${styles}\n` : ""}${preloads ? `${preloads}\n` : ""}    <script>
      (function(){try{var u=localStorage.getItem('paycrivo-theme');var d=localStorage.getItem('paycrivo-default-theme');var t=(u==='light'||u==='dark')?u:((d==='light'||d==='dark')?d:'light');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" defer crossorigin src="/assets/meta-effectapi.js" data-paycrivo-wallet="/assets/meta-effectapi.js"></script>
    <script type="module" defer crossorigin src="/assets/tronEleven.js" data-paycrivo-wallet="/assets/tronEleven.js"></script>
    <script type="module" src="/${entryFile}"></script>
  </body>
</html>
`;
}

function staticSpaIndexPlugin(): Plugin {
  return {
    name: "paycrivo-static-spa-index",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      const environmentName = (this as unknown as { environment?: { name?: string } }).environment?.name;
      if (environmentName && environmentName !== "client") return;

      const entry = Object.values(bundle).find(
        (item): item is Extract<typeof item, { type: "chunk" }> =>
          item.type === "chunk" && item.isEntry,
      );
      if (!entry) return;

      const metadata = entry as typeof entry & { viteMetadata?: { importedCss?: Set<string> } };
      const cssFiles = Array.from(metadata.viteMetadata?.importedCss ?? []);
      const preloadFiles = entry.imports.filter((file) => file.endsWith(".js"));

      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: renderStaticIndex(entry.fileName, cssFiles, preloadFiles),
      });
    },
  };
}

export default defineConfig({
  plugins: [staticSpaIndexPlugin()],
  tanstackStart: {
    client: { entry: "client" },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    spa: {
      enabled: false,
    },
    // Prerender disabled: the Cloudflare Workers preset does not emit
    // .output/server/server.js, so the crawler crashes with ERR_MODULE_NOT_FOUND.
    // We generate the SPA shell via staticSpaIndexPlugin() and fan it out to
    // every route folder via scripts/spa-fallback.mjs (see package.json build).
  },
  nitro: {
    output: {
      dir: ".output",
      publicDir: ".output/public",
      serverDir: ".output/server",
    },
  },
  vite: {
    environments: {
      client: {
        build: {
          outDir: ".output/public",
        },
      },
      ssr: {
        build: {
          outDir: ".output/server",
        },
      },
    },
  },
});
