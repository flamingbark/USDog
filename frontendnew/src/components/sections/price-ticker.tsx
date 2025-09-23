"use client";

import React from 'react';

const tickers = [
  { name: 'USDOG', price: '$1.00' },
  { name: 'SHIB', price: '$0.00002513' },
  { name: 'DOGE', price: '$0.1588' },
  { name: 'WETH', price: '$4,141.53' },
  { name: 'WSTETH', price: '$5,023.87' },
  { name: 'OP', price: '$0.69' },
  { name: 'TBTC', price: '$112,209.37' },
  { name: 'RETH', price: '$4,733.04' },
  { name: 'VELO', price: '$0.05' },
  { name: 'haiVELO v1', price: '$0.05' },
  { name: 'haiVELO v2', price: '$0.05' },
  { name: 'APXETH', price: '$4,506.58' },
  { name: 'ALETH', price: '$4,052.23' },
  { name: 'MSETH', price: '$4,150.50' },
  { name: 'YV-VELO-ALETH-WETH', price: '$9,577.55' },
  { name: 'YV-VELO-MSETH-WETH', price: '$12,620.75' },
];

const PriceTicker = () => {
  const TickerContent = () => {
    return (
      <div className="flex flex-shrink-0 items-center">
        {tickers.map((item, index) => (
          <React.Fragment key={index}>
            <span className="px-2">{item.name}</span>
            <span className="px-2">{item.price}</span>
            <span className="px-2">•</span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-primary text-primary-foreground font-ticker">
      <div className="relative flex overflow-hidden py-1.5">
        <div className="flex whitespace-nowrap animate-marquee">
          <TickerContent />
          <TickerContent />
        </div>
      </div>
    </div>
  );
};

export default PriceTicker;