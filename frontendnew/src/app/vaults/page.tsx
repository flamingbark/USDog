"use client";

import Link from "next/link";

export default function VaultsPage() {

  return (
    <div className="container mx-auto min-h-[70vh] px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Wallet connection header removed as requested */}

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Open a USDog Vault</h1>
          <p className="mt-2 text-muted-foreground">
            Choose a collateral to open a vault and mint USDog. Available collaterals are limited to Dogecoin and Shiba Inu.
          </p>
        </header>

        {/* Tabs header (single active tab for now) */}
        <div className="mb-6 flex items-center gap-2">
          <button
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
            aria-current="page"
          >
            Available
          </button>
          <span className="text-xs text-muted-foreground">2 vaults</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SHIB Card */}
          <div className="group rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fbe8e8] text-lg">🐕</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">Shiba Inu</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">SHIB</span>
                  </div>
                  <p className="text-xs text-muted-foreground">ERC-20 collateral</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                Popular
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-muted p-4">
              <div>
                <dt className="text-xs text-muted-foreground">Max LTV</dt>
                <dd className="text-base font-semibold text-foreground">75%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Stability Fee (APR)</dt>
                <dd className="text-base font-semibold text-foreground">2.5%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Min. Collateral</dt>
                <dd className="text-base font-semibold text-foreground">$50</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Liquidation Penalty</dt>
                <dd className="text-base font-semibold text-foreground">10%</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Open a vault using SHIB to mint USDog.</p>
              <Link
                href="/vaults/open?collateral=SHIB"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                Open Vault
              </Link>
            </div>
          </div>

          {/* DOGE Card */}
          <div className="group rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff4cc] text-lg">🐶</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">Dogecoin</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">DOGE</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Native-style collateral</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">
                Low Fee
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-muted p-4">
              <div>
                <dt className="text-xs text-muted-foreground">Max LTV</dt>
                <dd className="text-base font-semibold text-foreground">75%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Stability Fee (APR)</dt>
                <dd className="text-base font-semibold text-foreground">2.5%</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Min. Collateral</dt>
                <dd className="text-base font-semibold text-foreground">$50</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Liquidation Penalty</dt>
                <dd className="text-base font-semibold text-foreground">10%</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Open a vault using DOGE to mint USDog.</p>
              <Link
                href="/vaults/open?collateral=DOGE"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                Open Vault
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}