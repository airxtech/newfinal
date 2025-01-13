// app/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '../Header'
import Navigation from '../Navigation'
import styles from './AppLayout.module.css'
import { Home, Coins, Rocket, CheckSquare, Wallet } from 'lucide-react'

declare global {
  interface Window {
    Telegram: any;
  }
}

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
    console.log('AppLayout useEffect triggered');
    
    const waitForTelegram = () => {
      console.log('Waiting for Telegram WebApp...');
      if (window.Telegram?.WebApp) {
        console.log('Telegram WebApp found, initializing...');
        initTelegram()
      } else {
        console.log('Telegram WebApp not found, retrying...');
        setTimeout(waitForTelegram, 100)
      }
    }
    waitForTelegram()
  }, [])

  const navigation = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Earn', path: '/earn', icon: Coins },
    { name: 'Launchpad', path: '/launchpad', icon: Rocket },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Wallet', path: '/wallet', icon: Wallet }
  ]

  const initTelegram = () => {
    console.log('InitTelegram called');
    try {
      const webApp = window.Telegram.WebApp
      console.log('WebApp object:', webApp);
      
      webApp.ready()
      webApp.expand()
  
      console.log('InitDataUnsafe:', webApp.initDataUnsafe);
  
      if (webApp.initDataUnsafe?.user) {
        console.log('User found in initDataUnsafe:', webApp.initDataUnsafe.user);
        setUser(webApp.initDataUnsafe.user)
        setInitStatus('loaded')
        validateUser(webApp.initDataUnsafe.user)
      } else {
        console.warn('No user data in initDataUnsafe');
        setInitStatus('no-user')
      }
    } catch (error) {
      console.error('WebApp init error:', error)
      setInitStatus('error')
    }
  }
  
  const validateUser = async (userData: any) => {
    console.log('ValidateUser called with:', userData);
    try {
      const response = await fetch(`/api/user?telegramId=${userData.id}`)
      console.log('User fetch response:', response.status);
  
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data')
      }
  
      if (response.status === 404) {
        console.log('Creating new user');
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
        console.log('User creation response:', createResponse.status);
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
    }
  }

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

  const shouldShowNavigation = () => {
    const mainPages = ['/', '/earn', '/launchpad', '/tasks', '/wallet'];
    return mainPages.includes(pathname);
  }

  return (
    <div className={styles.container}>
      <main className={`${styles.main} ${!shouldShowNavigation() ? styles.noNav : ''}`}>
        {children}
      </main>
      
      {shouldShowNavigation() && (
        <nav className={styles.navigation}>
          <ul className={styles.navigationList}>
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <li
                  key={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={() => router.push(item.path)}
                >
                  <a className={styles.navLink}>
                    <span className={styles.icon}>
                      <Icon size={24} />
                    </span>
                    <span className={styles.text}>{item.name}</span>
                    <span className={styles.circle}></span>
                  </a>
                </li>
              )
            })}
            <div className={styles.indicator}></div>
          </ul>
        </nav>
      )}
    </div>
  )
}