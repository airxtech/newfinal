// app/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'

// Extend the Window interface to include Telegram
declare global {
  interface Window {
    Telegram: any;
  }
}
import { useRouter, usePathname } from 'next/navigation'
import styles from './AppLayout.module.css'
import { Home, Coins, Rocket, CheckSquare, Wallet } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
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
      console.log('WebApp object:', webApp)
      
      webApp.ready()
      webApp.expand()

      if (webApp.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user
        console.log('User data:', userData)
        setUser(userData)
        setInitStatus('loaded')
        validateUser(userData)
      } else {
        console.log('No user data found')
        setInitStatus('no-user')
      }
    } catch (error) {
      console.error('WebApp init error:', error)
      setInitStatus('error')
    }
  }

  const validateUser = async (userData: any) => {
    try {
      const response = await fetch(`/api/user?telegramId=${userData.id}`)
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data')
      }

      const data = await response.json()
      if (response.status === 404) {
        const createResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: userData.id,
            firstName: userData.first_name,
            lastName: userData.last_name || '',
            username: userData.username || ''
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

  const navigation = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Earn', path: '/earn', icon: Coins },
    { name: 'Launchpad', path: '/launchpad', icon: Rocket },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Wallet', path: '/wallet', icon: Wallet }
  ]

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
        <ul>
          {navigation.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <li key={item.path} className={isActive ? 'active' : ''}>
                <button
                  onClick={() => router.push(item.path)}
                  className={styles.navButton}
                >
                  <span className={styles.icon}>
                    <Icon size={24} />
                  </span>
                  <span className={styles.text}>{item.name}</span>
                  <span className={styles.circle}></span>
                </button>
              </li>
            );
          })}
          <div className={styles.indicator}></div>
        </ul>
      </nav>
    </div>
  )
}