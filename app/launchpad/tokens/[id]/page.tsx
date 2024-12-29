// app/launchpad/tokens/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import styles from './page.module.css'

interface TokenData {
  id: string
  name: string
  ticker: string
  description: string
  imageUrl: string
  website?: string
  twitter?: string
  telegram?: string
  currentPrice: number
  marketCap: number
  bondingCurve: number
  isListed: boolean
  contractAddress?: string
  creatorId: string
}

interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  amount: number
  tokenAmount: number
  price: number
  timestamp: Date
  address: string
}

interface Holder {
  address: string
  amount: number
  percentage: number
  isDev?: boolean
}

export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [token, setToken] = useState<TokenData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'holders'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [loading, setLoading] = useState(true)
  const [buyAmount, setBuyAmount] = useState('')
  const [sellAmount, setSellAmount] = useState('')

  useEffect(() => {
    fetchTokenData()
  }, [params.id])

  const fetchTokenData = async () => {
    try {
      // Fetch token details
      const response = await fetch(`/api/tokens/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch token')
      const tokenData = await response.json()
      setToken(tokenData)

      // Fetch transactions
      const txResponse = await fetch(`/api/tokens/${params.id}/transactions`)
      if (txResponse.ok) {
        const txData = await txResponse.json()
        setTransactions(txData)
      }

      // Fetch holders
      const holdersResponse = await fetch(`/api/tokens/${params.id}/holders`)
      if (holdersResponse.ok) {
        const holdersData = await holdersResponse.json()
        setHolders(holdersData)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching token data:', error)
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    try {
      const response = await fetch(`/api/tokens/${params.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(buyAmount) })
      })
      if (!response.ok) throw new Error('Failed to execute buy')
      fetchTokenData() // Refresh data
      setBuyAmount('')
    } catch (error) {
      console.error('Error buying token:', error)
    }
  }

  const handleSell = async () => {
    try {
      const response = await fetch(`/api/tokens/${params.id}/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(sellAmount) })
      })
      if (!response.ok) throw new Error('Failed to execute sell')
      fetchTokenData() // Refresh data
      setSellAmount('')
    } catch (error) {
      console.error('Error selling token:', error)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 3)}...${address.slice(-3)}`
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!token) {
    return <div className={styles.error}>Token not found</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.tokenInfo}>
          <img src={token.imageUrl} alt={token.name} className={styles.tokenImage} />
          <div>
            <h1>{token.name}</h1>
            <span className={styles.ticker}>{token.ticker}</span>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Price</span>
          <span className={styles.value}>{formatAmount(token.currentPrice)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Market Cap</span>
          <span className={styles.value}>{formatAmount(token.marketCap)}</span>
        </div>
      </div>

      <div className={styles.bondingCurve}>
        <div className={styles.curveHeader}>
          <span>Bonding Curve Progress</span>
          <span>{token.bondingCurve}%</span>
        </div>
        <div className={styles.progressBar}>
          <div 
            className={styles.progress} 
            style={{ width: `${token.bondingCurve}%` }}
          />
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'trades' ? styles.active : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          Trades
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'holders' ? styles.active : ''}`}
          onClick={() => setActiveTab('holders')}
        >
          Holders
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overview}>
            <p className={styles.description}>{token.description}</p>
            {(token.website || token.twitter || token.telegram) && (
              <div className={styles.links}>
                {token.website && (
                  <a href={token.website} target="_blank" rel="noopener noreferrer">
                    Website <ExternalLink size={14} />
                  </a>
                )}
                {token.twitter && (
                  <a href={token.twitter} target="_blank" rel="noopener noreferrer">
                    Twitter <ExternalLink size={14} />
                  </a>
                )}
                {token.telegram && (
                  <a href={token.telegram} target="_blank" rel="noopener noreferrer">
                    Telegram <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className={styles.trades}>
            {transactions.map(tx => (
              <div key={tx.id} className={styles.transaction}>
                <div className={styles.txInfo}>
                  <span className={styles.address}>{formatAddress(tx.address)}</span>
                  <span className={`${styles.type} ${styles[tx.type.toLowerCase()]}`}>
                    {tx.type}
                  </span>
                  <span className={styles.amount}>{formatAmount(tx.amount)}</span>
                </div>
                <span className={styles.time}>
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className={styles.holders}>
            {holders.map((holder, index) => (
              <div key={index} className={styles.holder}>
                <div className={styles.holderInfo}>
                  <span className={styles.address}>
                    {formatAddress(holder.address)}
                    {holder.isDev && <span className={styles.dev}>(dev)</span>}
                  </span>
                  <span className={styles.percentage}>{holder.percentage}%</span>
                </div>
                <span className={styles.amount}>
                  {holder.amount.toLocaleString()} {token.ticker}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {token.isListed ? (
          <button 
            className={styles.stonButton}
            onClick={() => window.open(`https://app.ston.fi/swap?token=${token.contractAddress}`, '_blank')}
          >
            Trade on STON.fi <ExternalLink size={16} />
          </button>
        ) : (
          <>
            <div className={styles.inputGroup}>
              <input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="Enter TON amount"
                min="0"
              />
              <button 
                className={styles.buyButton}
                onClick={handleBuy}
                disabled={!buyAmount}
              >
                Buy
              </button>
            </div>
            <div className={styles.inputGroup}>
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="Enter token amount"
                min="0"
              />
              <button 
                className={styles.sellButton}
                onClick={handleSell}
                disabled={!sellAmount}
              >
                Sell
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}