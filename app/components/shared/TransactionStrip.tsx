// frontend/src/components/shared/TransactionStrip.tsx
"use client";

import React from 'react';

export interface Transaction {
  wallet: string;
  type: 'bought' | 'sold' | 'created';
  amount?: number;
  tokenLogo: string;
  ticker: string;
}

const TransactionStrip = () => {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-2 overflow-hidden relative">
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 7.5s linear infinite;
        }
      `}</style>

      <div className="flex animate-marquee whitespace-nowrap">
        {/* Duplicate the items for seamless loop */}
        {[...Array(2)].map((_, outerIndex) => (
          <React.Fragment key={outerIndex}>
            <div className="inline-flex items-center">
              <span className="inline-flex items-center mx-4">
                <span className="text-emerald-400">0x1234...567</span>
                &nbsp;
                <span className="text-zinc-300">bought</span>
                &nbsp;
                <span>$1,500 of</span>
                &nbsp;
                <span className="mx-1">🚀</span>
                <span className="text-yellow-500">PEPE</span>
                <span className="mx-8">|</span>
              </span>
              <span className="inline-flex items-center mx-4">
                <span className="text-emerald-400">0x8901...234</span>
                &nbsp;
                <span className="text-zinc-300">sold</span>
                &nbsp;
                <span>$2,300 of</span>
                &nbsp;
                <span className="mx-1">🌙</span>
                <span className="text-yellow-500">MOON</span>
                <span className="mx-8">|</span>
              </span>
              <span className="inline-flex items-center mx-4">
                <span className="text-emerald-400">0x5678...901</span>
                &nbsp;
                <span className="text-zinc-300">created</span>
                &nbsp;
                <span className="mx-1">🔥</span>
                <span className="text-yellow-500">DOGE</span>
                <span className="mx-8">|</span>
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TransactionStrip;