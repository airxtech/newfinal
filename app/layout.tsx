// app/layout.tsx
import Script from 'next/script'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Farming Mini App',
  description: 'Telegram Mini App for Farming',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Remove preload and add proper script tag */}
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}