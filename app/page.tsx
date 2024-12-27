// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'

declare global {
  interface Window {
    Telegram: {
      WebApp: any;
    }
  }
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [farming, setFarming] = useState(false)
  const [counter, setCounter] = useState(0)
  const [balance, setBalance] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [initStatus, setInitStatus] = useState<string>('initial')

  // Check if we're in the Telegram WebApp environment
  const isTelegramWebApp = () => {
    try {
      const params = new URLSearchParams(window.location.hash.slice(1))
      return params.has('tgWebAppData')
    } catch (e) {
      return false
    }
  }

  useEffect(() => {
    let mounted = true
    setIsClient(true)

    const initApp = async () => {
      // Wait for the script to load
      while (mounted && !window.Telegram?.WebApp) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      if (!mounted) return

      try {
        const webApp = window.Telegram.WebApp
        console.log('WebApp object:', webApp)
        setInitStatus('webapp-loaded')

        // Only proceed if we're in Telegram
        if (!isTelegramWebApp()) {
          console.log('Not in Telegram WebApp environment')
          setInitStatus('not-in-telegram')
          return
        }

        webApp.ready()
        webApp.expand()
        setInitStatus('webapp-ready')

        if (webApp.initDataUnsafe?.user) {
          const userData = webApp.initDataUnsafe.user
          console.log('User data:', userData)
          if (mounted) {
            setUser(userData)
            setInitStatus('user-loaded')
            fetchUserData(userData.id)
          }
        } else {
          console.log('No user data available')
          setInitStatus('no-user-data')
        }
      } catch (error) {
        console.error('Init error:', error)
        setInitStatus('error')
      }
    }

    initApp()

    return () => {
      mounted = false
    }
  }, [])

  const fetchUserData = async (telegramId: number) => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          firstName: user?.first_name,
          lastName: user?.last_name,
          username: user?.username,
          balance: 0
        })
      })
      if (!response.ok) throw new Error('API response not ok')
      const data = await response.json()
      setBalance(data.balance)
    } catch (error) {
      console.error('API error:', error)
    }
  }

  const handleFarming = async () => {
    if (farming) {
      setFarming(false)
      const newBalance = balance + counter
      setBalance(newBalance)
      setCounter(0)
      
      try {
        const response = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            balance: newBalance
          })
        })
        if (!response.ok) throw new Error('Failed to update balance')
      } catch (error) {
        console.error('Update error:', error)
      }
    } else {
      setFarming(true)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (farming) {
      interval = setInterval(() => {
        setCounter(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [farming])

  if (!isClient) {
    return <div className={styles.container}>Initializing application...</div>
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h2>Loading Mini App</h2>
        <p>Current Status: {initStatus}</p>
        <div className={styles.smallText}>
          {initStatus === 'not-in-telegram' 
            ? 'This app can only be accessed through Telegram'
            : 'Please wait while we initialize the app...'}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1>Farming Mini App</h1>
      <div className={styles.userInfo}>
        <p>Name: {user.first_name} {user.last_name}</p>
        <p>Username: {user.username}</p>
        <p>Telegram ID: {user.id}</p>
        <p>Balance: {balance}</p>
        {farming && <p>Farming: +{counter}</p>}
      </div>
      <button 
        className={styles.farmButton}
        onClick={handleFarming}
      >
        {farming ? 'Stop Farming' : 'Start Farming'}
      </button>
    </div>
  )
}