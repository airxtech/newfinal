// app/launchpad/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { Plus } from 'lucide-react'
import TransactionStrip from '../components/shared/TransactionStrip'

interface Token {
  id: string
  name: string
  ticker: string
  logo: string
  transactions: number
  daysListed: number
  priceChange: number
  bondingProgress: number
  marketCap: number
  isGuaranteed: boolean
}

export default function LaunchpadPage() {
  const router = useRouter()
  const [activeView, setActiveView] = useState<'all' | 'hot' | 'new' | 'listed' | 'marketcap' | 'my'>('all')
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTokens()
    // Refetch every 10 seconds to keep the list updated
  const interval = setInterval(fetchTokens, 10000)
  return () => clearInterval(interval)
}, [activeView])

  const fetchTokens = async () => {
    try {
      console.log('Fetching tokens for view:', activeView)
      const query = activeView !== 'all' ? `?view=${activeView}` : ''
      const response = await fetch(`/api/tokens${query}`)
      console.log('Token API response:', response)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Received tokens:', data)
      setTokens(data)
    } catch (error) {
      console.error('Error fetching tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatTime = (days: number) => {
    if (days < 1) {
      const hours = Math.floor(days * 24)
      const minutes = Math.floor((days * 24 * 60) % 60)
      return `${hours}h ${minutes}m`
    }
    return `${days} days`
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.launchpadPage}>
      <div className={styles.header}>
        <h1>Launchpad</h1>
        <button 
          className={styles.createButton}
          onClick={() => router.push('/launchpad/create')}
        >
          <Plus size={20} />
          Create Token
        </button>
      </div>

      <div className={styles.transactionStripContainer}>
        <TransactionStrip />
      </div>

      <section className={styles.guaranteedSection}>
        <h2>ZOA Guaranteed Tokens</h2>
        <div className={styles.comingSoon}>
          <button
            className={styles.learnMoreButton}
            onClick={() => {
              window.Telegram.WebApp.showPopup({
                title: 'ZOA Guaranteed Tokens',
                message: 'ZOA Guaranteed tokens are specially vetted tokens that undergo thorough due diligence and have locked liquidity. These tokens provide additional security and transparency for investors.',
                buttons: [{ type: 'close' }]
              })
            }}
          >
            Coming Soon - Learn More
          </button>
        </div>
      </section>

      <section className={styles.memeSection}>
        <h2>Meme Coins</h2>
        
        <div className={styles.viewSelector}>
          <button 
            className={`${styles.viewButton} ${activeView === 'all' ? styles.active : ''}`}
            onClick={() => setActiveView('all')}
          >
            All
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'hot' ? styles.active : ''}`}
            onClick={() => setActiveView('hot')}
          >
            Hot 🔥
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'new' ? styles.active : ''}`}
            onClick={() => setActiveView('new')}
          >
            New
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'listed' ? styles.active : ''}`}
            onClick={() => setActiveView('listed')}
          >
            Listed
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'marketcap' ? styles.active : ''}`}
            onClick={() => setActiveView('marketcap')}
          >
            Market Cap
          </button>
          <button 
            className={`${styles.viewButton} ${activeView === 'my' ? styles.active : ''}`}
            onClick={() => setActiveView('my')}
          >
            My Tokens
          </button>
        </div>

        <div className={styles.tokenGrid}>
          {tokens.length === 0 ? (
            <div className={styles.noTokens}>No tokens found</div>
          ) : (
            tokens.map(token => {
              console.log('Navigating to token:', token.id); // Log outside JSX
              return (
                <div 
                  key={token.id} 
                  className={styles.tokenCard}
                  onClick={() => router.push(`/launchpad/tokens/${token.id}`)}
                >
                  <div className={styles.header}>
                    <div className={styles.logo}>{token.logo || '🪙'}</div>
                    <div className={styles.nameContainer}>
                      <h3>{token.name}</h3>
                      <span className={styles.ticker}>{token.ticker}</span>
                    </div>
                  </div>

                  <div className={styles.stats}>
                    <div className={styles.stat}>
                      <span className={styles.label}>Transactions</span>
                      <span className={styles.value}>{token.transactions || 0}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.label}>Listed</span>
                      <span className={styles.value}>
                        {formatTime(token.daysListed || 0)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.priceChange}>
                    <span 
                      className={`${styles.change} ${(token.priceChange || 0) >= 0 ? styles.positive : styles.negative}`}
                    >
                      {(token.priceChange || 0) >= 0 ? '+' : ''}{token.priceChange || 0}%
                    </span>
                    <span className={styles.period}>6h</span>
                  </div>

                  <div className={styles.bondingCurve}>
                    <div className={styles.progressLabel}>
                      <span>Bonding Curve</span>
                      <span>{token.bondingProgress || 0}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progress} 
                        style={{ width: `${token.bondingProgress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className={styles.marketCap}>
                    <span className={styles.label}>Market Cap</span>
                    <span className={styles.value}>{formatValue(token.marketCap || 0)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  )
}