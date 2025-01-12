'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '../Header';
import styles from './AppLayout.module.css';
import Link from 'next/link';

declare global {
  interface Window {
    Telegram: any;
  }
}

// Define the navigation type
const navigation = [
  { name: 'Home', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Earn', href: '/earn', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'Launchpad', href: '/launchpad', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'Tasks', href: '/tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { name: 'Wallet', href: '/wallet', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

// Define types
interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [initStatus, setInitStatus] = useState<string>('initial');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Telegram initialization
    const initTelegram = () => {
      if (window.Telegram?.WebApp) {
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
      }
    };

    initTelegram();
  }, []);

  const validateUser = async (userData: any) => {
    try {
      const response = await fetch(`/api/user?telegramId=${userData.id}`);
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch user data');
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
        });
      }
    } catch (error) {
      console.error('Error in validateUser:', error);
    }
  };

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
    <div className={styles.container}>
      <div className={styles.background} />

      {/* Simplified video background */}
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className={styles.backgroundVideo}
        >
          <source src="/bgvideo.mp4" type="video/mp4" />
        </video>
      </div>

      <Header />

      <main className={`${styles.main} ${!shouldShowNavigation() ? styles.noNav : ''}`}>
        {children}
      </main>

      {shouldShowNavigation() && (
        <nav className={styles.navigation}>
          <div className={styles.container}>
            {navigation.map((item: NavigationItem) => {
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