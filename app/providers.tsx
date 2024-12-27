// app/providers.tsx
'use client'

import { TelegramProvider } from './components/TelegramProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return <TelegramProvider>{children}</TelegramProvider>
}