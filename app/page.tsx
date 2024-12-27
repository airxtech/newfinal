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

  useEffect(() => {
    console.log('Component mounted, setting isClient to true')
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) {
      console.log('Not client side yet, skipping Telegram init')
      return
    }

    const initTelegram = () => {
      console.log('Attempting to initialize Telegram WebApp')
      setInitStatus('initializing')

      // Check if we're running in Telegram's environment
      const urlParams = new URLSearchParams(window.location.hash.slice(1))
      const tgWebAppData = urlParams.get('tgWebAppData')
      console.log('tgWebAppData present:', !!tgWebAppData)

      const webApp = window.Telegram?.WebApp
      if (!webApp) {
        console.log('Telegram WebApp not found on window object')
        setInitStatus('no-webapp')
        return
      }

      console.log('WebApp object found, checking initDataUnsafe')
      console.log('initDataUnsafe:', webApp.initDataUnsafe)
      
      try {
        webApp.ready()
        webApp.expand()
        console.log('WebApp ready() and expand() called')

        if (webApp.initDataUnsafe?.user) {
          const userData = webApp.initDataUnsafe.user
          console.log('User data found:', userData)
          setUser(userData)
          setInitStatus('user-loaded')
          fetchUserData(userData.id)
        } else {
          console.log('No user data in initDataUnsafe')
          setInitStatus('no-user-data')
        }
      } catch (error) {
        console.error('Error during Telegram WebApp initialization:', error)
        setInitStatus('init-error')
      }
    }

    initTelegram()
  }, [isClient])

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

  // Enhanced loading states with additional information
  if (!isClient) {
    return <div className={styles.container}>Loading... (Server Side)</div>
  }

  if (!window.Telegram?.WebApp) {
    return (
      <div className={styles.container}>
        <p>Loading Telegram Web App... (Status: {initStatus})</p>
        <p className={styles.smallText}>
          If you're seeing this outside of Telegram, please open this app through your Telegram bot.
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <p>Loading user data... (Status: {initStatus})</p>
        <p className={styles.smallText}>
          Make sure you're opening this through the Telegram bot.
        </p>
      </div>
    )
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