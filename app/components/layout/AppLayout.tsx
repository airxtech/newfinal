// app/components/layout/AppLayout.tsx
'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './AppLayout.module.css'

// Dynamically import components to avoid hydration issues
const Header = dynamic(() => import('../Header'), { ssr: false })
const Navigation = dynamic(() => import('../Navigation'), { ssr: false })

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
  const [mounted, setMounted] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [initStatus, setInitStatus] = useState<string>('initial')
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasInitialized = useRef(false)

  // Handle initial mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize Telegram WebApp
  useEffect(() => {
    if (!mounted || hasInitialized.current) return
    hasInitialized.current = true

    const initialize = () => {
      setIsClient(true)
      if (!window.Telegram?.WebApp) {
        setTimeout(initialize, 100)
        return
      }

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

    initialize()
  }, [mounted])

  const validateUser = async (userData: any) => {
    if (!userData?.id) return

    try {
      const checkResponse = await fetch(`/api/user?telegramId=${userData.id}`)
      if (checkResponse.ok) return // User exists

      if (checkResponse.status === 404) {
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
          const error = await createResponse.json()
          console.error('User creation failed:', error)
          throw new Error('Failed to create user')
        }
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
    }
  }

  if (!mounted || !isClient) {
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
      <div className={styles.background} />
      
      <Suspense fallback={null}>
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
                videoRef.current?.play()
              }}
              onError={() => {
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
      </Suspense>
    </div>
  )
}