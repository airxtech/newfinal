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
  const [balance, setBalance] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [initStatus, setInitStatus] = useState<string>('initial')

  useEffect(() => {
    setIsClient(true)
    
    // Wait for Telegram WebApp script to load
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
      console.log('WebApp object:', webApp)
      
      // Initialize WebApp
      webApp.ready()
      webApp.expand()
      
      // Get user data
      if (webApp.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user
        console.log('User data:', userData)
        setUser(userData)
        setInitStatus('loaded')
        fetchUserData(userData.id)
      } else {
        console.log('No user data found')
        setInitStatus('no-user')
      }
    } catch (error) {
      console.error('WebApp init error:', error)
      setInitStatus('error')
    }
  }

  const fetchUserData = async (telegramId: number) => {
    try {
      console.log('Fetching data for user:', telegramId)
      
      // First try to get existing user
      const getResponse = await fetch(`/api/user?telegramId=${telegramId}`)
      console.log('Response status:', getResponse.status)
      
      const data = await getResponse.json()
      console.log('API Response:', data)

      if (getResponse.ok) {
        console.log('Existing user found:', data)
        setBalance(data.balance)
        return
      }

      // If user doesn't exist (404), create new user
      if (getResponse.status === 404) {
        console.log('User not found, creating new user')
        const createResponse = await fetch('/api/user', {
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

        if (!createResponse.ok) {
          throw new Error('Failed to create user')
        }

        const newUser = await createResponse.json()
        console.log('New user created:', newUser)
        setBalance(0)
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      setBalance(0) // Fallback to 0 on error
    }
  }

  const handleFarming = async () => {
    if (farming) {
      setFarming(false)
      const newBalance = (balance || 0) + counter
      
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

        if (!response.ok) {
          throw new Error('Failed to update balance')
        }

        const updatedUser = await response.json()
        console.log('Balance updated:', updatedUser)
        setBalance(updatedUser.balance)
        setCounter(0)
      } catch (error) {
        console.error('Error updating balance:', error)
        // Revert the farming state on error
        setFarming(true)
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

  // SSR loading state
  if (!isClient) {
    return <div className={styles.container}>Initializing...</div>
  }

  // User-friendly loading states
  if (!user) {
    return (
      <div className={styles.container}>
        <h2>Loading Mini App</h2>
        <p>Status: {initStatus}</p>
        <div className={styles.smallText}>
          Please make sure you're opening this through Telegram
        </div>
      </div>
    )
  }

  // Main app UI
  return (
    <div className={styles.container}>
      <h1>Farming Mini App</h1>
      <div className={styles.userInfo}>
        <p>Name: {user.first_name} {user.last_name}</p>
        <p>Username: {user.username}</p>
        <p>Telegram ID: {user.id}</p>
        <p>Balance: {balance === null ? (
          <span className={styles.loading}>Loading...</span>
        ) : balance}</p>
        {farming && <p>Farming: +{counter}</p>}
      </div>
      <button 
        className={styles.farmButton}
        onClick={handleFarming}
        disabled={balance === null}
      >
        {farming ? 'Stop Farming' : 'Start Farming'}
      </button>
    </div>
  )
}