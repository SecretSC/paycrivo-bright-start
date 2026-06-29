import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/hooks/use-theme";
import { PromoBar } from "@/components/paycrivo/PromoBar";
import { Header } from "@/components/paycrivo/Header";
import { Hero } from "@/components/paycrivo/Hero";
import { PriceChart } from "@/components/paycrivo/PriceChart";
import { HowToBuy } from "@/components/paycrivo/HowToBuy";
import { WhyChoose } from "@/components/paycrivo/WhyChoose";
import { CryptoTrends } from "@/components/paycrivo/CryptoTrends";
import { SupportedCrypto } from "@/components/paycrivo/SupportedCrypto";
import { SupportedFiat } from "@/components/paycrivo/SupportedFiat";
import { CtaBanner } from "@/components/paycrivo/CtaBanner";
import { FAQ } from "@/components/paycrivo/FAQ";
import { Footer } from "@/components/paycrivo/Footer";
import { UnfinishedOrderBanner } from "@/components/checkout/UnfinishedOrderBanner";
import { RewardBanner } from "@/components/paycrivo/RewardBanner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayCrivo — Buy & Swap Cryptocurrency Securely" },
      {
        name: "description",
        content:
          "Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast crypto purchases, instant swaps, simple verification, competitive rates and secure checkout.",
      },
      { property: "og:title", content: "PayCrivo — Buy & Swap Cryptocurrency Securely" },
      {
        property: "og:description",
        content: "Buy Bitcoin, Ethereum, USDT and hundreds of cryptocurrencies securely with PayCrivo. Fast purchases, instant swaps, and secure checkout.",
      },
      { property: "og:url", content: "https://paycrivo.com/" },
    ],
    links: [{ rel: "canonical", href: "https://paycrivo.com/" }],
  }),
  component: Index,
});

function Index() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <PromoBar />
      <Header theme={theme} onToggleTheme={toggle} />
      <UnfinishedOrderBanner />
      <main>
        <Hero />
        <PriceChart />
      <RewardBanner />
        <HowToBuy />
        <WhyChoose />
        <CryptoTrends />
        <SupportedCrypto />
        <SupportedFiat />
        <CtaBanner />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
