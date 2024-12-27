// app/api/balance/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const { amount } = await request.json();

    const user = await prisma.user.update({
      where: { id: decoded.userId },
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