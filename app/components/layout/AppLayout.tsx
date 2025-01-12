'use client';

import { useEffect, useState, useRef } from 'react';
import Navigation from '../Navigation';
import Header from '../Header';
import styles from './AppLayout.module.css';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface AppLayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: { children: React.ReactNode }) {
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
      
      <main className={styles.main}>
        <div ref={mainRef} className={styles.scrollContainer}>
          {children}
        </div>
      </main>
      
      <Navigation />
    </div>
  );
}