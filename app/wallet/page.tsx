// app/wallet/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTonConnectUI } from '@tonconnect/ui-react'
import { toUserFriendlyAddress } from '@tonconnect/sdk'
import { WalletButton } from '../components/shared/WalletButton'
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
  const [tonBalance, setTonBalance] = useState('0.00');

  // Function to fetch TON balance
  const fetchTonBalance = async (wallet: TonWallet | null) => {
    if (!wallet?.account?.address) return '0.00';
    try {
      const userFriendlyAddress = toUserFriendlyAddress(wallet.account.address);
      console.log('Fetching balance for address:', userFriendlyAddress);

      const response = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${userFriendlyAddress}`, {
        headers: {
          'accept': 'application/json',
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
      
      if (wallet.account.balance) {
        return (Number(BigInt(wallet.account.balance)) / 1e9).toFixed(2);
      }

      return '0.00';
    } catch (error) {
      console.error('Error fetching balance:', error);
      if (wallet.account.balance) {
        return (Number(BigInt(wallet.account.balance)) / 1e9).toFixed(2);
      }
      return '0.00';
    }
  };

  // Function to fetch user data and update balances
  const fetchUserData = useCallback(async () => {
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
  }, []);

  // Function to update wallet info in database
  const updateWalletInfo = useCallback(async () => {
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
  }, [wallet?.account?.address, user?.telegramId]);

  // Initial load and wallet connection
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Update when wallet changes
  useEffect(() => {
    if (wallet?.account?.address) {
      console.log('Wallet update triggered:', wallet.account);
      updateWalletInfo();
    }
  }, [wallet?.account?.address, updateWalletInfo]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing data...');
        fetchUserData();
        updateWalletInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUserData, updateWalletInfo]);

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
          <div className={styles.totalValue}>
            Portfolio Value: {formatValue(totalValue)}
          </div>
        </div>
      </div>

      <div className={styles.tonSection}>
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
        <WalletButton />
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