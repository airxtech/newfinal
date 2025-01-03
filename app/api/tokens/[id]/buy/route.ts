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
    const { userId, amount, maxPrice, slippage, timestamp } = body;

    // Validate quote timestamp (1 minute validity)
    if (Date.now() - timestamp > 60000) {
      return NextResponse.json(
        { 
          error: 'QUOTE_EXPIRED',
          message: 'Price quote has expired. Please try again with updated prices.'
        },
        { status: 400 }
      );
    }

    // Get current market price
    const token = await prisma.token.findUnique({
      where: { id: params.id }
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Calculate price impact based on slippage
    const priceMovement = Math.abs(token.currentPrice - maxPrice) / maxPrice * 100;
    
    if (priceMovement > slippage) {
      return NextResponse.json(
        {
          error: 'PRICE_IMPACT_TOO_HIGH',
          message: `Price movement (${priceMovement.toFixed(2)}%) exceeds your slippage tolerance (${slippage}%). Please try again with a higher slippage tolerance or process your transaction faster.`,
          priceMovement: priceMovement.toFixed(2),
          allowedSlippage: slippage
        },
        { status: 400 }
      );
    }

    // Execute transaction
    const transaction = await TokenService.executeBuyTransaction(userId, params.id, amount);

    return NextResponse.json({
      transaction,
      slippage,
      executedPrice: token.currentPrice
    });
  } catch (error: any) {
    console.error('Buy token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to buy token' },
      { status: 500 }
    );
  }
}