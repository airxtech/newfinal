// lib/services/tokenService.ts

import { prisma } from '../prisma';
import { Token, User, TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface TokenCalculation {
  baseTokens: number;
  bonusTokens: number;
  totalTokens: number;
  tonAmount: number;
  fee: number;
  totalPayment: number;
  bondingCurveContribution: number;
  profit: number;
}

export class TokenService {
  private static TRANSACTION_FEE_PERCENTAGE = 0.01; // 1%
  private static BASE_TOKEN_PERCENTAGE = 0.83; // 83%
  private static MAX_BONUS_PERCENTAGE = 0.20; // 20%
  private static TOTAL_SUPPLY = 300_000_000; // 300M tokens
  private static TARGET_MARKET_CAP = 100_000; // $100k
  private static TARGET_BONDING_CURVE = 25_000; // $25k
  private static LIQUIDITY_POOL_AMOUNT = 12_000; // $12k

  static async calculateBuyTransaction(
    tokenId: string,
    buyAmountUSD: number,
    userZoaBalance: number
  ): Promise<TokenCalculation> {
    // Validate token exists and get current state
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        transactions: true,
        holders: true,
      },
    });

    if (!token) {
      throw new Error('Token not found');
    }

    if (token.bondingCurve >= 100) {
      throw new Error('Token is fully bonded');
    }

    // Calculate transaction fee
    const fee = buyAmountUSD * this.TRANSACTION_FEE_PERCENTAGE;
    const totalPayment = buyAmountUSD + fee;

    // Calculate base token amount
    const baseTokenValue = buyAmountUSD * this.BASE_TOKEN_PERCENTAGE;
    
    // Calculate bonus based on ZOA balance
    const maxBonusValue = baseTokenValue * this.MAX_BONUS_PERCENTAGE;
    const bonusTokenValue = Math.min(maxBonusValue, userZoaBalance);

    // Calculate token amounts based on bonding curve
    const currentBondingValue = (token.bondingCurve / 100) * this.TARGET_BONDING_CURVE;
    const newBondingValue = currentBondingValue + baseTokenValue;
    const bondingProgress = (newBondingValue / this.TARGET_BONDING_CURVE) * 100;

    // Calculate token price based on bonding curve
    const tokenPrice = this.calculateTokenPrice(bondingProgress);
    
    // Calculate actual tokens to be received
    const baseTokens = baseTokenValue / tokenPrice;
    const bonusTokens = bonusTokenValue / tokenPrice;
    const totalTokens = baseTokens + bonusTokens;

    // Calculate profit and bonding curve contribution
    const bondingCurveContribution = baseTokenValue;
    const profit = buyAmountUSD - baseTokenValue + fee;

    return {
      baseTokens,
      bonusTokens,
      totalTokens,
      tonAmount: buyAmountUSD,
      fee,
      totalPayment,
      bondingCurveContribution,
      profit,
    };
  }

  static async calculateSellTransaction(
    tokenId: string,
    tokenAmount: number
  ): Promise<{
    tonAmount: number;
    fee: number;
    netAmount: number;
    profit: number;
  }> {
    const tokenData = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        transactions: true,
        holders: true,
      },
    });

    if (!tokenData) {
      throw new Error('Token not found');
    }

    // Calculate token price based on current bonding curve
    const tokenPrice = this.calculateTokenPrice(tokenData.bondingCurve);
    
    // Calculate gross TON amount
    const grossAmount = tokenAmount * tokenPrice;
    
    // Calculate fee
    const fee = grossAmount * this.TRANSACTION_FEE_PERCENTAGE;
    
    // Calculate net amount after fee
    const netAmount = grossAmount - fee;
    
    // Calculate platform profit
    const profit = fee;

    return {
      tonAmount: grossAmount,
      fee,
      netAmount,
      profit,
    };
  }

  private static calculateTokenPrice(bondingProgress: number): number {
    const maxPrice = this.TARGET_MARKET_CAP / this.TOTAL_SUPPLY;
    const minPrice = maxPrice / 10;
    const exponent = bondingProgress / 100;
    const price = minPrice * Math.pow(maxPrice / minPrice, exponent);
    return price;
  }

  static async executeBuyTransaction(
    userId: string,
    tokenId: string,
    calculation: TokenCalculation
  ) {
    return await prisma.$transaction(async (prisma) => {
      const tokenData = await prisma.token.findUnique({
        where: { id: tokenId }
      });

      if (!tokenData) {
        throw new Error('Token not found');
      }

      // Update token state
      const updatedToken = await prisma.token.update({
        where: { id: tokenId },
        data: {
          bondingCurve: { increment: (calculation.bondingCurveContribution / this.TARGET_BONDING_CURVE) * 100 },
          marketCap: { increment: calculation.totalTokens * this.calculateTokenPrice(tokenData.bondingCurve) },
        },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          tokenId,
          type: TransactionType.BUY,
          amount: calculation.tonAmount,
          tokenAmount: calculation.totalTokens,
          price: this.calculateTokenPrice(updatedToken.bondingCurve),
        },
      });

      // Update or create user token balance
      await prisma.userToken.upsert({
        where: {
          userId_tokenId: {
            userId,
            tokenId,
          },
        },
        update: {
          balance: { increment: calculation.totalTokens },
        },
        create: {
          id: uuidv4(),
          userId,
          tokenId,
          balance: calculation.totalTokens,
        },
      });

      // Deduct ZOA tokens if bonus tokens were given
      if (calculation.bonusTokens > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            zoaBalance: { decrement: calculation.bonusTokens },
          },
        });
      }

      return transaction;
    });
  }

  static async executeSellTransaction(
    userId: string,
    tokenId: string,
    tokenAmount: number,
    calculation: { tonAmount: number; fee: number; netAmount: number; profit: number }
  ) {
    return await prisma.$transaction(async (prisma) => {
      // Verify user has enough tokens
      const userToken = await prisma.userToken.findUnique({
        where: {
          userId_tokenId: {
            userId,
            tokenId,
          },
        },
      });

      if (!userToken || userToken.balance < tokenAmount) {
        throw new Error('Insufficient token balance');
      }

      const tokenData = await prisma.token.findUnique({
        where: { id: tokenId }
      });

      if (!tokenData) {
        throw new Error('Token not found');
      }

      // Update token state
      const updatedToken = await prisma.token.update({
        where: { id: tokenId },
        data: {
          bondingCurve: { decrement: (calculation.netAmount / this.TARGET_BONDING_CURVE) * 100 },
          marketCap: { decrement: tokenAmount * this.calculateTokenPrice(tokenData.bondingCurve) },
        },
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          tokenId,
          type: TransactionType.SELL,
          amount: calculation.tonAmount,
          tokenAmount: tokenAmount,
          price: this.calculateTokenPrice(updatedToken.bondingCurve),
        },
      });

      // Update user token balance
      await prisma.userToken.update({
        where: {
          userId_tokenId: {
            userId,
            tokenId,
          },
        },
        data: {
          balance: { decrement: tokenAmount },
        },
      });

      return transaction;
    });
  }
}