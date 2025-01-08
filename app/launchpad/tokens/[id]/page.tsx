// app/launchpad/tokens/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Users, Clock, LineChart, RefreshCw } from 'lucide-react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { TradeModal } from '@/app/components/token/TradeModal'
import { useTokenUpdates } from '@/app/hooks/useTokenUpdates'
import styles from './page.module.css'
import { PriceChart } from '@/app/components/token/PriceChart'
import { Spinner } from '@/app/components/ui/spinner'

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

interface LoadingStates {
  token: boolean
  transactions: boolean
  holders: boolean
  userBalances: boolean
  more: boolean
}

interface ErrorStates {
  token?: string
  transactions?: string
  holders?: string
  userBalances?: string
}

const TRANSACTIONS_PER_PAGE = 20

export default function TokenPage() {
  const params = useParams()
  const router = useRouter()
  const [tonConnectUI] = useTonConnectUI()
  const { connected } = tonConnectUI
  const [token, setToken] = useState<TokenData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'holders'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [holders, setHolders] = useState<Holder[]>([])
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    token: true,
    transactions: false,
    holders: false,
    userBalances: false,
    more: false
  })
  const [errors, setErrors] = useState<ErrorStates>({})
  const [userBalances, setUserBalances] = useState<UserBalances>({
    ton: 0,
    token: 0,
    zoa: 0
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const lastTransactionRef = useRef<HTMLDivElement | null>(null)

  // Real-time updates subscription
  useTokenUpdates({
    tokenId: params.id as string,
    onPriceUpdate: (price) => {
      setToken(prev => prev ? { ...prev, currentPrice: price } : null)
    },
    onNewTransaction: (transaction) => {
      setTransactions(prev => [transaction, ...prev])
      setToken(prev => {
        if (!prev) return null
        const tokenChange = transaction.type === 'BUY' ? transaction.tokenAmount : -transaction.tokenAmount
        return {
          ...prev,
          transactionCount: prev.transactionCount + 1,
          currentTokensSold: prev.currentTokensSold + tokenChange,
          marketCap: prev.currentPrice * (prev.currentTokensSold + tokenChange)
        }
      })
    },
    onTokenUpdate: (data) => {
      setToken(prev => prev ? { ...prev, ...data } : null)
    }
  })

  // Infinite scroll setup
  useEffect(() => {
    if (!hasMore || loadingStates.more) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMoreTransactions()
        }
      },
      { threshold: 0.5 }
    )

    if (lastTransactionRef.current) {
      observer.observe(lastTransactionRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingStates.more])

  const fetchTokenData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingStates(prev => ({ ...prev, token: true }))

      const response = await fetch(`/api/tokens/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch token')
      const data = await response.json()

      setToken(data)
      setErrors(prev => ({ ...prev, token: undefined }))
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch token data'
      setErrors(prev => ({ ...prev, token: message }))
      if (!silent) {
        window.Telegram.WebApp.showPopup({
          title: 'Error',
          message,
          buttons: [{ type: 'close' }]
        })
      }
    } finally {
      if (!silent) setLoadingStates(prev => ({ ...prev, token: false }))
    }
  }, [params.id])

  const fetchTransactions = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, transactions: true }))

      const response = await fetch(
        `/api/tokens/${params.id}/transactions?page=1&limit=${TRANSACTIONS_PER_PAGE}`
      )
      if (!response.ok) throw new Error('Failed to fetch transactions')
      const data = await response.json()

      setTransactions(data.transactions)
      setHasMore(data.hasMore)
      setPage(2)
      setErrors(prev => ({ ...prev, transactions: undefined }))
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch transactions'
      setErrors(prev => ({ ...prev, transactions: message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, transactions: false }))
    }
  }

  const loadMoreTransactions = async () => {
    if (!hasMore || loadingStates.more) return

    try {
      setLoadingStates(prev => ({ ...prev, more: true }))

      const response = await fetch(
        `/api/tokens/${params.id}/transactions?page=${page}&limit=${TRANSACTIONS_PER_PAGE}`
      )
      if (!response.ok) throw new Error('Failed to fetch more transactions')
      const data = await response.json()

      setTransactions(prev => [...prev, ...data.transactions])
      setHasMore(data.hasMore)
      setPage(prev => prev + 1)
    } catch (error: any) {
      const message = error?.message || 'Failed to load more transactions'
      setErrors(prev => ({ ...prev, transactions: message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, more: false }))
    }
  }

  const fetchHolders = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, holders: true }))

      const response = await fetch(`/api/tokens/${params.id}/holders`)
      if (!response.ok) throw new Error('Failed to fetch holders')
      const data = await response.json()

      setHolders(data)
      setErrors(prev => ({ ...prev, holders: undefined }))
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch holders'
      setErrors(prev => ({ ...prev, holders: message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, holders: false }))
    }
  }

  const fetchUserBalances = useCallback(async () => {
    if (!connected || !tonConnectUI.wallet?.account.address) return

    try {
      setLoadingStates(prev => ({ ...prev, userBalances: true }))

      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) return

      const [tonResponse, tokenResponse, userResponse] = await Promise.all([
        fetch(`/api/ton/balance?address=${tonConnectUI.wallet.account.address}`),
        fetch(`/api/tokens/${params.id}/balance?telegramId=${webApp.initDataUnsafe.user.id}`),
        fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      ])

      const [tonData, tokenData, userData] = await Promise.all([
        tonResponse.json(),
        tokenResponse.json(),
        userResponse.json()
      ])

      setUserBalances({
        ton: Number(tonData.result?.balance || 0) / 1e9,
        token: tokenData.balance || 0,
        zoa: userData.zoaBalance || 0
      })
      setErrors(prev => ({ ...prev, userBalances: undefined }))
    } catch (error: any) {
      const message = error?.message || 'Failed to fetch balances'
      setErrors(prev => ({ ...prev, userBalances: message }))
    } finally {
      setLoadingStates(prev => ({ ...prev, userBalances: false }))
    }
  }, [connected, params.id, tonConnectUI.wallet?.account.address])

  // Initial data fetch
  useEffect(() => {
    fetchTokenData()
    fetchTransactions()
    fetchHolders()
    if (connected) {
      fetchUserBalances()
    }
  }, [fetchTokenData, fetchUserBalances, connected])

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    await Promise.all([
      fetchTokenData(true),
      fetchTransactions(),
      fetchHolders(),
      connected ? fetchUserBalances() : Promise.resolve()
    ])
    setIsRefreshing(false)
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

  if (loadingStates.token) {
    return (
      <div className={styles.loading}>
        <Spinner />
        <span>Loading token data...</span>
      </div>
    )
  }

  if (!token) {
    return (
      <div className={styles.error}>
        {errors.token || 'Token not found'}
      </div>
    )
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
                e.currentTarget.src = `/token-placeholder.svg`
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
          <span className={styles.metricValue}>
            {typeof token.holdersCount === 'number' ? token.holdersCount.toLocaleString() : '0'}
          </span>
          <span className={styles.metricLabel}>Holders</span>
        </div>
        <div className={styles.metricCard}>
          <LineChart size={20} />
          <span className={styles.metricValue}>
            {typeof token.transactionCount === 'number' ? token.transactionCount.toLocaleString() : '0'}
          </span>
          <span className={styles.metricLabel}>Trades</span>
        </div>
        <div className={styles.metricCard}>
          <Clock size={20} />
          <span className={styles.metricValue}>
            {typeof token.bondingCurve === 'number' ? token.bondingCurve.toFixed(1) : '0'}%
          </span>
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
                <span>
                  {typeof token.totalSupply === 'number' ? token.totalSupply.toLocaleString() : '0'} {token.ticker}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>Current Step</span>
                <span>#{token.currentStepNumber}</span>
              </div>
              <div className={styles.metricRow}>
                <span>Tokens in Market</span>
                <span>
                  {typeof token.currentTokensSold === 'number' ? token.currentTokensSold.toLocaleString() : '0'} {token.ticker}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className={styles.trades}>
            {loadingStates.transactions ? (
              <div className={styles.loading}>
                <Spinner />
                <span>Loading transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className={styles.empty}>No transactions yet</div>
            ) : (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`${styles.refreshButton} ${isRefreshing ? styles.refreshing : ''}`}
                >
                  <RefreshCw size={20} />
                </button>
                
                {transactions.map((tx, index) => (
                  <div 
                    key={tx.id} 
                    ref={index === transactions.length - 1 ? lastTransactionRef : null}
                    className={styles.transaction}
                  >
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
                ))}
                {loadingStates.more && (
                  <div className={styles.loadingMore}>
                    <Spinner />
                    <span>Loading more transactions...</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'holders' && (
          <div className={styles.holders}>
            {loadingStates.holders ? (
              <div className={styles.loading}>
                <Spinner />
                <span>Loading holders...</span>
              </div>
            ) : holders.length === 0 ? (
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
              disabled={loadingStates.userBalances}
            >
              Buy
            </button>
            <button 
              className={styles.sellButton}
              onClick={() => handleTrade('sell')}
              disabled={loadingStates.userBalances || !userBalances.token}
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