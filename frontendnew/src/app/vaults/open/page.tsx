"use client";
import { Suspense } from "react";

import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import CollateralSelection from '@/components/sections/collateral-selection';

const SUPPORTED = {
  SHIB: {
    name: "Shiba Inu",
    symbol: "SHIB",
    emoji: "🐕",
    bg: "bg-[#fbe8e8]",
    maxLtv: 0.75,
    apr: 0.025,
  },
  DOGE: {
    name: "Dogecoin",
    symbol: "DOGE",
    emoji: "🐶",
    bg: "bg-[#fff4cc]",
    maxLtv: 0.7,
    apr: 0.02,
  },
} as const;

type CollateralKey = keyof typeof SUPPORTED;

export default function OpenVaultPage() {
  return (
    <Suspense fallback={<div className="container mx-auto min-h-[70vh] px-4 py-12">Loading...</div>}>
      <OpenVaultInner />
    </Suspense>
  );
}

function OpenVaultInner() {
  const searchParams = useSearchParams();

  const ticker = (searchParams?.get('collateral') || "").toUpperCase() as CollateralKey;
  const selected = SUPPORTED[ticker];

  if (!selected) {
    return (
      <div className="container mx-auto min-h-[70vh] px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.06)]">

          <h1 className="text-2xl font-bold text-foreground">Unsupported collateral</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please choose Shiba Inu (SHIB) or Dogecoin (DOGE).
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/vaults/open?collateral=SHIB" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90">
              Use SHIB
            </Link>
            <Link href="/vaults/open?collateral=DOGE" className="rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90">
              Use DOGE
            </Link>
          </div>
          <div className="mt-4">
            <Link href="/vaults" className="text-sm text-muted-foreground underline underline-offset-4">
              Back to Vaults
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-[70vh] px-4 py-12">
      <div className="mx-auto max-w-3xl">


        {/* Use the actual collateral selection component */}
        <CollateralSelection initialCollateral={ticker} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Tip: Switch between SHIB and DOGE using the pill buttons above.
        </p>
      </div>
    </div>
  );
}