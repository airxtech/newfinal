// app/api/auth/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const initData = new URLSearchParams(data.initData);
    const userData = JSON.parse(initData.get('user') || '{}');

    // Create or update user in database
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

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, telegramId: user.telegramId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token, user });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}