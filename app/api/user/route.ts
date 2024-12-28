// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Get telegramId from URL params
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');
    
    console.log('Searching for telegramId:', telegramId);

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { 
        telegramId: Number(telegramId) 
      }
    });
    
    console.log('Found user:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('GET request error:', error);
    return NextResponse.json(
      { error: 'Database query failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { telegramId, firstName, lastName, username, zoaBalance, scratchChances } = body;

    const user = await prisma.user.upsert({
      where: { 
        telegramId: Number(telegramId) 
      },
      update: { 
        firstName,
        lastName,
        username,
        zoaBalance: zoaBalance || 0,
        ...(scratchChances !== undefined && { scratchChances })
      },
      create: {
        id: telegramId.toString(),
        telegramId: Number(telegramId),
        firstName: firstName || 'Anonymous',
        lastName: lastName || '',
        username: username || '',
        zoaBalance: zoaBalance || 0,
        scratchChances: scratchChances || 3,
        referralCode: `ZOA${telegramId}${Date.now().toString(36)}`.toUpperCase()
      }
    });
    
    console.log('User saved/updated:', user);
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('POST request error:', error);
    return NextResponse.json(
      { error: 'Database operation failed', details: error.message },
      { status: 500 }
    );
  }
}