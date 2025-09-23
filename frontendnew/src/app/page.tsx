import PriceTicker from "@/components/sections/price-ticker";
import Navigation from "@/components/sections/navigation";
import HeroSection from "@/components/sections/hero-section";
import PriceAlertBanner from "@/components/sections/price-alert-banner";
import CollateralSelection from "@/components/sections/collateral-selection";
import WalletConnection from "@/components/sections/wallet-connection";
import DecorativeElements from "@/components/sections/decorative-elements";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f3f1f7]">
      <PriceTicker />
      
      <div className="container mx-auto px-4 py-5">
        <Navigation />
      </div>

      <HeroSection />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <PriceAlertBanner />
        </div>

        <div className="relative">
          <CollateralSelection />
          <WalletConnection />
        </div>
      </div>

      <DecorativeElements />
    </div>
  );
}