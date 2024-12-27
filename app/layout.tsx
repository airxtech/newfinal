// app/layout.tsx
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
          {/* Preload the script */}
          <link rel="preload" as="script" href="https://telegram.org/js/telegram-web-app.js" />
          {/* Load the script */}
          <script 
            src="https://telegram.org/js/telegram-web-app.js" 
            async={false}
          />
        </head>
        <body>{children}</body>
      </html>
    )
  }
  