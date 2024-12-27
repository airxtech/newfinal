// app/api/user/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  console.log('GET request received');
  
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
  console.log('POST request received');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { telegramId, firstName, lastName, username, balance } = body;

    const user = await prisma.user.upsert({
      where: { 
        telegramId: Number(telegramId) 
      },
      update: { 
        firstName,
        lastName,
        username,
        balance: balance || 0
      },
      create: {
        id: telegramId.toString(),
        telegramId: Number(telegramId),
        firstName,
        lastName: lastName || '',
        username: username || '',
        balance: balance || 0
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