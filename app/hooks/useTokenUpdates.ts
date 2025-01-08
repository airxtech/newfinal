// hooks/useTokenUpdates.ts
import { useEffect } from 'react';
import { pusherClient } from '@/lib/services/pusherService';

interface UseTokenUpdatesProps {
  tokenId: string;
  onPriceUpdate: (price: number) => void;
  onNewTransaction: (transaction: any) => void;
  onTokenUpdate: (data: any) => void;
}

export function useTokenUpdates({
  tokenId,
  onPriceUpdate,
  onNewTransaction,
  onTokenUpdate,
}: UseTokenUpdatesProps) {
  useEffect(() => {
    // Subscribe to token-specific channel
    const channel = pusherClient.subscribe(`token-${tokenId}`);

    // Listen for price updates
    channel.bind('price_update', (data: { price: number }) => {
      onPriceUpdate(data.price);
    });

    // Listen for new transactions
    channel.bind('new_transaction', (transaction: any) => {
      onNewTransaction(transaction);
    });

    // Listen for token updates
    channel.bind('token_update', (data: any) => {
      onTokenUpdate(data);
    });

    return () => {
      pusherClient.unsubscribe(`token-${tokenId}`);
    };
  }, [tokenId, onPriceUpdate, onNewTransaction, onTokenUpdate]);
}