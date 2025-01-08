// hooks/useTokenWebSocket.ts
import { useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseTokenWebSocketProps {
  tokenId: string;
  onPriceUpdate: (price: number) => void;
  onNewTransaction: (transaction: any) => void;
  onTokenUpdate: (data: any) => void;
}

export function useTokenWebSocket({
  tokenId,
  onPriceUpdate,
  onNewTransaction,
  onTokenUpdate
}: UseTokenWebSocketProps) {
  const connectSocket = useCallback(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || '', {
      query: { tokenId }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('ton_price_update', ({ price }: { price: number }) => {
      onPriceUpdate(price);
    });

    socket.on('new_transaction', (transaction: any) => {
      onNewTransaction(transaction);
    });

    socket.on('token_update', (data: any) => {
      onTokenUpdate(data);
    });

    socket.on('error', (error: unknown) => {
      console.error('WebSocket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        socket.connect();
      }, 5000);
    });

    return socket;
  }, [tokenId, onPriceUpdate, onNewTransaction, onTokenUpdate]);

  useEffect(() => {
    const socket = connectSocket();

    return () => {
      socket.disconnect();
    };
  }, [connectSocket]);
}