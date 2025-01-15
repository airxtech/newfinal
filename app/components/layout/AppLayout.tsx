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
  const initRef = useRef<boolean>(false)

  useEffect(() => {
    if (initRef.current) return; // Prevent multiple initializations
    initRef.current = true;
    
    const initApp = async () => {
      setIsClient(true)
      try {
        // Wait for Telegram WebApp
        const waitForTelegram = () => {
          return new Promise<void>((resolve) => {
            if (window.Telegram?.WebApp) {
              resolve()
            } else {
              setTimeout(() => waitForTelegram().then(resolve), 100)
            }
          })
        }

        await waitForTelegram()

        // Initialize Telegram WebApp
        const webApp = window.Telegram.WebApp
        webApp.ready()
        webApp.expand()

        // Validate initialization data
        const initData = webApp.initData
        if (!initData) {
          throw new Error('No init data')
        }

        // Validate auth
        const authResponse = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        })

        if (!authResponse.ok) {
          throw new Error('Auth failed')
        }

        // Set user and validate
        const userData = webApp.initDataUnsafe?.user
        if (userData) {
          setUser(userData)
          setInitStatus('loaded')
          await validateUser(userData)
        } else {
          setInitStatus('no-user')
        }
      } catch (error) {
        console.error('Initialization error:', error)
        setInitStatus('error')
      }
    }

    initApp()
  }, [])

  const validateUser = async (userData: any) => {
    try {
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
          const errorData = await createResponse.json()
          throw new Error(`User creation failed: ${errorData.error || 'Unknown error'}`)
        }

        const newUser = await createResponse.json()
        console.log('User created:', newUser)
      }
    } catch (error) {
      console.error('Error in validateUser:', error)
      throw error // Propagate error to main init flow
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