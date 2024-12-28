// app/wallet/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import styles from './page.module.css'
import { Wallet as WalletIcon } from 'lucide-react'
import { useTonConnectUI, useTonWallet, CHAIN } from '@tonconnect/ui-react'
import { TonProofApi } from '../lib/ton-proof-api'

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
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  
  const [user, setUser] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const initializeWallet = async () => {
      if (!wallet) {
        TonProofApi.reset();
        setAuthorized(false);
        return;
      }

      // Handle proof verification if available
      if (wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
        await TonProofApi.checkProof(wallet.connectItems.tonProof.proof, wallet.account);
      }

      if (!TonProofApi.accessToken) {
        tonConnectUI.disconnect();
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
      fetchUserData();
    };

    initializeWallet();
  }, [wallet, tonConnectUI]);

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
      {!wallet ? (
          <button className={styles.connectButton} onClick={() => tonConnectUI.connectWallet()}>
            <WalletIcon size={20} />
            Connect TON Wallet
          </button>
        ) : (
          <div className={styles.tonBalance}>
            <div className={styles.label}>TON Balance</div>
            <div className={styles.value}>
              {wallet && 'balance' in wallet ? 
                `${(Number(wallet.balance) / 1e9).toFixed(2)} TON` : 
                'Loading...'}
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