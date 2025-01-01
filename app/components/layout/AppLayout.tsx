'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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

  const navigation = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Earn', path: '/earn', icon: Coins },
    { name: 'Launchpad', path: '/launchpad', icon: Rocket },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Wallet', path: '/wallet', icon: Wallet }
  ]

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
        setUser(webApp.initDataUnsafe.user)
        setInitStatus('loaded')
        validateUser(webApp.initDataUnsafe.user)
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
      const response = await fetch(`/api/user?telegramId=${userData.id}`)
      if (response.status === 404) {
        await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: userData.id,
            firstName: userData.first_name,
            lastName: userData.last_name || '',
            username: userData.username || ''
          })
        })
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
    }
  }

  const handleNavigation = (path: string) => {
    const listItems = document.querySelectorAll('li');
    listItems.forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`li[data-path="${path}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
    router.push(path);
  };

  if (!isClient) {
    return <div className={styles.loading}>Initializing...</div>
  }

  if (!user) {
    return (
      <div className={styles.loading}>
        <h2>Loading ZOA.fund</h2>
        <p>Status: {initStatus}</p>
        <div className={styles.hint}>Please open this app through Telegram</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <main className={styles.main}>{children}</main>
      
      <nav className={styles.navigation}>
        <ul>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li 
                key={item.path}
                className={`list ${pathname === item.path ? 'active' : ''}`}
              >
                <a onClick={() => router.push(item.path)}>
                  <span className={styles.icon}>
                    <Icon size={24} />
                  </span>
                  <span className={styles.text}>{item.name}</span>
                  <span className={styles.circle}></span>
                </a>
              </li>
            );
          })}
          <div className={styles.indicator}></div>
        </ul>
      </nav>
    </div>
  )
}