// app/layout.tsx
'use client'

import './globals.css'
import { TonConnectUIProvider, THEME } from '@tonconnect/ui-react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preload" as="script" href="https://telegram.org/js/telegram-web-app.js" />
        <script src="https://telegram.org/js/telegram-web-app.js" async={false} />
      </head>
      <TonConnectUIProvider 
        manifestUrl="https://telegramtest-eight.vercel.app/tonconnect-manifest.json"
        uiPreferences={{ theme: THEME.DARK }}
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
            },
            {
              appName: "tonkeeper",
              name: "Tonkeeper",
              imageUrl: "https://tonkeeper.com/assets/tonkeeper-wallet-logo.png",
              aboutUrl: "https://tonkeeper.com",
              universalLink: "https://app.tonkeeper.com/ton-connect",
              bridgeUrl: "https://bridge.tonapi.io/bridge",
              platforms: ["ios", "android", "chrome"]
            },
            // Add other wallets from the example here
          ]
        }}
        actionsConfiguration={{
          twaReturnUrl: 'https://t.me/your_bot_username/start'  // Replace with your bot's username
        }}
      >
        <body>{children}</body>
      </TonConnectUIProvider>
    </html>
  )
}