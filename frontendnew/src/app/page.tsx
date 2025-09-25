import HeroSection from "@/components/sections/hero-section";
import CollateralSelection from "@/components/sections/collateral-selection";
import WalletConnection from "@/components/sections/wallet-connection";
import DecorativeElements from "@/components/sections/decorative-elements";
import DirectorySection from "@/components/sections/directory-section";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f3f1f7]">

      <HeroSection />

      <div className="container mx-auto px-4 py-8">
        <div className="relative">
          <CollateralSelection />
          <WalletConnection />
        </div>
      </div>

      <DecorativeElements />
      <DirectorySection />
    </div>
  );
}