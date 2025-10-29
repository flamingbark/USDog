import type { Metadata } from "next";
import "./globals.css";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { Providers } from "@/components/providers";
import Navigation from "@/components/sections/navigation";
import RiskDisclaimer from "@/components/sections/risk-disclaimer";
import MaintenanceBanner from "@/components/sections/maintenance-banner";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Ã°Å¸Ââ€¢ USDog Stablecoin",
  description: "Decentralized stablecoin backed by DOGE and SHIB collateral",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <MaintenanceBanner />
          <ErrorReporter />
          <Script
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
            strategy="afterInteractive"
            data-target-origin="*"
            data-message-type="ROUTE_CHANGE"
            data-include-search-params="true"
            data-only-in-iframe="true"
            data-debug="true"
            data-custom-data='{"appName": "USDog", "version": "1.0.0", "greeting": "Welcome to USDog"}'
          />
          <header>
            <div className="container mx-auto px-4 py-5">
              <Navigation />
            </div>
          </header>
          <main className="flex-1">
            {children}
          </main>
          <footer className="mt-8 border-t border-black/10 bg-[#f3f1f7]">
            <div className="container mx-auto px-4 pt-6">
              <RiskDisclaimer />
            </div>
            <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>Ã‚Â©USDog - All rights reserved.</span>
              <nav className="flex gap-4 items-center">
                <a href="https://four.meme/token/0xc3e960668fe56f235e0653e20787b2fc3af54444?code=N87R2SDZDJCV" target="_blank" rel="noopener noreferrer"><Button className="rounded-full px-3 py-1">🐕 USDog Memecoin</Button></a>
                
                <a href="/docs" className="hover:text-foreground">Docs</a>
                <a href="https://github.com/flamingbark/USDog" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Github</a>
                <a href="https://t.me/usdog_bark" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Telegram</a>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
