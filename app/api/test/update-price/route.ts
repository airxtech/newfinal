// app/api/test/update-price/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Manual price update triggered');
    
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
    );

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Received data:', data);

    // CoinGecko returns price in this format: { "the-open-network": { "usd": 2.34 } }
    const price = data['the-open-network'].usd;

    if (!price && price !== 0) {
      throw new Error('No price data in response');
    }

    const result = await prisma.tonPrice.upsert({
      where: { id: 'current' },
      update: { price, timestamp: new Date() },
      create: { id: 'current', price, timestamp: new Date() }
    });

    return NextResponse.json({ 
      success: true, 
      price, 
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual price update failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}