'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '../Header';
import styles from './AppLayout.module.css';
import Link from 'next/link';
import Navigation from '../Navigation';

declare global {
  interface Window {
    Telegram: any;
  }
}

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
            <Navigation />
          </div>
        </nav>
      )}
    </div>
  );
}