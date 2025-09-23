import Link from "next/link";

export default function StakePage() {
  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stake USDog</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stake your USDog to earn governance token rewards. Unstake anytime.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Back to home
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main staking card */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          {/* Tabs mimic */}
          <div className="mb-6 flex w-full items-center gap-2 rounded-full bg-muted p-1">
            <button className="w-1/2 rounded-full bg-card px-4 py-2 text-center text-sm font-semibold text-foreground shadow">
              Stake
            </button>
            <button className="w-1/2 rounded-full px-4 py-2 text-center text-sm font-semibold text-muted-foreground hover:text-foreground">
              Unstake
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Amount</label>
              <span className="text-xs text-muted-foreground">Balance: 0.00 USDog</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-4 py-3">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                className="w-full bg-transparent text-xl outline-none placeholder:text-muted-foreground/60"
              />
              <button className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted/80">
                MAX
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Estimated APR</p>
              <p className="mt-1 text-lg font-semibold text-foreground">12.0%</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Reward Token</p>
              <p className="mt-1 text-lg font-semibold text-foreground">GOV</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Claimable Rewards</p>
              <p className="mt-1 text-lg font-semibold text-foreground">0.00 GOV</p>
            </div>
          </div>

          {/* Action */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="rounded-xl bg-primary px-4 py-3 font-button text-primary-foreground transition-colors hover:bg-primary/90">
              Stake USDog
            </button>
            <button className="rounded-xl border border-input bg-card px-4 py-3 font-button text-foreground transition-colors hover:bg-muted">
              Claim Rewards
            </button>
          </div>
        </div>

        {/* Side info card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-semibold text-foreground">Staking Overview</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Staked</span>
              <span className="font-medium text-foreground">0.00 USDog</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your Staked</span>
              <span className="font-medium text-foreground">0.00 USDog</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your APR</span>
              <span className="font-medium text-foreground">12.0%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lockup</span>
              <span className="font-medium text-foreground">None</span>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gradient-middle)] to-[var(--gradient-end)] p-4">
            <p className="text-xs text-foreground">
              Earn GOV token rewards by staking USDog. Rewards accrue block-by-block and can be claimed at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}