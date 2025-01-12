'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '../Header';
import styles from './AppLayout.module.css';
import Navigation from '../Navigation';

declare global {
  interface Window {
    Telegram: any;
  }
}

// Create a context for Telegram user data
interface TelegramUserContext {
  user: any;
  initStatus: string;
}

const TelegramUserContext = createContext<TelegramUserContext>({
  user: null,
  initStatus: 'initial'
});

export const useTelegramUser = () => useContext(TelegramUserContext);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [initStatus, setInitStatus] = useState<string>('initial');
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const forceVideoPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setIsVideoVisible(true);
      } catch (error) {
        console.error('Video play error:', error);
        setIsVideoVisible(false);
      }
    }
  };

  useEffect(() => {
    // Prevent body scroll when app is initializing
    document.body.style.overflow = 'hidden';
    
    setIsClient(true);
    
    // Telegram initialization with recursive waiting
    const initializeTelegramWebApp = () => {
      const retryInit = () => setTimeout(initializeTelegramWebApp, 100);

      if (!window.Telegram?.WebApp) {
        return retryInit();
      }

      try {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        webApp.expand();

        // Ensure user data is available
        if (webApp.initDataUnsafe?.user) {
          const userData = webApp.initDataUnsafe.user;
          
          // Validate and create user if not exists
          const validateUser = async () => {
            try {
              const response = await fetch(`/api/user?telegramId=${userData.id}`);
              
              if (!response.ok && response.status === 404) {
                // Create user if not exists
                await fetch('/api/user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    telegramId: userData.id,
                    firstName: userData.first_name,
                    lastName: userData.last_name || '',
                    username: userData.username || ''
                  })
                });
              }

              // Set user and status
              setUser(userData);
              setInitStatus('loaded');
            } catch (error) {
              console.error('Error validating user:', error);
              setInitStatus('error');
              retryInit();
            }
          };

          validateUser();
        } else {
          // No user data
          setInitStatus('no-user');
          retryInit();
        }
      } catch (error) {
        console.error('WebApp init error:', error);
        setInitStatus('error');
        retryInit();
      }
    };

    // Start initialization
    initializeTelegramWebApp();

    // Handle page visibility and focus
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setIsVideoVisible(false);
        videoRef.current?.pause();
      } else {
        setTimeout(() => {
          setIsVideoVisible(true);
          forceVideoPlay();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      setTimeout(() => {
        setIsVideoVisible(true);
        forceVideoPlay();
      }, 100);
    });

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.overflow = '';
    };
  }, []);

  // Simplified navigation and rendering logic
  if (!isClient) {
    return <div className={styles.loading}>Initializing...</div>;
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
    );
  }

  const shouldShowNavigation = () => {
    const mainPages = ['/', '/earn', '/launchpad', '/tasks', '/wallet'];
    return mainPages.includes(pathname);
  };

  return (
    <TelegramUserContext.Provider value={{ user, initStatus }}>
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
                setIsVideoLoaded(true);
                forceVideoPlay();
              }}
              onError={(e) => {
                console.error('Video error event:', e);
                setVideoError(true);
                setIsVideoVisible(false);
              }}
              className={`${styles.backgroundVideo} ${isVideoLoaded ? styles.videoLoaded : ''}`}
            >
              <source src="/bgvideo.mp4" type="video/mp4" />
            </video>
          </div>
        )}

        <Header />

        <main className={`${styles.main} ${!shouldShowNavigation() ? styles.noNav : ''}`}>
          <div ref={mainRef} className={styles.scrollContainer}>
            {children}
          </div>
        </main>

        {shouldShowNavigation() && <Navigation />}
      </div>
    </TelegramUserContext.Provider>
  );
}