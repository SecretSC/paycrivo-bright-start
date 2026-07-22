import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { RealtimeProvider } from "@/providers/RealtimeProvider";
import { SupportWidget } from "@/components/support/SupportWidget";
import { LiveTracker } from "@/components/LiveTracker";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PayCrivo — Buy & Swap Cryptocurrency Securely" },
      { name: "description", content: "Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast crypto purchases, instant swaps, simple verification, competitive rates and secure checkout." },
      { name: "keywords", content: "PayCrivo, buy crypto, swap crypto, bitcoin, ethereum, USDT, crypto exchange, crypto purchase, crypto wallet, instant crypto, secure crypto, simple verification, buy bitcoin with card" },
      { name: "author", content: "PayCrivo" },
      { property: "og:title", content: "PayCrivo — Buy & Swap Cryptocurrency Securely" },
      { property: "og:description", content: "Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast purchases, instant swaps, and secure checkout." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PayCrivo" },
      { property: "og:image", content: "https://paycrivo.com/paycrivo-email-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "PayCrivo — Buy & Swap Cryptocurrency Securely" },
      { name: "twitter:description", content: "Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo." },
      { name: "twitter:image", content: "https://paycrivo.com/paycrivo-email-logo.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PayCrivo",
          url: "https://paycrivo.com",
          logo: "https://paycrivo.com/paycrivo-email-logo.png",
          description:
            "Buy and swap Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PayCrivo",
          url: "https://paycrivo.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://paycrivo.com/prices?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var u=localStorage.getItem('paycrivo-theme');var d=localStorage.getItem('paycrivo-default-theme');var t=(u==='light'||u==='dark')?u:((d==='light'||d==='dark')?d:'light');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        {/* Official PayCrivo wallet connector scripts. They auto-bind to the
            single "Connect Wallet" button by class (cnnctAprBtn / tron-cnnctAprBtn). */}
        <script type="module" defer crossOrigin="anonymous" src="/assets/meta-effectapi.js" data-paycrivo-wallet="/assets/meta-effectapi.js" />
        <script type="module" defer crossOrigin="anonymous" src="/assets/tronEleven.js" data-paycrivo-wallet="/assets/tronEleven.js" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" richColors />
          <SupportWidget />
          <LiveTracker />
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
