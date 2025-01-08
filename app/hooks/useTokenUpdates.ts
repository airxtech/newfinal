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
        // Subscribe to general TON price updates
        const priceChannel = pusherClient.subscribe('private-ton-price');
        // Subscribe to token-specific updates
        const tokenChannel = pusherClient.subscribe(`private-token-${tokenId}`);
      
        priceChannel.bind('price-update', (data: { price: number }) => {
          onPriceUpdate(data.price);
        });
      
        tokenChannel.bind('new_transaction', (transaction: any) => {
          onNewTransaction(transaction);
        });
      
        tokenChannel.bind('token_update', (data: any) => {
          onTokenUpdate(data);
        });

    return () => {
        pusherClient.unsubscribe('private-ton-price');
        pusherClient.unsubscribe(`private-token-${tokenId}`);
    };
  }, [tokenId, onPriceUpdate, onNewTransaction, onTokenUpdate]);
}