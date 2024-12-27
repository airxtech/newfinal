// app/tasks/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { ExternalLink } from 'lucide-react'

interface Task {
  id: string
  name: string
  description: string
  reward: number
  isDaily: boolean
  isCompleted: boolean
}

export default function TasksPage() {
  const [user, setUser] = useState<any>(null)
  const [standardTasks, setStandardTasks] = useState<Task[]>([
    {
      id: 'join-channel',
      name: 'Join Telegram Channel',
      description: 'Join our official Telegram Channel',
      reward: 20,
      isDaily: false,
      isCompleted: false
    },
    {
      id: 'join-group',
      name: 'Join Telegram Group',
      description: 'Join our community Telegram Group',
      reward: 20,
      isDaily: false,
      isCompleted: false
    },
    {
      id: 'follow-x',
      name: 'Follow on X',
      description: 'Follow us on X (Twitter)',
      reward: 20,
      isDaily: false,
      isCompleted: false
    }
  ])
  
  const [dailyTasks, setDailyTasks] = useState<Task[]>([])

  useEffect(() => {
    fetchUserData()
    fetchDailyTasks()
  }, [])

  const fetchUserData = async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) return

      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        // Update completed tasks based on user data
        updateCompletedTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchDailyTasks = async () => {
    try {
      const response = await fetch('/api/tasks/daily')
      if (response.ok) {
        const data = await response.json()
        setDailyTasks(data)
      }
    } catch (error) {
      console.error('Error fetching daily tasks:', error)
    }
  }

  const updateCompletedTasks = (completedTasks: string[]) => {
    setStandardTasks(prev => prev.map(task => ({
      ...task,
      isCompleted: completedTasks.includes(task.id)
    })))
  }

  const handleTaskClick = async (task: Task) => {
    if (task.isCompleted) return

    try {
      const webApp = window.Telegram.WebApp
      
      // Open respective links based on task
      switch (task.id) {
        case 'join-channel':
          webApp.openTelegramLink('https://t.me/your_channel')
          break
        case 'join-group':
          webApp.openTelegramLink('https://t.me/your_group')
          break
        case 'follow-x':
          webApp.openLink('https://x.com/your_profile')
          break
      }

      // Mark task as completed and update user's ZOA balance
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          taskId: task.id,
          reward: task.reward
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        updateCompletedTasks(updatedUser.tasks || [])
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const copyReferralCode = () => {
    if (!user?.referralCode) return
    navigator.clipboard.writeText(user.referralCode)
    // Show copied notification
  }

  if (!user) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.tasksPage}>
      <div className={styles.header}>
        <h1>Tasks</h1>
        <div className={styles.balance}>
          {user.zoaBalance.toFixed(2)} ZOA
        </div>
      </div>

      <section className={styles.standardTasks}>
        <h2>One-Time Tasks</h2>
        <div className={styles.taskList}>
          {standardTasks.map(task => (
            <div 
              key={task.id}
              className={`${styles.taskCard} ${task.isCompleted ? styles.completed : ''}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className={styles.taskInfo}>
                <h3>{task.name}</h3>
                <p>{task.description}</p>
              </div>
              <div className={styles.taskReward}>
                <span>{task.reward} ZOA</span>
                {!task.isCompleted && <ExternalLink size={16} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.dailyTasks}>
        <h2>Daily Tasks</h2>
        <div className={styles.taskList}>
          {dailyTasks.map(task => (
            <div 
              key={task.id}
              className={`${styles.taskCard} ${task.isCompleted ? styles.completed : ''}`}
              onClick={() => handleTaskClick(task)}
            >
              <div className={styles.taskInfo}>
                <h3>{task.name}</h3>
                <p>{task.description}</p>
              </div>
              <div className={styles.taskReward}>
                <span>{task.reward} ZOA</span>
                {!task.isCompleted && <ExternalLink size={16} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.referralSection}>
        <h2>Referral Program</h2>
        <p>Earn 100 ZOA for each referral!</p>
        
        <div className={styles.referralCard}>
          <div className={styles.referralInfo}>
            <span>Your Referral Code</span>
            <div className={styles.referralCode} onClick={copyReferralCode}>
              {user.referralCode}
            </div>
          </div>
          <div className={styles.referralStats}>
            <div>
              <span>Total Referrals</span>
              <strong>{user.referralCount || 0}</strong>
            </div>
            <div>
              <span>ZOA Earned</span>
              <strong>{(user.referralCount || 0) * 100} ZOA</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}