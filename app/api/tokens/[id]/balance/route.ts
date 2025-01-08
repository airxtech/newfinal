// app/api/tokens/[id]/balance/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    const userToken = await prisma.userToken.findFirst({
      where: {
        tokenId: params.id,
        user: {
          telegramId: Number(telegramId)
        }
      }
    });

    return NextResponse.json({
      balance: userToken?.balance || 0
    });
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}