// lib/services/platformService.ts

import { prisma } from '../prisma';
import { TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface PlatformState {
  bondingCurveFunds: number;
  availableProfit: number;
  totalProfitToDate: number;
}

interface WithdrawResult {
  success: boolean;
  amount: number;
  transactionId: string;
  remainingProfit: number;
}

export class PlatformService {
  static async getPlatformState(): Promise<PlatformState> {
    // Get all transactions
    const transactions = await prisma.transaction.findMany({
      include: {
        token: true
      }
    });

    let bondingCurveFunds = 0;
    let availableProfit = 0;
    let totalProfitToDate = 0;

    // Calculate for each transaction
    transactions.forEach(tx => {
      if (tx.token.isListed) {
        // For listed tokens, all funds are moved to profit
        if (tx.type === TransactionType.BUY) {
          totalProfitToDate += tx.amount * 0.01; // Only count the 1% fee
          availableProfit += tx.amount * 0.01;
        }
      } else {
        // For non-listed tokens
        if (tx.type === TransactionType.BUY) {
          bondingCurveFunds += tx.amount * 0.83; // 83% goes to bonding curve
          const profit = tx.amount * 0.17 + tx.amount * 0.01; // 17% + 1% fee
          totalProfitToDate += profit;
          availableProfit += profit;
        } else {
          // Sell transaction
          bondingCurveFunds -= tx.amount;
          totalProfitToDate += tx.amount * 0.01; // 1% fee
          availableProfit += tx.amount * 0.01;
        }
      }
    });

    // Get all completed token listings
    const listedTokens = await prisma.token.findMany({
      where: {
        isListed: true
      }
    });

    // Adjust for listed tokens
    listedTokens.forEach(token => {
      // Remove bonding curve funds for listed tokens
      bondingCurveFunds -= 25000; // $25k per listed token
      // Add remaining funds after STON.fi listing to profit
      const remainingFunds = 25000 - 12000; // $25k - $12k liquidity pool
      totalProfitToDate += remainingFunds;
      availableProfit += remainingFunds;
    });

    return {
      bondingCurveFunds,
      availableProfit,
      totalProfitToDate
    };
  }

  static async withdrawProfit(
    amount: number,
    destinationWallet: string
  ): Promise<WithdrawResult> {
    const state = await this.getPlatformState();

    if (amount > state.availableProfit) {
      throw new Error('Insufficient available profit');
    }

    // Record withdrawal transaction
    const withdrawalId = uuidv4();
    await prisma.profitWithdrawal.create({
      data: {
        id: withdrawalId,
        amount,
        destinationWallet,
        timestamp: new Date(),
        status: 'COMPLETED'
      }
    });

    // Update available profit tracking
    // Note: This is tracked through transactions, so no need to update a separate counter

    return {
      success: true,
      amount,
      transactionId: withdrawalId,
      remainingProfit: state.availableProfit - amount
    };
  }

  static async getWithdrawalHistory() {
    return await prisma.profitWithdrawal.findMany({
      orderBy: {
        timestamp: 'desc'
      }
    });
    }
}