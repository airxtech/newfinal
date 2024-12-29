// lib/services/fundService.ts
import { prisma } from '../prisma';

interface FundState {
  bondingCurveFunds: number;
  availableProfit: number;
  platformWalletBalance: number;
}

export class FundService {
  static PLATFORM_WALLET = process.env.WALLET_ADDRESS || '';

  static async updateFundState(
    bondingCurveChange: number,
    profitChange: number
  ) {
    await prisma.platformState.upsert({
      where: { id: 'platform_state' },
      update: {
        bondingCurveFunds: { increment: bondingCurveChange },
        availableProfit: { increment: profitChange },
      },
      create: {
        id: 'platform_state',
        bondingCurveFunds: bondingCurveChange,
        availableProfit: profitChange,
        platformWalletBalance: bondingCurveChange + profitChange,
      }
    });
  }

  static async getFundState(): Promise<FundState> {
    const state = await prisma.platformState.findUnique({
      where: { id: 'platform_state' }
    });

    return {
      bondingCurveFunds: state?.bondingCurveFunds || 0,
      availableProfit: state?.availableProfit || 0,
      platformWalletBalance: state?.platformWalletBalance || 0
    };
  }
}