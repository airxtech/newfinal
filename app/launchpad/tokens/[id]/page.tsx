// app/launchpad/tokens/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
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
  }, [params.id, connected])

  const fetchTokenData = async () => {
    try {
      const response = await fetch(`/api/tokens/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch token')
      const tokenData = await response.json()
      setToken(tokenData)

      const txResponse = await fetch(`/api/tokens/${params.id}/transactions`)
      if (txResponse.ok) {
        const txData = await txResponse.json()
        setTransactions(txData)
      }

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

  const fetchUserBalances = async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) return

      const [walletResponse, tokenResponse] = await Promise.all([
        fetch(`/api/ton/balance?address=${tonConnectUI.wallet?.account.address}`),
        fetch(`/api/tokens/${params.id}/balance?telegramId=${webApp.initDataUnsafe.user.id}`),
        fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      ])

      const [walletData, tokenData, userData] = await Promise.all([
        walletResponse.json(),
        tokenResponse.json(),
        fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`).then(r => r.json())
      ])

      setUserBalances({
        ton: Number(walletData.result?.balance || 0) / 1e9,
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

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!token) {
    return <div className={styles.error}>Token not found</div>
  }

  return (
    <div className={styles.container}>
      {/* Rest of your JSX remains the same until the TradeModal */}
      
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