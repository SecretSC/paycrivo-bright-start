import type { ReactNode } from "react";
import { useTheme } from "@/hooks/use-theme";
import { PromoBar } from "./PromoBar";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageChrome({ children, promo = true }: { children: ReactNode; promo?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      {promo && <PromoBar />}
      <Header theme={theme} onToggleTheme={toggle} />
      {children}
      <Footer />
    </div>
  );
}