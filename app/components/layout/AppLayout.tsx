'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { usePathname } from 'next/navigation';
import Header from '../Header';
import styles from './AppLayout.module.css';
import Link from 'next/link';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Home', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Earn', href: '/earn', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Launchpad', href: '/launchpad', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'Tasks', href: '/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: 'Wallet', href: '/wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

export default function AppLayout({ children }: AppLayoutProps) {
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

  useEffect(() => {
    setIsClient(true);
    const waitForTelegram = () => {
      if (window.Telegram?.WebApp) {
        initTelegram();
      } else {
        setTimeout(waitForTelegram, 100);
      }
    };
    waitForTelegram();
  }, []);

  const initTelegram = () => {
    try {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();

      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
        setInitStatus('loaded');
        validateUser(webApp.initDataUnsafe.user);
      } else {
        setInitStatus('no-user');
      }
    } catch (error) {
      console.error('WebApp init error:', error);
      setInitStatus('error');
    }
  };

  const validateUser = async (userData: any) => {
    try {
      const response = await fetch(`/api/user?telegramId=${userData.id}`)
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data')
      }

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
    document.body.style.overflow = 'hidden';

    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      try {
        webApp.ready();
        webApp.expand();
      } catch (error) {
        console.error('Error initializing Telegram Web App:', error);
      }
    }

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setIsVideoVisible(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.overflow = '';
    };
  }, []);

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

      {shouldShowNavigation() && (
        <nav className={styles.navigation}>
          <div className={styles.container}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.link} ${isActive ? styles.active : ''}`}
                >
                  <svg
                    className={styles.icon}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  <span className={styles.label}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}