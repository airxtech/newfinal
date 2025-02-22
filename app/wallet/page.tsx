// app/wallet/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { toUserFriendlyAddress } from '@tonconnect/sdk'
import { WalletButton } from '../components/shared/WalletButton'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { Spinner } from '../components/ui/spinner'
import styles from './page.module.css'

// Types based on Prisma schema
interface TonWalletAccount {
  address: string
  chain: number
  walletStateInit?: string
  publicKey?: string
}

interface TonWallet {
  account: TonWalletAccount
  connectTime?: number
  device?: {
    platform: string
    appName: string
    appVersion?: string
  }
}

interface Token {
  id: string
  name: string
  ticker: string
  imageUrl: string | null
  description: string
  totalSupply: number
  currentPrice: number
  marketCap: number
  bondingCurve: number
  isListed: boolean
  contractAddress: string | null
  createdAt: Date
  creatorId: string
}

interface UserToken {
  id: string
  userId: string
  tokenId: string
  balance: number
  token: Token
}

interface User {
  id: string
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
  zoaBalance: number
  tonBalance: number | null
  walletAddress: string | null
  lastConnected: Date | null
}

export default function WalletPage() {
  const [tonConnectUI] = useTonConnectUI()
  const [user, setUser] = useState<User | null>(null)
  const [userTokens, setUserTokens] = useState<UserToken[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [tonBalance, setTonBalance] = useState<string>('0.00')
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  const wallet = tonConnectUI.wallet as TonWallet | null
  const isConnected = tonConnectUI.connected

  const fetchUserData = useCallback(async (silent: boolean = false) => {
    if (!silent) setLoading(true)
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) {
        console.error('No user ID found in WebApp')
        return
      }

      // Fetch user data
      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      const userData: User = await response.json()
      
      if (response.ok) {
        setUser(userData)

        // Fetch user's tokens
        const tokensResponse = await fetch(`/api/tokens/user/${userData.telegramId}`)
        if (tokensResponse.ok) {
          const tokensData: UserToken[] = await tokensResponse.json()
          setUserTokens(tokensData)

          // Calculate total portfolio value including ZOA
          const totalPortfolioValue = tokensData.reduce((acc, userToken) => {
            return acc + (userToken.balance * userToken.token.currentPrice)
          }, userData.zoaBalance) // ZOA is worth $1 per token

          setTotalValue(totalPortfolioValue)
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const updateWalletInfo = useCallback(async () => {
    if (!wallet?.account?.address || !user?.telegramId) return

    try {
      const userFriendlyAddress = toUserFriendlyAddress(wallet.account.address)
      const response = await fetch(`/api/ton/balance?address=${userFriendlyAddress}`)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const balance = data?.result?.balance 
        ? (Number(data.result.balance) / 1e9).toFixed(2)
        : '0.00'

      setTonBalance(balance)

      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user.telegramId,
          tonBalance: Number(balance),
          walletAddress: wallet.account.address,
          lastConnected: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error updating wallet info:', error)
      setTonBalance('0.00')
    }
  }, [wallet?.account?.address, user?.telegramId])

  // Initial load
  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  // Update when wallet changes
  useEffect(() => {
    if (wallet?.account?.address) {
      updateWalletInfo()
    }
  }, [wallet?.account?.address, updateWalletInfo])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await Promise.all([
      fetchUserData(true),
      isConnected ? updateWalletInfo() : Promise.resolve()
    ])
    setRefreshing(false)
  }

  const formatValue = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const goToStonFi = (contractAddress: string): void => {
    window.Telegram.WebApp.openLink(`https://app.ston.fi/swap?token=${contractAddress}`)
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
        <span>Loading wallet data...</span>
      </div>
    )
  }

  return (
    <div className={styles.walletPage}>
      <div className={styles.header}>
        <h1>Wallet</h1>
        <div className={styles.headerActions}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`${styles.refreshButton} ${refreshing ? styles.refreshing : ''}`}
          >
            <RefreshCw size={20} />
          </button>
          <div className={styles.totalValue}>
            {formatValue(totalValue)}
          </div>
        </div>
      </div>

      <div className={styles.tonSection}>
        {wallet && (
          <div className={styles.tonBalance}>
            <div className={styles.label}>TON Balance</div>
            <div className={styles.value}>{tonBalance} TON</div>
          </div>
        )}
        <WalletButton />
      </div>

      <section className={styles.portfolio}>
        <h2>Token Portfolio</h2>
        <div className={styles.tokenList}>
          {!user ? (
            <div className={styles.empty}>Failed to load user data</div>
          ) : (
            <>
              {/* ZOA Token Card */}
              <div className={styles.tokenCard}>
                <div className={styles.tokenInfo}>
                  <div className={styles.tokenLogo}>💎</div>
                  <div className={styles.tokenDetails}>
                    <h3>ZOA Coin</h3>
                    <span className={styles.ticker}>ZOA</span>
                  </div>
                </div>
                <div className={styles.tokenBalance}>
                  <div className={styles.amount}>
                    {user.zoaBalance.toFixed(4)} ZOA
                  </div>
                  <div className={styles.value}>
                    {formatValue(user.zoaBalance)}
                  </div>
                </div>
              </div>

              {/* Other Tokens */}
              {userTokens.length === 0 ? (
                <div className={styles.empty}>No other tokens in portfolio</div>
              ) : (
                userTokens.map((userToken) => (
                  <div key={userToken.id} className={styles.tokenCard}>
                    <div className={styles.tokenInfo}>
                      <div className={styles.tokenLogo}>
                        {userToken.token.imageUrl ? (
                          <img
                            src={userToken.token.imageUrl}
                            alt={userToken.token.name}
                            className={styles.tokenImage}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.textContent = '🪙'
                              }
                            }}
                          />
                        ) : '🪙'}
                      </div>
                      <div className={styles.tokenDetails}>
                        <h3>{userToken.token.name}</h3>
                        <span className={styles.ticker}>{userToken.token.ticker}</span>
                      </div>
                    </div>

                    <div className={styles.tokenBalance}>
                      <div className={styles.amount}>
                        {userToken.balance.toFixed(4)} {userToken.token.ticker}
                      </div>
                      <div className={styles.value}>
                        {formatValue(userToken.balance * userToken.token.currentPrice)}
                      </div>
                    </div>

                    {userToken.token.isListed && userToken.token.contractAddress && (
                      <button 
                        className={styles.tradeButton}
                        onClick={() => goToStonFi(userToken.token.contractAddress!)}
                      >
                        <span>STON.fi</span>
                        <ExternalLink size={16} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}