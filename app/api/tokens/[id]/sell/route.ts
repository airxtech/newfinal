// app/api/tokens/[id]/sell/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TokenService } from '@/lib/services/tokenService';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, tokenAmount } = body;

    if (!userId || !tokenAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate transaction details
    const calculation = await TokenService.calculateSellTransaction(
      params.id,
      tokenAmount
    );

    // Execute transaction
    const transaction = await TokenService.executeSellTransaction(
      userId,
      params.id,
      tokenAmount,
      calculation
    );

    return NextResponse.json({
      transaction,
      calculation,
    });
  } catch (error: any) {
    console.error('Sell token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sell token' },
      { status: 500 }
    );
  }
}