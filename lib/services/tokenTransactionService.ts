// lib/services/tokenTransactionService.ts
import { useState } from 'react';

interface TransactionHistoryParams {
  tokenId: string;
  page: number;
  limit: number;
}

interface UseTransactionHistoryReturn {
  transactions: any[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useTransactionHistory({
  tokenId,
  page: initialPage = 1,
  limit = 20
}: TransactionHistoryParams): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(initialPage);

  const loadMore = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/tokens/${tokenId}/transactions?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      const newTransactions = data.transactions;

      setTransactions(prev => [...prev, ...newTransactions]);
      setHasMore(newTransactions.length === limit);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  return { transactions, loading, error, hasMore, loadMore };
}