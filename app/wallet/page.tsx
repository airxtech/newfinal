// app/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { Wallet as WalletIcon } from 'lucide-react'
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react'
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

type WalletWithBalance = ReturnType<typeof useTonWallet> & {
  balance?: string;
  account?: {
    balance?: string;
    address?: string;
  };
}

export default function WalletPage() {
  const wallet = useTonWallet() as WalletWithBalance;
  const [tonConnectUI] = useTonConnectUI();
  
  const [user, setUser] = useState<any>(null)
  const [portfolio, setPortfolio] = useState<Token[]>([])
  const [totalValue, setTotalValue] = useState<number>(0)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    console.log('Fetching user data...');
    fetchUserData();
  }, []);

  useEffect(() => {
    if (wallet && user?.telegramId) {
      console.log('Wallet connected:', wallet);
      console.log('Wallet account:', wallet.account);

      // Update user's wallet info in database
      const walletData = {
        telegramId: user.telegramId,
        tonBalance: wallet.account?.balance ? Number(wallet.account.balance) / 1e9 : null,
        walletAddress: wallet.account?.address || null,
        lastConnected: new Date().toISOString()
      };

      console.log('Updating wallet data:', walletData);

      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletData)
      }).then(response => {
        console.log('Wallet update response:', response);
        return response.json();
      }).then(data => {
        console.log('Wallet update successful:', data);
        setUser(data);
      }).catch(err => {
        console.error('Error updating wallet info:', err);
      });
    }
  }, [wallet, user?.telegramId]);

  const fetchUserData = async () => {
    try {
      const webApp = window.Telegram.WebApp
      console.log('WebApp object:', webApp);
      console.log('WebApp user:', webApp?.initDataUnsafe?.user);

      if (!webApp?.initDataUnsafe?.user?.id) {
        console.log('No user ID found in WebApp');
        return;
      }

      console.log('Fetching user with ID:', webApp.initDataUnsafe.user.id);
      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`)
      console.log('User API response:', response);

      if (response.ok) {
        const data = await response.json()
        console.log('User data received:', data);
        setUser(data)
        
        // Fetch user's tokens
        console.log('Fetching tokens...');
        const tokensResponse = await fetch(`/api/tokens/user/${data.telegramId}`)
        console.log('Tokens API response:', tokensResponse);

        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json()
          console.log('Tokens data received:', tokensData);
          
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
        } else {
          console.log('Failed to fetch tokens:', tokensResponse.status);
        }
      } else {
        console.log('Failed to fetch user:', response.status);
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error)
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

  const formatAddress = (address: string) => {
    if (!address) return '';

    try {
      // Remove workchain prefix (0:) if exists
      const rawAddress = address.startsWith('0:') ? address.slice(2) : address;
      
      // Convert to base64url
      const buffer = Buffer.from(rawAddress, 'hex');
      const base64 = buffer.toString('base64url');
      
      // Add bounceable prefix
      const friendlyAddress = 'EQ' + base64;
      
      // Return shortened version
      return `${friendlyAddress.slice(0, 6)}...${friendlyAddress.slice(-4)}`;
    } catch (error) {
      console.error('Error formatting address:', error);
      return address.slice(0, 6) + '...' + address.slice(-4);
    }
  }

  if (!user) {
    console.log('Rendering loading state...');
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
              {wallet?.account?.balance !== undefined ? 
                `${(Number(wallet.account.balance) / 1e9).toFixed(2)} TON` : 
                '0.00 TON'}
            </div>
            {wallet.account?.address && (
              <div className={styles.address} title={wallet.account.address}>
                {`${formatAddress(wallet.account.address).slice(0, 6)}...${formatAddress(wallet.account.address).slice(-4)}`}
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