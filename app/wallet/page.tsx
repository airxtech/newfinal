// app/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Wallet as WalletIcon } from 'lucide-react'
import TonConnect, { 
  isWalletInfoRemote, 
  WalletInfoRemote,
  toUserFriendlyAddress
} from '@tonconnect/sdk'

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

// Create a singleton connector instance
const connector = new TonConnect({
  manifestUrl: 'https://telegramtest-eight.vercel.app/tonconnect-manifest.json'
})

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [tonBalance, setTonBalance] = useState<number | null>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    // Restore previous connection
    const init = async () => {
      try {
        // Try to restore the connection
        await connector.restoreConnection()

        // Add connection status listener
        const unsubscribe = connector.onStatusChange(wallet => {
          if (wallet) {
            setIsConnected(true)
            // Convert raw address to user-friendly format
            const address = toUserFriendlyAddress(wallet.account.address)
            setWalletAddress(address)

            // Get chain and check if testnet
            const isTestnet = wallet.account.chain === '-239'
            if (isTestnet) {
              setTonBalance(1.0) // 1 TON for testing
            }
          } else {
            setIsConnected(false)
            setTonBalance(null)
            setWalletAddress(null)
          }
        })

        // Load initial user data
        fetchUserData()

        return () => {
          unsubscribe()
        }
      } catch (e) {
        console.error('Error initializing wallet:', e)
      }
    }

    init()
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
      // Get list of available wallets
      const walletsList = await connector.getWallets()
      const remoteWallets = walletsList.filter(isWalletInfoRemote)
      
      // Get Tonkeeper wallet
      const tonkeeper = remoteWallets.find(wallet => wallet.appName === 'tonkeeper')
      if (!tonkeeper) {
        throw new Error('Tonkeeper wallet not found')
      }

      // Generate universal link and open it
      const universalLink = connector.connect({
        universalLink: tonkeeper.universalLink,
        bridgeUrl: tonkeeper.bridgeUrl
      })

      // Open in Telegram's browser
      window.Telegram.WebApp.openLink(universalLink)

    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const disconnectWallet = async () => {
    try {
      await connector.disconnect()
      setIsConnected(false)
      setTonBalance(null)
      setWalletAddress(null)
    } catch (error) {
      console.error('Error disconnecting wallet:', error)
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
            {walletAddress && (
              <div className={styles.address}>
                {walletAddress}
              </div>
            )}
            <button className={styles.disconnectButton} onClick={disconnectWallet}>
              Disconnect
            </button>
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