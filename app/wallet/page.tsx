// app/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Wallet as WalletIcon } from 'lucide-react'

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

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [tonBalance, setTonBalance] = useState<number | null>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    fetchUserData()
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

  const connectWallet = () => {
    console.log('Starting wallet connection...')
    try {
      const webApp = window.Telegram.WebApp
      console.log('WebApp object:', webApp)
      
      // Check if WebApp exists
      if (!webApp) {
        const error = new Error('Telegram WebApp not found')
        console.error(error)
        alert('Please open this app in Telegram')
        return
      }

      // Check if WebApp supports wallet connection
      if (!webApp.isVersionAtLeast('6.1')) {
        const error = new Error(`Telegram version too old: ${webApp.version}`)
        console.error(error)
        alert('Please update your Telegram app to use this feature')
        return
      }

      // Log before opening wallet
      console.log('Opening TON Wallet...')

      // Use Telegram's native wallet connection with the correct method name
      webApp.tonWallet.connect(function(result: { address: string; balance: string }) {  // Changed from openTonWallet to tonWallet.connect
        console.log('Wallet callback received:', result)
        
        if (!result) {
          console.error('No result from wallet connection')
          return
        }

        const { address, balance } = result
        if (address && balance) {
          console.log('Wallet connected successfully:', { address, balance })
          setIsConnected(true)
          setTonBalance(Number(balance) / 1e9)
          
          // Update user's wallet address in database
          if (user?.telegramId) {
            fetch('/api/user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                telegramId: user.telegramId,
                tonBalance: Number(balance) / 1e9
              })
            }).then(response => {
              console.log('Balance update response:', response)
              return response.json()
            }).then(data => {
              console.log('Balance update successful:', data)
            }).catch(err => {
              console.error('Error updating wallet balance:', err)
            })
          }
        } else {
          console.error('Invalid wallet connection result:', {
            hasAddress: !!address,
            hasBalance: !!balance,
            fullResult: result
          })
        }
      })

      // Log after opening wallet request
      console.log('Wallet request sent')

    } catch (error) {
      // Log the full error object
      console.error('Detailed wallet connection error:', {
        message: (error as any)?.message,
        name: (error as Error)?.name,
        stack: (error as Error)?.stack,
        fullError: error
      })
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