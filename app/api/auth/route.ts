// app/api/auth/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createHash, createHmac } from 'crypto';

const prisma = new PrismaClient();

const BOT_TOKEN = process.env.BOT_TOKEN!;
const JWT_SECRET = process.env.JWT_SECRET!;

function validateTelegramWebAppData(data: any) {
  const initData = new URLSearchParams(data);
  const hash = initData.get('hash');
  initData.delete('hash');
  
  const dataCheckString = Array.from(initData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHash('sha256')
    .update(BOT_TOKEN)
    .digest();
  
  const hmac = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const isValid = validateTelegramWebAppData(data.initData);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    const userData = JSON.parse(new URLSearchParams(data.initData).get('user') || '{}');

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