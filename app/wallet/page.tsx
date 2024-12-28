// app/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Wallet as WalletIcon } from 'lucide-react'
import TonConnect, { isWalletInfoRemote, WalletInfoRemote } from '@tonconnect/sdk'

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

let connector: TonConnect | null = null

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [tonBalance, setTonBalance] = useState<number | null>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize TonConnect
    if (!connector) {
      connector = new TonConnect({
        manifestUrl: 'https://telegramtest-eight.vercel.app/tonconnect-manifest.json'
      })

      connector.restoreConnection()
    }

    // Add connection status listener
    const unsubscribe = connector.onStatusChange((wallet) => {
      if (wallet) {
        setIsConnected(true)
        try {
          const balanceNano = wallet.account.chain === '-239' // -239 is testnet, 0 is mainnet
            ? '1000000000' // 1 TON for testing
            : '0'
          setTonBalance(Number(balanceNano) / 1e9)
        } catch (e) {
          console.error('Error getting wallet balance:', e)
        }
      } else {
        setIsConnected(false)
        setTonBalance(null)
      }
    })

    fetchUserData()

    return () => {
      unsubscribe()
    }
  }, [])

  const fetchUserData = async () => {
    try {
      const webApp = window.Telegram.WebApp
      if (!webApp?.initDataUnsafe?.user?.id) return

      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUser(data)
        
        // Fetch user's tokens
        const tokensResponse = await fetch(`/api/tokens/user/${data.telegramId}`)
        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json()
          // Add ZOA token as first item
          const portfolio = [{
            id: 'zoa',
            name: 'ZOA Coin',
            ticker: 'ZOA',
            logo: '💎',
            balance: data.zoaBalance,
            value: data.zoaBalance, // 1 ZOA = $1
            price: 1,
            isListed: true
          }, ...tokensData]
          
          setPortfolio(portfolio)
          // Calculate total portfolio value
          const total = portfolio.reduce((acc, token) => acc + token.value, 0)
          setTotalValue(total)
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const connectWallet = async () => {
    try {
      const webApp = window.Telegram.WebApp

      // Check if WebApp supports wallet connection
      if (!webApp.isVersionAtLeast('6.1')) {
        alert('Please update your Telegram app to use this feature')
        return
      }

      // Open the TON wallet connection using Telegram's native API
      webApp.openTonWallet(({ address, balance }: { address: string; balance: string }) => {
        if (address && balance) {
          setIsConnected(true)
          // Convert balance from nano TON to TON
          const balanceInTon = Number(balance) / 1e9
          setTonBalance(balanceInTon)
        }
      })
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

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
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.walletPage}>
      <div className={styles.header}>
        <h1>Wallet</h1>
        <div className={styles.totalValue}>
          Portfolio Value: {formatValue(totalValue)}
        </div>
      </div>

      <div className={styles.tonSection}>
        {!isConnected ? (
          <button className={styles.connectButton} onClick={connectWallet}>
            <WalletIcon size={20} />
            Connect TON Wallet
          </button>
        ) : (
          <div className={styles.tonBalance}>
            <div className={styles.label}>TON Balance</div>
            <div className={styles.value}>
              {tonBalance !== null ? `${tonBalance.toFixed(2)} TON` : 'Loading...'}
            </div>
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