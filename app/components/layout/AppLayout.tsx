// app/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import styles from './AppLayout.module.css'

interface AppLayoutProps {
  children: React.ReactNode
}

declare global {
  interface Window {
    Telegram: {
      WebApp: any
    }
  }
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [initStatus, setInitStatus] = useState<string>('initial')

  useEffect(() => {
    setIsClient(true)
    const waitForTelegram = () => {
      if (window.Telegram?.WebApp) {
        initTelegram()
      } else {
        setTimeout(waitForTelegram, 100)
      }
    }
    waitForTelegram()
  }, [])

  const initTelegram = () => {
    try {
      const webApp = window.Telegram.WebApp
      webApp.ready()
      webApp.expand()

      if (webApp.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user
        setUser(userData)
        setInitStatus('loaded')
        validateUser(userData)
      } else {
        setInitStatus('no-user')
      }
    } catch (error) {
      console.error('WebApp init error:', error)
      setInitStatus('error')
    }
  }

  const validateUser = async (userData: any) => {
    try {
      // First try to get existing user
      const getResponse = await fetch(`/api/user?telegramId=${userData.id}`)
      
      if (!getResponse.ok && getResponse.status !== 404) {
        throw new Error('Failed to fetch user data')
      }

      if (getResponse.status === 404) {
        // Create new user with referral code
        const referralCode = generateReferralCode(userData.id)
        const createResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: userData.id,
            firstName: userData.first_name,
            lastName: userData.last_name,
            username: userData.username,
            zoaBalance: 0,
            referralCode
          })
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create user')
        }
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
    }
  }

  const generateReferralCode = (telegramId: number): string => {
    // Generate a unique referral code based on telegram ID and timestamp
    const timestamp = Date.now().toString(36)
    const userPart = telegramId.toString(36)
    return `ZOA${userPart}${timestamp}`.toUpperCase()
  }

  const navigation = [
    { name: 'Home', path: '/' },
    { name: 'Earn', path: '/earn' },
    { name: 'Launchpad', path: '/launchpad' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Wallet', path: '/wallet' }
  ]

  // Loading states
  if (!isClient) {
    return <div className={styles.loading}>Initializing...</div>
  }

  if (!user) {
    return (
      <div className={styles.loading}>
        <h2>Loading ZOA.fund</h2>
        <p>Status: {initStatus}</p>
        <div className={styles.hint}>
          Please open this app through Telegram
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>{children}</main>
      
      <nav className={styles.navigation}>
        {navigation.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`${styles.navButton} ${
              pathname === item.path ? styles.active : ''
            }`}
          >
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  )
}