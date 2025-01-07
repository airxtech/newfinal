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
  const [error, setError] = useState<string | null>(null)
  const [highlightedToken, setHighlightedToken] = useState<string | null>(null)

  useEffect(() => {
    fetchTokens()
    // For Hot view and All view updates
    const interval = setInterval(() => {
      if (activeView === 'hot' || activeView === 'all') {
        fetchTokens()
      }
    }, activeView === 'hot' ? 60000 : 5000) // 1 min for hot, 5s for all

    return () => clearInterval(interval)
  }, [activeView])

  const fetchTokens = async () => {
    try {
      setError(null)
      console.log('Fetching tokens for view:', activeView)
      const query = activeView !== 'all' ? `?view=${activeView}` : ''
      console.log('Making request to:', `/api/tokens${query}`)

      const response = await fetch(`/api/tokens${query}`)
      console.log('Token API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Received tokens data:', data)

      if (!Array.isArray(data)) {
        console.error('Received non-array data:', data)
        throw new Error('Invalid data format received from API')
      }
      
      setTokens(data)
      
      if (activeView === 'all' && data.length > 0) {
        setHighlightedToken(data[0].id)
        // Rotate tokens every 5 seconds
        setTimeout(() => {
          setTokens(prev => {
            const newTokens = [...prev]
            const first = newTokens.shift()
            if (first) {
              newTokens.push(first)
            }
            return newTokens
          })
        }, 5000)
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch tokens')
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
    return <div className={styles.loading}>Loading tokens...</div>
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>
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
            <div className={styles.noTokens}>
              {activeView === 'my' 
                ? "You don't have any tokens yet"
                : "No tokens found"}
            </div>
          ) : (
            tokens.map(token => {
              console.log('Rendering token:', token.id)
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
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}