// hooks/useTokenUpdates.ts
import { useEffect } from 'react';
import { clientPusher } from '@/lib/services/pusherService';

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
    if (!clientPusher) return;

    // Subscribe to general TON price updates
    const priceChannel = clientPusher.subscribe('private-ton-price');
    // Subscribe to token-specific updates
    const tokenChannel = clientPusher.subscribe(`private-token-${tokenId}`);

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
      clientPusher?.unsubscribe('private-ton-price');
      clientPusher?.unsubscribe(`private-token-${tokenId}`);
    };
  }, [tokenId, onPriceUpdate, onNewTransaction, onTokenUpdate]);
}