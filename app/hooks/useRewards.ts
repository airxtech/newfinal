// hooks/useRewards.ts
import { useState } from 'react'

export const useRewards = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScratchCard = async (): Promise<number | null> => {
    setLoading(true)
    setError(null)
    
    try {
      // Get user data to check remaining chances
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) {
        throw new Error('User not found')
      }

      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      const user = await response.json()

      if (!response.ok) {
        throw new Error('Failed to fetch user data')
      }

      if (user.scratchChances <= 0) {
        throw new Error('No scratch chances remaining today')
      }

      // Generate random reward between 1 and 10 ZOA
      const reward = Math.random() * 9 + 1
      return reward

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    handleScratchCard,
    loading,
    error
  }
}