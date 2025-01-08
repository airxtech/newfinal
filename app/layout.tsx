// app/layout.tsx
'use client'

import './globals.css'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import AppLayout from './components/layout/AppLayout'
import React, { useEffect } from 'react'
import { TonPriceService } from '@/lib/services/tonPriceService'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Initial price update
    TonPriceService.updatePrice();

    // Set up periodic updates (every 15 minutes)
    const updateInterval = setInterval(() => {
      TonPriceService.updatePrice();
    }, 15 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(updateInterval);
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <link rel="preload" as="script" href="https://telegram.org/js/telegram-web-app.js" />
        <script src="https://telegram.org/js/telegram-web-app.js" async={false} />
      </head>
      <body>
        <TonConnectUIProvider 
          manifestUrl="https://telegramtest-eight.vercel.app/tonconnect-manifest.json"
          walletsListConfiguration={{
            includeWallets: [
              {
                appName: "telegram-wallet",
                name: "Wallet",
                imageUrl: "https://wallet.tg/images/logo-288.png",
                aboutUrl: "https://wallet.tg/",
                universalLink: "https://t.me/wallet?attach=wallet",
                bridgeUrl: "https://bridge.ton.space/bridge",
                platforms: ["ios", "android", "macos", "windows", "linux"]
              }
            ]
          }}
          actionsConfiguration={{
            twaReturnUrl: `https://t.me/${process.env.BOT_USERNAME}/start`
          }}
        >
          <AppLayout>{children}</AppLayout>
        </TonConnectUIProvider>
      </body>
    </html>
  )
}