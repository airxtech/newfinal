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

  useEffect(() => {
    setIsClient(true)
    
    // Initialize Telegram WebApp
    const webApp = window.Telegram?.WebApp
    if (webApp) {
      webApp.ready()
      webApp.expand()

      // Get user data
      if (webApp.initDataUnsafe?.user) {
        const userData = webApp.initDataUnsafe.user
        console.log('User data:', userData)  // Debug log
        setUser(userData)
        fetchUserData(userData.id)
      } else {
        console.log('No user data available')  // Debug log
      }
    } else {
      console.log('Telegram WebApp not available')  // Debug log
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (farming) {
      interval = setInterval(() => {
        setCounter(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [farming])

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
      const data = await response.json()
      setBalance(data.balance)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleFarming = async () => {
    if (farming) {
      setFarming(false)
      const newBalance = balance + counter
      setBalance(newBalance)
      setCounter(0)
      
      try {
        await fetch('/api/user', {
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
      } catch (error) {
        console.error('Error updating balance:', error)
      }
    } else {
      setFarming(true)
    }
  }

  // Return loading state during SSR
  if (!isClient) {
    return <div className={styles.container}>Loading...</div>
  }

  // Show loading if Telegram WebApp is not available
  if (!window.Telegram?.WebApp) {
    return <div className={styles.container}>Loading Telegram Web App...</div>
  }

  // Show loading if user data is not yet available
  if (!user) {
    return <div className={styles.container}>Loading user data...</div>
  }

  return (
    <div className={styles.container}>
      <h1>Welcome to Farming Mini App</h1>
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