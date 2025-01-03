// app/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
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
  const [tonConnectUI] = useTonConnectUI();
  const wallet = tonConnectUI.wallet as TonWallet | null;
  const [user, setUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<Token[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tonBalance, setTonBalance] = useState('0.00');

  // Function to fetch TON balance
  const fetchTonBalance = async (wallet: TonWallet | null) => {
    if (!wallet?.account?.address) return '0.00';
    try {
      // Remove workchain prefix and convert to user-friendly format
      const userFriendlyAddress = toUserFriendlyAddress(wallet.account.address);
      console.log('Using address:', userFriendlyAddress);

      const response = await fetch(`https://toncenter.com/api/v2/address/getAccount?account=${userFriendlyAddress}`, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_TONCENTER_API_KEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('TonCenter API response:', data);
      
      if (data?.ok && data?.result?.balance) {
        return (Number(data.result.balance) / 1e9).toFixed(2);
      }
      
      // If we can get balance from wallet object as fallback
      if (wallet.account.balance) {
        return (Number(BigInt(wallet.account.balance)) / 1e9).toFixed(2);
      }

      return '0.00';
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Try to get balance from wallet object as fallback
      if (wallet.account.balance) {
        return (Number(BigInt(wallet.account.balance)) / 1e9).toFixed(2);
      }
      return '0.00';
    }
  };

  // Function to fetch user data and update balances
  const fetchUserData = async () => {
    try {
      const webApp = window.Telegram.WebApp;
      if (!webApp?.initDataUnsafe?.user?.id) {
        console.log('No user ID found in WebApp');
        return;
      }

      console.log('Fetching user data...');
      const response = await fetch(`/api/user?telegramId=${webApp.initDataUnsafe.user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('User data received:', data);
        setUser(data);

        // Fetch tokens
        console.log('Fetching tokens...');
        const tokensResponse = await fetch(`/api/tokens/user/${data.telegramId}`);
        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          console.log('Tokens data received:', tokensData);

          const portfolioData = [{
            id: 'zoa',
            name: 'ZOA Coin',
            ticker: 'ZOA',
            logo: '💎',
            balance: data.zoaBalance,
            value: data.zoaBalance,
            price: 1,
            isListed: true
          }, ...tokensData];

          setPortfolio(portfolioData);
          setTotalValue(portfolioData.reduce((acc, token) => acc + token.value, 0));
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Function to update wallet info in database
  const updateWalletInfo = async () => {
    if (!wallet?.account?.address || !user?.telegramId) return;

    try {
      const balance = await fetchTonBalance(wallet);
      setTonBalance(balance);

      const walletData = {
        telegramId: user.telegramId,
        tonBalance: Number(balance),
        walletAddress: wallet.account.address,
        lastConnected: new Date().toISOString()
      };

      console.log('Updating wallet with data:', walletData);
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletData)
      });

      if (!response.ok) throw new Error('Failed to update wallet info');
      const updatedUser = await response.json();
      console.log('Updated user data:', updatedUser);
      setUser(updatedUser);
    } catch (error) {
      console.error('Error updating wallet info:', error);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUserData();
    await updateWalletInfo();
    setIsRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    fetchUserData();
  }, []);

  // Update when wallet changes
  useEffect(() => {
    if (wallet?.account?.address) {
      console.log('Wallet update triggered:', wallet.account);
      updateWalletInfo();
    }
  }, [wallet?.account?.address]);

  // Update balance periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let errorCount = 0;
    const MAX_ERRORS = 3;
    
    const updateBalance = async () => {
      if (wallet?.account?.address) {
        try {
          const balance = await fetchTonBalance(wallet);
          setTonBalance(balance);
          errorCount = 0; // Reset error count on success
        } catch (error) {
          console.error('Balance update failed:', error);
          errorCount++;
          
          // Stop interval if too many errors
          if (errorCount >= MAX_ERRORS) {
            console.log('Too many errors, stopping balance updates');
            clearInterval(intervalId);
          }
        }
      }
    };

    if (wallet?.account?.address) {
      // Initial update
      updateBalance();
      
      // Set up interval
      intervalId = setInterval(updateBalance, 15000); // Changed to 15 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [wallet?.account?.address]);

  // Format currency values
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Handle STON.fi navigation
  const goToStonFi = (contractAddress: string) => {
    window.Telegram.WebApp.openLink(`https://app.ston.fi/swap?token=${contractAddress}`);
  };

  if (!user) {
    return <div className={styles.loading}>Loading...</div>;
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
            <div className={styles.value}>{tonBalance} TON</div>
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
  );
}