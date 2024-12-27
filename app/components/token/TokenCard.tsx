// app/components/token/TokenCard.tsx
'use client'

import styles from './TokenCard.module.css'

interface TokenCardProps {
  name: string
  ticker: string
  logo: string
  transactions: number
  daysListed: number
  priceChange: number
  bondingProgress: number
  marketCap: number
  onClick: () => void
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

const formatTime = (days: number) => {
  if (days < 1) {
    const hours = Math.floor(days * 24)
    const minutes = Math.floor((days * 24 * 60) % 60)
    return `${hours}h ${minutes}m`
  }
  return `${days} days`
}

const TokenCard: React.FC<TokenCardProps> = ({
  name,
  ticker,
  logo,
  transactions,
  daysListed,
  priceChange,
  bondingProgress,
  marketCap,
  onClick
}) => {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.logo}>{logo}</div>
        <div className={styles.nameContainer}>
          <h3>{name}</h3>
          <span className={styles.ticker}>{ticker}</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Transactions</span>
          <span className={styles.value}>{transactions}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Listed</span>
          <span className={styles.value}>{formatTime(daysListed)}</span>
        </div>
      </div>

      <div className={styles.priceChange}>
        <span className={`${styles.change} ${priceChange >= 0 ? styles.positive : styles.negative}`}>
          {priceChange >= 0 ? '+' : ''}{priceChange}%
        </span>
        <span className={styles.period}>6h</span>
      </div>

      <div className={styles.bondingCurve}>
        <div className={styles.progressLabel}>
          <span>Bonding Curve</span>
          <span>{bondingProgress}%</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progress} 
            style={{ width: `${bondingProgress}%` }}
          />
        </div>
      </div>

      <div className={styles.marketCap}>
        <span className={styles.label}>Market Cap</span>
        <span className={styles.value}>{formatCurrency(marketCap)}</span>
      </div>
    </div>
  )
}

export default TokenCard