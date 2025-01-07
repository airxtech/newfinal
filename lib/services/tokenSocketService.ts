// lib/services/tokenSocketService.ts
import { useEffect } from 'react';
import io from 'socket.io-client';

export function useTokenUpdates(tokenId: string, 
  onPriceUpdate: (price: number) => void,
  onTransactionUpdate: (transaction: any) => void
) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || '', {
      query: { tokenId }
    });

    socket.on('connect', () => {
      console.log('Connected to token updates');
    });

    socket.on('price_update', (data: { price: number }) => {
      onPriceUpdate(data.price);
    });

    socket.on('new_transaction', (transaction: any) => {
      onTransactionUpdate(transaction);
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [tokenId]);
}