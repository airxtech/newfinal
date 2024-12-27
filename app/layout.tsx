// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script 
          src="https://telegram.org/js/telegram-web-app.js?56" 
          data-telegram-web-app="true"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}