// lib/services/tokenService.ts

import { prisma } from '../prisma';
import { TonPriceService } from './tonPriceService';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType } from '@prisma/client';

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

    const fee = buyAmountUSD * this.TRANSACTION_FEE_PERCENTAGE;
    const totalPayment = buyAmountUSD + fee;
    const baseTokenValue = buyAmountUSD * this.BASE_TOKEN_PERCENTAGE;
    const maxBonusValue = baseTokenValue * this.MAX_BONUS_PERCENTAGE;
    const bonusTokenValue = Math.min(maxBonusValue, userZoaBalance);
    const currentBondingValue = (token.bondingCurve / 100) * this.TARGET_BONDING_CURVE;
    const newBondingValue = currentBondingValue + baseTokenValue;
    const bondingProgress = (newBondingValue / this.TARGET_BONDING_CURVE) * 100;
    const tokenPrice = this.calculateTokenPrice(bondingProgress);
    const baseTokens = baseTokenValue / tokenPrice;
    const bonusTokens = bonusTokenValue / tokenPrice;
    const totalTokens = baseTokens + bonusTokens;
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

    const tokenPrice = this.calculateTokenPrice(token.bondingCurve);
    const grossAmount = tokenAmount * tokenPrice;
    const fee = grossAmount * this.TRANSACTION_FEE_PERCENTAGE;
    const netAmount = grossAmount - fee;
    const profit = fee;

    return {
      tonAmount: grossAmount,
      fee,
      netAmount,
      profit,
    };
  }

  static async executeBuyTransaction(
    userId: string,
    tokenId: string,
    calculation: TokenCalculation
  ) {
    return await prisma.$transaction(async (prisma) => {
      const token = await prisma.token.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        throw new Error('Token not found');
      }

      const tonUsdRate = await TonPriceService.getCurrentPrice();
      const amountUsd = calculation.tonAmount * tonUsdRate;
      const priceUsd = token.currentPrice * tonUsdRate;

      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          tokenId,
          type: TransactionType.BUY,
          amount: calculation.tonAmount,
          amountUsd,
          tokenAmount: calculation.totalTokens,
          price: token.currentPrice,
          priceUsd,
          tonUsdRate,
          timestamp: new Date()
        }
      });

      await prisma.token.update({
        where: { id: tokenId },
        data: {
          bondingCurve: { increment: (calculation.bondingCurveContribution / this.TARGET_BONDING_CURVE) * 100 },
          marketCap: { increment: calculation.totalTokens * token.currentPrice },
        },
      });

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

      const token = await prisma.token.findUnique({
        where: { id: tokenId }
      });

      if (!token) {
        throw new Error('Token not found');
      }

      const tonUsdRate = await TonPriceService.getCurrentPrice();
      const amountUsd = calculation.tonAmount * tonUsdRate;
      const priceUsd = token.currentPrice * tonUsdRate;

      const transaction = await prisma.transaction.create({
        data: {
          id: uuidv4(),
          userId,
          tokenId,
          type: TransactionType.SELL,
          amount: calculation.tonAmount,
          amountUsd,
          tokenAmount: tokenAmount,
          price: token.currentPrice,
          priceUsd,
          tonUsdRate,
          timestamp: new Date()
        }
      });

      await prisma.token.update({
        where: { id: tokenId },
        data: {
          bondingCurve: { decrement: (calculation.netAmount / this.TARGET_BONDING_CURVE) * 100 },
          marketCap: { decrement: tokenAmount * token.currentPrice },
        },
      });

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

  private static calculateTokenPrice(bondingProgress: number): number {
    const maxPrice = this.TARGET_MARKET_CAP / this.TOTAL_SUPPLY;
    const minPrice = maxPrice / 10;
    const exponent = bondingProgress / 100;
    return minPrice * Math.pow(maxPrice / minPrice, exponent);
  }
}