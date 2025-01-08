// app/hooks/useTokenUpdates.ts
import { useEffect } from 'react';
import { TonPriceService } from '@/lib/services/tonPriceService';

interface UseTokenUpdatesProps {
  tokenId: string;
  onPriceUpdate: (price: number) => void;
  onNewTransaction?: (transaction: Transaction) => void;
  onTokenUpdate?: (data: TokenData) => void;
}

interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  tokenAmount: number;
  price: number;
  timestamp: Date;
  user?: {
    username?: string;
    firstName: string;
  };
}

interface TokenData {
  id: string;
  name: string;
  ticker: string;
  currentPrice: number;
  marketCap: number;
  bondingCurve: number;
  totalSupply: number;
  isListed: boolean;
}

export function useTokenUpdates({
  tokenId,
  onPriceUpdate,
  onNewTransaction,
  onTokenUpdate,
}: UseTokenUpdatesProps) {
  useEffect(() => {
    const updateData = async () => {
      try {
        // Update TON price
        const price = await TonPriceService.getCurrentPrice();
        onPriceUpdate(price);

        // Fetch latest token data
        const tokenResponse = await fetch(`/api/tokens/${tokenId}`);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (onTokenUpdate) {
            onTokenUpdate(tokenData);
          }
        }

        // Fetch latest transactions
        const txResponse = await fetch(
          `/api/tokens/${tokenId}/transactions?limit=1`
        );
        if (txResponse.ok) {
          const { transactions } = await txResponse.json();
          if (transactions?.length > 0 && onNewTransaction) {
            onNewTransaction(transactions[0]);
          }
        }
      } catch (error) {
        console.error('Error updating token data:', error);
      }
    };

    // Initial update
    updateData();

    // Set up periodic updates (every 15 minutes)
    const interval = setInterval(updateData, 15 * 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [tokenId, onPriceUpdate, onNewTransaction, onTokenUpdate]);
}