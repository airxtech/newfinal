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

// Constants
const MAIN_PAGES = ['/', '/earn', '/launchpad', '/tasks', '/wallet']

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

  // Initialize Telegram WebApp
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
        console.error('No user data in WebApp')
      }
    } catch (error) {
      console.error('WebApp init error:', error)
      setInitStatus('error')
    }
  }

  const validateUser = async (userData: any) => {
    try {
      if (!userData?.id) {
        console.error('Invalid user data')
        setInitStatus('error')
        return
      }

      const response = await fetch(`/api/user?telegramId=${userData.id}`)
      
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data')
      }

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

        const newUser = await createResponse.json()
        console.log('New user created:', newUser)
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
      setInitStatus('error')
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

  // Loading state before client-side initialization
  if (!isClient) {
    return (
      <div className={styles.loading}>
        <h2>Initializing...</h2>
      </div>
    )
  }

  // Loading state while waiting for user data
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
    return MAIN_PAGES.includes(pathname)
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

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.scrollContainer}>
          {children}
        </div>
      </main>
      
      {/* Navigation */}
      {shouldShowNavigation() && <Navigation />}
    </div>
  )
}