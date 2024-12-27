// app/components/TelegramProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface TelegramContext {
  webApp: any
  user: any
}

const TelegramContext = createContext<TelegramContext>({ webApp: null, user: null })

export const useTelegram = () => useContext(TelegramContext)

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [webApp, setWebApp] = useState<any>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const initTelegram = () => {
      // @ts-ignore
      if (window.Telegram?.WebApp) {
        // @ts-ignore
        const tg = window.Telegram.WebApp
        setWebApp(tg)
        
        if (tg.initDataUnsafe?.user) {
          setUser(tg.initDataUnsafe.user)
        }
        
        tg.ready()
        tg.expand()
      }
    }

    // Check if Telegram Web App script is already loaded
    if (document.readyState === 'complete') {
      initTelegram()
    } else {
      window.addEventListener('load', initTelegram)
      return () => window.removeEventListener('load', initTelegram)
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ webApp, user }}>
      {children}
    </TelegramContext.Provider>
  )
}