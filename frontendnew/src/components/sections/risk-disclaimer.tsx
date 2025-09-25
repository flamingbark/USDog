"use client";

import { useState } from "react";

export default function RiskDisclaimer() {
  const [expanded, setExpanded] = useState(true);

  return (
    <section
      role="alert"
      aria-live="polite"
      className="mx-auto mb-4 w-full max-w-[1200px] px-4"
    >
      <div className="rounded-xl border border-red-300 bg-red-50 text-red-900 shadow-sm">
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <h1 className="text-base font-extrabold">
              ⚠️ IMPORTANT RISK DISCLAIMER ⚠️
            </h1>
            <h2 className="mt-1 text-sm font-bold">
              UNAUDITED CODE - USE AT YOUR OWN RISK
            </h2>
            <p className="mt-1 text-sm font-semibold">
              The USDog stablecoin smart contract code has NOT been audited by any third-party security firm or independent auditors.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-red-300 bg-white/60 px-3 py-1 text-xs font-medium text-red-700 hover:bg-white"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="risk-details"
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>

        {expanded && (
          <div id="risk-details" className="border-t border-red-200 p-4 pt-3 text-sm">
            <h3 className="font-bold">RISK OF TOTAL LOSS</h3>
            <p className="mt-1">
              <strong>YOU MAY LOSE ALL FUNDS DEPOSITED OR INVESTED IN THIS PROTOCOL.</strong> By interacting with USDog, you acknowledge and accept the following risks:
            </p>
            <ul className="ml-5 mt-2 list-disc space-y-1">
              <li>
                <strong>Smart Contract Vulnerabilities</strong>: Unaudited code may contain critical bugs, exploits, or security flaws that could result in permanent loss of funds
              </li>
              <li>
                <strong>Economic Risks</strong>: The stablecoin mechanism may fail, leading to depegging, liquidity crises, or total collapse
              </li>
              <li>
                <strong>Regulatory Risks</strong>: Future regulatory action may impact the protocol's operation or your ability to access funds
              </li>
              <li>
                <strong>Technical Risks</strong>: Platform outages, network congestion, or technical failures may prevent access to your assets
              </li>
              <li>
                <strong>Experimental Nature</strong>: This protocol is experimental technology with no guarantees of functionality or safety
              </li>
            </ul>

            <h3 className="mt-4 font-bold">NO WARRANTIES OR GUARANTEES</h3>
            <p className="mt-1">
              This software is provided "AS IS" without warranty of any kind. The developers make no representations about the security, functionality, or suitability of this code for any purpose.
            </p>

            <h3 className="mt-4 font-bold">NO FINANCIAL ADVICE</h3>
            <p className="mt-1">
              Nothing in this protocol or documentation constitutes financial, investment, trading, or legal advice. You are solely responsible for your own financial decisions.
            </p>

            <h3 className="mt-4 font-bold">JURISDICTION AND COMPLIANCE</h3>
            <p className="mt-1">
              You are responsible for ensuring your use of USDog complies with all applicable laws and regulations in your jurisdiction.
            </p>

            <hr className="my-4 border-red-200" />

            <p className="font-semibold">
              <strong>BY USING USDOG, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO ASSUME ALL RISKS ASSOCIATED WITH THIS UNAUDITED EXPERIMENTAL PROTOCOL.</strong>
            </p>
            <p className="mt-1 font-bold">ONLY INVEST WHAT YOU CAN AFFORD TO LOSE COMPLETELY.</p>
          </div>
        )}
      </div>
    </section>
  );
}