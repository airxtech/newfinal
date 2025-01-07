// app/launchpad/tokens/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Users, Clock, LineChart } from 'lucide-react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { TradeModal } from '@/app/components/token/TradeModal'
import styles from './page.module.css'
import { PriceChart } from '@/app/components/token/PriceChart'

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
  totalSupply: number
  currentStepNumber: number
  currentTokensSold: number
  isListed: boolean
  contractAddress?: string
  creatorId: string
  creator: {
    username?: string
    firstName: string
    lastName?: string
  }
  holdersCount: number
  transactionCount: number
}

interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  amount: number
  tokenAmount: number
  price: number
  timestamp: Date
  address: string
  user: {
    username?: string
    firstName: string
  }
}

interface Holder {
  address: string
  amount: number
  percentage: number
  isDev?: boolean
  user?: {
    username?: string
    firstName: string
  }
}

interface UserBalances {
  ton: number
  token: number
  zoa: number
}

export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [tonConnectUI] = useTonConnectUI()
  const { connected } = tonConnectUI
  const [token, setToken] = useState<TokenData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'holders'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [loading, setLoading] = useState(true)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [userBalances, setUserBalances] = useState<UserBalances>({
    ton: 0,
    token: 0,
    zoa: 0
  })

  useEffect(() => {
    fetchTokenData()
    if (connected) {
      fetchUserBalances()
    }

    // Set up real-time updates
    const interval = setInterval(fetchTokenData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [params.id, connected])

  const fetchTokenData = async () => {
    try {
      const [tokenResponse, txResponse, holdersResponse] = await Promise.all([
        fetch(`/api/tokens/${params.id}`),
        fetch(`/api/tokens/${params.id}/transactions`),
        fetch(`/api/tokens/${params.id}/holders`)
      ])

      if (!tokenResponse.ok) throw new Error('Failed to fetch token')
      
      const [tokenData, txData, holdersData] = await Promise.all([
        tokenResponse.json(),
        txResponse.ok ? txResponse.json() : [],
        holdersResponse.ok ? holdersResponse.json() : []
      ])

      setToken(tokenData)
      setTransactions(txData)
      setHolders(holdersData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching token data:', error)
      setLoading(false)
    }
  }

  const fetchUserBalances = async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id || !tonConnectUI.wallet?.account.address) return

      const [tonResponse, tokenResponse, userResponse] = await Promise.all([
        fetch(`/api/ton/balance?address=${tonConnectUI.wallet.account.address}`),
        fetch(`/api/tokens/${params.id}/balance?telegramId=${webApp.initDataUnsafe.user.id}`),
        fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      ])

      const tonData = await tonResponse.json()
      const tokenData = await tokenResponse.json()
      const userData = await userResponse.json()

      setUserBalances({
        ton: Number(tonData.result?.balance || 0) / 1e9,
        token: tokenData.balance || 0,
        zoa: userData.zoaBalance || 0
      })
    } catch (error) {
      console.error('Error fetching user balances:', error)
    }
  }

  const handleTrade = (type: 'buy' | 'sell') => {
    if (!token) return
    setTradeType(type)
    setShowTradeModal(true)
  }

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatTime = (time: Date) => {
    const date = new Date(time)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
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
          <ArrowLeft size={24} />
        </button>
        <div className={styles.tokenInfo}>
          {token.imageUrl ? (
            <img 
              src={token.imageUrl} 
              alt={token.name} 
              className={styles.tokenImage}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,...' // Add placeholder SVG
              }}
            />
          ) : (
            <div className={styles.tokenPlaceholder}>
              {token.ticker[0]}
            </div>
          )}
          <div>
            <h1>{token.name}</h1>
            <span className={styles.ticker}>{token.ticker}</span>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.label}>Price</span>
          <span className={styles.value}>{formatValue(token.currentPrice)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.label}>Market Cap</span>
          <span className={styles.value}>{formatValue(token.marketCap)}</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <Users size={20} />
          <span className={styles.metricValue}>{token.holdersCount}</span>
          <span className={styles.metricLabel}>Holders</span>
        </div>
        <div className={styles.metricCard}>
          <LineChart size={20} />
          <span className={styles.metricValue}>{token.transactionCount}</span>
          <span className={styles.metricLabel}>Trades</span>
        </div>
        <div className={styles.metricCard}>
          <Clock size={20} />
          <span className={styles.metricValue}>{token.bondingCurve.toFixed(1)}%</span>
          <span className={styles.metricLabel}>Bonding</span>
        </div>
      </div>

      <PriceChart tokenId={token.id} currentPrice={token.currentPrice} />

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
            {token.creator && (
              <div className={styles.creator}>
                <span>Created by:</span>
                <span>{token.creator.username || token.creator.firstName}</span>
              </div>
            )}
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
            
            <div className={styles.tokenMetrics}>
              <div className={styles.metricRow}>
                <span>Total Supply</span>
                <span>{token.totalSupply.toLocaleString()} {token.ticker}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Current Step</span>
                <span>#{token.currentStepNumber}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Tokens in Market</span>
                <span>{token.currentTokensSold.toLocaleString()} {token.ticker}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className={styles.trades}>
            {transactions.length === 0 ? (
              <div className={styles.empty}>No transactions yet</div>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} className={styles.transaction}>
                  <div className={styles.txInfo}>
                    <span className={styles.address}>
                      {tx.user?.username || formatAddress(tx.address)}
                    </span>
                    <span className={`${styles.type} ${styles[tx.type.toLowerCase()]}`}>
                      {tx.type}
                    </span>
                    <span className={styles.amount}>
                      {formatValue(tx.amount)}
                    </span>
                  </div>
                  <div className={styles.txDetails}>
                    <span>{tx.tokenAmount.toFixed(2)} {token.ticker}</span>
                    <span className={styles.time}>{formatTime(tx.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className={styles.holders}>
            {holders.length === 0 ? (
              <div className={styles.empty}>No holders yet</div>
            ) : (
              holders.map((holder, index) => (
                <div key={index} className={styles.holder}>
                  <div className={styles.holderInfo}>
                    <span className={styles.address}>
                      {holder.user?.username || formatAddress(holder.address)}
                      {holder.isDev && <span className={styles.dev}>(dev)</span>}
                    </span>
                    <span className={styles.percentage}>{holder.percentage.toFixed(2)}%</span>
                  </div>
                  <span className={styles.amount}>
                    {holder.amount.toLocaleString()} {token.ticker}
                  </span>
                </div>
              ))
            )}
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
          <div className={styles.tradeButtons}>
            <button 
              className={styles.buyButton}
              onClick={() => handleTrade('buy')}
            >
              Buy
            </button>
            <button 
              className={styles.sellButton}
              onClick={() => handleTrade('sell')}
              disabled={!userBalances.token}
            >
              Sell
            </button>
          </div>
        )}
      </div>

      {showTradeModal && (
        <TradeModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          type={tradeType}
          token={{
            id: token.id,
            name: token.name,
            ticker: token.ticker,
            currentPrice: token.currentPrice,
            currentStepNumber: token.currentStepNumber,
            currentTokensSold: token.currentTokensSold
          }}
          userBalance={userBalances}
        />
      )}
    </div>
  )
}