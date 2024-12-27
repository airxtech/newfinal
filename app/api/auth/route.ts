// app/api/auth/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const initData = new URLSearchParams(data.initData);
    const userData = JSON.parse(initData.get('user') || '{}');

    const user = await prisma.user.upsert({
      where: { telegramId: userData.id },
      update: {
        firstName: userData.first_name,
        lastName: userData.last_name || null,
        username: userData.username || null,
        isPremium: userData.is_premium || false,
      },
      create: {
        telegramId: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name || null,
        username: userData.username || null,
        isPremium: userData.is_premium || false,
        balance: 0,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}