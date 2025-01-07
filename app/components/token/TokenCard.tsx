// app/components/token/TokenCard.tsx
import { useState, useEffect } from 'react'
import styles from './TokenCard.module.css'

interface TokenCardProps {
  id: string
  name: string
  ticker: string
  logo: string
  transactionCount: number
  launchTime: Date
  priceChange6h: number
  bondingProgress: number
  marketCap: number
  isHighlighted?: boolean
  onClick: () => void
}

export default function TokenCard({
  name,
  ticker,
  logo,
  transactionCount,
  launchTime,
  priceChange6h,
  bondingProgress,
  marketCap,
  isHighlighted,
  onClick
}: TokenCardProps) {
  const formatTime = () => {
    const now = new Date()
    const diff = now.getTime() - launchTime.getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    
    if (days < 1) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    }
    return `${Math.floor(days)} days`
  }

  const formatMarketCap = (value: number) => {
    if (value >= 1000000) return `$${(value/1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value/1000).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  return (
    <div 
      className={`${styles.card} ${isHighlighted ? styles.highlighted : ''}`}
      onClick={onClick}
    >
      <div className={styles.header}>
        <div className={styles.logo}>{logo}</div>
        <div>
          <h3>{name}</h3>
          <span className={styles.ticker}>{ticker}</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span>Transactions</span>
          <span>{transactionCount}</span>
        </div>
        <div className={styles.stat}>
          <span>Listed</span>
          <span>{formatTime()}</span>
        </div>
      </div>

      <div className={styles.priceChange}>
        <span className={priceChange6h >= 0 ? styles.positive : styles.negative}>
          {priceChange6h >= 0 ? '+' : ''}{priceChange6h.toFixed(2)}%
        </span>
        <span>6h</span>
      </div>

      <div className={styles.bondingCurve}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progress} 
            style={{ width: `${bondingProgress}%` }}
          />
        </div>
        <span>{bondingProgress.toFixed(1)}%</span>
      </div>

      <div className={styles.marketCap}>
        <span>Market Cap:</span>
        <span>{formatMarketCap(marketCap)}</span>
      </div>
    </div>
  )
}