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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayCrivo — Buy Bitcoin with Credit Card or Debit Card" },
      {
        name: "description",
        content:
          "Buy and swap Bitcoin and 18+ cryptocurrencies fast, simply, and securely with PayCrivo. Transparent fees, instant checkout, and your own wallet. First purchase: 0% fee.",
      },
      { property: "og:title", content: "PayCrivo — Buy Crypto Fast, Simple, and Secure" },
      {
        property: "og:description",
        content: "Fast, simple, and secure crypto purchases with transparent fees. First purchase: 0% PayCrivo fee.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <PromoBar />
      <Header theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero />
        <PriceChart />
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
