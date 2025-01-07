// lib/services/priceService.ts
import { prisma } from '../prisma';
import Papa from 'papaparse';
import { Prisma } from '@prisma/client';

export class PriceService {
  static readonly TOKENS_PER_STEP = 8000;
  static readonly TOTAL_SUPPLY = 800000000;

  static async importBondingCurveData(csvContent: string) {
    return await prisma.$transaction(async (prisma) => {
      const { data } = Papa.parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
      });

      // Process in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize).map((row: any) => ({
          id: `step_${row.Step}`,
          stepNumber: row.Step,
          tokensSold: row['Tokens Sold'],
          priceInTon: row['Price (TON)'],
          tonCollected: row['TON Collected at Step'],
          totalTonCollected: row['Total TON Collected'],
          createdAt: new Date()
        }));

        // Use createMany without skipDuplicates option
        await prisma.bondingCurveStep.createMany({
          data: batch
        });
      }
    });
  }

  static async updateTonPrice() {
    try {
      const response = await fetch(
        'https://toncenter.com/api/v2/getTokenData',
        {
          headers: {
            'X-API-Key': process.env.TONCENTER_API_KEY || ''
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch TON price');
      
      const data = await response.json();
      const usdPrice = data.price_usd;

      await prisma.tonPrice.create({
        data: {
          id: Date.now().toString(),
          price: usdPrice,
          timestamp: new Date()
        }
      });

      return usdPrice;
    } catch (error) {
      console.error('Error updating TON price:', error);
      throw error;
    }
  }

  static async getCurrentTonPrice(): Promise<number> {
    const latestPrice = await prisma.tonPrice.findFirst({
      orderBy: { timestamp: 'desc' }
    });
    return latestPrice?.price || 0;
  }

  static async getCurrentStep(tokensSold: number): Promise<number> {
    return Math.floor(tokensSold / this.TOKENS_PER_STEP);
  }

  static async getPriceForStep(stepNumber: number): Promise<{priceInTon: number, priceInUsd: number}> {
    const [stepData, tonPrice] = await Promise.all([
      prisma.bondingCurveStep.findUnique({
        where: { stepNumber }
      }),
      this.getCurrentTonPrice()
    ]);

    if (!stepData) throw new Error('Step not found');

    return {
      priceInTon: stepData.priceInTon,
      priceInUsd: stepData.priceInTon * tonPrice
    };
  }

  static async calculateTokenPrice(tokensSold: number): Promise<{
    priceInTon: number;
    priceInUsd: number;
    stepNumber: number;
    nextStepPrice: number;
    priceImpact: number;
  }> {
    const currentStep = await this.getCurrentStep(tokensSold);
    const [currentStepData, nextStepData, tonPrice] = await Promise.all([
      this.getPriceForStep(currentStep),
      this.getPriceForStep(currentStep + 1).catch(() => null),
      this.getCurrentTonPrice()
    ]);

    return {
      priceInTon: currentStepData.priceInTon,
      priceInUsd: currentStepData.priceInTon * tonPrice,
      stepNumber: currentStep,
      nextStepPrice: nextStepData ? nextStepData.priceInTon : currentStepData.priceInTon * 1.01,
      priceImpact: nextStepData ? 
        ((nextStepData.priceInTon - currentStepData.priceInTon) / currentStepData.priceInTon) * 100 : 1
    };
  }

  static async calculateBuyAmount(tonAmount: number, currentTokensSold: number): Promise<{
    tokenAmount: number;
    priceImpact: number;
    averagePrice: number;
  }> {
    const currentStep = await this.getCurrentStep(currentTokensSold);
    const stepData = await this.getPriceForStep(currentStep);
    
    // Calculate how many tokens can be bought at current step
    const tokensInCurrentStep = Math.min(
      this.TOKENS_PER_STEP - (currentTokensSold % this.TOKENS_PER_STEP),
      tonAmount / stepData.priceInTon
    );

    let tokenAmount = tokensInCurrentStep;
    let remainingTon = tonAmount - (tokensInCurrentStep * stepData.priceInTon);
    let totalCost = tokensInCurrentStep * stepData.priceInTon;

    // If we need to go to next step
    if (remainingTon > 0) {
      const nextStepData = await this.getPriceForStep(currentStep + 1);
      const additionalTokens = remainingTon / nextStepData.priceInTon;
      tokenAmount += additionalTokens;
      totalCost += remainingTon;
    }

    return {
      tokenAmount,
      priceImpact: ((totalCost / tokenAmount - stepData.priceInTon) / stepData.priceInTon) * 100,
      averagePrice: totalCost / tokenAmount
    };
  }

  static async updateTokenPrices() {
    const tokens = await prisma.token.findMany({
      where: { isListed: false },
      include: {
        transactions: {
          select: {
            type: true,
            tokenAmount: true
          }
        }
      }
    });

    const tonPrice = await this.getCurrentTonPrice();

    await Promise.all(tokens.map(async (token) => {
      // Calculate current tokens in market
      const buyTotal = token.transactions
        .filter(tx => tx.type === 'BUY')
        .reduce((sum, tx) => sum + tx.tokenAmount, 0);

      const sellTotal = token.transactions
        .filter(tx => tx.type === 'SELL')
        .reduce((sum, tx) => sum + tx.tokenAmount, 0);

      const currentTokensSold = buyTotal - sellTotal;
      const currentStep = await this.getCurrentStep(currentTokensSold);
      const priceData = await this.getPriceForStep(currentStep);

      await prisma.token.update({
        where: { id: token.id },
        data: {
          currentPrice: priceData.priceInUsd,
          marketCap: priceData.priceInUsd * currentTokensSold,
          bondingCurve: (currentTokensSold / this.TOTAL_SUPPLY) * 100,
          lastPriceUpdate: new Date()
        }
      });
    }));
  }

  // Helper method to calculate best slippage tolerance
  static async calculateOptimalSlippage(tokenAmount: number, currentTokensSold: number): Promise<number> {
    const currentPrice = await this.calculateTokenPrice(currentTokensSold);
    const futurePrice = await this.calculateTokenPrice(currentTokensSold + tokenAmount);
    const priceImpact = Math.abs(futurePrice.priceImpact);
    
    // Add 1% buffer to the calculated price impact
    return Math.ceil(priceImpact + 1);
  }
}