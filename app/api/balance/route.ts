// app/api/balance/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { userId, amount } = await request.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: amount },
        lastFarmingTime: new Date(),
      },
    });

    return NextResponse.json({ balance: user.balance });
  } catch (error) {
    console.error('Balance update error:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}