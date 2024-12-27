// app/layout.tsx
import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Telegram Mini App',
  description: 'Farming Mini App for Telegram',
}
 
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
        <script 
          async 
          src="https://telegram.org/js/telegram-web-app.js"
          type="text/javascript"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
