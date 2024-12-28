// app/lib/ton-connector.ts
import TonConnect from '@tonconnect/sdk';

let connector: TonConnect | null = null;

export const getTonConnector = () => {
  if (!connector) {
    connector = new TonConnect({
      manifestUrl: 'https://telegramtest-eight.vercel.app/tonconnect-manifest.json'
    });
  }
  return connector;
};

// We need to export the TonConnect type for use in other files
export type { TonConnect };