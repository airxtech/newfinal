// types/transaction.ts
export interface Transaction {
    id: string;
    type: 'BUY' | 'SELL';
    amount: number;
    tokenAmount: number;
    price: number;
    timestamp: Date;
    address: string;  // Added this
    user?: {
      username?: string;
      firstName: string;
    };
  }