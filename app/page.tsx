// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useTelegram } from './components/TelegramProvider'
import styles from './page.module.css'

export default function Home() {
  const { user } = useTelegram()
  const [farming, setFarming] = useState(false)
  const [counter, setCounter] = useState(0)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    if (user) {
      fetchUserData(user.id)
    }
  }, [user])

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

  if (!user) return <div className={styles.container}>Loading...</div>

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