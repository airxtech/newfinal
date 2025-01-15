// app/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Header from '../Header'
import Navigation from '../Navigation'
import styles from './AppLayout.module.css'

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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data')
      }
  
      if (response.status === 404) {
        // Generate a unique referral code
        const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase()
        
        const createResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: userData.id,
            firstName: userData.first_name,
            lastName: userData.last_name || '',
            username: userData.username || '',
            referralCode,
            scratchChances: 3,
            zoaBalance: 0,
            lastChanceReset: new Date().toISOString()
          })
        })
  
        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          console.error('User creation failed:', errorData)
          throw new Error('Failed to create user')
        }
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
    }
  }

  const forceVideoPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play()
        setIsVideoVisible(true)
      } catch (error) {
        console.error('Video play error:', error)
        setIsVideoVisible(false)
      }
    }
  }

  if (!isClient) {
    return (
      <div className={styles.initContainer}>
        <h2>Initializing...</h2>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.initContainer}>
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
      {/* Background color */}
      <div className={styles.background} />
      
      {/* Video background */}
      {!videoError && isVideoVisible && (
        <div className={styles.videoContainer}>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => {
              setIsVideoLoaded(true)
              forceVideoPlay()
            }}
            onError={(e) => {
              console.error('Video error event:', e)
              setVideoError(true)
              setIsVideoVisible(false)
            }}
            className={`${styles.backgroundVideo} ${isVideoLoaded ? styles.videoLoaded : ''}`}
          >
            <source src="/bgvideo.mp4" type="video/mp4" />
          </video>
        </div>
      )}

      <Header />

      <main className={styles.main}>
        <div className={styles.scrollContainer}>
          {children}
        </div>
      </main>
      
      {pathname && ['/', '/earn', '/launchpad', '/tasks', '/wallet'].includes(pathname) && (
        <Navigation />
      )}
    </div>
  )
}