// app/api/tokens/[id]/buy/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TokenService } from '@/lib/services/tokenService';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's ZOA balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate transaction details
    const calculation = await TokenService.calculateBuyTransaction(
      params.id,
      amount,
      user.zoaBalance
    );

    // Execute transaction
    const transaction = await TokenService.executeBuyTransaction(
      userId,
      params.id,
      calculation
    );

    return NextResponse.json({
      transaction,
      calculation,
    });
  } catch (error: any) {
    console.error('Buy token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to buy token' },
      { status: 500 }
    );
  }
}