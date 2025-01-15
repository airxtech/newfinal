// app/components/CustomBackground/CustomBackground.tsx
'use client'

import { useRef, useState } from 'react'
import styles from './CustomBackground.module.css'

export default function CustomBackground() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [isVideoVisible, setIsVideoVisible] = useState(true)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  return (
    <>
      <div className={styles.background} />
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
    </>
  )
}