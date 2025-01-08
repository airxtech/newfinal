// app/api/test/update-price/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Manual price update triggered');
    
    const response = await fetch('https://toncenter.com/api/v2/getTokenData');
    if (!response.ok) throw new Error('Failed to fetch TON price');
    
    const data = await response.json();
    const price = data.price_usd;

    const result = await prisma.tonPrice.upsert({
      where: { id: 'current' },
      update: { price, timestamp: new Date() },
      create: { id: 'current', price, timestamp: new Date() }
    });

    return NextResponse.json({ success: true, price, result });
  } catch (error) {
    console.error('Manual price update failed:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}