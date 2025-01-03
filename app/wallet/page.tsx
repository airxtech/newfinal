// app/wallet/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { toUserFriendlyAddress } from '@tonconnect/sdk'
import { WalletButton } from '../components/shared/WalletButton'
import { RefreshCw } from 'lucide-react'
import styles from './page.module.css'

interface Token {
  id: string
  name: string
  ticker: string
  logo: string
  balance: number
  value: number
  price: number
  isListed: boolean
  contractAddress?: string
}

interface TonWalletAccount {
  address: string;
  chain: number;
  balance: string;
  publicKey?: string;
  walletStateInit?: string;
}

interface TonWallet {
  account: TonWalletAccount;
  connectTime?: number;
  device?: {
    platform: string;
    appName: string;
    appVersion?: string;
  };
}

export default function WalletPage() {
  const [tonConnectUI] = useTonConnectUI()
  const wallet = tonConnectUI.wallet as TonWallet | null
  const [user, setUser] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Function to fetch user data and update balances
  const fetchUserData = useCallback(async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) {
        console.log('No user ID found in WebApp')
        return
      }

      console.log('Fetching user data...')
      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user data')

      const data = await response.json()
      console.log('User data received:', data)
      setUser(data)
      
      // Fetch token portfolio
      console.log('Fetching tokens...')
      const tokensResponse = await fetch(`/api/tokens/user/${data.telegramId}`)
      if (!tokensResponse.ok) throw new Error('Failed to fetch tokens')

      const tokensData = await tokensResponse.json()
      console.log('Tokens data received:', tokensData)
      
      const portfolio = [{
        id: 'zoa',
        name: 'ZOA Coin',
        ticker: 'ZOA',
        logo: '💎',
        balance: data.zoaBalance,
        value: data.zoaBalance,
        price: 1,
        isListed: true
      }, ...tokensData]
      
      setPortfolio(portfolio)
      setTotalValue(portfolio.reduce((acc, token) => acc + token.value, 0))
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [])

  // Function to update wallet balance
  const updateWalletBalance = useCallback(async () => {
    if (!wallet?.account?.address || !user?.telegramId) return

    try {
      const walletData = {
        telegramId: user.telegramId,
        tonBalance: wallet.account.balance && Number(BigInt(wallet.account.balance) / BigInt(1e9)),
        walletAddress: wallet.account.address,
        lastConnected: new Date().toISOString()
      }

      console.log('Updating wallet data:', walletData)
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletData)
      })

      if (!response.ok) throw new Error('Failed to update wallet data')
      
      const updatedUser = await response.json()
      console.log('Wallet update successful:', updatedUser)
      setUser(updatedUser)
    } catch (error) {
      console.error('Error updating wallet:', error)
    }
  }, [wallet, user?.telegramId])

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchUserData(), updateWalletBalance()])
    setIsRefreshing(false)
  }

  // Initial load and immediate balance check
  useEffect(() => {
    fetchUserData();
    if (wallet?.account) {
      logWalletDetails(wallet);
      updateWalletBalance();
    }
  }, []);

  // Handle wallet connection and balance updates
  useEffect(() => {
    if (wallet?.account?.address) {
      updateWalletBalance()
    }
  }, [wallet?.account?.address, wallet?.account?.balance, updateWalletBalance])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData()
        updateWalletBalance()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchUserData, updateWalletBalance])

  // Listen for transaction events
  useEffect(() => {
    const unsubscribe = tonConnectUI.onStatusChange((wallet: any) => {
      if (wallet) {
        fetchUserData()
        updateWalletBalance()
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [tonConnectUI, fetchUserData, updateWalletBalance])

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const goToStonFi = (contractAddress: string) => {
    window.Telegram.WebApp.openLink(`https://app.ston.fi/swap?token=${contractAddress}`)
  }

  if (!user) {
    console.log('Rendering loading state...')
    return <div className={styles.loading}>Loading...</div>
  }

  function displayBalance(wallet: TonWallet): import("react").ReactNode {
    throw new Error('Function not implemented.')
  }

  return (
    <div className={styles.walletPage}>
      <div className={styles.header}>
        <h1>Wallet</h1>
        <div className={styles.headerActions}>
          <button 
            onClick={handleRefresh} 
            className={`${styles.refreshButton} ${isRefreshing ? styles.refreshing : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} />
          </button>
          <div className={styles.totalValue}>
            Portfolio Value: {formatValue(totalValue)}
          </div>
        </div>
      </div>

      <div className={styles.tonSection}>
        <WalletButton />
        {wallet && (
          <div className={styles.tonBalance}>
            <div className={styles.label}>TON Balance</div>
            <div className={styles.value}>
              {displayBalance(wallet)}
            </div>
            {wallet.account?.address && (
              <div className={styles.address} title={wallet.account.address}>
                {`${toUserFriendlyAddress(wallet.account.address).slice(0, 6)}...${toUserFriendlyAddress(wallet.account.address).slice(-4)}`}
              </div>
            )}
          </div>
        )}
      </div>

      <section className={styles.portfolio}>
        <h2>Token Portfolio</h2>
        <div className={styles.tokenList}>
          {portfolio.map(token => (
            <div key={token.id} className={styles.tokenCard}>
              <div className={styles.tokenInfo}>
                <div className={styles.tokenLogo}>{token.logo}</div>
                <div className={styles.tokenDetails}>
                  <h3>{token.name}</h3>
                  <span className={styles.ticker}>{token.ticker}</span>
                </div>
              </div>

              <div className={styles.tokenBalance}>
                <div className={styles.amount}>
                  {token.balance.toFixed(4)} {token.ticker}
                </div>
                <div className={styles.value}>
                  {formatValue(token.value)}
                </div>
              </div>

              {token.isListed && token.contractAddress && (
                <button 
                  className={styles.tradeButton}
                  onClick={() => goToStonFi(token.contractAddress!)}
                >
                  Trade on STON.fi
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function logWalletDetails(wallet: TonWallet) {
  throw new Error('Function not implemented.')
}
